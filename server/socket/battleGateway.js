import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import pool from "../db/pool.js";
import { saveGhostReplay, findGhost, replayGhostKeystrokes, ghostDisplayName } from "../services/ghost.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/** @typedef {{ socket: import("socket.io").Socket, userId: string, elo: number, username: string, levelId: string, ghostTimer?: ReturnType<typeof setTimeout> }} QueueEntry */

/** @type {Map<string, QueueEntry[]>} */
const queueByLevel = new Map();

/** @type {Map<string, { levelId: string, mode: 'human'|'ghost', players: { socket: import("socket.io").Socket, userId: string, username: string, elo: number }[], keystrokes: Map<string, { char: string, timestamp_ms: number }[]>, submitted: Set<string>, ghostCancel?: () => void }>} */
const rooms = new Map();

/** @type {Map<string, string>} socket.id -> roomId */
const socketRoom = new Map();

async function loadUser(userId) {
  const r = await pool.query(`SELECT id, username, elo FROM users WHERE id = $1`, [userId]);
  return r.rows[0] ?? null;
}

function removeFromQueueBySocketId(socketId) {
  for (const [levelId, arr] of queueByLevel.entries()) {
    const idx = arr.findIndex((e) => e.socket.id === socketId);
    if (idx === -1) continue;
    const [removed] = arr.splice(idx, 1);
    if (removed.ghostTimer) clearTimeout(removed.ghostTimer);
    if (arr.length === 0) queueByLevel.delete(levelId);
    return removed;
  }
  return null;
}

function detachSocketFromRoom(socket) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) {
    socketRoom.delete(socket.id);
    return;
  }

  for (const p of room.players) {
    socketRoom.delete(p.socket.id);
  }

  if (room.mode === "ghost" && room.ghostCancel) {
    room.ghostCancel();
    room.ghostCancel = undefined;
  }

  if (room.mode === "human") {
    for (const p of room.players) {
      if (p.socket.id !== socket.id && p.socket.connected) {
        p.socket.emit("opponent_disconnected", { roomId });
      }
    }
  }

  rooms.delete(roomId);
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const p of room.players) {
    socketRoom.delete(p.socket.id);
  }
  if (room.mode === "ghost" && room.ghostCancel) {
    room.ghostCancel();
  }
  rooms.delete(roomId);
}

function startHumanRoom(levelId, selfSocket, selfRow, peerEntry) {
  const roomId = randomUUID();
  const peerSocket = peerEntry.socket;

  const room = {
    levelId,
    mode: "human",
    players: [
      { socket: selfSocket, userId: selfRow.id, username: selfRow.username, elo: selfRow.elo },
      {
        socket: peerSocket,
        userId: peerEntry.userId,
        username: peerEntry.username,
        elo: peerEntry.elo,
      },
    ],
    keystrokes: new Map([
      [selfRow.id, []],
      [peerEntry.userId, []],
    ]),
    submitted: new Set(),
  };
  rooms.set(roomId, room);
  socketRoom.set(selfSocket.id, roomId);
  socketRoom.set(peerSocket.id, roomId);

  selfSocket.emit("match_found", {
    roomId,
    levelId,
    opponentType: "human",
    opponentName: peerEntry.username,
    opponentElo: peerEntry.elo,
  });
  peerSocket.emit("match_found", {
    roomId,
    levelId,
    opponentType: "human",
    opponentName: selfRow.username,
    opponentElo: selfRow.elo,
  });
}

function startGhostRoom(socket, userRow, levelId, ghostReplay) {
  const roomId = randomUUID();
  const opponentName = ghostDisplayName(ghostReplay);

  const room = {
    levelId,
    mode: "ghost",
    players: [{ socket, userId: userRow.id, username: userRow.username, elo: userRow.elo }],
    keystrokes: new Map([[userRow.id, []]]),
    submitted: new Set(),
  };
  rooms.set(roomId, room);
  socketRoom.set(socket.id, roomId);

  socket.emit("match_found", {
    roomId,
    levelId,
    opponentType: "ghost",
    opponentName,
    opponentElo: ghostReplay.creator_elo,
  });

  room.ghostCancel = replayGhostKeystrokes(socket, ghostReplay, () => {
    rooms.delete(roomId);
    socketRoom.delete(socket.id);
  });
}

/**
 * @param {import("socket.io").Server} io
 */
export function registerBattleGateway(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }
    if (!process.env.JWT_SECRET) {
      return next(new Error("Server misconfigured"));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      socket.username = payload.username;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_battle_queue", async (payload) => {
      const levelId = payload?.levelId;
      if (!isUuid(levelId)) {
        socket.emit("battle_error", { message: "Invalid levelId" });
        return;
      }

      const userRow = await loadUser(socket.userId);
      if (!userRow) {
        socket.emit("battle_error", { message: "User not found" });
        return;
      }

      removeFromQueueBySocketId(socket.id);
      detachSocketFromRoom(socket);

      if (!queueByLevel.has(levelId)) queueByLevel.set(levelId, []);
      const q = queueByLevel.get(levelId);
      const peerIdx = q.findIndex((e) => e.userId !== userRow.id);

      if (peerIdx !== -1) {
        const peer = q[peerIdx];
        q.splice(peerIdx, 1);
        if (q.length === 0) queueByLevel.delete(levelId);
        else queueByLevel.set(levelId, q);
        if (peer.ghostTimer) clearTimeout(peer.ghostTimer);
        startHumanRoom(levelId, socket, userRow, peer);
        return;
      }

      /** @type {QueueEntry} */
      const entry = {
        socket,
        userId: userRow.id,
        elo: userRow.elo,
        username: userRow.username,
        levelId,
      };
      entry.ghostTimer = setTimeout(() => {
        void (async () => {
          const still = queueByLevel.get(levelId)?.find((e) => e.socket.id === socket.id);
          if (!still || !socket.connected) return;

          removeFromQueueBySocketId(socket.id);

          const ghost = await findGhost(levelId, userRow.elo, userRow.id);
          if (!ghost) {
            socket.emit("no_ghost_available", { levelId });
            return;
          }

          startGhostRoom(socket, userRow, levelId, ghost);
        })();
      }, 10_000);

      q.push(entry);
      socket.emit("queue_joined", { levelId, waitSeconds: 10 });
    });

    socket.on("leave_battle_queue", () => {
      removeFromQueueBySocketId(socket.id);
      socket.emit("queue_left", {});
    });

    socket.on("battle_keystroke", (payload) => {
      const roomId = payload?.roomId;
      const char = payload?.char;
      const timestamp_ms = Number(payload?.timestamp_ms);
      if (!isUuid(roomId) || char == null || !Number.isFinite(timestamp_ms)) return;

      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.find((p) => p.socket.id === socket.id);
      if (!player) return;

      const list = room.keystrokes.get(player.userId);
      if (!list) return;
      list.push({ char: String(char), timestamp_ms });
    });

    socket.on("battle_submit", async (payload) => {
      const roomId = payload?.roomId;
      const solutionCode = payload?.solutionCode != null ? String(payload.solutionCode) : "";
      const totalTimeMs = Number(payload?.totalTimeMs) || 0;
      if (!isUuid(roomId)) {
        socket.emit("battle_error", { message: "Invalid roomId" });
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("battle_error", { message: "Invalid room" });
        return;
      }
      const player = room.players.find((p) => p.socket.id === socket.id);
      if (!player) {
        socket.emit("battle_error", { message: "Not in this room" });
        return;
      }

      if (room.mode === "human") {
        const ks = room.keystrokes.get(player.userId) ?? [];
        try {
          await saveGhostReplay(player.userId, room.levelId, ks, totalTimeMs, solutionCode);
        } catch (err) {
          console.error("saveGhostReplay", err);
        }
      }

      room.submitted.add(player.userId);
      socket.emit("battle_submit_ack", { ok: true });

      if (room.mode === "human" && room.submitted.size >= room.players.length) {
        destroyRoom(roomId);
      }
    });

    socket.on("disconnect", () => {
      removeFromQueueBySocketId(socket.id);
      detachSocketFromRoom(socket);
    });
  });
}
