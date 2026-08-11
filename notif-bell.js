// Shared notification bell — REST load on page open, live updates via the existing SignalR connection.
// Include after utils.js, api.js, and signalr.js on any authenticated page with a #notifBellBtn in the topbar.

const NotifBell = {
    unreadCount: 0,
    notifications: [],

    init: async () => {
        const btn = document.getElementById('notifBellBtn');
        if (!btn || !Auth.isLoggedIn()) return;

        const dropdown = document.getElementById('notifDropdown');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) {
                dropdown.classList.remove('open');
            }
        });

        document.getElementById('notifMarkReadBtn').addEventListener('click', NotifBell.markAllRead);

        await NotifBell.load();
    },

    load: async () => {
        const result = await NotificationAPI.getMine();
        if (!result.isSuccessful) return;

        NotifBell.notifications = result.data || [];
        NotifBell.unreadCount = NotifBell.notifications.filter(n => !n.isRead).length;
        NotifBell.renderBadge();
        NotifBell.renderList();
    },

    renderBadge: () => {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        if (NotifBell.unreadCount > 0) {
            badge.textContent = NotifBell.unreadCount > 9 ? '9+' : NotifBell.unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    renderList: () => {
        const list = document.getElementById('notifList');
        if (!list) return;

        if (NotifBell.notifications.length === 0) {
            list.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
            return;
        }

        list.innerHTML = NotifBell.notifications.slice(0, 20).map((n, i) => `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" data-index="${i}">
                <div class="title">${n.title}</div>
                <div class="msg">${n.messageContent}</div>
                <div class="time">${NotifBell.formatDate(n.dateCreated)}</div>
            </div>
        `).join('');

        list.querySelectorAll('.notif-item').forEach(el => {
            el.addEventListener('click', () => {
                const n = NotifBell.notifications[parseInt(el.dataset.index)];
                NotifBell.handleClick(n);
            });
        });
    },

    handleClick: async (notification) => {
        document.getElementById('notifDropdown').classList.remove('open');

        if (!notification.isRead) {
            await NotificationAPI.markRead(notification.id);
            notification.isRead = true;
            NotifBell.unreadCount = Math.max(0, NotifBell.unreadCount - 1);
            NotifBell.renderBadge();
            NotifBell.renderList();
        }

        const type = notification.notificationType;
        if (['NewOrderReceived', 'OrderStatusChanged'].includes(type)) {
            window.location.href = Auth.hasRole('app_vendor') ? 'food-providers-orders.html' : 'my-orders.html';
        } else if (type === 'PaymentConfirmed') {
            window.location.href = 'my-orders.html';
        } else {
            window.location.href = 'notifications.html';
        }
    },

    markAllRead: async () => {
        const result = await NotificationAPI.markAllRead();
        if (!result.isSuccessful) return;
        NotifBell.notifications.forEach(n => n.isRead = true);
        NotifBell.unreadCount = 0;
        NotifBell.renderBadge();
        NotifBell.renderList();
    },

    // Called by signalr.js when a ReceiveNotification event arrives live
    handleLivePush: (data) => {
        NotifBell.notifications.unshift(data);
        NotifBell.unreadCount += 1;
        NotifBell.renderBadge();
        NotifBell.renderList();
    },

    formatDate: (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
};

document.addEventListener('DOMContentLoaded', () => NotifBell.init());