document.addEventListener('DOMContentLoaded', () => {

    setupBackLink();

    let selectedFulfilment = null;
    let selectedZoneId = null;
    let selectedZoneFee = 0;
    let deliveryZones = [];

    render();

    function setupBackLink() {
        const backLink = document.getElementById('back-link');
        if (Auth.isLoggedIn() && Auth.hasRole('app_customer')) {
            backLink.href = 'customer-dashboard.html';
            backLink.innerHTML = '<i class="bi bi-arrow-left"></i> Back to Dashboard';
        }
    }

    function render() {
        const cart = Cart.get();

        if (!cart || cart.items.length === 0) {
            document.getElementById('checkout-empty').style.display = 'block';
            document.getElementById('checkout-layout').style.display = 'none';
            return;
        }

        document.getElementById('checkout-empty').style.display = 'none';
        document.getElementById('checkout-layout').style.display = 'grid';

        document.getElementById('checkout-vendor-name').textContent = cart.vendorName;

        document.getElementById('checkout-items-list').innerHTML = cart.items.map(item => {
            const lineTotal = item.isFree ? 0 : (item.price || 0) * item.quantity;
            const imgUrl = item.imageUrl
                ? (item.imageUrl.startsWith('/') ? `https://localhost:7208${item.imageUrl}` : item.imageUrl)
                : null;

            return `
                <div class="checkout-item" data-id="${item.listingId}">
                    ${imgUrl
                        ? `<img src="${imgUrl}" class="checkout-item-img" alt="${item.foodName}" onerror="this.outerHTML='<div class=\\'checkout-item-img-placeholder\\'><i class=\\'bi bi-image\\'></i></div>'">`
                        : `<div class="checkout-item-img-placeholder"><i class="bi bi-image"></i></div>`}
                    <div class="checkout-item-info">
                        <div class="checkout-item-name">${item.foodName}</div>
                        <div class="checkout-item-price">${item.isFree ? 'Free' : formatCurrency(item.price) + ' each'}</div>
                    </div>
                    <div class="checkout-item-controls">
                        <div class="checkout-qty-controls">
                            <button class="qty-minus" data-id="${item.listingId}" ${item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="checkout-qty-value">${item.quantity}</span>
                            <button class="qty-plus" data-id="${item.listingId}" ${item.quantity >= item.maxQty ? 'disabled' : ''}>
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                        <div class="checkout-item-line-total">${item.isFree ? 'Free' : formatCurrency(lineTotal)}</div>
                        <button class="checkout-item-remove" data-id="${item.listingId}" title="Remove">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        wireItemControls();
        renderFulfilmentOptions(cart);
        updateSummary(cart);
    }

    function wireItemControls() {
        document.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => {
                const cart = Cart.get();
                const item = cart.items.find(i => i.listingId === btn.dataset.id);
                if (item) Cart.updateQuantity(item.listingId, item.quantity + 1);
                render();
            });
        });

        document.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => {
                const cart = Cart.get();
                const item = cart.items.find(i => i.listingId === btn.dataset.id);
                if (item) Cart.updateQuantity(item.listingId, item.quantity - 1);
                render();
            });
        });

        document.querySelectorAll('.checkout-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                Cart.remove(btn.dataset.id);
                render();
            });
        });
    }

    // Fulfilment must be supported by every item in the cart (intersection)
    async function renderFulfilmentOptions(cart) {
        const canPickup = cart.items.every(i => i.pickUpAvailable);
        let canDeliver = cart.items.every(i => i.deliveryAvailable);

        if (canDeliver) {
            const zonesResult = await VendorAPI.getPublicDeliveryZones(cart.vendorId);
            deliveryZones = (zonesResult.isSuccessful && zonesResult.data) ? zonesResult.data : [];
            canDeliver = deliveryZones.length > 0;
        } else {
            deliveryZones = [];
        }

        const btnsEl = document.getElementById('fulfillment-btns');
        const conflictEl = document.getElementById('fulfilment-conflict');
        const placeOrderBtn = document.getElementById('place-order-btn');

        if (!canPickup && !canDeliver) {
            conflictEl.style.display = 'flex';
            btnsEl.innerHTML = '';
            placeOrderBtn.disabled = true;
            selectedFulfilment = null;
            return;
        }

        conflictEl.style.display = 'none';
        placeOrderBtn.disabled = false;

        if (!selectedFulfilment || (selectedFulfilment === 'PickUp' && !canPickup) || (selectedFulfilment === 'Delivery' && !canDeliver)) {
            selectedFulfilment = canPickup ? 'PickUp' : 'Delivery';
        }

        btnsEl.innerHTML = `
            ${canPickup ? `<button type="button" class="fulfillment-btn ${selectedFulfilment === 'PickUp' ? 'active' : ''}" data-value="PickUp"><i class="bi bi-bag-check"></i> Pickup</button>` : ''}
            ${canDeliver ? `<button type="button" class="fulfillment-btn ${selectedFulfilment === 'Delivery' ? 'active' : ''}" data-value="Delivery"><i class="bi bi-bicycle"></i> Delivery</button>` : ''}
        `;

        document.getElementById('delivery-address-wrap').style.display =
            selectedFulfilment === 'Delivery' ? 'block' : 'none';

        if (selectedFulfilment === 'Delivery') populateZoneSelect();

        btnsEl.querySelectorAll('.fulfillment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedFulfilment = btn.dataset.value;
                selectedZoneId = null;
                selectedZoneFee = 0;
                const cart = Cart.get();
                renderFulfilmentOptions(cart);
                updateSummary(cart);
            });
        });
    }

    function populateZoneSelect() {
        const select = document.getElementById('checkoutZoneSelect');
        select.innerHTML = '<option value="">Select your area</option>' +
            deliveryZones.map(z =>
                `<option value="${z.zoneId}" data-fee="${z.fee}">${z.zoneName} — ${formatCurrency(z.fee)}</option>`
            ).join('');

        select.onchange = () => {
            const opt = select.selectedOptions[0];
            selectedZoneId = select.value || null;
            selectedZoneFee = select.value ? parseFloat(opt.dataset.fee) : 0;
            updateSummary(Cart.get());
        };
    }

    function updateSummary(cart) {
        const subtotal = cart.items.reduce((sum, i) => sum + (i.isFree ? 0 : (i.price || 0) * i.quantity), 0);
        const deliveryFee = selectedFulfilment === 'Delivery' ? selectedZoneFee : 0;
        const total = subtotal + deliveryFee;

        document.getElementById('checkout-subtotal').textContent = subtotal > 0 ? formatCurrency(subtotal) : 'Free';

        if (deliveryFee > 0) {
            document.getElementById('checkout-delivery-row').style.display = 'flex';
            document.getElementById('checkout-delivery-fee').textContent = formatCurrency(deliveryFee);
        } else {
            document.getElementById('checkout-delivery-row').style.display = 'none';
        }

        document.getElementById('checkout-total').textContent = total > 0 ? formatCurrency(total) : 'Free';
    }

    document.getElementById('place-order-btn').addEventListener('click', async () => {
        const errorEl = document.getElementById('checkout-error');
        errorEl.style.display = 'none';

        const cart = Cart.get();
        if (!cart || cart.items.length === 0) return;

        if (!selectedFulfilment) {
            showCheckoutError('Please select a fulfilment method.');
            return;
        }

        const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
        if (selectedFulfilment === 'Delivery' && !deliveryAddress) {
            showCheckoutError('Please enter your delivery address.');
            return;
        }
        if (selectedFulfilment === 'Delivery' && !selectedZoneId) {
            showCheckoutError('Please select your delivery area.');
            return;
        }

        if (!Auth.isLoggedIn() || !Auth.hasRole('app_customer')) {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            return;
        }

        setPlaceOrderLoading(true);

        const payload = {
            items: cart.items.map(i => ({ listingId: i.listingId, quantity: i.quantity })),
            fulfilmentType: selectedFulfilment === 'PickUp' ? 1 : 2,
            deliveryAddress: selectedFulfilment === 'Delivery' ? deliveryAddress : null,
            deliveryZoneId: selectedFulfilment === 'Delivery' ? selectedZoneId : null
        };

        const result = await OrderAPI.place(payload);
        setPlaceOrderLoading(false);

        if (!result.isSuccessful) {
            showCheckoutError(result.message || 'Checkout failed. Please try again.');
            return;
        }

        Cart.clear();

        if (result.data.paymentAuthorizationUrl) {
            showToast('Order placed! Redirecting to payment...', 'success');
            setTimeout(() => {
                window.location.href = result.data.paymentAuthorizationUrl;
            }, 1200);
            return;
        }

        showToast('Order placed successfully!', 'success');
        setTimeout(() => window.location.href = 'my-orders.html', 1200);
    });

    function showCheckoutError(msg) {
        const el = document.getElementById('checkout-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function setPlaceOrderLoading(loading) {
        const btn = document.getElementById('place-order-btn');
        const text = document.getElementById('place-order-btn-text');
        const spinner = document.getElementById('place-order-spinner');
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('show', loading);
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }
});