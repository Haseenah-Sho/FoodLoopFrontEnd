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
            document.getElementById('dashboard-orders').innerHTML =
                `<div class="empty-state"><p>Could not load orders.</p></div>`;
            return;
        }

        const orders = result.data || [];

        // Stats — cancelled orders don't count toward the total; food items only count once actually rescued (Completed)
        const countedOrders = orders.filter(o => o.status !== 'Cancelled');
        const foodItemsRescued = orders
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + (o.listingNames?.length || 0), 0);

        document.getElementById('stat-total-orders').textContent = countedOrders.length;
        document.getElementById('stat-food-items').textContent = foodItemsRescued;

        // Recent orders preview (last 5)
        const recent = orders.slice(0, 5);
        const container = document.getElementById('dashboard-orders');

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>You haven't placed any orders yet. <a href="index.html#listings">Browse food</a> to get started.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Order No</th>
                        <th>Food Items</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(o => `
                        <tr class="clickable-row" onclick="window.location.href='order-detail.html?id=${o.orderId}'">
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

    function formatDateShort(dateString) {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

});