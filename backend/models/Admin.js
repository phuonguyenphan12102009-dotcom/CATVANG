// models/Admin.js
// Schema Mongoose cho tài khoản Quản trị viên (Admin) của hệ thống CMS
// Mật khẩu KHÔNG BAO GIỜ lưu dạng plaintext — luôn được băm bằng bcrypt trước khi lưu.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Tên đăng nhập là bắt buộc"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },
    password: {
      type: String,
      required: [true, "Mật khẩu là bắt buộc"],
      minlength: 6,
      select: false, // mặc định không trả về password khi query, trừ khi .select('+password')
    },
    fullName: {
      type: String,
      trim: true,
      default: "Quản trị viên",
    },
    role: {
      type: String,
      enum: ["admin", "super-admin"],
      default: "admin",
    },
  },
  { timestamps: true }
);

// Middleware: tự động băm mật khẩu bằng bcrypt trước khi lưu (khi tạo mới hoặc đổi mật khẩu)
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method instance: so sánh mật khẩu người dùng nhập với mật khẩu đã băm trong DB
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
