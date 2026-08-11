document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_customer', 'app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const avatarEl = document.getElementById('sidebar-avatar');
    const usernameEl = document.getElementById('sidebar-username');
    if (avatarEl) avatarEl.textContent = initials;
    if (usernameEl) usernameEl.textContent = name;

    setupSidebar();
    await loadNotifications();

    document.getElementById('mark-all-btn').addEventListener('click', async () => {
        const result = await apiFetch('/notification/mark-all-read', { method: 'PUT' });
        if (result.isSuccessful) {
            showToast('All notifications marked as read.', 'success');
            await loadNotifications();
        }
    });

    async function loadNotifications() {
    const result = await apiFetch('/notification/my-notifications');
    const container = document.getElementById('notifications-container');

    if (!result.isSuccessful) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Could not load notifications.</p>
            </div>`;
        return;
    }

    const notifications = result.data || [];
    const unread = notifications.filter(n => !n.isRead);

    const markAllBtn = document.getElementById('mark-all-btn');
    if (unread.length > 0) markAllBtn.style.display = 'inline-flex';

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-bell"></i>
                <p>No notifications yet.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="notif-list">
            ${notifications.map(n => `
                <div class="notif-item ${n.isRead ? '' : 'unread'}" id="notif-${n.id}">
                    <div class="notif-icon ${notifIconClass(n.notificationType)}">
                        <i class="bi ${notifIcon(n.notificationType)}"></i>
                    </div>
                    <div class="notif-body">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-message">${n.messageContent}</div>
                        <div class="notif-time">${formatDateShort(n.dateCreated)}</div>
                    </div>
                    ${!n.isRead ? `
                        <button class="notif-mark-read" onclick="markRead('${n.id}')">
                            <i class="bi bi-check"></i>
                        </button>` : ''}
                </div>
            `).join('')}
        </div>`;
}

window.markRead = async function(notifId) {
    const result = await apiFetch(`/notification/mark-read/${notifId}`, { method: 'PUT' });
    if (result.isSuccessful) {
        const el = document.getElementById(`notif-${notifId}`);
        if (el) {
            el.classList.remove('unread');
            el.querySelector('.notif-mark-read')?.remove();
        }
        // Hide mark all button if no more unread
        const remaining = document.querySelectorAll('.notif-item.unread');
        if (remaining.length === 0) {
            document.getElementById('mark-all-btn').style.display = 'none';
        }
    }
};

    function notifIcon(type) {
        const map = {
            'NewOrder': 'bi-bag-check',
            'OrderStatusChanged': 'bi-arrow-repeat',
            'PaymentConfirmed': 'bi-credit-card',
            'StrikeIssued': 'bi-exclamation-triangle'
        };
        return map[type] || 'bi-bell';
    }

    function notifIconClass(type) {
        const map = {
            'NewOrder': 'green',
            'OrderStatusChanged': 'amber',
            'PaymentConfirmed': 'green',
            'StrikeIssued': 'red'
        };
        return map[type] || 'green';
    }

    function formatDateShort(dateString) {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            sidebar.classList.add('open'); overlay.classList.add('show');
        });
        document.getElementById('sidebarClose').addEventListener('click', () => {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        });
    }
});