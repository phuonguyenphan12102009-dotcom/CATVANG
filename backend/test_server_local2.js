const express = require("express");
const cors = require("cors");
const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
}));
app.use(express.json({ limit: "2mb" }));
const motifRoutes = require("./routes/motifRoutes");
const authRoutes = require("./routes/authRoutes");
app.use("/api", authRoutes);
app.use("/api", motifRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", (req, res) => res.status(404).json({ message: "Không tìm thấy endpoint API này" }));
app.use((err, req, res, next) => res.status(500).json({ message: "Đã xảy ra lỗi máy chủ", error: err.message }));
app.listen(4322, () => console.log("up"));
