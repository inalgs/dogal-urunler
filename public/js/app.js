// ===== API HELPER =====
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
    const isFormData = body instanceof FormData;
    return this.request(url, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  },
  put(url, body) {
    const isFormData = body instanceof FormData;
    return this.request(url, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body)
    });
  },
  delete(url) { return this.request(url, { method: 'DELETE' }); }
};

// ===== AUTH HELPER =====
const Auth = {
  getToken() { return localStorage.getItem('token'); },
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin() { return this.getUser()?.role === 'admin'; },
  login(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    updateNavbar();
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNavbar();
    window.location.href = '/';
  }
};

// ===== TOAST =====
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
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== FORMAT HELPERS =====
function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0
  }).format(price);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function getStatusText(status) {
  const map = {
    'beklemede': 'Beklemede',
    'hazirlaniyor': 'Hazırlanıyor',
    'kargoda': 'Kargoda',
    'teslim_edildi': 'Teslim Edildi',
    'iptal': 'İptal Edildi'
  };
  return map[status] || status;
}

function getStatusClass(status) {
  const map = {
    'beklemede': 'warning',
    'hazirlaniyor': 'warning',
    'kargoda': 'success',
    'teslim_edildi': 'success',
    'iptal': 'error'
  };
  return map[status] || '';
}

// ===== NAVBAR =====
function updateNavbar() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const user = Auth.getUser();
  if (user) {
    navActions.innerHTML = `
      <a href="/cart.html" class="nav-cart" title="Sepet">
        <i class="bi bi-cart3"></i>
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </a>
      <div class="nav-user" onclick="toggleUserMenu()">
        <i class="bi bi-person-circle"></i>
        <span>${user.name.split(' ')[0]}</span>
        <i class="bi bi-chevron-down" style="font-size:0.7rem"></i>
      </div>
      <div class="user-dropdown" id="userDropdown" style="display:none;position:absolute;top:60px;right:20px;background:white;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);min-width:180px;z-index:1001;padding:8px 0;">
        <a href="/profile.html" style="display:block;padding:10px 16px;font-size:0.9rem;font-weight:600;">
          <i class="bi bi-person"></i> Profilim
        </a>
        <a href="/orders.html" style="display:block;padding:10px 16px;font-size:0.9rem;font-weight:600;">
          <i class="bi bi-box-seam"></i> Siparişlerim
        </a>
        ${user.role === 'admin' ? `<a href="/admin/" style="display:block;padding:10px 16px;font-size:0.9rem;font-weight:600;color:#2d5016;">
          <i class="bi bi-gear"></i> Admin Panel
        </a>` : ''}
        <hr style="margin:4px 0;border:none;border-top:1px solid #eee;">
        <a href="#" onclick="Auth.logout();return false;" style="display:block;padding:10px 16px;font-size:0.9rem;font-weight:600;color:#e53935;">
          <i class="bi bi-box-arrow-right"></i> Çıkış Yap
        </a>
      </div>
    `;
    updateCartBadge();
  } else {
    navActions.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Giriş Yap</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Kayıt Ol</a>
    `;
  }
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown && !e.target.closest('.nav-user') && !e.target.closest('.user-dropdown')) {
    dropdown.style.display = 'none';
  }
});

// Mobile menu
function toggleMobileMenu() {
  document.querySelector('.nav-links')?.classList.toggle('active');
}

// ===== CART BADGE =====
async function updateCartBadge() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await API.get('/cart');
    const badge = document.getElementById('cartBadge');
    if (badge) {
      const count = data.items.length;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch (e) { /* ignore */ }
}

// ===== ADD TO CART =====
async function addToCart(productId, quantity = 1) {
  if (!Auth.isLoggedIn()) {
    showToast('Sepete eklemek için giriş yapın', 'error');
    window.location.href = '/login.html';
    return;
  }
  try {
    await API.post('/cart', { product_id: productId, quantity });
    showToast('Ürün sepete eklendi!');
    updateCartBadge();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
});
