# Bảo Tàng Số — Kiến Trúc Chùa Khmer (Vĩnh Long)

Hệ thống bảo tồn và quảng bá số nghệ thuật tạo hình kiến trúc chùa Khmer tại Vĩnh Long,
gồm giao diện khách tương tác (scroll animation, glassmorphism, bản đồ
địa lý thật) và một CMS quản trị bảo mật bằng JWT.

## 1. Cấu trúc thư mục

```
khmer-museum-digital/
├── README.md
├── frontend/                      # Giao diện tĩnh — mở trực tiếp hoặc chạy qua Live Server
│   ├── index.html                 # Trang khách
│   ├── admin.html                 # Trang quản trị (CMS)
│   ├── css/
│   │   └── styles.css             # CSS bổ sung: glassmorphism, parallax, modal
│   ├── js/
│   │   ├── main.js                # Fetch API, gallery, Leaflet map thật, AOS
│   │   └── admin.js                # Đăng nhập JWT, CRUD hoa văn, thống kê dashboard
│   └── assets/                    # (tuỳ chọn) ảnh cục bộ nếu không dùng URL ngoài
│
└── backend/                       # API Node.js + Express + MongoDB
    ├── server.js                  # Khởi tạo Express, kết nối Mongo, gắn routes
    ├── package.json
    ├── .env.example                # Đổi tên thành .env trước khi chạy
    ├── models/
    │   ├── Motif.js                # Schema hoa văn / chi tiết tạo hình
    │   └── Admin.js                # Schema tài khoản quản trị (mật khẩu băm bcrypt)
    ├── middleware/
    │   └── auth.js                 # Middleware xác thực JWT (protect)
    ├── routes/
    │   ├── authRoutes.js           # POST /api/login, GET /api/me
    │   └── motifRoutes.js          # CRUD /api/motifs, GET /api/scan/:id, GET /api/stats
    └── seed/
        ├── seedData.js             # Nạp dữ liệu hoa văn mẫu (có toạ độ GPS)
        └── seedAdmin.js             # Tạo tài khoản Admin mặc định đầu tiên
```

## 2. Cài đặt Backend

```bash
cd backend
npm install
cp .env.example .env        # rồi chỉnh MONGO_URI / JWT_SECRET nếu cần
```

Yêu cầu: Node.js ≥ 18, MongoDB đang chạy (local `mongodb://127.0.0.1:27017` hoặc MongoDB Atlas).

### Nạp dữ liệu mẫu (tuỳ chọn, để xem trước giao diện có dữ liệu ngay)

```bash
npm run seed
```

### Tạo tài khoản Admin mặc định đầu tiên (BẮT BUỘC trước khi đăng nhập CMS)

```bash
npm run seed:admin
```

Mặc định script sẽ tạo:
- **Tên đăng nhập:** `admin`
- **Mật khẩu:** `VinhLong@2026`

Có thể tuỳ chỉnh bằng biến môi trường khi chạy (hoặc đặt sẵn trong `.env`):

```bash
ADMIN_USERNAME=vlmuseum ADMIN_PASSWORD=MatKhauManh123! npm run seed:admin
```

> ⚠️ Sau khi đăng nhập lần đầu ở `admin.html`, bạn nên đổi sang mật khẩu mạnh của riêng mình
> (có thể tạo tính năng "đổi mật khẩu" mở rộng từ `PUT /api/me`, hoặc xoá bản ghi Admin cũ
> trong MongoDB rồi chạy lại `npm run seed:admin` với mật khẩu mới).

### Chạy server

```bash
npm run dev      # dùng nodemon, tự khởi động lại khi sửa code
# hoặc
npm start
```

Server chạy tại `http://localhost:5000`. Kiểm tra nhanh: `GET http://localhost:5000/api/health`.

## 3. Chạy Frontend

Frontend là các file tĩnh (`index.html`, `admin.html`), gọi API qua `http://localhost:5000/api`
(khai báo ở đầu file `main.js` / `admin.js` qua biến `API_BASE_URL`).

Cách đơn giản nhất: dùng extension **Live Server** trong VS Code, mở `frontend/index.html`.
Hoặc chạy một static server bất kỳ, ví dụ:

```bash
cd frontend
npx serve .
```

Vào trang quản trị tại `.../admin.html`, đăng nhập bằng tài khoản đã tạo ở bước `seed:admin`.

## 4. Tóm tắt API

| Method | Endpoint             | Bảo vệ (JWT) | Mô tả                                     |
|--------|-----------------------|:---:|--------------------------------------------|
| POST   | `/api/login`           | ❌ | Đăng nhập, trả về JWT                      |
| GET    | `/api/me`               | ✅ | Thông tin admin hiện tại (kiểm tra phiên)  |
| GET    | `/api/motifs`           | ❌ | Danh sách hoa văn (lọc theo `?category=`)  |
| GET    | `/api/motifs/:id`       | ❌ | Chi tiết một hoa văn                       |
| POST   | `/api/motifs`           | ✅ | Thêm hoa văn mới                           |
| PUT    | `/api/motifs/:id`       | ✅ | Cập nhật hoa văn                           |
| DELETE | `/api/motifs/:id`       | ✅ | Xoá hoa văn                                |
| GET    | `/api/scan/:id`         | ❌ | Được gọi khi quét QR — tự tăng `qrScans`   |
| GET    | `/api/stats`            | ✅ | Thống kê nhanh cho Dashboard admin         |

Route bảo vệ yêu cầu header: `Authorization: Bearer <token>` (token lấy từ `/api/login`).

## 5. Ghi chú về "bản đồ thật"

Mục **Bản đồ thực địa** trên trang khách dùng **Leaflet + OpenStreetMap** để hiển thị vị trí
GPS thật của từng ngôi chùa (trường `geoLocation.lat` / `geoLocation.lng` trong schema `Motif`).
Dữ liệu mẫu trong `seedData.js` dùng toạ độ tham chiếu ở mức trung tâm xã/huyện theo địa chỉ
hành chính thật (VD: Chùa Hạnh Phúc Tăng — ấp Trung Trạch, xã Trung Thành, huyện Vũng Liêm).
Khi ghi nhận thực địa, đội ngũ dự án nên đo GPS chính xác tận nơi (bằng điện thoại hoặc máy định vị)
rồi cập nhật lại qua form trong `admin.html` để bản đồ phản ánh đúng vị trí từng ngôi chùa.

## 6. Công nghệ sử dụng

- **Frontend:** HTML/CSS/JS thuần + Tailwind CSS (CDN), AOS (Animate On Scroll), Leaflet.js
- **Backend:** Node.js, Express, MongoDB/Mongoose
- **Bảo mật:** JWT (jsonwebtoken) + bcrypt (bcryptjs) để mã hoá mật khẩu Admin
