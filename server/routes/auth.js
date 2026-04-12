import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";

const router = express.Router();
const SALT_ROUNDS = 10;

/** @type {string[]} Phase 2: persist refresh tokens */
const storedRefreshTokens = [];

function rememberRefreshToken(token) {
  storedRefreshTokens.push(token);
}

function isStoredRefreshToken(token) {
  return storedRefreshTokens.includes(token);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateRegisterBody(body) {
  const { username, email, password } = body || {};
  if (!isNonEmptyString(username)) {
    return "username is required";
  }
  if (username.trim().length > 255) {
    return "username must be at most 255 characters";
  }
  if (!isNonEmptyString(email)) {
    return "email is required";
  }
  if (!validateEmailFormat(email)) {
    return "invalid email format";
  }
  if (!isNonEmptyString(password) || password.length < 6) {
    return "password must be at least 6 characters";
  }
  return null;
}

function validateLoginBody(body) {
  const { email, password } = body || {};
  if (!isNonEmptyString(email)) {
    return "email is required";
  }
  if (!validateEmailFormat(email)) {
    return "invalid email format";
  }
  if (!isNonEmptyString(password)) {
    return "password is required";
  }
  return null;
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, typ: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUserShape(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    credits: row.credits,
    elo: row.elo,
  };
}

function issueTokenPair(user) {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set");
  }
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.id);
  rememberRefreshToken(refreshToken);
  return { accessToken, refreshToken };
}

router.post("/register", async (req, res) => {
  const errMsg = validateRegisterBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: errMsg });
  }

  const { username, email, password } = req.body;

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, credits, elo`,
      [username.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const row = result.rows[0];
    let tokens;
    try {
      tokens = issueTokenPair(row);
    } catch (e) {
      console.error("register tokens", e);
      return res.status(500).json({ error: "Server misconfigured" });
    }
    const { accessToken, refreshToken } = tokens;
    return res.status(201).json({
      accessToken,
      refreshToken,
      user: publicUserShape(row),
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username or email already registered" });
    }
    console.error("register", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const errMsg = validateLoginBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: errMsg });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash, credits, elo
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password_hash: _, ...user } = row;
    let tokens;
    try {
      tokens = issueTokenPair(user);
    } catch (e) {
      console.error("login tokens", e);
      return res.status(500).json({ error: "Server misconfigured" });
    }
    const { accessToken, refreshToken } = tokens;
    return res.json({
      accessToken,
      refreshToken,
      user: publicUserShape(user),
    });
  } catch (err) {
    console.error("login", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    console.error("refresh: JWT_REFRESH_SECRET is not set");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  if (!isStoredRefreshToken(refreshToken)) {
    return res.status(401).json({ error: "Invalid or revoked refresh token" });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  if (payload.typ !== "refresh") {
    return res.status(401).json({ error: "Invalid token type" });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, credits, elo FROM users WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (err) {
    console.error("refresh", err);
    return res.status(500).json({ error: "Token refresh failed" });
  }
});

export default router;
