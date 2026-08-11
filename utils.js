const BASE_URL = 'https://localhost:7208/api';

const Auth = {
    getToken: () => sessionStorage.getItem('fl_token'),
    setToken: (token) => sessionStorage.setItem('fl_token', token),
    removeToken: () => sessionStorage.removeItem('fl_token'),
    getUser: () => JSON.parse(sessionStorage.getItem('fl_user') || '{}'),
    setUser: (user) => sessionStorage.setItem('fl_user', JSON.stringify(user)),
    removeUser: () => sessionStorage.removeItem('fl_user'),
    isLoggedIn: () => !!sessionStorage.getItem('fl_token'),
    hasRole: (role) => {
        const user = Auth.getUser();
        return user.roles && user.roles.includes(role);
    },
    logout: () => {
    sessionStorage.removeItem('fl_token');
    sessionStorage.removeItem('fl_user');
    window.location.href = 'login.html';
}
};

function showToast(message, type = 'success') {
    const existing = document.getElementById('fl-toast-container');
    if (existing) existing.remove();

    const bgColors = {
        success: '#1a6b3c',
        error: '#c62828',
        warning: '#e65100',
        info: '#1565c0'
    };

    const container = document.createElement('div');
    container.id = 'fl-toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px;';

    container.innerHTML = `
        <div style="
            background:${bgColors[type] || bgColors.success};
            color:#fff;
            padding:14px 18px;
            border-radius:10px;
            box-shadow:0 4px 16px rgba(0,0,0,0.2);
            font-size:0.9rem;
            font-weight:500;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            animation:slideIn 0.3s ease;
        ">
            <span>${message}</span>
            <span onclick="this.closest('#fl-toast-container').remove()" 
                  style="cursor:pointer;opacity:0.8;font-size:1.1rem;">✕</span>
        </div>
        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
    `;

    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4500);
}

function showLoader(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;padding:60px 20px;">
            <div style="text-align:center;">
                <div class="spinner-border" style="color:var(--primary);width:2.5rem;height:2.5rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p style="margin-top:12px;color:var(--dark-muted);font-size:0.875rem;">Loading...</p>
            </div>
        </div>`;
}

function showEmptyState(containerId, message = 'Nothing here yet.', icon = 'bi-inbox') {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `
        <div class="empty-state">
            <i class="bi ${icon}"></i>
            <p>${message}</p>
        </div>`;
}

function requireAuth(allowedRoles = []) {
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    if (allowedRoles.length > 0) {
        const hasAccess = allowedRoles.some(role => Auth.hasRole(role));
        if (!hasAccess) {
            showToast('Access denied.', 'error');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return false;
        }
    }
    return true;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDateShort(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function getStatusPill(status) {
    const map = {
        'Active': 'status-active',
        'Completed': 'status-completed',
        'Pending': 'status-pending',
        'Cancelled': 'status-cancelled',
        'Confirmed': 'status-completed',
        'Expired': 'status-expired',
    };
    const cls = map[status] || 'status-pending';
    return `<span class="status-pill ${cls}">${status}</span>`;
}

function getStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return `
        <span class="stars">
            ${'<i class="bi bi-star-fill"></i>'.repeat(full)}
            ${half ? '<i class="bi bi-star-half"></i>' : ''}
            ${'<i class="bi bi-star"></i>'.repeat(empty)}
        </span>
        <small class="text-muted ms-1">${rating}</small>
    `;
}


function showFieldError(errorId, inputEl, message) {
    const el = document.getElementById(errorId);
    if (el) el.textContent = message;
    if (inputEl) inputEl.classList.add('is-invalid');
}

function clearFieldError(errorId, inputEl) {
    const el = document.getElementById(errorId);
    if (el) el.textContent = '';
    if (inputEl) inputEl.classList.remove('is-invalid');
}

function showFormError(message) {
    const el = document.getElementById('form-error');
    if (el) { el.textContent = message; el.classList.add('show'); }
}

function showFormSuccess(message) {
    const el = document.getElementById('form-success');
    if (el) { el.textContent = message; el.classList.add('show'); }
}

function hideFormMessages() {
    const err = document.getElementById('form-error');
    const suc = document.getElementById('form-success');
    if (err) { err.classList.remove('show'); err.textContent = ''; }
    if (suc) { suc.classList.remove('show'); suc.textContent = ''; }
}

function setupToggle(toggleId, inputId, iconId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!toggle || !input || !icon) return;
    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'bi bi-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'bi bi-eye';
        }
    });
}