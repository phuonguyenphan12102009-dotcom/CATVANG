// routes/uploadRoutes.js
// API cho phép Admin tải ảnh trực tiếp từ máy tính lên server (thay vì phải dán URL ảnh có sẵn).
// Ảnh được lưu vào thư mục backend/uploads/ và phục vụ tĩnh qua /uploads/<tên file>
// (xem app.use("/uploads", ...) trong server.js).

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/auth");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Cấu hình nơi lưu + tên file ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

// ---------- Chỉ chấp nhận file ảnh, giới hạn 8MB ----------
function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, webp, gif)"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/**
 * POST /api/upload  🔒 Yêu cầu đăng nhập Admin
 * Nhận 1 file ảnh (field "image"), lưu vào backend/uploads/,
 * trả về URL tuyệt đối để lưu thẳng vào Motif.imageUrl.
 */
router.post("/upload", protect, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải ảnh lên thất bại" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file ảnh" });
    }

    // Xây URL tuyệt đối dựa trên host thật của request, hoạt động đúng cả khi
    // chạy local (http://localhost:5001) lẫn khi đã deploy (Render...).
    const fullUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.status(201).json({
      message: "Tải ảnh lên thành công",
      url: fullUrl,
      filename: req.file.filename,
    });
  });
});

module.exports = router;
