// utils/text.js
// Chuẩn hóa tên chùa thành "khóa" để ghép thông tin chùa với các hoa văn,
// không bị lệch vì khác hoa/thường, dấu hoặc khoảng trắng thừa.
// LƯU Ý: hàm templeKey() ở frontend (main.js, admin.js) phải làm đúng y như vậy.

function templeKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { templeKey };
