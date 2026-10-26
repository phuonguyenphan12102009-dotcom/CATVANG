// middleware/auth.js
// Middleware xác thực JWT — chỉ Admin có token hợp lệ mới được đi tiếp vào route
// được bảo vệ (POST / PUT / DELETE các API quản trị nội dung).

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "khmer_museum_dev_secret_change_me";

/**
 * protect
 * Đọc token từ header "Authorization: Bearer <token>",
 * xác minh chữ ký + hạn dùng, rồi gắn thông tin admin (id, username, role)
 * vào req.admin để các route phía sau sử dụng.
 */
function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Không có quyền truy cập — thiếu token xác thực (Bearer token).",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token không hợp lệ." });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    // decoded = { id, username, role, iat, exp }
    req.admin = decoded;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." });
    }
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã bị chỉnh sửa." });
  }
}

/**
 * requireSuperAdmin (tuỳ chọn mở rộng)
 * Ví dụ middleware phân quyền nâng cao — chỉ super-admin mới được thực hiện
 * các thao tác nhạy cảm (VD: tạo thêm tài khoản admin khác).
 */
function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== "super-admin") {
    return res.status(403).json({ message: "Chỉ Super Admin mới có quyền thực hiện thao tác này." });
  }
  next();
}

module.exports = { protect, requireSuperAdmin, JWT_SECRET };
