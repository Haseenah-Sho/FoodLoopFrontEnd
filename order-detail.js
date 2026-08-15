document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_customer'])) return;

    const user = Auth.getUser();
    document.getElementById('sidebar-username').textContent = user.name || 'Customer';

    setupSidebar();

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    if (!orderId) {
        window.location.href = 'my-orders.html';
        return;
    }

    await loadOrder();

    async function loadOrder() {
        const result = await OrderAPI.getDetails(orderId);

        document.getElementById('detail-loading').style.display = 'none';

        if (!result.isSuccessful || !result.data) {
            document.getElementById('detail-error').style.display = 'block';
            return;
        }

        renderOrder(result.data);
        document.getElementById('detail-content').style.display = 'block';
    }

    function renderOrder(o) {
        document.getElementById('od-orderNo').textContent = o.orderNo;
        document.getElementById('od-date').textContent = formatDate(o.orderedOn);
        document.getElementById('od-status').innerHTML = statusPill(o);
        document.getElementById('od-timeline').innerHTML = renderStatusTimeline(o);

        document.getElementById('od-vendorName').textContent = o.vendorName;
        document.getElementById('od-vendorPhone').innerHTML = o.vendorPhone
            ? `<i class="bi bi-telephone"></i> ${o.vendorPhone}`
            : '';

        document.getElementById('od-items').innerHTML = o.items.map(i => `
            <div class="od-item">
                ${itemImage(i.imageUrl, i.foodName)}
                <div class="od-item-info">
                    <div class="od-item-name">${i.foodName}</div>
                    <div class="od-item-sub">Qty: ${i.quantity}${i.pickUpStart ? ` · Pickup ${formatDate(i.pickUpStart)} – ${formatDate(i.pickUpEnd)}` : ''}</div>
                </div>
                <div class="od-item-price">${i.isFree ? 'Free' : formatCurrency((i.unitPrice || 0) * i.quantity)}</div>
            </div>
        `).join('');

        document.getElementById('od-fulfilment').textContent =
            o.fulfilmentType === 'Delivery' ? 'Delivery' : 'Pickup';

        if (o.fulfilmentType === 'Delivery' && o.deliveryAddress) {
            document.getElementById('od-address-wrap').style.display = 'flex';
            document.getElementById('od-address').textContent = o.deliveryAddress;
        }

        document.getElementById('od-total').textContent =
            o.totalAmount > 0 ? formatCurrency(o.totalAmount) : 'Free';

        // Completed orders can report a mismatch; delivery orders awaiting the customer's
        // confirmation can either confirm receipt or report a problem the same way.
        const awaitingDeliveryConfirmation =
            o.fulfilmentType === 'Delivery' && o.status === 'Confirmed' && o.deliveryStatus === 'Delivered';

        if (o.status === 'Completed') {
            document.getElementById('mismatch-report').style.display = 'block';
        }

        if (awaitingDeliveryConfirmation) {
            document.getElementById('confirm-delivery-section').style.display = 'block';
        }

        if (o.canCancel) {
            document.getElementById('od-actions').style.display = 'flex';

            if (o.status === 'Pending') {
                const payBtn = document.getElementById('od-pay-btn');
                payBtn.style.display = 'inline-flex';
                payBtn.addEventListener('click', () => payNow(o.orderId, payBtn));
            }

            const editBtn = document.getElementById('od-edit-btn');
            editBtn.style.display = 'inline-flex';
            editBtn.addEventListener('click', () => editOrder(o, editBtn));

            const cancelBtn = document.getElementById('od-cancel-btn');
            cancelBtn.style.display = 'inline-flex';
            cancelBtn.addEventListener('click', () => cancelOrder(o.orderId, cancelBtn));
        }
    }

    async function payNow(id, btn) {
        btn.disabled = true;
        btn.innerHTML = 'Redirecting...';

        const result = await OrderAPI.resumePayment(id);

        if (!result.isSuccessful || !result.data?.paymentAuthorizationUrl) {
            showToast(result.message || 'Could not start payment.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-credit-card"></i> Pay Now';
            return;
        }

        window.location.href = result.data.paymentAuthorizationUrl;
    }

    async function editOrder(o, btn) {
        const firstItem = o.items[0];
        if (!firstItem) return;

        const proceed = confirm(
            'To edit this order, we\'ll cancel it and take you back to the food item so you can adjust the portion and resubmit. Continue?'
        );
        if (!proceed) return;

        btn.disabled = true;
        btn.innerHTML = 'Preparing...';

        const result = await OrderAPI.cancelOrder(o.orderId);

        if (!result.isSuccessful) {
            showToast(result.message || 'Could not start editing this order.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-pencil"></i> Edit Order';
            return;
        }

        window.location.href = `food-items-detail.html?id=${firstItem.listingId}&qty=${firstItem.quantity}`;
    }

    async function cancelOrder(id, btn) {
        if (!confirm('Cancel this order? This cannot be undone.')) return;

        btn.disabled = true;
        btn.textContent = 'Cancelling...';

        const result = await OrderAPI.cancelOrder(id);

        if (!result.isSuccessful) {
            showToast(result.message || 'Could not cancel order.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel Order';
            return;
        }

        showToast('Order cancelled.', 'success');
        setTimeout(() => window.location.reload(), 1000);
    }

    function itemImage(url, alt) {
        if (!url) return `<div class="od-item-img-placeholder"><i class="bi bi-image"></i></div>`;
        const fullUrl = url.startsWith('/') ? `https://localhost:7208${url}` : url;
        return `<img src="${fullUrl}" alt="${alt}" class="od-item-img" onerror="this.outerHTML='<div class=\\'od-item-img-placeholder\\'><i class=\\'bi bi-image\\'></i></div>'">`;
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

    document.getElementById('confirm-receipt-btn').addEventListener('click', async () => {
        const btn = document.getElementById('confirm-receipt-btn');
        btn.disabled = true;
        btn.textContent = 'Confirming...';

        const result = await OrderAPI.confirmDelivery(orderId);

        if (!result.isSuccessful) {
            showToast(result.message || 'Could not confirm receipt.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle"></i> Yes, I Received This';
            return;
        }

        showToast('Thanks for confirming!', 'success');
        setTimeout(() => window.location.reload(), 1000);
    });

    document.getElementById('deny-receipt-btn').addEventListener('click', () => {
        document.getElementById('confirm-delivery-section').style.display = 'none';
        document.getElementById('mismatch-report').style.display = 'block';
        document.getElementById('mismatch-form').style.display = 'block';
        document.getElementById('mismatch-btn').style.display = 'none';
        document.getElementById('mismatchNote').placeholder = "What happened? (e.g. never arrived, wrong address, etc.)";
        document.getElementById('mismatchNote').focus();
    });

    document.getElementById('mismatch-btn').addEventListener('click', () => {
        document.getElementById('mismatch-form').style.display = 'block';
        document.getElementById('mismatch-btn').style.display = 'none';
    });

    document.getElementById('mismatch-submit-btn').addEventListener('click', async () => {
        const note = document.getElementById('mismatchNote').value.trim();
        const errorEl = document.getElementById('mismatch-error');
        errorEl.textContent = '';

        if (!note) {
            errorEl.textContent = 'Please describe what didn\'t match.';
            return;
        }

        const btn = document.getElementById('mismatch-submit-btn');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        const result = await OrderAPI.flagMismatch(orderId, note);

        btn.disabled = false;
        btn.textContent = 'Submit Report';

        if (!result.isSuccessful) {
            errorEl.textContent = result.message || 'Could not submit report.';
            return;
        }

        document.getElementById('mismatch-form').style.display = 'none';
        document.getElementById('mismatch-success').style.display = 'block';
    });
});