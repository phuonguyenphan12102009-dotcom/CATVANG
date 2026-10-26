// routes/authRoutes.js
// API xác thực dành cho Admin: đăng nhập (JWT), đổi mật khẩu, lấy thông tin bản thân.

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const Admin = require("../models/Admin");
const { protect, JWT_SECRET } = require("../middleware/auth");

/**
 * POST /api/login
 * Body: { "username": "admin", "password": "..." }
 * Kiểm tra tài khoản trong DB, so sánh mật khẩu bằng bcrypt,
 * nếu đúng -> ký (sign) một JWT có hạn 8 giờ và trả về cho client.
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." });
    }

    // .select('+password') vì trong schema đã đặt select:false cho field password
    const admin = await Admin.findOne({ username: username.toLowerCase().trim() }).select("+password");

    if (!admin) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi đăng nhập", error: err.message });
  }
});

/**
 * GET /api/me
 * Trả về thông tin admin hiện tại dựa trên token — dùng để admin.js
 * kiểm tra phiên đăng nhập còn hiệu lực khi tải lại trang admin.html.
 */
router.get("/me", protect, async (req, res) => {
  const admin = await Admin.findById(req.admin.id);
  if (!admin) return res.status(404).json({ message: "Không tìm thấy tài khoản." });
  res.status(200).json({
    id: admin._id,
    username: admin.username,
    fullName: admin.fullName,
    role: admin.role,
  });
});

module.exports = router;
