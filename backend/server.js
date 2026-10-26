// server.js
// Khởi tạo Express server, kết nối MongoDB (Mongoose), gắn các Routes API
// cho dự án "Bảo tàng số kiến trúc chùa Khmer" (Vĩnh Long)

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const motifRoutes = require("./routes/motifRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const PORT = process.env.PORT || 5002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/khmer_museum";

// ---------- Middleware ----------
// CORS: chỉ cho phép các domain frontend liệt kê trong FRONTEND_URL (phân tách bằng dấu phẩy).
// Nếu chưa đặt biến này (VD lúc chạy local), cho phép tất cả để dễ phát triển.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // origin rỗng = request không qua trình duyệt (Postman, curl...) -> luôn cho phép
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: domain "${origin}" không được phép gọi API này`));
    },
  })
);
app.use(express.json({ limit: "2mb" })); // parse JSON body cho POST/PUT

// ---------- Phục vụ tĩnh ảnh admin đã upload từ máy tính ----------
// Ảnh lưu tại backend/uploads/, truy cập qua http://<host>/uploads/<tên file>
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- Kết nối MongoDB ----------
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB thành công"))
  .catch((err) => {
    console.error("❌ Kết nối MongoDB thất bại:", err.message);
    process.exit(1);
  });

// ---------- Routes API ----------
app.use("/api", authRoutes); // POST /api/login, GET /api/me
app.use("/api", motifRoutes); // GET/POST/PUT/DELETE /api/motifs, GET /api/scan/:id, GET /api/stats
app.use("/api", uploadRoutes); // POST /api/upload — Admin tải ảnh từ máy tính lên server

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server đang chạy bình thường" });
});

// ---------- (Tuỳ chọn) Phục vụ luôn frontend tĩnh từ cùng server ----------
// Bỏ comment 2 dòng dưới nếu muốn chạy chung 1 cổng thay vì mở index.html riêng bằng Live Server.
// app.use(express.static(path.join(__dirname, "..", "frontend")));
// app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(__dirname, "..", "frontend", "index.html")));

// ---------- Xử lý lỗi 404 cho các route API không tồn tại ----------
app.use("/api", (req, res) => {
  res.status(404).json({ message: "Không tìm thấy endpoint API này" });
});

// ---------- Middleware xử lý lỗi tập trung ----------
app.use((err, req, res, next) => {
  console.error("🔥 Lỗi không mong muốn:", err);
  res.status(500).json({ message: "Đã xảy ra lỗi máy chủ", error: err.message });
});

// ---------- Khởi động server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
