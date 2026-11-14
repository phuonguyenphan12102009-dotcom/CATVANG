// models/Submission.js
// Bài đóng góp từ cộng đồng (ảnh + thông tin) — nằm ở trạng thái "pending"
// cho đến khi Admin duyệt. Khi duyệt, dữ liệu được chuyển thành một Motif công khai.

const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Vui lòng nhập tiêu đề"], trim: true, maxlength: 150 },
    description: { type: String, required: [true, "Vui lòng nhập mô tả"], trim: true, maxlength: 4000 },
    category: {
      type: String,
      required: true,
      enum: ["Tượng", "Phù điêu", "Hoa văn", "Hội họa", "Chùa"],
      default: "Hoa văn",
    },
    templeName: { type: String, trim: true, maxlength: 150, default: "" },
    templeAddress: { type: String, trim: true, maxlength: 300, default: "" },

    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, default: "" }, // để xoá ảnh trên Cloudinary khi từ chối

    // Thông tin người gửi
    submitterName: { type: String, trim: true, maxlength: 100, default: "" },
    submitterContact: { type: String, trim: true, maxlength: 150, default: "" }, // email/SĐT — KHÔNG hiển thị công khai
    showName: { type: Boolean, default: false }, // người gửi đồng ý ghi tên khi đăng

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    rejectReason: { type: String, trim: true, maxlength: 500, default: "" },
    reviewedBy: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    motifId: { type: mongoose.Schema.Types.ObjectId, ref: "Motif", default: null }, // Motif được tạo khi duyệt
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
