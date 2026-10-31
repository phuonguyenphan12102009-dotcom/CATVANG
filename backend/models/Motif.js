// models/Motif.js
// Schema Mongoose cho một "hoa văn / chi tiết tạo hình" trong kiến trúc chùa Khmer

const mongoose = require("mongoose");

const motifSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tên hoa văn / chi tiết tạo hình là bắt buộc"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Mô tả ý nghĩa văn hóa là bắt buộc"],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Tượng", "Phù điêu", "Hoa văn", "Hội họa", "Chùa"],
      default: "Hoa văn",
    },
    imageUrl: {
      type: String,
      required: [true, "Cần có ảnh chi tiết tạo hình"],
    },
    // Toạ độ điểm chạm (hotspot) trên ảnh tổng quan kiến trúc,
    // tính theo phần trăm (%) chiều rộng/chiều cao để responsive mọi màn hình.
    hotspotCoordinates: {
      x: { type: Number, min: 0, max: 100, default: 50 },
      y: { type: Number, min: 0, max: 100, default: 50 },
    },
    // Toạ độ GPS thật (nếu có) của ngôi chùa nơi hoa văn được khảo sát,
    // dùng để hiển thị trên bản đồ địa lý thật (Leaflet/OpenStreetMap).
    geoLocation: {
      lat: { type: Number, min: -90, max: 90, default: null },
      lng: { type: Number, min: -180, max: 180, default: null },
    },
    // Địa điểm khảo sát thực tế (tên chùa), phục vụ thống kê báo cáo
    templeName: {
      type: String,
      trim: true,
      default: "",
    },
    templeAddress: {
      type: String,
      trim: true,
      default: "",
    },
    // Đếm số lượt quét mã QR tại thực địa — phục vụ số liệu truyền thông
    qrScans: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // tự động thêm createdAt, updatedAt
  }
);

motifSchema.index({ category: 1 });
motifSchema.index({ templeName: 1 });

module.exports = mongoose.model("Motif", motifSchema);
