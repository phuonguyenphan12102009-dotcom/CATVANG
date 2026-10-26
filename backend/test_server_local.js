const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const motifRoutes = require("./routes/motifRoutes");
const authRoutes = require("./routes/authRoutes");

// stub mongoose/model calls so we don't need a real DB - just testing ROUTE MATCHING
app.use("/api", authRoutes);
app.use("/api", motifRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server đang chạy bình thường" });
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Không tìm thấy endpoint API này" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: "Đã xảy ra lỗi máy chủ", error: err.message });
});

app.listen(4321, () => console.log("test server up"));
