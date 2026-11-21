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
    // Nội dung chi tiết chia thành nhiều đoạn (mỗi đoạn có tiêu đề nhỏ + nội dung).
    // Không bắt buộc: bản ghi cũ chỉ có `description` vẫn hiển thị bình thường.
    sections: [
      {
        _id: false,
        heading: { type: String, trim: true, maxlength: 120, default: "" },
        body: { type: String, trim: true, maxlength: 4000, default: "" },
      },
    ],
    imageUrl: {
      type: String,
      required: [true, "Cần có ảnh chi tiết tạo hình"],
    },
    // Người đóng góp (chỉ có khi bài đến từ cộng đồng và người gửi đồng ý ghi tên)
    contributor: { type: String, trim: true, maxlength: 100, default: "" },
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
  },
  {
    timestamps: true, // tự động thêm createdAt, updatedAt
  }
);

motifSchema.index({ category: 1 });
motifSchema.index({ templeName: 1 });

module.exports = mongoose.model("Motif", motifSchema);
