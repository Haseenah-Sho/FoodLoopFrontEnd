document.addEventListener('DOMContentLoaded', async () => {

    // Auth guard
    if (!requireAuth(['app_customer'])) return;

    // Populate user info
    const user = Auth.getUser();
    const name = user.name || 'Customer';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const avatarEl = document.getElementById('sidebar-avatar');
    const usernameEl = document.getElementById('sidebar-username');
    const greetingEl = document.getElementById('topbar-greeting');

    if (avatarEl) avatarEl.textContent = initials;
    if (usernameEl) usernameEl.textContent = name;
    if (greetingEl) greetingEl.textContent = `Hi, ${name.split(' ')[0]}`;

    // Mobile sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    toggleBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Load data
    await Promise.all([loadOrders()]);

    async function loadOrders() {
        const result = await OrderAPI.getMyOrders();

        if (!result.isSuccessful) {
            document.getElementById('recent-orders').innerHTML =
                `<div class="empty-state"><p>Could not load orders.</p></div>`;
            return;
        }

        const orders = result.data || [];

        // Stats
        const active = orders.filter(o =>
            o.status === 'Pending' || o.status === 'Confirmed').length;

        const spent = orders
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + o.totalAmount, 0);

        document.getElementById('stat-total-orders').textContent = orders.length;
        document.getElementById('stat-active-orders').textContent = active;
        document.getElementById('stat-total-spent').textContent =
            spent > 0 ? formatCurrency(spent) : '₦0';

        // Recent orders table (last 5)
        const recent = orders.slice(0, 5);
        const container = document.getElementById('recent-orders');

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-bag"></i>
                    <p>You haven't placed any orders yet. <a href="index.html#listings">Browse food</a> to get started.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Order No</th>
                        <th>Items</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(o => `
                        <tr>
                            <td class="food-name">${o.orderNo}</td>
                            <td>${o.listingNames?.join(', ') || '—'}</td>
                            <td>${o.totalAmount > 0 ? formatCurrency(o.totalAmount) : 'Free'}</td>
                            <td>${statusPill(o.status)}</td>
                            <td>${formatDateShort(o.orderedOn)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    function statusPill(status) {
        const map = {
            'Confirmed': 'status-confirmed',
            'Pending': 'status-pending',
            'Completed': 'status-completed',
            'Cancelled': 'status-cancelled'
        };
        return `<span class="status-pill ${map[status] || 'status-pending'}">${status}</span>`;
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

    function formatDateShort(dateString) {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

});