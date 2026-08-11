document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_customer'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Customer';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let allOrders = [];
    let activeFilter = 'all';

    await loadOrders();

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            renderOrders(activeFilter === 'all'
                ? allOrders
                : allOrders.filter(o => o.status === activeFilter));
        });
    });

    async function loadOrders() {
        const result = await OrderAPI.getMyOrders();

        if (!result.isSuccessful) {
            document.getElementById('orders-container').innerHTML =
                `<div class="empty-state"><p>Could not load orders.</p></div>`;
            return;
        }

        allOrders = result.data || [];
        renderOrders(allOrders);
    }

    function renderOrders(orders) {
        const container = document.getElementById('orders-container');

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No orders found. <a href="index.html#listings">Browse food</a> to place your first order.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="order-cards">
                ${orders.map(o => `
                    <div class="order-card" onclick="window.location.href='order-detail.html?id=${o.orderId}'">
                        <div class="order-card-left">
                            <div class="order-card-no">${o.orderNo}</div>
                            <div class="order-card-items">
                                ${o.listingNames?.join(', ') || '—'}
                            </div>
                            <div class="order-card-date">${formatDateShort(o.orderedOn)}</div>
                        </div>
                        <div class="order-card-right">
                            <div class="order-card-amount ${o.totalAmount === 0 ? 'free' : ''}">
                                ${o.totalAmount > 0 ? formatCurrency(o.totalAmount) : 'Free'}
                            </div>
                            ${statusPill(o.status)}
                            ${o.status === 'Pending' ? `
                                <button class="btn-primary-sm pay-now-btn"
                                   data-order-id="${o.orderId}"
                                   style="font-size:0.75rem;padding:5px 12px;"
                                   onclick="event.stopPropagation()">
                                   Pay Now
                                </button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>`;

        container.querySelectorAll('.pay-now-btn').forEach(btn => {
            btn.addEventListener('click', () => payNow(btn.dataset.orderId, btn));
        });
    }

    async function payNow(orderId, btn) {
        btn.disabled = true;
        btn.textContent = 'Redirecting...';

        const result = await OrderAPI.resumePayment(orderId);

        if (!result.isSuccessful || !result.data?.paymentAuthorizationUrl) {
            showToast(result.message || 'Could not start payment.', 'error');
            btn.disabled = false;
            btn.textContent = 'Pay Now';
            return;
        }

        window.location.href = result.data.paymentAuthorizationUrl;
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

    function setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');
        const closeBtn = document.getElementById('sidebarClose');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        });

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

});