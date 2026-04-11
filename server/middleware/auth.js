import jwt from "jsonwebtoken";

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("auth middleware: JWT_SECRET is not set");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    /** Decoded access token: sub, username, email, iat, exp */
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export default authMiddleware;
