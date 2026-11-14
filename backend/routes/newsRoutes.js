// routes/newsRoutes.js
// GET /api/news?q=chùa Khmer Vĩnh Long&period=30d
// Tìm bài báo liên quan trên Internet qua Google News RSS (công khai, không cần API key).
// Backend làm trung gian để: (1) tránh lỗi CORS ở trình duyệt, (2) cache kết quả, (3) giới hạn tốc độ.

const express = require("express");
const router = express.Router();
const rateLimit = require("../middleware/rateLimit");
const { parseGoogleNewsRss } = require("../utils/rss");

const DEFAULT_QUERY = "chùa Khmer Vĩnh Long";
const PERIODS = { "7d": "when:7d", "30d": "when:30d", "1y": "when:1y", any: "" };
const CACHE_TTL = 10 * 60 * 1000; // 10 phút
const cache = new Map(); // key -> { at, items }

const newsLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: "Bạn tìm kiếm quá nhanh, vui lòng đợi một chút." });

router.get("/news", newsLimiter, async (req, res) => {
  const q = String(req.query.q || DEFAULT_QUERY).replace(/\s+/g, " ").trim().slice(0, 100);
  if (q.length < 2) return res.status(400).json({ message: "Từ khoá quá ngắn." });
  const period = PERIODS[req.query.period] !== undefined ? req.query.period : "any";

  const key = `${q.toLowerCase()}|${period}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return res.json({ query: q, period, cached: true, items: hit.items });
  }

  const search = [q, PERIODS[period]].filter(Boolean).join(" ");
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=vi&gl=VN&ceid=VN:vi`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; KhmerMuseumBot/1.0)" } });
    if (!r.ok) throw new Error(`Nguồn tin trả về mã ${r.status}`);
    const items = parseGoogleNewsRss(await r.text(), 12);

    cache.set(key, { at: Date.now(), items });
    if (cache.size > 200) cache.delete(cache.keys().next().value); // giữ cache nhỏ

    res.json({ query: q, period, cached: false, items });
  } catch (e) {
    // Có cache cũ thì trả tạm còn hơn báo lỗi
    if (hit) return res.json({ query: q, period, cached: true, stale: true, items: hit.items });
    const msg = e.name === "AbortError" ? "Nguồn tin phản hồi quá lâu." : "Không lấy được tin tức lúc này.";
    res.status(502).json({ message: msg });
  } finally {
    clearTimeout(timer);
  }
});

module.exports = router;
