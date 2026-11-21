// models/Temple.js
// Thông tin riêng của từng ngôi chùa (hiện trong cửa sổ khi bấm vào điểm trên bản đồ).
// Ghép với hoa văn qua tên chùa (Motif.templeName) đã chuẩn hóa -> nameKey.

const mongoose = require("mongoose");

const templeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Thiếu tên chùa"], trim: true, maxlength: 150 },
    nameKey: { type: String, required: true, unique: true, index: true },
    foundedYear: { type: String, trim: true, maxlength: 60, default: "" }, // VD: "1800" hoặc "Thế kỷ 19"
    abbot: { type: String, trim: true, maxlength: 100, default: "" }, // Sư trụ trì
    openingHours: { type: String, trim: true, maxlength: 150, default: "" }, // VD: "5:00 – 20:00 hằng ngày"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Temple", templeSchema);
