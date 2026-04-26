import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

// GET /api/leaderboard/weekly
// Returns top 50 users ranked by credits_weekly
router.get("/weekly", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id        AS user_id,
         u.username,
         u.elo,
         u.credits,
         COALESCE(lw.credits_weekly, 0) AS credits_weekly
       FROM users u
       LEFT JOIN leaderboard_weekly lw ON lw.user_id = u.id
       ORDER BY credits_weekly DESC, u.elo DESC
       LIMIT 50`
    );
    res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error("GET /api/leaderboard/weekly", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// POST /api/leaderboard/award  (called internally after battle)
router.post("/award", async (req, res) => {
  const { winnerId, loserId } = req.body || {};
  if (!winnerId) return res.status(400).json({ error: "winnerId required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Award winner +250 total credits and +250 weekly
    await client.query(`UPDATE users SET credits = credits + 250 WHERE id = $1`, [winnerId]);
    await client.query(
      `INSERT INTO leaderboard_weekly (user_id, credits_weekly)
       VALUES ($1, 250)
       ON CONFLICT (user_id)
       DO UPDATE SET credits_weekly = leaderboard_weekly.credits_weekly + 250, updated_at = NOW()`,
      [winnerId]
    );

    // Award loser +50 consolation
    if (loserId) {
      await client.query(`UPDATE users SET credits = credits + 50 WHERE id = $1`, [loserId]);
      await client.query(
        `INSERT INTO leaderboard_weekly (user_id, credits_weekly)
         VALUES ($1, 50)
         ON CONFLICT (user_id)
         DO UPDATE SET credits_weekly = leaderboard_weekly.credits_weekly + 50, updated_at = NOW()`,
        [loserId]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/leaderboard/award", err);
    res.status(500).json({ error: "Failed to award credits" });
  } finally {
    client.release();
  }
});

export default router;
