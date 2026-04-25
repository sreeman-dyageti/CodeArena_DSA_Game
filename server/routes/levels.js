import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

// GET /api/levels?track=dsa
// Returns all levels ordered by order_num
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, topic, sub_topic, difficulty, order_num, problem_statement, examples, constraints, starter_code
       FROM levels
       ORDER BY order_num ASC`
    );
    res.json({ levels: result.rows });
  } catch (err) {
    console.error("GET /api/levels", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

// GET /api/levels/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, topic, sub_topic, difficulty, order_num, problem_statement, examples, constraints, starter_code
       FROM levels WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Level not found" });
    }
    res.json({ level: result.rows[0] });
  } catch (err) {
    console.error("GET /api/levels/:id", err);
    res.status(500).json({ error: "Failed to fetch level" });
  }
});

export default router;
