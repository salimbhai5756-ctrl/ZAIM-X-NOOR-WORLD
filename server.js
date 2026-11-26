const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"]
});
app.get("/", (_req, res) => res.send("ZAIM ❤️ JANNAWWH game server is online."));
const rooms = new Map();
io.on("connection", socket => {
  socket.on("join-room", ({ room }) => {
    if (typeof room !== "string" || !/^[A-Z0-9]{4,8}$/.test(room)) {
      socket.emit("room-error", { message: "Invalid room code." }); return;
    }
    const members = rooms.get(room) || new Set();
    if (members.size >= 2 && !members.has(socket.id)) {
      socket.emit("room-error", { message: "Room is full (2 players maximum)." }); return;
    }
    if (socket.data.room) socket.leave(socket.data.room);
    members.add(socket.id); rooms.set(room, members);
    socket.data.room = room; socket.join(room);
    socket.emit("room-joined", { room, players: members.size });
    socket.to(room).emit("peer-joined", { players: members.size });
  });
  socket.on("player-state", state => {
    const room = socket.data.room;
    if (!room || !state || state.room !== room) return;
    const clean = {
      x: clamp(state.x), y: clamp(state.y), z: clamp(state.z),
      ry: clamp(state.ry), driving: !!state.driving,
      cx: clamp(state.cx), cy: clamp(state.cy), cz: clamp(state.cz)
    };
    socket.to(room).emit("peer-state", clean);
  });
  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) {
      const members = rooms.get(room);
      if (members) { members.delete(socket.id); if (!members.size) rooms.delete(room); }
      socket.to(room).emit("peer-left");
    }
  });
});
function clamp(v) { v = Number(v); return Number.isFinite(v) ? Math.max(-130, Math.min(130, v)) : 0; }
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Game server listening on " + PORT));
