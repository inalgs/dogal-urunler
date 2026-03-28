// ===== ADMIN API HELPER =====
const API = {
  base: '/api',
  async request(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(this.base + url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Bir hata oluştu');
    return data;
  },
  get(url) { return this.request(url); },
  post(url, body) {
    const isForm = body instanceof FormData;
    return this.request(url, { method: 'POST', body: isForm ? body : JSON.stringify(body) });
  },
  put(url, body) {
    const isForm = body instanceof FormData;
    return this.request(url, { method: 'PUT', body: isForm ? body : JSON.stringify(body) });
  },
  delete(url) { return this.request(url, { method: 'DELETE' }); }
};

// Auth check
function checkAdmin() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user || user.role !== 'admin') {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Toast
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format helpers
function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusBadge(status) {
  const map = {
    'beklemede': { text: 'Beklemede', class: 'badge-warning' },
    'hazirlaniyor': { text: 'Hazırlanıyor', class: 'badge-info' },
    'kargoda': { text: 'Kargoda', class: 'badge-info' },
    'teslim_edildi': { text: 'Teslim Edildi', class: 'badge-success' },
    'iptal': { text: 'İptal', class: 'badge-error' }
  };
  const s = map[status] || { text: status, class: '' };
  return `<span class="badge ${s.class}">${s.text}</span>`;
}

// Mobile sidebar
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('active');
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
