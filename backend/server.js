require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const motifRoutes = require("./routes/motifRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const newsRoutes = require("./routes/newsRoutes");
const rateLimit = require("./middleware/rateLimit");

const app = express();
app.set("trust proxy", 1); 
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/khmer_museum";

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: domain "${origin}" không được phép gọi API này`));
    },
  })
);
app.use(express.json({ limit: "2mb" })); 
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB thành công"))
  .catch((err) => {
    console.error("❌ Kết nối MongoDB thất bại:", err.message);
    process.exit(1);
  });

app.use("/api/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút." }));
app.use("/api", authRoutes); 
app.use("/api", motifRoutes); 
app.use("/api", uploadRoutes); 
app.use("/api", submissionRoutes); 
app.use("/api", newsRoutes); 

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server đang chạy bình thường" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Không tìm thấy endpoint API này" });
});

app.use((err, req, res, next) => {
  console.error("🔥 Lỗi không mong muốn:", err);
  res.status(500).json({ message: "Đã xảy ra lỗi máy chủ", error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
