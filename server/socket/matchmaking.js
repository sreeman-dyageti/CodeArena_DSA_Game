import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import pool from "../db/pool.js";
import { judgeSubmission } from "../services/judge.js";
import {
  saveGhostReplay,
  findGhost,
  replayGhostKeystrokes,
  ghostDisplayName,
} from "../services/ghost.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/** @type {{ socket: import("socket.io").Socket, userId: string, levelId: string, username: string, elo: number, ghostTimer?: ReturnType<typeof setTimeout> }[]} */
const queue = [];

/** @type {Map<string, object>} */
const rooms = new Map();

/** @type {Map<string, string>} */
const socketRoom = new Map();

async function fetchProblem(levelId) {
  const r = await pool.query(
    `SELECT id, topic, sub_topic, difficulty, order_num, problem_statement, examples, constraints, starter_code
     FROM levels WHERE id = $1`,
    [levelId]
  );
  return r.rows[0] ?? null;
}

function removeFromQueue(socketId) {
  const idx = queue.findIndex((e) => e.socket.id === socketId);
  if (idx === -1) return null;
  const [removed] = queue.splice(idx, 1);
  if (removed.ghostTimer) clearTimeout(removed.ghostTimer);
  return removed;
}

function clearGhostTimers(entry) {
  if (entry?.ghostTimer) clearTimeout(entry.ghostTimer);
}

function detachSocketFromRoom(socket) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) {
    socketRoom.delete(socket.id);
    return;
  }

  if (room.player1?.socket) socketRoom.delete(room.player1.socket.id);
  if (room.player2?.socket) socketRoom.delete(room.player2.socket.id);

  if (room.mode === "ghost" && room.ghostCancel) {
    room.ghostCancel();
    room.ghostCancel = undefined;
  }

  const other = room.player1?.socket?.id === socket.id ? room.player2?.socket : room.player1?.socket;
  if (room.mode === "1v1" && other?.connected) {
    other.emit("opponent_disconnected", { roomId });
  }

  rooms.delete(roomId);
}

function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.player1?.socket) socketRoom.delete(room.player1.socket.id);
  if (room.player2?.socket) socketRoom.delete(room.player2.socket.id);
  if (room.mode === "ghost" && room.ghostCancel) room.ghostCancel();
  rooms.delete(roomId);
}

function otherPlayer(room, socket) {
  if (room.player1?.socket?.id === socket.id) return room.player2;
  if (room.player2?.socket?.id === socket.id) return room.player1;
  return null;
}

async function createBattleRow(player1Id, player2Id, levelId, mode) {
  const r = await pool.query(
    `INSERT INTO battles (player1_id, player2_id, level_id, mode)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [player1Id, player2Id, levelId, mode]
  );
  return r.rows[0].id;
}

function shapeProblem(row) {
  if (!row) return null;
  return {
    id: row.id,
    topic: row.topic,
    sub_topic: row.sub_topic,
    difficulty: row.difficulty,
    order_num: row.order_num,
    problem_statement: row.problem_statement,
    examples: row.examples,
    constraints: row.constraints,
    starter_code: row.starter_code,
  };
}

/**
 * @param {import("socket.io").Server} io
 */
export function initSocket(io) {
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
    socket.on("join_queue", async (payload) => {
      const userId = payload?.userId;
      const levelId = payload?.levelId;
      const username = payload?.username;
      const elo = Number(payload?.elo);

      if (!isUuid(levelId)) {
        socket.emit("matchmaking_error", { message: "Invalid levelId" });
        return;
      }
      if (userId !== socket.userId) {
        socket.emit("matchmaking_error", { message: "userId does not match session" });
        return;
      }
      if (typeof username !== "string" || !username.trim()) {
        socket.emit("matchmaking_error", { message: "username is required" });
        return;
      }
      if (!Number.isFinite(elo)) {
        socket.emit("matchmaking_error", { message: "elo is required" });
        return;
      }

      removeFromQueue(socket.id);
      detachSocketFromRoom(socket);

      const problemRow = await fetchProblem(levelId);
      if (!problemRow) {
        socket.emit("matchmaking_error", { message: "Level not found" });
        return;
      }
      const problem = shapeProblem(problemRow);

      const peerIdx = queue.findIndex((e) => e.levelId === levelId && e.userId !== userId);
      if (peerIdx !== -1) {
        const peer = queue[peerIdx];
        queue.splice(peerIdx, 1);
        clearGhostTimers(peer);

        const roomId = randomUUID();
        const battleId = await createBattleRow(peer.userId, userId, levelId, "1v1");

        const room = {
          id: roomId,
          battleId,
          levelId,
          levelRow: problemRow,
          mode: "1v1",
          player1: {
            userId: peer.userId,
            username: peer.username,
            elo: peer.elo,
            socket: peer.socket,
          },
          player2: {
            userId,
            username: username.trim(),
            elo,
            socket,
          },
          startedAt: Date.now(),
          ended: false,
        };
        rooms.set(roomId, room);
        socketRoom.set(peer.socket.id, roomId);
        socketRoom.set(socket.id, roomId);

        peer.socket.emit("match_found", {
          roomId,
          problem,
          opponentId: userId,
          opponentName: username.trim(),
          opponentType: "human",
        });
        socket.emit("match_found", {
          roomId,
          problem,
          opponentId: peer.userId,
          opponentName: peer.username,
          opponentType: "human",
        });
        return;
      }

      /** @type {{ socket: import("socket.io").Socket, userId: string, levelId: string, username: string, elo: number, ghostTimer?: ReturnType<typeof setTimeout> }} */
      const entry = {
        socket,
        userId,
        levelId,
        username: username.trim(),
        elo,
      };
      entry.ghostTimer = setTimeout(() => {
        void (async () => {
          const stillIdx = queue.findIndex((e) => e.socket.id === socket.id);
          if (stillIdx === -1 || !socket.connected) return;
          queue.splice(stillIdx, 1);
          clearGhostTimers(entry);

          const ghost = await findGhost(levelId, elo, userId);
          if (!ghost) {
            socket.emit("no_ghost_available", { levelId });
            return;
          }

          const roomId = randomUUID();
          const battleId = await createBattleRow(userId, null, levelId, "ghost");
          const opponentName = ghostDisplayName(ghost);

          const room = {
            id: roomId,
            battleId,
            levelId,
            levelRow: problemRow,
            mode: "ghost",
            player1: {
              userId,
              username: username.trim(),
              elo,
              socket,
            },
            player2: null,
            ghostReplay: ghost,
            startedAt: Date.now(),
            ended: false,
          };
          rooms.set(roomId, room);
          socketRoom.set(socket.id, roomId);

          socket.emit("match_found", {
            roomId,
            problem,
            opponentId: null,
            opponentName,
            opponentType: "ghost",
          });

          room.ghostCancel = replayGhostKeystrokes(socket, ghost);
        })();
      }, 10_000);

      queue.push(entry);
      socket.emit("queue_joined", { levelId, waitSeconds: 10 });
    });

    socket.on("leave_queue", () => {
      removeFromQueue(socket.id);
      socket.emit("queue_left", {});
    });

    socket.on("code_change", (payload) => {
      const roomId = payload?.roomId;
      const lineCount = Number(payload?.lineCount);
      if (!isUuid(roomId) || !Number.isFinite(lineCount)) return;

      const room = rooms.get(roomId);
      if (!room || room.ended) return;
      const other = otherPlayer(room, socket);
      if (!other?.socket?.connected) return;
      other.socket.emit("opponent_update", { lineCount });
    });

    socket.on("submit_solution", async (payload) => {
      const roomId = payload?.roomId;
      const code = payload?.code != null ? String(payload.code) : "";
      const language = payload?.language != null ? String(payload.language) : "javascript";

      if (!isUuid(roomId)) {
        socket.emit("submit_result", { correct: false, message: "Invalid roomId" });
        return;
      }

      const room = rooms.get(roomId);
      if (!room || room.ended) {
        socket.emit("submit_result", { correct: false, message: "Battle is not active" });
        return;
      }

      const self =
        room.player1?.socket?.id === socket.id
          ? room.player1
          : room.player2?.socket?.id === socket.id
            ? room.player2
            : null;
      if (!self) {
        socket.emit("submit_result", { correct: false, message: "You are not in this room" });
        return;
      }

      const judgeResult = await judgeSubmission({
        code,
        language,
        levelRow: room.levelRow,
      });

      if (!judgeResult.correct) {
        socket.emit("submit_result", { correct: false, message: judgeResult.message || "Incorrect" });
        return;
      }

      if (room.ended) {
        socket.emit("submit_result", { correct: true, late: true });
        return;
      }
      room.ended = true;

      const winnerId = self.userId;
      const winnerName = self.username;
      const opponent = self.userId === room.player1.userId ? room.player2 : room.player1;
      const loserId = room.mode === "1v1" && opponent ? opponent.userId : null;
      const loserName = room.mode === "1v1" && opponent ? opponent.username : null;

      const elapsedMs = Date.now() - room.startedAt;
      const p1 = room.player1;
      const p2 = room.player2;
      const player1Code = p1.userId === winnerId ? code : null;
      const player2Code = p2 && p2.userId === winnerId ? code : null;
      const player1Time = p1.userId === winnerId ? elapsedMs : null;
      const player2Time = p2 && p2.userId === winnerId ? elapsedMs : null;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE battles
           SET winner_id = $1,
               player1_code = $2,
               player2_code = $3,
               player1_time_ms = $4,
               player2_time_ms = $5,
               ended_at = NOW()
           WHERE id = $6`,
          [winnerId, player1Code, player2Code, player1Time, player2Time, room.battleId]
        );
        await client.query(`UPDATE users SET credits = credits + 250 WHERE id = $1`, [winnerId]);
        if (loserId) {
          await client.query(`UPDATE users SET credits = credits + 50 WHERE id = $1`, [loserId]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("submit_solution battle/credits", err);
        room.ended = false;
        socket.emit("submit_result", { correct: false, message: "Server error saving battle" });
        return;
      } finally {
        client.release();
      }

      try {
        await saveGhostReplay(winnerId, room.levelId, [], elapsedMs, code);
      } catch (err) {
        console.error("saveGhostReplay winner", err);
      }

      const battleEndPayload = {
        roomId,
        battleId: room.battleId,
        winnerId,
        winnerName,
        loserId,
        loserName,
        durationMs: elapsedMs,
        creditsAwarded: { winner: 250, loser: loserId ? 50 : 0 },
      };

      if (p1.socket?.connected) p1.socket.emit("battle_end", battleEndPayload);
      if (p2?.socket?.connected) p2.socket.emit("battle_end", battleEndPayload);

      if (room.mode === "ghost" && room.ghostCancel) {
        room.ghostCancel();
        room.ghostCancel = undefined;
      }
      destroyRoom(roomId);
    });

    socket.on("disconnect", () => {
      removeFromQueue(socket.id);
      detachSocketFromRoom(socket);
    });
  });
}
