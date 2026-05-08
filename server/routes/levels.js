import express from "express";
import pool from "../db/pool.js";
import authMiddleware from "../middleware/auth.js";

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

// GET /api/levels/progress/completed
// Returns all completed levels for the authenticated user
router.get("/progress/completed", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT level_id FROM user_progress WHERE user_id = $1 ORDER BY completed_at ASC`,
      [req.user.sub]
    );
    res.json({ completedLevelIds: result.rows.map(r => r.level_id) });
  } catch (err) {
    console.error("GET /api/levels/progress/completed", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// POST /api/levels/:id/complete
// Mark a level as completed for the authenticated user
router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const levelId = req.params.id;
    
    // Check if level exists
    const levelCheck = await pool.query(
      `SELECT id FROM levels WHERE id = $1`,
      [levelId]
    );
    if (!levelCheck.rows[0]) {
      return res.status(404).json({ error: "Level not found" });
    }

    // Insert or ignore if already completed
    const result = await pool.query(
      `INSERT INTO user_progress (user_id, level_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, level_id) DO NOTHING
       RETURNING level_id, completed_at`,
      [req.user.sub, levelId]
    );

    res.json({ levelId, completed: true });
  } catch (err) {
    console.error("POST /api/levels/:id/complete", err);
    res.status(500).json({ error: "Failed to mark level complete" });
  }
});

export default router;
