document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Food Provider';
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

    // Order lookup
    document.getElementById('lookupBtn').addEventListener('click', () => lookupOrder());
    document.getElementById('orderNoInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') lookupOrder();
    });

    async function lookupOrder(orderNoOverride) {
        const orderNo = orderNoOverride || document.getElementById('orderNoInput').value.trim();
        if (!orderNo) return;

        document.getElementById('orderNoInput').value = orderNo;

        const result = await OrderAPI.lookup(orderNo);
        const container = document.getElementById('lookup-result');
        const content = document.getElementById('lookup-content');

        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (!result.isSuccessful) {
            content.innerHTML = `<p style="color:#c62828;font-size:0.875rem;">${result.message}</p>`;
            return;
        }

        const o = result.data;
        content.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;gap:24px;flex-wrap:wrap;">
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Order No</div>
                    <div style="font-weight:700;">${o.orderNo}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Customer</div>
                    <div style="font-weight:700;">${o.customerName}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Phone</div>
                    <div style="font-weight:700;">${o.customerPhoneNumber || '-'}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Fulfilment</div>
                    <div style="font-weight:700;">${o.fulfilmentType}</div></div>
                    <div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Status</div>
                    <div>${statusPill(o)}</div></div>
                </div>
                <div>
                    <div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;margin-bottom:8px;">Items</div>
                    ${o.items.map(i => `
                        <div style="font-size:0.875rem;padding:6px 0;border-bottom:1px solid var(--border);">
                            ${i.foodName} × ${i.quantity}
                        </div>`).join('')}
                </div>

                ${o.customerPhoneNumber ? `
                    <a href="tel:${o.customerPhoneNumber}" class="btn-primary-sm" style="background:var(--accent);border-color:var(--accent);">
                        <i class="bi bi-telephone-fill"></i> Call Customer
                    </a>` : ''}
                ${o.status === 'Confirmed' && o.fulfilmentType === 'PickUp' ? `
                    <button class="btn-primary-sm" onclick="verifyPickup('${o.orderNo}')">
                        <i class="bi bi-check-circle"></i> Mark as Picked Up
                    </button>` : ''}
                ${o.status === 'Confirmed' && o.fulfilmentType === 'PickUp' ? `
                    <button class="btn-primary-sm" onclick="verifyPickup('${o.orderNo}')">
                        <i class="bi bi-check-circle"></i> Mark as Picked Up
                    </button>` : ''}
                ${o.status === 'Confirmed' && o.fulfilmentType === 'Delivery' ? `
                    <button class="btn-primary-sm" onclick="dispatchDelivery('${o.orderNo}')">
                        <i class="bi bi-bicycle"></i> Mark as Dispatched
                    </button>` : ''}
                ${o.deliveryStatus === 'Dispatched' ? `
                    <button class="btn-primary-sm" onclick="markDelivered('${o.orderNo}')">
                        <i class="bi bi-patch-check"></i> Mark as Delivered
                    </button>
                ` : ''}
            </div>`;
    }

    window.closeLookup = function() {
        document.getElementById('lookup-result').style.display = 'none';
        document.getElementById('orderNoInput').value = '';
    };

    window.verifyPickup = async function(orderNo) {
        const result = await OrderAPI.verifyPickup(orderNo);
        if (result.isSuccessful) {
            showToast('Order as been picked up.', 'success');
            window.closeLookup();
            await loadOrders();
        } else {
            showToast(result.message || 'Failed to verify pickup.', 'error');
        }
    };

    window.dispatchDelivery = async function(orderNo) {
        const result = await OrderAPI.dispatchDelivery(orderNo);
        if (result.isSuccessful) {
            showToast('Order dispatched.', 'success');
            window.closeLookup();
            await loadOrders();
        } else {
            showToast(result.message || 'Failed to dispatch.', 'error');
        }
    };

    window.markDelivered = async function(orderNo) {
        const result = await OrderAPI.markDelivered(orderNo);
        if (result.isSuccessful) {
            showToast('Order has been delivered.', 'success');
            window.closeLookup();
            await loadOrders();
        } else {
            showToast(result.message || 'Failed to be delivered.', 'error');
        }
    };

    async function loadOrders() {
        const result = await OrderAPI.getMyVendorOrders();
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
                    <p>No orders found.</p>
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
                        <th>Fulfilment</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Call</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                        <tr class="order-row" data-order-no="${o.orderNo}" style="cursor:pointer;">
                            <td class="food-name">${o.orderNo}</td>
                            <td>${o.customerName || '-'}</td>
                            <td>${o.totalAmount > 0 ? formatCurrency(o.totalAmount) : 'Free'}</td>
                            <td>${o.fulfilmentType}</td>
                            <td>${statusPill(o)}</td>
                            <td>${formatDateShort(o.orderedOn)}</td>
                            <td onclick="event.stopPropagation()">${callButton(o)}</td>
                            <td onclick="event.stopPropagation()">${actionButton(o)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;

        container.querySelectorAll('.order-row').forEach(row => {
            row.addEventListener('click', () => lookupOrder(row.dataset.orderNo));
        });
    }

    function callButton(o) {
        if (!o.customerPhoneNumber) return '-';
        return `<a href="tel:${o.customerPhoneNumber}" class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;background:var(--accent);border-color:var(--accent);">
            <i class="bi bi-telephone-fill"></i> Call
        </a>`;
    }

    function actionButton(o) {
        if (o.status === 'Confirmed' && o.fulfilmentType === 'PickUp') {
            return `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="verifyPickup('${o.orderNo}')">Mark Picked Up</button>`;
        }
        if (o.status === 'Confirmed' && o.fulfilmentType === 'Delivery' && !o.deliveryStatus) {
            return `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="dispatchDelivery('${o.orderNo}')">Mark Dispatched</button>`;
        }
        if (o.deliveryStatus === 'Dispatched') {
            return `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="markDelivered('${o.orderNo}')">Mark Delivered</button>`;
        }
        return '-';
    }

    function statusPill(o) {
        const map = {
            'Confirmed': 'status-confirmed',
            'Pending': 'status-pending',
            'Completed': 'status-completed',
            'Cancelled': 'status-cancelled'
        };
        let html = `<span class="status-pill ${map[o.status] || 'status-pending'}">${o.status}</span>`;
        if (o.fulfilmentType === 'Delivery' && o.deliveryStatus) {
            html += ` <span class="status-pill status-confirmed">${o.deliveryStatus}</span>`;
        }
        return html;
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