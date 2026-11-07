// routes/uploadRoutes.js
// API cho phép Admin tải ảnh từ máy tính lên Cloudinary.
// Ảnh KHÔNG còn lưu trên đĩa server (Render xóa đĩa mỗi lần restart),
// mà được đẩy lên Cloudinary và trả về URL vĩnh viễn.

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const { protect } = require("../middleware/auth");

// ---------- Cấu hình Cloudinary (đọc từ biến môi trường) ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------- Multer: giữ file trong RAM, không ghi ra đĩa ----------
const storage = multer.memoryStorage();

// Chỉ chấp nhận file ảnh, giới hạn 8MB
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

// ---------- Đẩy buffer ảnh lên Cloudinary ----------
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "khmer-museum", resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * POST /api/upload  🔒 Yêu cầu đăng nhập Admin
 * Nhận 1 file ảnh (field "image"), đẩy lên Cloudinary,
 * trả về URL https vĩnh viễn để lưu vào Motif.imageUrl.
 */
router.post("/upload", protect, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Tải ảnh lên thất bại" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file ảnh" });
    }

    // Báo lỗi rõ ràng nếu quên cấu hình biến môi trường
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("❌ Thiếu biến môi trường CLOUDINARY_*");
      return res.status(500).json({ message: "Server chưa cấu hình Cloudinary" });
    }

    try {
      const result = await uploadToCloudinary(req.file.buffer);
      res.status(201).json({
        message: "Tải ảnh lên thành công",
        url: result.secure_url, // https://res.cloudinary.com/...
        filename: result.public_id,
      });
    } catch (e) {
      console.error("❌ Lỗi upload Cloudinary:", e);
      res.status(500).json({ message: "Không thể tải ảnh lên Cloudinary: " + (e.message || "") });
    }
  });
});

module.exports = router;