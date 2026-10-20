document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Food Provider';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let allOrders = [];
    let activeFilter = 'all';
    let actionBusy = false;

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
            content.innerHTML = `<p style="color:#c62828;font-size:0.875rem;">${escapeHtml(result.message || 'Order not found.')}</p>`;
            return;
        }

        const o = result.data;
        const canDispatch = o.status === 'Confirmed'
            && o.fulfilmentType === 'Delivery'
            && (!o.deliveryStatus || o.deliveryStatus === 'Pending');

        content.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;gap:24px;flex-wrap:wrap;">
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Order No</div>
                    <div style="font-weight:700;">${escapeHtml(o.orderNo)}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Customer</div>
                    <div style="font-weight:700;">${escapeHtml(o.customerName)}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Phone</div>
                    <div style="font-weight:700;">${escapeHtml(o.customerPhoneNumber || '-')}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Fulfilment</div>
                    <div style="font-weight:700;">${escapeHtml(o.fulfilmentType)}</div></div>
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Status</div>
                    <div>${statusPill(o)}</div></div>
                    ${o.fulfilmentType === 'Delivery' && o.deliveryAddress ? `
                    <div><div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;">Deliver To</div>
                    <div style="font-weight:700;">${escapeHtml(o.deliveryAddress)}${o.deliveryZoneName ? ' (' + escapeHtml(o.deliveryZoneName) + ')' : ''}</div></div>` : ''}
                </div>

                <div>
                    <div style="font-size:0.75rem;color:var(--dark-muted);font-weight:600;text-transform:uppercase;margin-bottom:8px;">Items</div>
                    ${o.items.map(i => `
                        <div style="font-size:0.875rem;padding:6px 0;border-bottom:1px solid var(--border);">
                            ${escapeHtml(i.foodName)} × ${i.quantity}
                        </div>`).join('')}
                </div>

                ${o.status === 'Pending' ? `
                    <div style="font-size:0.82rem;color:#b26a00;background:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;padding:10px 12px;">
                        Waiting for the customer's payment. You can't mark this order as picked up or dispatched yet.
                    </div>` : ''}

                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${o.customerPhoneNumber ? `
                        <a href="tel:${escapeHtml(o.customerPhoneNumber)}" class="btn-primary-sm" style="background:var(--accent);border-color:var(--accent);">
                            <i class="bi bi-telephone-fill"></i> Call Customer
                        </a>` : ''}
                    ${o.status === 'Confirmed' && o.fulfilmentType === 'PickUp' ? `
                        <button class="btn-primary-sm" onclick="verifyPickup('${escapeHtml(o.orderNo)}')">
                            <i class="bi bi-check-circle"></i> Picked Up
                        </button>` : ''}
                    ${canDispatch ? `
                        <button class="btn-primary-sm" onclick="dispatchDelivery('${escapeHtml(o.orderNo)}')">
                            <i class="bi bi-bicycle"></i> Dispatched
                        </button>` : ''}
                    ${o.deliveryStatus === 'Dispatched' ? `
                        <button class="btn-primary-sm" onclick="markDelivered('${escapeHtml(o.orderNo)}')">
                            <i class="bi bi-patch-check"></i> Delivered
                        </button>` : ''}
                </div>
            </div>`;
    }

    window.closeLookup = function() {
        document.getElementById('lookup-result').style.display = 'none';
        document.getElementById('orderNoInput').value = '';
    };

    // Ignore a click while another action is still running
    async function runAction(fn) {
        if (actionBusy) return;
        actionBusy = true;
        try {
            await fn();
        } finally {
            actionBusy = false;
        }
    }

    window.verifyPickup = (orderNo) => runAction(async () => {
        const result = await OrderAPI.verifyPickup(orderNo);
        if (result.isSuccessful) {
            showToast('Order marked as picked up.', 'success');
            window.closeLookup();
            await loadOrders();
        } else {
            showToast(result.message || 'Failed to verify pickup.', 'error');
        }
    });

    window.dispatchDelivery = (orderNo) => runAction(async () => {
        const result = await OrderAPI.dispatchDelivery(orderNo);
        if (result.isSuccessful) {
            showToast('Order dispatched.', 'success');
            window.closeLookup();
            await loadOrders();
        } else {
            showToast(result.message || 'Failed to dispatch.', 'error');
        }
    });

    window.markDelivered = (orderNo) => runAction(async () => {
        const result = await OrderAPI.markDelivered(orderNo);
        if (result.isSuccessful) {
            showToast('Order marked as delivered.', 'success');
            window.closeLookup();
            await loadOrders();
        } else {
            showToast(result.message || 'Failed to mark as delivered.', 'error');
        }
    });

    async function loadOrders() {
        const result = await OrderAPI.getMyVendorOrders();
        if (!result.isSuccessful) {
            document.getElementById('orders-container').innerHTML =
                `<div class="empty-state"><p>Could not load orders.</p></div>`;
            return;
        }
        allOrders = result.data || [];
        renderOrders(activeFilter === 'all'
            ? allOrders
            : allOrders.filter(o => o.status === activeFilter));
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
                        <tr class="order-row" data-order-no="${escapeHtml(o.orderNo)}" style="cursor:pointer;">
                            <td class="food-name">${escapeHtml(o.orderNo)}</td>
                            <td>${escapeHtml(o.customerName || '-')}</td>
                            <td>${o.totalAmount > 0 ? formatCurrency(o.totalAmount) : 'Free'}</td>
                            <td>${escapeHtml(o.fulfilmentType)}</td>
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

    // Only paid, live orders get a Call button
    function callButton(o) {
        if (o.status !== 'Confirmed' || !o.customerPhoneNumber) return '-';
        return `<a href="tel:${escapeHtml(o.customerPhoneNumber)}" class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;background:var(--accent);border-color:var(--accent);">
            <i class="bi bi-telephone-fill"></i> Call
        </a>`;
    }

    function actionButton(o) {
        if (o.status === 'Confirmed' && o.fulfilmentType === 'PickUp') {
            return `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="verifyPickup('${escapeHtml(o.orderNo)}')">Picked Up</button>`;
        }
        if (o.status === 'Confirmed' && o.fulfilmentType === 'Delivery' && (!o.deliveryStatus || o.deliveryStatus === 'Pending')) {
            return `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="dispatchDelivery('${escapeHtml(o.orderNo)}')">Dispatched</button>`;
        }
        if (o.deliveryStatus === 'Dispatched') {
            return `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="markDelivered('${escapeHtml(o.orderNo)}')">Delivered</button>`;
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
        let html = `<span class="status-pill ${map[o.status] || 'status-pending'}">${escapeHtml(o.status)}</span>`;
        if (o.fulfilmentType === 'Delivery' && o.deliveryStatus) {
            html += ` <span class="status-pill status-confirmed">${escapeHtml(o.deliveryStatus)}</span>`;
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