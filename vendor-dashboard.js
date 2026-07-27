document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Vendor';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('sidebar-username').textContent = name;
    document.getElementById('topbar-greeting').textContent = `Hi, ${name.split(' ')[0]}`;

    // Mobile sidebar
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

    // Check approval status from login response
    const vendorApproved = user.vendorApproved;
    if (vendorApproved === false) {
        document.getElementById('approval-banner').style.display = 'flex';
        document.getElementById('create-listing-btn').style.pointerEvents = 'none';
        document.getElementById('create-listing-btn').style.opacity = '0.5';
    }

    // Load data
    await Promise.all([loadListings(), loadOrders(), loadTransactions()]);

    async function loadListings() {
    const result = await ListingAPI.getVendorListings();

    if (!result.isSuccessful) {
        document.getElementById('recent-listings').innerHTML =
            `<div class="empty-state"><i class="bi bi-bag-x"></i><p>No listings available.</p></div>`;
        document.getElementById('stat-listings').textContent = '0';
        return;
    }

    const listings = result.data || [];
    const active = listings.filter(l => l.status === 'Active');
    document.getElementById('stat-listings').textContent = active.length;

    const recent = listings.slice(0, 5);
    const container = document.getElementById('recent-listings');

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-bag"></i>
                <p>${vendor?.isApproved === false
                    ? 'Your account needs admin approval before you can create listings.'
                    : 'No listings yet. <a href="create-listing.html">Create your first listing</a>.'
                }</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <table class="dash-table">
            <thead>
                <tr>
                    <th>Food Name</th>
                    <th>Price</th>
                    <th>Remaining</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${recent.map(l => `
                    <tr>
                        <td class="food-name">${l.foodName}</td>
                        <td>${l.isFree ? 'Free' : formatCurrency(l.price)}</td>
                        <td>${l.remainingPortion} left</td>
                        <td>${listingStatusPill(l.status)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

    async function loadOrders() {
        const result = await OrderAPI.getMyVendorOrders();

        if (!result.isSuccessful) {
            document.getElementById('recent-orders').innerHTML =
                `<div class="empty-state"><i class="bi bi-receipt"></i><p>Could not load orders.</p></div>`;
            document.getElementById('stat-orders').textContent = '0';
            return;
        }

        const orders = result.data || [];
        document.getElementById('stat-orders').textContent = orders.length;

        const recent = orders.slice(0, 5);
        const container = document.getElementById('recent-orders');

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-receipt"></i>
                    <p>No orders received yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Order No</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(o => `
                        <tr>
                            <td class="food-name">${o.orderNo}</td>
                            <td>${o.customerName || '-'}</td>
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

    function listingStatusPill(status) {
        const map = {
            'Active': 'status-confirmed',
            'Completed': 'status-completed',
            'Expired': 'status-cancelled'
        };
        return `<span class="status-pill ${map[status] || 'status-pending'}">${status || 'Active'}</span>`;
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