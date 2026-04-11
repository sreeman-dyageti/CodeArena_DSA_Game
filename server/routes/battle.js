import express from "express";
import pool from "../db/pool.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, opponent_name, result, created_at
       FROM battles
       WHERE player_id = $1
       ORDER BY created_at DESC`,
      [req.user.sub]
    );
    return res.json({ battles: result.rows });
  } catch (err) {
    console.error("list battles", err);
    return res.status(500).json({ error: "Failed to load battles" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid battle id" });
  }

  try {
    const result = await pool.query(
      `SELECT id, player_id, opponent_name, result, created_at
       FROM battles
       WHERE id = $1 AND player_id = $2`,
      [id, req.user.sub]
    );
    const battle = result.rows[0];
    if (!battle) {
      return res.status(404).json({ error: "Battle not found" });
    }
    return res.json({ battle });
  } catch (err) {
    console.error("get battle", err);
    return res.status(500).json({ error: "Failed to load battle" });
  }
});

router.post("/", async (req, res) => {
  const { opponent_name: opponentName, result } = req.body || {};
  if (!opponentName || !result) {
    return res.status(400).json({ error: "opponent_name and result are required" });
  }
  const allowed = ["win", "loss", "draw"];
  if (!allowed.includes(String(result).toLowerCase())) {
    return res.status(400).json({ error: "result must be win, loss, or draw" });
  }

  try {
    const insert = await pool.query(
      `INSERT INTO battles (player_id, opponent_name, result)
       VALUES ($1, $2, $3)
       RETURNING id, player_id, opponent_name, result, created_at`,
      [req.user.sub, String(opponentName).trim(), String(result).toLowerCase()]
    );
    return res.status(201).json({ battle: insert.rows[0] });
  } catch (err) {
    console.error("create battle", err);
    return res.status(500).json({ error: "Failed to record battle" });
  }
});

export default router;
