import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";

const router = express.Router();
const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username or email already registered" });
    }
    console.error("register", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash, created_at
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password_hash: _, ...publicUser } = user;
    const token = signToken(publicUser);
    return res.json({ user: publicUser, token });
  } catch (err) {
    console.error("login", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;
