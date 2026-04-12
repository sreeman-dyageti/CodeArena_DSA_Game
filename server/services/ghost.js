import pool from "../db/pool.js";

/**
 * @param {string} userId
 * @param {string} levelId
 * @param {{ char: string, timestamp_ms: number }[]} keystrokes
 * @param {number} totalTimeMs
 * @param {string} solutionCode
 */
export async function saveGhostReplay(userId, levelId, keystrokes, totalTimeMs, solutionCode) {
  const result = await pool.query(
    `INSERT INTO ghost_replays (user_id, level_id, keystrokes, total_time_ms, solution_code)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     RETURNING id, user_id, level_id, keystrokes, total_time_ms, solution_code, created_at`,
    [userId, levelId, JSON.stringify(keystrokes ?? []), totalTimeMs, solutionCode ?? ""]
  );
  return result.rows[0];
}

/**
 * Closest ELO ghost for a level (by creator's current ELO).
 * @param {string} levelId
 * @param {number} userElo
 * @param {string} [excludeUserId] If set, never pick this user's replay (e.g. current player).
 */
export async function findGhost(levelId, userElo, excludeUserId = null) {
  const result = await pool.query(
    `SELECT gr.id, gr.level_id, gr.user_id, gr.keystrokes, gr.total_time_ms, gr.solution_code, gr.created_at,
            u.elo AS creator_elo
     FROM ghost_replays gr
     INNER JOIN users u ON u.id = gr.user_id
     WHERE gr.level_id = $1
       AND ($3::uuid IS NULL OR gr.user_id <> $3)
     ORDER BY ABS(u.elo - $2::integer)
     LIMIT 1`,
    [levelId, userElo, excludeUserId ?? null]
  );
  return result.rows[0] ?? null;
}

function normalizeKeystrokes(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((k) => ({
      char: k.char == null ? "" : String(k.char),
      timestamp_ms: Number(k.timestamp_ms) || 0,
    }))
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
}

/**
 * Replays keystrokes using chained setTimeout calls (delta timing).
 * Emits `ghost_keystroke` then `ghost_submitted` (after total_time_ms from battle start).
 * @param {() => void} [onComplete] Runs after the final `ghost_submitted` schedule fires (not if cancelled).
 * @returns {() => void} Cancel pending timers.
 */
export function replayGhostKeystrokes(socket, ghostReplay, onComplete) {
  const timeouts = [];
  const keystrokes = normalizeKeystrokes(ghostReplay.keystrokes);
  const totalTimeMs = Number(ghostReplay.total_time_ms) || 0;
  let finished = false;

  const schedule = (index, prevTs) => {
    if (!socket.connected) return;
    if (index >= keystrokes.length) {
      const remain = Math.max(0, totalTimeMs - prevTs);
      timeouts.push(
        setTimeout(() => {
          if (socket.connected) {
            socket.emit("ghost_submitted", {
              solutionCode: ghostReplay.solution_code ?? "",
            });
          }
          if (!finished) {
            finished = true;
            onComplete?.();
          }
        }, remain)
      );
      return;
    }
    const k = keystrokes[index];
    const delay = Math.max(0, k.timestamp_ms - prevTs);
    timeouts.push(
      setTimeout(() => {
        if (!socket.connected) return;
        socket.emit("ghost_keystroke", {
          char: k.char,
          timestamp_ms: k.timestamp_ms,
        });
        schedule(index + 1, k.timestamp_ms);
      }, delay)
    );
  };

  schedule(0, 0);

  return () => {
    for (const id of timeouts) clearTimeout(id);
  };
}

function ghostDisplayName(ghostReplay) {
  const hex = ghostReplay.id.replace(/-/g, "");
  const n = parseInt(hex.slice(-8), 16) % 10000;
  return `Ghost #${String(n).padStart(4, "0")}`;
}

export { ghostDisplayName };
