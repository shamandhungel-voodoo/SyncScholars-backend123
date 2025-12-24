// server.js - SyncScholars Backend (PRODUCTION SAFE FIXED)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// ✅ MongoDB Atlas FIX
// =======================
const MONGODB_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/syncscholars";

mongoose
  .connect(MONGODB_URI, {
    dbName: "syncscholars", // ✅ FORCE CORRECT DB
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB Connected → syncscholars"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// =======================
// Schemas (UNCHANGED)
// =======================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "default-avatar.png" },
  status: { type: String, default: "offline" },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

// Study Group Schema (UNCHANGED)
const studyGroupSchema = new mongoose.Schema({
  name: String,
  description: String,
  subject: String,
  code: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  maxMembers: Number,
  isPrivate: Boolean,
  members: Array,
  timer: Object,
  tasks: Array,
  messages: Array,
  resources: Array,
  settings: Object,
  stats: Object,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

studyGroupSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const StudyGroup = mongoose.model("StudyGroup", studyGroupSchema);

// =======================
// Routes (UNCHANGED)
// =======================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SyncScholars Backend API",
    status: "running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// =======================
// Socket.IO (UNCHANGED)
// =======================
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join-group", (groupId) => {
    socket.join(groupId);
    socket.to(groupId).emit("user-joined", socket.id);
  });

  socket.on("timer-start", (data) => {
    io.to(data.groupId).emit("timer-started", data);
  });

  socket.on("send-message", (data) => {
    io.to(data.groupId).emit("new-message", data);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: err.message });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// =======================
// Start Server (Render-ready)
// =======================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 SyncScholars Backend running on port ${PORT}`);
});

module.exports = { app, server, io };
