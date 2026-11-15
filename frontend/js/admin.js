// admin.js
// Logic phía Client cho admin.html: đăng nhập JWT, lưu token, gọi API bảo vệ
// để Thêm / Sửa / Xoá hoa văn, và hiển thị thống kê nhanh cho Dashboard.

// Tự nhận diện môi trường: chạy local thì gọi localhost, deploy thật thì gọi backend Render.
// Sau khi deploy backend lên Render, thay PRODUCTION_API_URL bằng địa chỉ Render thật của bạn
// (phải TRÙNG với giá trị trong frontend/js/main.js).
const PRODUCTION_API_URL = "https://catvang.onrender.com/api";
const API_BASE_URL =
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5002/api"
    : PRODUCTION_API_URL;
const TOKEN_KEY = "khmer_museum_admin_token";
const ADMIN_KEY = "khmer_museum_admin_info";

let currentMotifs = [];
let editingMotifId = null;
let approvingSubmission = null; // có giá trị khi form đang ở chế độ "Duyệt đóng góp"
let currentSubmissions = [];
let submissionStatus = "pending";

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initLogout();
  initMotifFormModal();
  initTabs();
  initSubmissionPanel();

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
    // Máy chủ Render gói miễn phí có thể đang ngủ: sau 4 giây vẫn chưa xong thì báo khách đợi
    const wakeTimer = setTimeout(() => {
      submitBtn.textContent = "Máy chủ đang khởi động, vui lòng đợi...";
    }, 4000);

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
      clearTimeout(wakeTimer);
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
  loadSubmissionBadge();
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
  initSectionsEditor();
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
  approvingSubmission = null;
  setApproveMode(false);
  document.getElementById("formModalTitle").textContent = "Thêm hoa văn mới";
  document.getElementById("motifForm").reset();
  renderSectionsEditor([]);
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
  approvingSubmission = null;
  setApproveMode(false);
  document.getElementById("formModalTitle").textContent = "Chỉnh sửa hoa văn";
  renderSectionsEditor(motif.sections || []);
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
  approvingSubmission = null;
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
    sections: collectSections(),
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
    const isApproving = Boolean(approvingSubmission);
    const isEditing = !isApproving && Boolean(editingMotifId);

    let path = "/motifs";
    let method = "POST";
    if (isApproving) path = `/submissions/${approvingSubmission._id}/approve`;
    else if (isEditing) {
      path = `/motifs/${editingMotifId}`;
      method = "PUT";
    }

    const res = await authFetch(path, { method, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      if (isApproving && res.status === 409) await loadSubmissions(); // bài đã được xử lý -> làm mới danh sách
      throw new Error(data.message || "Không thể lưu hoa văn");
    }

    showToast(
      isApproving ? "Đã duyệt và đăng tải" : isEditing ? "Đã cập nhật hoa văn thành công" : "Đã thêm hoa văn mới thành công",
      "success"
    );
    closeFormModal();
    await Promise.all([loadMotifTable(), loadStats(), loadSubmissionBadge(), isApproving ? loadSubmissions() : null]);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = approvingSubmission ? "Duyệt & đăng" : "Lưu hoa văn";
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
// TRÌNH SOẠN NỘI DUNG CHIA ĐOẠN (tiêu đề nhỏ + nội dung)
// ============================================================
function initSectionsEditor() {
  const editor = document.getElementById("sectionsEditor");
  document.getElementById("addSectionBtn").addEventListener("click", () => {
    const row = addSectionRow("", "");
    row.querySelector(".sec-heading").focus();
  });

  // Nút ↑ ↓ ✕ trên từng đoạn (event delegation)
  editor.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sec-action]");
    if (!btn) return;
    const row = btn.closest("[data-section-row]");
    const action = btn.dataset.secAction;
    if (action === "remove") row.remove();
    if (action === "up" && row.previousElementSibling) editor.insertBefore(row, row.previousElementSibling);
    if (action === "down" && row.nextElementSibling) editor.insertBefore(row.nextElementSibling, row);
  });
}

function addSectionRow(heading, body) {
  const row = document.createElement("div");
  row.setAttribute("data-section-row", "");
  row.className = "rounded-xl border border-gold/30 bg-white/50 p-3 space-y-2";
  row.innerHTML = `
    <div class="flex gap-2">
      <input class="sec-heading flex-1 min-w-0 rounded-lg border border-gold/30 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
        list="sectionHeadingList" maxlength="120" placeholder="Tiêu đề đoạn (VD: Ý nghĩa biểu tượng)" />
      <button type="button" data-sec-action="up" class="w-8 rounded-lg border border-ink/15 text-xs hover:bg-ink/5" aria-label="Chuyển lên">↑</button>
      <button type="button" data-sec-action="down" class="w-8 rounded-lg border border-ink/15 text-xs hover:bg-ink/5" aria-label="Chuyển xuống">↓</button>
      <button type="button" data-sec-action="remove" class="w-8 rounded-lg border border-terracotta/30 text-terracotta text-xs hover:bg-terracotta/10" aria-label="Xoá đoạn">✕</button>
    </div>
    <textarea class="sec-body w-full rounded-lg border border-gold/30 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
      rows="3" maxlength="4000" placeholder="Nội dung đoạn này..."></textarea>
  `;
  row.querySelector(".sec-heading").value = heading || "";
  row.querySelector(".sec-body").value = body || "";
  document.getElementById("sectionsEditor").appendChild(row);
  return row;
}

function renderSectionsEditor(sections) {
  document.getElementById("sectionsEditor").innerHTML = "";
  (sections || []).forEach((sec) => addSectionRow(sec.heading, sec.body));
}

function collectSections() {
  return [...document.querySelectorAll("#sectionsEditor [data-section-row]")]
    .map((row) => ({
      heading: row.querySelector(".sec-heading").value.trim(),
      body: row.querySelector(".sec-body").value.trim(),
    }))
    .filter((sec) => sec.body); // bỏ đoạn trống
}

// ============================================================
// TAB: CHI TIẾT TẠO HÌNH  |  ĐÓNG GÓP TỪ CỘNG ĐỒNG
// ============================================================
function initTabs() {
  document.getElementById("tabMotifs").addEventListener("click", () => switchTab("motifs"));
  document.getElementById("tabSubmissions").addEventListener("click", () => switchTab("submissions"));
}

function switchTab(name) {
  const isMotifs = name === "motifs";
  document.getElementById("panelMotifs").classList.toggle("hidden", !isMotifs);
  document.getElementById("panelSubmissions").classList.toggle("hidden", isMotifs);
  const tabM = document.getElementById("tabMotifs");
  const tabS = document.getElementById("tabSubmissions");
  tabM.classList.toggle("is-active", isMotifs);
  tabS.classList.toggle("is-active", !isMotifs);
  tabM.setAttribute("aria-selected", String(isMotifs));
  tabS.setAttribute("aria-selected", String(!isMotifs));
  if (!isMotifs) loadSubmissions();
}

// ============================================================
// DUYỆT ĐÓNG GÓP TỪ CỘNG ĐỒNG
// ============================================================
function initSubmissionPanel() {
  document.querySelectorAll("#submissionFilters .sub-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      submissionStatus = btn.dataset.status;
      document.querySelectorAll("#submissionFilters .sub-filter").forEach((b) =>
        b.classList.toggle("is-active", b === btn)
      );
      loadSubmissions();
    })
  );

  document.getElementById("submissionList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-sub-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.subAction === "approve") openApproveForm(id);
    if (btn.dataset.subAction === "reject") handleReject(id);
    if (btn.dataset.subAction === "delete") handleSubmissionDelete(id);
  });
}

async function loadSubmissionBadge() {
  try {
    const res = await authFetch("/submissions/summary");
    const sum = await res.json();
    const badge = document.getElementById("pendingBadge");
    badge.textContent = sum.pending;
    badge.classList.toggle("hidden", !sum.pending);
  } catch (err) {
    console.warn("Không thể tải số bài chờ duyệt:", err.message);
  }
}

async function loadSubmissions() {
  const list = document.getElementById("submissionList");
  const empty = document.getElementById("submissionEmpty");
  const errorEl = document.getElementById("adminError");
  errorEl.classList.add("hidden");
  try {
    const res = await authFetch(`/submissions?status=${submissionStatus}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Lỗi tải danh sách");
    currentSubmissions = data;
    renderSubmissions();
  } catch (err) {
    list.innerHTML = "";
    empty.classList.add("hidden");
    errorEl.textContent = "Không thể tải đóng góp: " + err.message;
    errorEl.classList.remove("hidden");
  }
}

function renderSubmissions() {
  const list = document.getElementById("submissionList");
  const empty = document.getElementById("submissionEmpty");
  list.innerHTML = "";
  empty.classList.toggle("hidden", currentSubmissions.length > 0);

  currentSubmissions.forEach((sub) => {
    const imgOk = /^https:\/\//.test(sub.imageUrl || "");
    const when = new Date(sub.createdAt).toLocaleString("vi-VN");
    const sender = sub.submitterName ? escapeHTML(sub.submitterName) : "Ẩn danh";
    const contact = sub.submitterContact ? escapeHTML(sub.submitterContact) : "—";

    let actions = "";
    if (sub.status === "pending") {
      actions = `
        <button data-sub-action="approve" data-id="${sub._id}" class="text-xs font-semibold px-4 py-2 rounded-full bg-terracotta text-white hover:bg-terracotta-dark transition-colors">Xem &amp; duyệt</button>
        <button data-sub-action="reject" data-id="${sub._id}" class="text-xs px-4 py-2 rounded-full border border-terracotta/30 text-terracotta hover:bg-terracotta/10 transition-colors">Từ chối</button>`;
    } else {
      actions = `<button data-sub-action="delete" data-id="${sub._id}" class="text-xs px-4 py-2 rounded-full border border-ink/15 hover:bg-ink/5 transition-colors">Xoá bản ghi</button>`;
    }

    let note = "";
    if (sub.status === "approved") note = `<p class="text-xs text-gold-dark mt-2">Đã đăng bởi ${escapeHTML(sub.reviewedBy)} — ${new Date(sub.reviewedAt).toLocaleDateString("vi-VN")}</p>`;
    if (sub.status === "rejected") note = `<p class="text-xs text-terracotta-dark mt-2">Đã từ chối${sub.rejectReason ? `: ${escapeHTML(sub.rejectReason)}` : ""} (ảnh đã xoá khỏi kho lưu trữ)</p>`;

    const card = document.createElement("article");
    card.className = "rounded-2xl border border-gold/20 bg-white/60 p-4 sm:p-5 grid sm:grid-cols-[170px_1fr] gap-4";
    card.innerHTML = `
      ${
        sub.status === "rejected" || !imgOk
          ? `<div class="w-full h-32 sm:h-full min-h-[8rem] rounded-xl bg-beige/60 flex items-center justify-center text-xs text-ink/40">Không có ảnh</div>`
          : `<a href="${sub.imageUrl}" target="_blank" rel="noopener noreferrer"><img src="${sub.imageUrl}" alt="" class="w-full h-32 sm:h-full min-h-[8rem] object-cover rounded-xl" /></a>`
      }
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-1">
          <span class="text-xs px-2.5 py-1 rounded-full bg-gold/15 text-gold-dark">${escapeHTML(sub.category)}</span>
          <span class="text-xs text-ink/45">${when}</span>
        </div>
        <h3 class="font-serif text-lg text-ink">${escapeHTML(sub.title)}</h3>
        <p class="text-xs text-ink/55 mb-2">${escapeHTML(sub.templeName || "Chưa ghi tên chùa")}${sub.templeAddress ? " — " + escapeHTML(sub.templeAddress) : ""}</p>
        <p class="text-sm text-ink/75 leading-relaxed whitespace-pre-line line-clamp-4">${escapeHTML(sub.description)}</p>
        <p class="text-xs text-ink/50 mt-2">Người gửi: <strong>${sender}</strong> · Liên hệ: ${contact} · Ghi tên khi đăng: ${sub.showName ? "có" : "không"}</p>
        ${note}
        <div class="flex flex-wrap gap-2 mt-3">${actions}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

// Mở form Thêm/Sửa ở chế độ "Duyệt": điền sẵn từ bài đóng góp, admin chỉnh + bổ sung GPS rồi đăng
function openApproveForm(id) {
  const sub = currentSubmissions.find((x) => x._id === id);
  if (!sub) return;

  openCreateForm(); // reset form về trạng thái sạch
  approvingSubmission = sub;
  setApproveMode(true);

  document.getElementById("formModalTitle").textContent = "Duyệt đóng góp";
  document.getElementById("fTitle").value = sub.title || "";
  document.getElementById("fDescription").value = sub.description || "";
  document.getElementById("fCategory").value = sub.category || "Hoa văn";
  document.getElementById("fImageUrl").value = sub.imageUrl || "";
  document.getElementById("fTempleName").value = sub.templeName || "";
  document.getElementById("fTempleAddress").value = sub.templeAddress || "";
  resetImageUploadField(sub.imageUrl || null);

  document.getElementById("approveInfo").innerHTML =
    `Người gửi: <strong>${sub.submitterName ? escapeHTML(sub.submitterName) : "Ẩn danh"}</strong> · ` +
    `Liên hệ: ${sub.submitterContact ? escapeHTML(sub.submitterContact) : "—"} · ` +
    `Ghi tên khi đăng: ${sub.showName ? "có" : "không"}.<br />` +
    `Kiểm tra và chỉnh nội dung, tách đoạn nếu cần, bổ sung toạ độ GPS rồi bấm “Duyệt &amp; đăng”.`;
}

// Bật/tắt giao diện chế độ duyệt (khoá ô ảnh vì ảnh đã được người gửi tải lên)
function setApproveMode(on) {
  document.getElementById("approveInfo").classList.toggle("hidden", !on);
  document.getElementById("formSubmitBtn").textContent = on ? "Duyệt & đăng" : "Lưu hoa văn";
  document.getElementById("fImageFile").disabled = on;
  document.getElementById("fImageUrl").readOnly = on;
  document.querySelector('label[for="fImageFile"]').classList.toggle("opacity-40", on);
}

async function handleReject(id) {
  const sub = currentSubmissions.find((x) => x._id === id);
  const reason = prompt(
    `Từ chối "${sub?.title || "bài này"}"?\nẢnh sẽ bị xoá khỏi kho lưu trữ.\n\nLý do (không bắt buộc, chỉ lưu nội bộ):`
  );
  if (reason === null) return; // bấm Huỷ

  try {
    const res = await authFetch(`/submissions/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể từ chối");
    showToast("Đã từ chối đóng góp", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
  await Promise.all([loadSubmissions(), loadSubmissionBadge()]);
}

async function handleSubmissionDelete(id) {
  if (!confirm("Xoá bản ghi này? Hành động không thể hoàn tác.")) return;
  try {
    const res = await authFetch(`/submissions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Không thể xoá");
    showToast("Đã xoá", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
  await Promise.all([loadSubmissions(), loadSubmissionBadge()]);
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
