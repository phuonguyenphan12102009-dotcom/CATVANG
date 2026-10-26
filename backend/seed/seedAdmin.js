// seed/seedAdmin.js
// Script tạo TÀI KHOẢN ADMIN MẶC ĐỊNH ĐẦU TIÊN cho hệ thống CMS.
// Chạy:  npm run seed:admin
//
// Có thể tuỳ chỉnh username/password qua biến môi trường khi chạy, ví dụ:
//   ADMIN_USERNAME=vlmuseum ADMIN_PASSWORD=MatKhauManh123 npm run seed:admin
//
// ⚠️ Sau khi tạo xong, hãy đăng nhập ở admin.html và đổi mật khẩu / hoặc xoá
// script này khỏi server production để tránh bị chạy lại làm lộ tài khoản mặc định.

require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/khmer_museum";

const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "VinhLong@2026";
const DEFAULT_FULLNAME = process.env.ADMIN_FULLNAME || "Quản trị viên Bảo tàng số";

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Đã kết nối MongoDB");

    const existing = await Admin.findOne({ username: DEFAULT_USERNAME.toLowerCase() });
    if (existing) {
      console.log(`⚠️  Tài khoản "${DEFAULT_USERNAME}" đã tồn tại — bỏ qua tạo mới.`);
      console.log("   Nếu quên mật khẩu, hãy xoá bản ghi này trong DB rồi chạy lại script.");
      return process.exit(0);
    }

    // Không cần tự băm password ở đây — middleware pre("save") trong models/Admin.js
    // sẽ tự động băm bằng bcrypt trước khi lưu vào DB.
    const admin = new Admin({
      username: DEFAULT_USERNAME,
      password: DEFAULT_PASSWORD,
      fullName: DEFAULT_FULLNAME,
      role: "super-admin",
    });

    await admin.save();

    console.log("🌱 Đã tạo tài khoản Admin mặc định thành công!");
    console.log("----------------------------------------------");
    console.log(`   Tên đăng nhập : ${DEFAULT_USERNAME}`);
    console.log(`   Mật khẩu      : ${DEFAULT_PASSWORD}`);
    console.log("----------------------------------------------");
    console.log("👉 Vào admin.html để đăng nhập, sau đó nên đổi mật khẩu ngay.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi tạo tài khoản admin:", err.message);
    process.exit(1);
  }
}

seedAdmin();
