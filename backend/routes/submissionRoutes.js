// routes/submissionRoutes.js
// Đóng góp từ cộng đồng:
//   POST   /api/submissions                 (công khai, có giới hạn tốc độ) — gửi ảnh + thông tin, trạng thái "pending"
//   GET    /api/submissions?status=pending   🔒 Admin xem danh sách
//   GET    /api/submissions/summary          🔒 Admin xem số lượng theo trạng thái (hiện huy hiệu "chờ duyệt")
//   POST   /api/submissions/:id/approve      🔒 Duyệt — tạo Motif công khai (Admin có thể sửa nội dung trước khi đăng)
//   POST   /api/submissions/:id/reject       🔒 Từ chối (kèm lý do), xoá ảnh khỏi Cloudinary
//   DELETE /api/submissions/:id              🔒 Xoá hẳn

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Submission = require("../models/Submission");
const Motif = require("../models/Motif");
const { protect } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");
const { makeUploader, looksLikeImage, uploadBuffer, destroyImage, cloudinaryConfigured } = require("../utils/imageUpload");

const CATEGORIES = ["Tượng", "Phù điêu", "Hoa văn", "Hội họa", "Chùa"];
const upload = makeUploader(5 * 1024 * 1024); // ảnh công khai: tối đa 5MB

// Mỗi IP tối đa 10 lượt gửi / giờ (tính cả lượt gửi lỗi)
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Bạn đã gửi quá nhiều bài trong 1 giờ. Vui lòng quay lại sau.",
});

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

// ---------- Công khai: gửi bài ----------
router.post("/submissions", submitLimiter, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "Ảnh quá lớn (tối đa 5MB)" : err.message || "Tải ảnh thất bại";
      return res.status(400).json({ message: msg });
    }

    // Ô bẫy (honeypot): người thật không thấy ô này nên sẽ để trống; bot thường điền -> bỏ qua âm thầm
    if (req.body.website) return res.status(201).json({ message: "Đã nhận đóng góp của bạn." });

    if (req.body.consent !== "true") {
      return res.status(400).json({ message: "Vui lòng tích đồng ý cho phép đăng tải tư liệu." });
    }
    if (!req.file) return res.status(400).json({ message: "Vui lòng chọn một ảnh để gửi." });
    if (!looksLikeImage(req.file.buffer)) {
      return res.status(400).json({ message: "File không phải ảnh hợp lệ." });
    }

    const title = clean(req.body.title, 150);
    const description = clean(req.body.description, 4000);
    if (!title || !description) {
      return res.status(400).json({ message: "Vui lòng nhập tiêu đề và mô tả." });
    }
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : "Hoa văn";

    if (!cloudinaryConfigured()) {
      console.error("❌ Thiếu biến môi trường CLOUDINARY_*");
      return res.status(500).json({ message: "Máy chủ chưa cấu hình lưu ảnh." });
    }

    let uploaded;
    try {
      uploaded = await uploadBuffer(req.file.buffer, "khmer-museum/pending");
    } catch (e) {
      console.error("❌ Lỗi upload Cloudinary:", e);
      return res.status(500).json({ message: "Không thể tải ảnh lên, vui lòng thử lại." });
    }

    try {
      await Submission.create({
        title,
        description,
        category,
        templeName: clean(req.body.templeName, 150),
        templeAddress: clean(req.body.templeAddress, 300),
        imageUrl: uploaded.secure_url,
        imagePublicId: uploaded.public_id,
        submitterName: clean(req.body.submitterName, 100),
        submitterContact: clean(req.body.submitterContact, 150),
        showName: req.body.showName === "true",
      });
      res.status(201).json({ message: "Cảm ơn bạn! Đóng góp sẽ hiển thị sau khi quản trị viên duyệt." });
    } catch (e) {
      await destroyImage(uploaded.public_id); // không để ảnh mồ côi
      res.status(400).json({ message: "Không thể lưu đóng góp", error: e.message });
    }
  });
});

// ---------- Admin ----------
router.get("/submissions/summary", protect, async (req, res) => {
  try {
    const rows = await Submission.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const out = { pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => (out[r._id] = r.count));
    res.json(out);
  } catch (e) {
    res.status(500).json({ message: "Lỗi khi thống kê đóng góp", error: e.message });
  }
});

router.get("/submissions", protect, async (req, res) => {
  try {
    const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
    const items = await Submission.find({ status }).sort({ createdAt: status === "pending" ? 1 : -1 }).limit(200);
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đóng góp", error: e.message });
  }
});

router.post("/submissions/:id/approve", protect, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID không hợp lệ" });

  try {
    const sub = await Submission.findById(id);
    if (!sub) return res.status(404).json({ message: "Không tìm thấy đóng góp này" });
    if (sub.status !== "pending") return res.status(409).json({ message: "Đóng góp này đã được xử lý rồi." });

    // Admin có thể chỉnh nội dung trước khi đăng; trường nào không gửi lên thì lấy từ bài gốc
    const b = req.body || {};
    const motif = new Motif({
      title: b.title || sub.title,
      description: b.description || sub.description,
      sections: Array.isArray(b.sections) ? b.sections : [],
      category: CATEGORIES.includes(b.category) ? b.category : sub.category,
      imageUrl: sub.imageUrl,
      templeName: b.templeName ?? sub.templeName,
      templeAddress: b.templeAddress ?? sub.templeAddress,
      hotspotCoordinates: b.hotspotCoordinates,
      geoLocation: b.geoLocation,
      contributor: sub.showName ? sub.submitterName : "",
    });
    await motif.save();

    // Chốt trạng thái có điều kiện: nếu có admin khác vừa xử lý bài này thì huỷ Motif vừa tạo
    const claimed = await Submission.findOneAndUpdate(
      { _id: id, status: "pending" },
      { status: "approved", reviewedBy: req.admin.username, reviewedAt: new Date(), motifId: motif._id },
      { new: true }
    );
    if (!claimed) {
      await Motif.findByIdAndDelete(motif._id);
      return res.status(409).json({ message: "Đóng góp này vừa được xử lý bởi người khác." });
    }

    res.status(201).json({ message: "Đã duyệt và đăng tải", motif });
  } catch (e) {
    res.status(400).json({ message: "Không thể duyệt đóng góp", error: e.message });
  }
});

router.post("/submissions/:id/reject", protect, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID không hợp lệ" });

  try {
    const sub = await Submission.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        status: "rejected",
        rejectReason: clean(req.body?.reason, 500),
        reviewedBy: req.admin.username,
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!sub) return res.status(409).json({ message: "Không tìm thấy bài chờ duyệt này (có thể đã được xử lý)." });

    await destroyImage(sub.imagePublicId);
    res.json({ message: "Đã từ chối đóng góp" });
  } catch (e) {
    res.status(400).json({ message: "Không thể từ chối đóng góp", error: e.message });
  }
});

router.delete("/submissions/:id", protect, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "ID không hợp lệ" });
  try {
    const sub = await Submission.findByIdAndDelete(id);
    if (!sub) return res.status(404).json({ message: "Không tìm thấy đóng góp này" });
    // Bài đã duyệt: ảnh đang được Motif dùng -> giữ lại. Còn lại thì xoá ảnh.
    if (sub.status !== "approved") await destroyImage(sub.imagePublicId);
    res.json({ message: "Đã xoá" });
  } catch (e) {
    res.status(400).json({ message: "Không thể xoá", error: e.message });
  }
});

module.exports = router;
