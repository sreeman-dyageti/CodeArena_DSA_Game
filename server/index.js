import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import battleRoutes from "./routes/battle.js";
import leaderboardRoutes from "./routes/leaderboard.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || true,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/battles", battleRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, () => {
  console.log(`HTTP + Socket.IO listening on port ${PORT}`);
});
