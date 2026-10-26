// admin.js
// Logic phía Client cho admin.html: đăng nhập JWT, lưu token, gọi API bảo vệ
// để Thêm / Sửa / Xoá hoa văn, và hiển thị thống kê nhanh cho Dashboard.

// Tự nhận diện môi trường: chạy local thì gọi localhost, deploy thật thì gọi backend Render.
// Sau khi deploy backend lên Render, thay PRODUCTION_API_URL bằng địa chỉ Render thật của bạn
// (phải TRÙNG với giá trị trong frontend/js/main.js).
const PRODUCTION_API_URL = "https://catvang.onrender.com/api";
const API_BASE_URL =
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5001/api"
    : PRODUCTION_API_URL;
const TOKEN_KEY = "khmer_museum_admin_token";
const ADMIN_KEY = "khmer_museum_admin_info";

let currentMotifs = [];
let editingMotifId = null;

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initLogout();
  initMotifFormModal();

  const token = getToken();
  if (token) {
    verifySessionAndLoadDashboard();
  } else {
    showLoginScreen();
  }
});

// ============================================================
// XÁC THỰC / PHIÊN ĐĂNG NHẬP
// ============================================================
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function saveSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const submitBtn = document.getElementById("loginSubmitBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang đăng nhập...";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");

      saveSession(data.token, data.admin);
      showDashboard(data.admin);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Đăng nhập";
    }
  });
}

async function verifySessionAndLoadDashboard() {
  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Phiên hết hạn");
    const admin = await res.json();
    showDashboard(admin);
  } catch (err) {
    clearSession();
    showLoginScreen();
  }
}

function initLogout() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession();
    showLoginScreen();
  });
}

function showLoginScreen() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("dashboardScreen").classList.add("hidden");
}

function showDashboard(admin) {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("dashboardScreen").classList.remove("hidden");
  const greeting = document.getElementById("adminGreeting");
  if (greeting) greeting.textContent = `Xin chào, ${admin.fullName || admin.username}`;

  loadStats();
  loadMotifTable();
}

// ============================================================
// GỌI API CÓ XÁC THỰC (helper)
// ============================================================
async function authFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    showLoginScreen();
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
  }

  return res;
}

// ============================================================
// THỐNG KÊ DASHBOARD
// ============================================================
async function loadStats() {
  try {
    const res = await authFetch("/stats");
    const stats = await res.json();

    document.getElementById("statTotalMotifs").textContent = stats.totalMotifs;
    document.getElementById("statTotalScans").textContent = stats.totalScans;

    const catEl = document.getElementById("statByCategory");
    catEl.innerHTML = stats.byCategory
      .map(
        (c) =>
          `<span class="text-xs px-3 py-1.5 rounded-full bg-white/70 border border-gold/25 text-ink/70">${escapeHTML(c._id)}: <strong class="text-ink">${c.count}</strong></span>`
      )
      .join("");
  } catch (err) {
    console.warn("Không thể tải thống kê:", err.message);
  }
}

// ============================================================
// BẢNG DANH SÁCH HOA VĂN
// ============================================================
async function loadMotifTable() {
  const errorEl = document.getElementById("adminError");
  errorEl.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/motifs`); // GET công khai, không cần token
    currentMotifs = await res.json();
    renderMotifTable();
  } catch (err) {
    errorEl.textContent = "Không thể tải danh sách hoa văn: " + err.message;
    errorEl.classList.remove("hidden");
  }
}

function renderMotifTable() {
  const tbody = document.getElementById("motifTableBody");
  const emptyState = document.getElementById("tableEmptyState");
  tbody.innerHTML = "";

  if (currentMotifs.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  currentMotifs.forEach((motif) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-beige/30 transition-colors";
    tr.innerHTML = `
      <td class="px-4 py-3">
        <img src="${motif.imageUrl}" alt="" class="w-14 h-14 object-cover rounded-lg" />
      </td>
      <td class="px-4 py-3 font-medium text-ink max-w-[220px]">${escapeHTML(motif.title)}</td>
      <td class="px-4 py-3">
        <span class="text-xs px-2.5 py-1 rounded-full bg-gold/15 text-gold-dark">${escapeHTML(motif.category)}</span>
      </td>
      <td class="px-4 py-3 text-ink/60 max-w-[180px]">${escapeHTML(motif.templeName || "—")}</td>
      <td class="px-4 py-3 text-terracotta font-semibold">${motif.qrScans ?? 0}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button data-action="edit" data-id="${motif._id}" class="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold-dark hover:bg-gold/10 transition-colors mr-2">Sửa</button>
        <button data-action="delete" data-id="${motif._id}" class="text-xs px-3 py-1.5 rounded-full border border-terracotta/30 text-terracotta hover:bg-terracotta/10 transition-colors">Xoá</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit"]').forEach((btn) =>
    btn.addEventListener("click", () => openEditForm(btn.dataset.id))
  );
  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.id))
  );
}

// ============================================================
// MODAL FORM THÊM / SỬA
// ============================================================
function initMotifFormModal() {
  const overlay = document.getElementById("motifFormModal");
  const openBtn = document.getElementById("openCreateBtn");
  const closeBtn = document.getElementById("formModalCloseBtn");
  const cancelBtn = document.getElementById("formCancelBtn");
  const form = document.getElementById("motifForm");

  openBtn.addEventListener("click", () => openCreateForm());
  closeBtn.addEventListener("click", closeFormModal);
  cancelBtn.addEventListener("click", closeFormModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeFormModal();
  });

  form.addEventListener("submit", handleFormSubmit);
  initImageUploadField();
}

// ============================================================
// TẢI ẢNH TỪ MÁY TÍNH (input file -> preview -> upload lên server)
// ============================================================
function initImageUploadField() {
  const fileInput = document.getElementById("fImageFile");
  const fileNameEl = document.getElementById("fImageFileName");
  const preview = document.getElementById("fImagePreview");
  const urlInput = document.getElementById("fImageUrl");
  const statusEl = document.getElementById("fImageUploadStatus");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    fileNameEl.textContent = file.name;

    // Xem trước ảnh ngay lập tức (chưa cần chờ upload xong)
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);

    await uploadImageFile(file);
  });

  // Nếu admin tự dán/sửa URL ảnh bằng tay, cập nhật preview tương ứng
  urlInput.addEventListener("change", () => {
    if (urlInput.value.trim()) {
      preview.src = urlInput.value.trim();
      preview.classList.remove("hidden");
    }
  });

  function showUploadStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className =
      "text-xs px-2 py-1 rounded mb-2 " +
      (type === "error" ? "bg-terracotta/10 text-terracotta-dark" : "bg-gold/15 text-gold-dark");
    statusEl.classList.remove("hidden");
  }

  async function uploadImageFile(file) {
    showUploadStatus("Đang tải ảnh lên...", "info");
    urlInput.disabled = true;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` }, // KHÔNG set Content-Type — browser tự thêm boundary
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Tải ảnh lên thất bại");

      urlInput.value = data.url;
      showUploadStatus("✓ Đã tải ảnh lên thành công", "success");
    } catch (err) {
      showUploadStatus(err.message, "error");
    } finally {
      urlInput.disabled = false;
    }
  }
}

function resetImageUploadField(existingUrl) {
  const fileInput = document.getElementById("fImageFile");
  const fileNameEl = document.getElementById("fImageFileName");
  const preview = document.getElementById("fImagePreview");
  const statusEl = document.getElementById("fImageUploadStatus");

  fileInput.value = "";
  fileNameEl.textContent = "Chưa chọn file nào";
  statusEl.classList.add("hidden");

  if (existingUrl) {
    preview.src = existingUrl;
    preview.classList.remove("hidden");
  } else {
    preview.src = "";
    preview.classList.add("hidden");
  }
}

function openCreateForm() {
  editingMotifId = null;
  document.getElementById("formModalTitle").textContent = "Thêm hoa văn mới";
  document.getElementById("motifForm").reset();
  document.getElementById("fHotspotX").value = 50;
  document.getElementById("fHotspotY").value = 50;
  document.getElementById("formError").classList.add("hidden");
  resetImageUploadField(null);
  openFormModal();
}

function openEditForm(id) {
  const motif = currentMotifs.find((m) => m._id === id);
  if (!motif) return;

  editingMotifId = id;
  document.getElementById("formModalTitle").textContent = "Chỉnh sửa hoa văn";
  document.getElementById("motifId").value = motif._id;
  document.getElementById("fTitle").value = motif.title || "";
  document.getElementById("fDescription").value = motif.description || "";
  document.getElementById("fCategory").value = motif.category || "Hoa văn";
  document.getElementById("fImageUrl").value = motif.imageUrl || "";
  document.getElementById("fTempleName").value = motif.templeName || "";
  document.getElementById("fTempleAddress").value = motif.templeAddress || "";
  document.getElementById("fHotspotX").value = motif.hotspotCoordinates?.x ?? 50;
  document.getElementById("fHotspotY").value = motif.hotspotCoordinates?.y ?? 50;
  document.getElementById("fLat").value = motif.geoLocation?.lat ?? "";
  document.getElementById("fLng").value = motif.geoLocation?.lng ?? "";
  document.getElementById("formError").classList.add("hidden");
  resetImageUploadField(motif.imageUrl || null);

  openFormModal();
}

function openFormModal() {
  const overlay = document.getElementById("motifFormModal");
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeFormModal() {
  const overlay = document.getElementById("motifFormModal");
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("formSubmitBtn");
  const errorEl = document.getElementById("formError");
  errorEl.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.textContent = "Đang lưu...";

  const lat = document.getElementById("fLat").value;
  const lng = document.getElementById("fLng").value;

  const payload = {
    title: document.getElementById("fTitle").value.trim(),
    description: document.getElementById("fDescription").value.trim(),
    category: document.getElementById("fCategory").value,
    imageUrl: document.getElementById("fImageUrl").value.trim(),
    templeName: document.getElementById("fTempleName").value.trim(),
    templeAddress: document.getElementById("fTempleAddress").value.trim(),
    hotspotCoordinates: {
      x: Number(document.getElementById("fHotspotX").value) || 50,
      y: Number(document.getElementById("fHotspotY").value) || 50,
    },
    geoLocation: {
      lat: lat === "" ? null : Number(lat),
      lng: lng === "" ? null : Number(lng),
    },
  };

  try {
    const isEditing = Boolean(editingMotifId);
    const res = await authFetch(isEditing ? `/motifs/${editingMotifId}` : "/motifs", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể lưu hoa văn");

    showToast(isEditing ? "Đã cập nhật hoa văn thành công" : "Đã thêm hoa văn mới thành công", "success");
    closeFormModal();
    await loadMotifTable();
    await loadStats();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Lưu hoa văn";
  }
}

async function handleDelete(id) {
  const motif = currentMotifs.find((m) => m._id === id);
  const confirmed = confirm(`Xoá "${motif?.title || "hoa văn này"}"? Hành động này không thể hoàn tác.`);
  if (!confirmed) return;

  try {
    const res = await authFetch(`/motifs/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể xoá hoa văn");

    showToast("Đã xoá hoa văn", "success");
    await loadMotifTable();
    await loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ============================================================
// TOAST THÔNG BÁO
// ============================================================
let toastTimer = null;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className =
    "toast fixed top-5 right-5 z-[200] max-w-xs rounded-xl px-4 py-3 text-sm font-medium shadow-lg is-visible " +
    (type === "success" ? "bg-ink text-cream" : "bg-terracotta text-white");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
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
