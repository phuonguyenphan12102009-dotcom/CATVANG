// middleware/rateLimit.js
// Giới hạn số request theo IP, lưu trong RAM (không cần cài thêm thư viện).
// Phù hợp 1 instance Render. Nếu sau này chạy nhiều instance, đổi sang express-rate-limit + Redis.

function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Dọn bộ nhớ định kỳ
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
  }, Math.max(windowMs, 60_000)).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || h.resetAt <= now) {
      h = { count: 0, resetAt: now + windowMs };
      hits.set(ip, h);
    }
    h.count += 1;
    if (h.count > max) {
      res.set("Retry-After", String(Math.ceil((h.resetAt - now) / 1000)));
      return res.status(429).json({ message: message || "Bạn thao tác quá nhanh, vui lòng thử lại sau." });
    }
    next();
  };
}

module.exports = rateLimit;
