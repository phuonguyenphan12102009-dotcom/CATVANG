// seed/seedData.js
// Script nạp dữ liệu mẫu vào MongoDB để xem trước giao diện ngay lập tức.
// Chạy: npm run seed
//
// Ghi chú về toạ độ GPS (geoLocation): các giá trị dưới đây là toạ độ tham chiếu
// ở mức trung tâm xã/huyện nơi ngôi chùa toạ lạc (dựa trên địa chỉ hành chính thật),
// dùng để hiển thị lên bản đồ Leaflet/OpenStreetMap trong lúc chờ nhóm khảo sát
// đo GPS chính xác tận nơi bằng điện thoại/máy định vị rồi cập nhật lại qua trang Admin.

require("dotenv").config();
const mongoose = require("mongoose");
const Motif = require("../models/Motif");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/khmer_museum";

const sampleMotifs = [
  {
    title: "Tượng chim thần Krud (Garuda) đỡ mái",
    description:
      "Hình tượng chim thần Krud đỡ các góc mái, biểu trưng cho sức mạnh hộ pháp và tín ngưỡng bảo vệ ngôi chùa khỏi tà khí, xuất phát từ sử thi Ấn Độ giáo được Phật giáo hóa.",
    category: "Tượng",
    imageUrl: "https://images.unsplash.com/photo-1600100397608-a2ab7d123b6f?q=80&w=800&auto=format&fit=crop",
    hotspotCoordinates: { x: 22, y: 28 },
    geoLocation: { lat: 9.9967, lng: 106.1667 },
    templeName: "Chùa Hạnh Phúc Tăng (Sanghamangala)",
    templeAddress: "Ấp Trung Trạch, xã Trung Thành, huyện Vũng Liêm, tỉnh Vĩnh Long",
    qrScans: 0,
  },
  {
    title: "Phù điêu tiên nữ Kemonak trên vách",
    description:
      "Chạm khắc hình tiên nữ nửa người nửa chim, thường xuất hiện ở các mảng tường quanh chánh điện, tượng trưng cho sự thanh khiết và âm nhạc thiêng liêng trong vũ trụ quan Khmer.",
    category: "Phù điêu",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800&auto=format&fit=crop",
    hotspotCoordinates: { x: 52, y: 45 },
    geoLocation: { lat: 9.9967, lng: 106.1667 },
    templeName: "Chùa Hạnh Phúc Tăng (Sanghamangala)",
    templeAddress: "Ấp Trung Trạch, xã Trung Thành, huyện Vũng Liêm, tỉnh Vĩnh Long",
    qrScans: 0,
  },
  {
    title: "Hoa văn ngọn lửa trên diềm mái",
    description:
      "Chuỗi họa tiết hình ngọn lửa lặp lại trên diềm mái, tạo nhịp điệu thị giác đặc trưng, tượng trưng cho ánh sáng trí tuệ trong triết lý Phật giáo Nam tông.",
    category: "Hoa văn",
    imageUrl: "https://images.unsplash.com/photo-1596796930131-c9dab8f4c4c1?q=80&w=800&auto=format&fit=crop",
    hotspotCoordinates: { x: 76, y: 20 },
    geoLocation: { lat: 10.045, lng: 105.9628 },
    templeName: "Chùa Phước Hậu",
    templeAddress: "Ấp Đông Hậu, xã Ngãi Tứ, huyện Tam Bình, tỉnh Vĩnh Long",
    qrScans: 0,
  },
  {
    title: "Rắn thần Naga trên bậc thang",
    description:
      "Hình tượng rắn Naga nhiều đầu uốn lượn dọc bậc thang lối vào chánh điện, biểu trưng cho sự chuyển tiếp từ cõi trần sang cõi thiêng, đồng thời gắn với truyền thuyết bảo hộ nguồn nước.",
    category: "Tượng",
    imageUrl: "https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?q=80&w=800&auto=format&fit=crop",
    hotspotCoordinates: { x: 40, y: 78 },
    geoLocation: { lat: 10.045, lng: 105.9628 },
    templeName: "Chùa Phước Hậu",
    templeAddress: "Ấp Đông Hậu, xã Ngãi Tứ, huyện Tam Bình, tỉnh Vĩnh Long",
    qrScans: 0,
  },
  {
    title: "Bích họa tích Đức Phật đản sinh",
    description:
      "Tranh vẽ màu trên trần và vách trong chánh điện, kể lại các tích truyện tiền thân Đức Phật (Jataka), là hình thức giáo dục Phật pháp trực quan cho tín đồ.",
    category: "Hội họa",
    imageUrl: "https://images.unsplash.com/photo-1590077778375-7c74a9e94e9f?q=80&w=800&auto=format&fit=crop",
    hotspotCoordinates: { x: 60, y: 62 },
    geoLocation: { lat: 9.9967, lng: 106.1667 },
    templeName: "Chùa Hạnh Phúc Tăng (Sanghamangala)",
    templeAddress: "Ấp Trung Trạch, xã Trung Thành, huyện Vũng Liêm, tỉnh Vĩnh Long",
    qrScans: 0,
  },
  {
    title: "Phù điêu hoa sen bệ thờ",
    description:
      "Cánh sen cách điệu bao quanh bệ thờ, biểu tượng cho sự thanh tịnh và giác ngộ — một trong những mô-típ phổ biến nhất trong trang trí Phật giáo Khmer Nam Bộ.",
    category: "Phù điêu",
    imageUrl: "https://images.unsplash.com/photo-1609619385076-36a873425636?q=80&w=800&auto=format&fit=crop",
    hotspotCoordinates: { x: 85, y: 55 },
    geoLocation: { lat: 10.2536, lng: 105.9722 },
    templeName: "Chùa Khmer nội ô TP. Vĩnh Long",
    templeAddress: "Phường 4, TP. Vĩnh Long, tỉnh Vĩnh Long",
    qrScans: 0,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Đã kết nối MongoDB");

    await Motif.deleteMany({});
    console.log("🗑️  Đã xoá dữ liệu cũ trong collection motifs");

    const inserted = await Motif.insertMany(sampleMotifs);
    console.log(`🌱 Đã nạp ${inserted.length} hoa văn mẫu vào cơ sở dữ liệu`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi khi nạp dữ liệu mẫu:", err.message);
    process.exit(1);
  }
}

seed();
