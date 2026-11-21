// routes/templeRoutes.js
//   GET /api/temples   (công khai) — danh sách thông tin chùa, dùng cho popup bản đồ
//   PUT /api/temples   🔒 Admin   — thêm/sửa thông tin một ngôi chùa (theo tên chùa).
//                                    Để trống cả 3 ô thông tin = xoá bản ghi của chùa đó.

const express = require("express");
const router = express.Router();
const Temple = require("../models/Temple");
const { protect } = require("../middleware/auth");
const { templeKey } = require("../utils/text");

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

router.get("/temples", async (req, res) => {
  try {
    const temples = await Temple.find().sort({ name: 1 }).select("name nameKey foundedYear abbot openingHours");
    res.json(temples);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin chùa", error: err.message });
  }
});

router.put("/temples", protect, async (req, res) => {
  try {
    const name = clean(req.body?.name, 150);
    const nameKey = templeKey(name);
    if (!nameKey) return res.status(400).json({ message: "Thiếu tên chùa" });

    const info = {
      foundedYear: clean(req.body.foundedYear, 60),
      abbot: clean(req.body.abbot, 100),
      openingHours: clean(req.body.openingHours, 150),
    };

    if (!info.foundedYear && !info.abbot && !info.openingHours) {
      await Temple.deleteOne({ nameKey });
      return res.json({ message: "Đã xoá thông tin chùa", deleted: true });
    }

    const temple = await Temple.findOneAndUpdate(
      { nameKey },
      { $set: { name, ...info } }, // nameKey tự được gán từ điều kiện lọc khi tạo mới (upsert)
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ message: "Đã lưu thông tin chùa", temple });
  } catch (err) {
    res.status(400).json({ message: "Không thể lưu thông tin chùa", error: err.message });
  }
});

module.exports = router;
