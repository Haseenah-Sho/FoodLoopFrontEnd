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
            ? `<i class="bi bi-telephone"></i> ${escapeHtml(o.vendorPhone)}`
            : '';

        document.getElementById('od-items').innerHTML = o.items.map(i => `
            <div class="od-item">
                ${itemImage(i.imageUrl, i.foodName)}
                <div class="od-item-info">
                    <div class="od-item-name">${escapeHtml(i.foodName)}</div>
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

        // Completed orders can be rated and can report a mismatch; delivery orders awaiting the
        // customer's confirmation can either confirm receipt or report a problem the same way.
        const awaitingDeliveryConfirmation =
            o.fulfilmentType === 'Delivery' && o.status === 'Confirmed' && o.deliveryStatus === 'Delivered';

        if (o.status === 'Completed') {
            renderRatingSection(o);
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

    // ── Ratings: one card per item, only on completed orders ──
    function renderRatingSection(o) {
        const section = document.getElementById('rate-section');
        if (!section) return;

        // hasRated is optional: if the server doesn't send it yet, every item is shown
        const toRate = o.items.filter(i => i.hasRated !== true);
        section.style.display = 'block';

        if (toRate.length === 0) {
            section.innerHTML = '<div class="rate-done"><i class="bi bi-check-circle"></i> Thanks for reviewing your food.</div>';
            return;
        }

        section.innerHTML = '<div class="order-detail-section-title">Rate your food</div>' +
            toRate.map(i => `
                <div class="rate-card" data-listing="${escapeHtml(i.listingId)}">
                    <div class="rate-card-title">${escapeHtml(i.foodName)}</div>
                    <div class="rate-stars">
                        ${[1, 2, 3, 4, 5].map(n =>
                            `<i class="bi bi-star" data-value="${n}" aria-label="${n} star${n > 1 ? 's' : ''}"></i>`).join('')}
                    </div>
                    <textarea class="dash-input dash-textarea rate-comment" rows="2" maxlength="500"
                        placeholder="How was it? (optional)"></textarea>
                    <div class="dash-field-error rate-error"></div>
                    <button type="button" class="btn-primary-sm rate-submit" style="align-self:flex-start;">Submit review</button>
                </div>
            `).join('');

        section.querySelectorAll('.rate-card').forEach(setupRateCard);
    }

    function setupRateCard(card) {
        const stars = card.querySelectorAll('.rate-stars i');
        const errorEl = card.querySelector('.rate-error');
        const submitBtn = card.querySelector('.rate-submit');
        let selected = 0;

        const paint = (upTo) => stars.forEach(s => {
            s.className = parseInt(s.dataset.value) <= upTo ? 'bi bi-star-fill active' : 'bi bi-star';
        });

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selected = parseInt(star.dataset.value);
                errorEl.textContent = '';
                paint(selected);
            });
            star.addEventListener('mouseover', () => paint(parseInt(star.dataset.value)));
            star.addEventListener('mouseout', () => paint(selected));
        });

        submitBtn.addEventListener('click', async () => {
            errorEl.textContent = '';

            if (selected === 0) {
                errorEl.textContent = 'Please choose a star rating.';
                return;
            }

            const comment = card.querySelector('.rate-comment').value.trim();

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            const result = await RatingAPI.add({
                listingId: card.dataset.listing,
                stars: selected,
                comment: comment || null
            });

            if (!result.isSuccessful) {
                if (/already/i.test(result.message || '')) {
                    card.innerHTML = '<div class="rate-done">You have already reviewed this item.</div>';
                    return;
                }
                errorEl.textContent = result.message || 'Could not submit your review.';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit review';
                return;
            }

            card.innerHTML = '<div class="rate-done"><i class="bi bi-check-circle"></i> Thanks for your review!</div>';
        });
    }

    async function payNow(id, btn) {
        btn.disabled = true;
        btn.innerHTML = 'Redirecting...';

        const result = await OrderAPI.resumePayment(id);

        // Payment had already gone through: no new payment link, just refresh
        if (result.isSuccessful && !result.data?.paymentAuthorizationUrl) {
            showToast(result.message, 'success');
            setTimeout(() => window.location.reload(), 1200);
            return;
        }

        if (!result.isSuccessful || !result.data?.paymentAuthorizationUrl) {
            showToast(result.message || 'Could not start payment.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-credit-card"></i> Pay Now';
            return;
        }

        window.location.href = result.data.paymentAuthorizationUrl;
    }

    // Shared by Edit and Cancel: restore the button, and refresh if the order has moved on
    function handleCancelFailure(result, btn, restoreHtml, fallbackMessage) {
        showToast(result.message || fallbackMessage, 'error');
        btn.disabled = false;
        btn.innerHTML = restoreHtml;

        if (/already received|no longer be cancelled/i.test(result.message || '')) {
            setTimeout(() => window.location.reload(), 2500);
        }
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
            handleCancelFailure(
                result, btn,
                '<i class="bi bi-pencil"></i> Edit Order',
                'Could not start editing this order.');
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
            handleCancelFailure(
                result, btn,
                '<i class="bi bi-x-circle"></i> Cancel Order',
                'Could not cancel this order.');
            return;
        }

        showToast('Order cancelled.', 'success');
        setTimeout(() => window.location.reload(), 1000);
    }

    function itemImage(url, alt) {
        if (!url) return `<div class="od-item-img-placeholder"><i class="bi bi-image"></i></div>`;
        return `<img src="${escapeHtml(resolveImageUrl(url))}" alt="${escapeHtml(alt)}" class="od-item-img" onerror="this.outerHTML='<div class=\\'od-item-img-placeholder\\'><i class=\\'bi bi-image\\'></i></div>'">`;
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