// main.js
// Logic phía Client (index.html): gọi API lấy dữ liệu Motif,
// dựng bản đồ địa lý thật (Leaflet), thư viện di sản dạng thẻ glassmorphism, modal chi tiết,
// và khởi tạo các hiệu ứng cuộn (AOS + parallax).

// Tự nhận diện môi trường: chạy local thì gọi localhost, deploy thật thì gọi backend Render.
// Sau khi deploy backend lên Render, thay PRODUCTION_API_URL bằng địa chỉ Render thật của bạn.
const PRODUCTION_API_URL = "https://catvang.onrender.com/api";
const API_BASE_URL =
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:8000/api"
    : PRODUCTION_API_URL;

let allMotifs = [];
let activeCategory = "Tất cả";
let leafletMap = null;

// ---------- Khởi tạo khi trang đã tải ----------
document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initAOS();
  initModal();
  fetchMotifs();
});

// ---------- Menu mobile ----------
function initMobileMenu() {
  const btn = document.getElementById("mobileMenuBtn");
  const menu = document.getElementById("mobileMenu");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
}

// ---------- AOS (Animate On Scroll) ----------
function initAOS() {
  if (typeof AOS === "undefined") return;
  AOS.init({
    duration: 700,
    easing: "ease-out-cubic",
    once: true,
    offset: 60,
  });
}

// ---------- Gọi API lấy danh sách hoa văn ----------
async function fetchMotifs() {
  try {
    const res = await fetch(`${API_BASE_URL}/motifs`);
    if (!res.ok) throw new Error("Không thể tải dữ liệu hoa văn");
    allMotifs = await res.json();
  } catch (err) {
    console.warn("⚠️ Không kết nối được API, dùng dữ liệu mẫu tạm thời để xem trước giao diện:", err.message);
    allMotifs = getFallbackMotifs();
  }

  renderCategoryFilters();
  renderGallery();
  renderRealMap();
  renderStatBar();
}

// ============================================================
// DẢI SỐ LIỆU SỐ HÓA (thay cho đồng hồ đếm ngược trong hero)
// ============================================================
function renderStatBar() {
  const templeCount = new Set(allMotifs.map((m) => m.templeName).filter(Boolean)).size;
  const categoryCount = new Set(allMotifs.map((m) => m.category).filter(Boolean)).size;
  const scanCount = allMotifs.reduce((sum, m) => sum + (m.qrScans || 0), 0);

  animateCount("statTemples", templeCount);
  animateCount("statMotifs", allMotifs.length);
  animateCount("statCategories", categoryCount);
  animateCount("statScans", scanCount);
}

function animateCount(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============================================================
// BỘ LỌC DANH MỤC + THƯ VIỆN DI SẢN
// ============================================================
function renderCategoryFilters() {
  const container = document.getElementById("categoryFilters");
  if (!container) return;

  const categories = ["Tất cả", ...new Set(allMotifs.map((m) => m.category))];
  container.innerHTML = "";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.className = buildFilterBtnClass(cat === activeCategory);
    btn.addEventListener("click", () => {
      activeCategory = cat;
      document.querySelectorAll("#categoryFilters button").forEach((b) => {
        b.className = buildFilterBtnClass(b.dataset.category === activeCategory);
      });
      renderGallery();
    });
    container.appendChild(btn);
  });
}

function buildFilterBtnClass(isActive) {
  return isActive
    ? "px-4 py-2 rounded-full text-xs font-semibold bg-terracotta text-white transition-colors"
    : "px-4 py-2 rounded-full text-xs font-semibold bg-white/60 border border-gold/25 text-ink/70 hover:bg-white transition-colors";
}

function renderGallery() {
  const grid = document.getElementById("motifGrid");
  const emptyState = document.getElementById("motifEmptyState");
  if (!grid) return;

  const filtered =
    activeCategory === "Tất cả" ? allMotifs : allMotifs.filter((m) => m.category === activeCategory);

  grid.innerHTML = "";

  if (filtered.length === 0) {
    emptyState?.classList.remove("hidden");
    return;
  }
  emptyState?.classList.add("hidden");

  filtered.forEach((motif, index) => {
    const card = document.createElement("article");
    card.className = "motif-card";
    card.style.setProperty("--stagger-index", index % 6);
    card.setAttribute("data-aos", "fade-up");
    card.setAttribute("data-aos-delay", String((index % 6) * 90));
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Xem chi tiết: ${motif.title}`);

    card.innerHTML = `
      <div class="motif-card__bg" style="background-image:url('${motif.imageUrl}')"></div>
      <div class="motif-card__scrim"></div>
      <div class="motif-card__body glass-panel-dark">
        <span class="motif-card__tag">${escapeHTML(motif.category)}</span>
        <h3 class="font-serif text-white text-lg mt-2 leading-snug">${escapeHTML(motif.title)}</h3>
        <p class="text-cream/70 text-xs mt-1">${escapeHTML(motif.templeName || "")}</p>
      </div>
    `;

    card.addEventListener("click", () => openMotifModal(motif));
    card.addEventListener("keypress", (e) => {
      if (e.key === "Enter") openMotifModal(motif);
    });

    grid.appendChild(card);
  });

  // Cho AOS quét lại các phần tử vừa được thêm động vào DOM
  if (typeof AOS !== "undefined") AOS.refreshHard();
}

// ============================================================
// MODAL CHI TIẾT
// ============================================================
function initModal() {
  const overlay = document.getElementById("motifModal");
  const closeBtn = document.getElementById("modalCloseBtn");
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener("click", closeMotifModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMotifModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMotifModal();
  });
}

function openMotifModal(motif) {
  document.getElementById("modalImage").src = motif.imageUrl;
  document.getElementById("modalImage").alt = motif.title;
  document.getElementById("modalCategory").textContent = motif.category;
  document.getElementById("modalTitle").textContent = motif.title;
  document.getElementById("modalDescription").textContent = motif.description;
  document.getElementById("modalTemple").textContent = motif.templeName || "Chưa cập nhật";
  document.getElementById("modalAddress").textContent = motif.templeAddress || "";
  document.getElementById("modalScans").textContent = `${motif.qrScans ?? 0} lượt quét`;

  const overlay = document.getElementById("motifModal");
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeMotifModal() {
  const overlay = document.getElementById("motifModal");
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ============================================================
// BẢN ĐỒ ĐỊA LÝ THẬT (Leaflet + OpenStreetMap)
// ============================================================
function renderRealMap() {
  const mapEl = document.getElementById("realMap");
  if (!mapEl || typeof L === "undefined") return;

  // Toạ độ trung tâm mặc định: tỉnh Vĩnh Long
  const center = [10.2536, 105.9722];

  if (!leafletMap) {
    leafletMap = L.map("realMap").setView(center, 10);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, and the GIS User Community'
  }).addTo(leafletMap);
  }

  // Gom nhóm hoa văn theo từng ngôi chùa (cùng toạ độ geoLocation) để mỗi chùa 1 marker
  const templeGroups = {};
  allMotifs.forEach((motif) => {
    const lat = motif.geoLocation?.lat;
    const lng = motif.geoLocation?.lng;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const key = `${motif.templeName}__${lat}__${lng}`;
    if (!templeGroups[key]) {
      templeGroups[key] = {
        templeName: motif.templeName || "Chùa chưa đặt tên",
        templeAddress: motif.templeAddress || "",
        lat,
        lng,
        motifs: [],
      };
    }
    templeGroups[key].motifs.push(motif);
  });

  const goldIcon = L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#C7963B;border:3px solid #FFFBEB;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  const bounds = [];
  Object.values(templeGroups).forEach((group) => {
    const marker = L.marker([group.lat, group.lng], { icon: goldIcon }).addTo(leafletMap);
    marker.bindPopup(`
      <div style="font-family: 'Be Vietnam Pro', sans-serif; min-width:180px">
        <strong style="font-family:'Playfair Display', serif; font-size:15px; color:#3A2C1D">${escapeHTML(group.templeName)}</strong>
        <p style="font-size:12px; color:#6b5c46; margin:4px 0 6px">${escapeHTML(group.templeAddress)}</p>
        <p style="font-size:12px; color:#B5533C; font-weight:600">${group.motifs.length} chi tiết tạo hình đã số hóa</p>
      </div>
    `);
    bounds.push([group.lat, group.lng]);
  });

  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }
}

// ============================================================
// TIỆN ÍCH
// ============================================================
function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Dữ liệu dự phòng để xem trước giao diện khi chưa bật backend/MongoDB
function getFallbackMotifs() {
  return [
    {
      _id: "demo1",
      title: "Tượng chim thần Krud (Garuda) đỡ mái",
      description:
        "Hình tượng chim thần Krud đỡ các góc mái, biểu trưng cho sức mạnh hộ pháp và tín ngưỡng bảo vệ ngôi chùa khỏi tà khí.",
      category: "Tượng",
      imageUrl: "https://images.unsplash.com/photo-1600100397608-a2ab7d123b6f?q=80&w=800&auto=format&fit=crop",
      hotspotCoordinates: { x: 22, y: 28 },
      geoLocation: { lat: 9.9967, lng: 106.1667 },
      templeName: "Chùa Hạnh Phúc Tăng (Sanghamangala)",
      templeAddress: "Ấp Trung Trạch, xã Trung Thành, huyện Vũng Liêm, tỉnh Vĩnh Long",
      qrScans: 12,
    },
    {
      _id: "demo2",
      title: "Phù điêu tiên nữ Kemonak trên vách",
      description: "Chạm khắc hình tiên nữ nửa người nửa chim, tượng trưng cho sự thanh khiết và âm nhạc thiêng liêng.",
      category: "Phù điêu",
      imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800&auto=format&fit=crop",
      hotspotCoordinates: { x: 52, y: 45 },
      geoLocation: { lat: 9.9967, lng: 106.1667 },
      templeName: "Chùa Hạnh Phúc Tăng (Sanghamangala)",
      templeAddress: "Ấp Trung Trạch, xã Trung Thành, huyện Vũng Liêm, tỉnh Vĩnh Long",
      qrScans: 5,
    },
    {
      _id: "demo3",
      title: "Hoa văn ngọn lửa trên diềm mái",
      description: "Chuỗi họa tiết hình ngọn lửa lặp lại trên diềm mái, tượng trưng cho ánh sáng trí tuệ.",
      category: "Hoa văn",
      imageUrl: "https://images.unsplash.com/photo-1596796930131-c9dab8f4c4c1?q=80&w=800&auto=format&fit=crop",
      hotspotCoordinates: { x: 76, y: 20 },
      geoLocation: { lat: 10.045, lng: 105.9628 },
      templeName: "Chùa Phước Hậu",
      templeAddress: "Ấp Đông Hậu, xã Ngãi Tứ, huyện Tam Bình, tỉnh Vĩnh Long",
      qrScans: 3,
    },
  ];
}
