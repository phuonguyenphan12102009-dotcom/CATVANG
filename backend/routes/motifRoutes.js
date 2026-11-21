// routes/motifRoutes.js
// Định nghĩa các API RESTful cho tài nguyên "Motif" (hoa văn / chi tiết tạo hình)
// - GET: công khai, ai cũng xem được (dùng cho index.html)
// - POST / PUT / DELETE: yêu cầu middleware `protect` — chỉ Admin có JWT hợp lệ

const express = require("express");
const router = express.Router();
const Motif = require("../models/Motif");
const { protect } = require("../middleware/auth");
const { templeKey } = require("../utils/text");

/**
 * GET /api/motifs
 * Lấy danh sách toàn bộ hoa văn để render Bản đồ tương tác + Thư viện di sản.
 * Hỗ trợ lọc theo danh mục qua query string: /api/motifs?category=Tượng
 */
router.get("/motifs", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const motifs = await Motif.find(filter).sort({ createdAt: -1 });
    res.status(200).json(motifs);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách hoa văn", error: err.message });
  }
});

/**
 * GET /api/motifs/:id
 * Lấy chi tiết một hoa văn theo id.
 */
router.get("/motifs/:id", async (req, res) => {
  try {
    const motif = await Motif.findById(req.params.id);
    if (!motif) return res.status(404).json({ message: "Không tìm thấy hoa văn này" });
    res.status(200).json(motif);
  } catch (err) {
    res.status(400).json({ message: "ID không hợp lệ", error: err.message });
  }
});

/**
 * POST /api/motifs  🔒 Yêu cầu đăng nhập Admin
 * Thêm mới một hoa văn / chi tiết tạo hình vào cơ sở dữ liệu.
 */
router.post("/motifs", protect, async (req, res) => {
  try {
    const {
      title,
      description,
      sections,
      category,
      imageUrl,
      hotspotCoordinates,
      geoLocation,
      templeName,
      templeAddress,
    } = req.body;

    const newMotif = new Motif({
      title,
      description,
      sections,
      category,
      imageUrl,
      hotspotCoordinates,
      geoLocation,
      templeName,
      templeAddress,
    });

    const saved = await newMotif.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Không thể thêm hoa văn mới", error: err.message });
  }
});

/**
 * PUT /api/motifs/:id  🔒 Yêu cầu đăng nhập Admin
 * Cập nhật thông tin một hoa văn.
 */
router.put("/motifs/:id", protect, async (req, res) => {
  try {
    const updated = await Motif.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Không tìm thấy hoa văn này" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: "Không thể cập nhật hoa văn", error: err.message });
  }
});

/**
 * DELETE /api/motifs/:id  🔒 Yêu cầu đăng nhập Admin
 * Xoá một hoa văn khỏi cơ sở dữ liệu.
 */
router.delete("/motifs/:id", protect, async (req, res) => {
  try {
    const deleted = await Motif.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy hoa văn này" });
    res.status(200).json({ message: "Đã xoá thành công" });
  } catch (err) {
    res.status(400).json({ message: "Không thể xoá hoa văn", error: err.message });
  }
});

/**
 * GET /api/stats  🔒 Yêu cầu đăng nhập Admin
 * Thống kê nhanh cho Dashboard admin: tổng số hoa văn, số ngôi chùa,
 * số lượng theo từng danh mục.
 */
router.get("/stats", protect, async (req, res) => {
  try {
    const totalMotifs = await Motif.countDocuments();
    const byCategory = await Motif.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const templeNames = await Motif.distinct("templeName");
    // Gộp các cách viết khác nhau của cùng một tên chùa (hoa/thường, dấu, khoảng trắng)
    const totalTemples = new Set(templeNames.map(templeKey).filter(Boolean)).size;

    res.status(200).json({ totalMotifs, totalTemples, byCategory });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy thống kê", error: err.message });
  }
});

module.exports = router;
