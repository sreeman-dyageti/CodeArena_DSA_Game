import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  try {
    const result = await pool.query(
      `SELECT u.username,
              COUNT(b.id) FILTER (WHERE b.result = 'win')::int AS wins,
              COUNT(b.id) FILTER (WHERE b.result = 'loss')::int AS losses,
              COUNT(b.id) FILTER (WHERE b.result = 'draw')::int AS draws
       FROM users u
       LEFT JOIN battles b ON b.player_id = u.id
       GROUP BY u.id, u.username
       ORDER BY wins DESC, losses ASC, u.username ASC
       LIMIT $1`,
      [limit]
    );
    return res.json({ leaderboard: result.rows });
  } catch (err) {
    console.error("leaderboard", err);
    return res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;
