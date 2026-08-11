document.addEventListener('DOMContentLoaded', () => {

    setupNav();

    let selectedFulfilment = null;

    render();

    // Called by signalr.js when a cart item's stock changes live
    window.onCartStockSync = (syncResult) => {
        if (syncResult.removed) {
            showToast(`${syncResult.foodName} is no longer available and was removed from your cart.`, 'error');
        } else if (syncResult.adjusted) {
            showToast(`Only ${syncResult.newQty} left of ${syncResult.foodName} — quantity updated.`, 'error');
        }
        render();
    };

    function setupNav() {
        if (Auth.isLoggedIn() && Auth.hasRole('app_customer')) {
            document.getElementById('nav-guest-actions').style.display = 'none';
            document.getElementById('nav-user-actions').style.display = 'flex';
            document.getElementById('nav-username').textContent = (Auth.getUser().name || 'Customer').split(' ')[0];
        }
    }

    function render() {
        const cart = Cart.get();

        if (!cart || cart.items.length === 0) {
            document.getElementById('cart-empty').style.display = 'block';
            document.getElementById('cart-layout').style.display = 'none';
            return;
        }

        document.getElementById('cart-empty').style.display = 'none';
        document.getElementById('cart-layout').style.display = 'grid';

        document.getElementById('cart-vendor-name').textContent = cart.vendorName;

        document.getElementById('cart-items-list').innerHTML = cart.items.map(item => {
            const lineTotal = item.isFree ? 0 : (item.price || 0) * item.quantity;
            const imgUrl = item.imageUrl
                ? (item.imageUrl.startsWith('/') ? `https://localhost:7208${item.imageUrl}` : item.imageUrl)
                : null;

            return `
                <div class="cart-item" data-id="${item.listingId}">
                    ${imgUrl
                        ? `<img src="${imgUrl}" class="cart-item-img" alt="${item.foodName}" onerror="this.outerHTML='<div class=\\'cart-item-img-placeholder\\'><i class=\\'bi bi-image\\'></i></div>'">`
                        : `<div class="cart-item-img-placeholder"><i class="bi bi-image"></i></div>`}
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.foodName}</div>
                        <div class="cart-item-price">${item.isFree ? 'Free' : formatCurrency(item.price) + ' each'}</div>
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-qty-controls">
                            <button class="cart-qty-btn qty-minus" data-id="${item.listingId}" ${item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="cart-qty-value">${item.quantity}</span>
                            <button class="cart-qty-btn qty-plus" data-id="${item.listingId}" ${item.quantity >= item.maxQty ? 'disabled' : ''}>
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                        <div class="cart-item-line-total">${item.isFree ? 'Free' : formatCurrency(lineTotal)}</div>
                        <button class="cart-item-remove" data-id="${item.listingId}" title="Remove">
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

        document.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                Cart.remove(btn.dataset.id);
                render();
            });
        });
    }

    // Fulfilment must be supported by every item in the cart (intersection)
    function renderFulfilmentOptions(cart) {
        const canPickup = cart.items.every(i => i.pickUpAvailable);
        const canDeliver = cart.items.every(i => i.deliveryAvailable);

        const btnsEl = document.getElementById('fulfillment-btns');
        const conflictEl = document.getElementById('fulfilment-conflict');
        const checkoutBtn = document.getElementById('checkout-btn');

        if (!canPickup && !canDeliver) {
            conflictEl.style.display = 'flex';
            btnsEl.innerHTML = '';
            checkoutBtn.disabled = true;
            selectedFulfilment = null;
            return;
        }

        conflictEl.style.display = 'none';
        checkoutBtn.disabled = false;

        if (!selectedFulfilment || (selectedFulfilment === 'PickUp' && !canPickup) || (selectedFulfilment === 'Delivery' && !canDeliver)) {
            selectedFulfilment = canPickup ? 'PickUp' : 'Delivery';
        }

        btnsEl.innerHTML = `
            ${canPickup ? `<button type="button" class="fulfillment-btn ${selectedFulfilment === 'PickUp' ? 'active' : ''}" data-value="PickUp"><i class="bi bi-bag-check"></i> Pickup</button>` : ''}
            ${canDeliver ? `<button type="button" class="fulfillment-btn ${selectedFulfilment === 'Delivery' ? 'active' : ''}" data-value="Delivery"><i class="bi bi-bicycle"></i> Delivery</button>` : ''}
        `;

        document.getElementById('delivery-address-wrap').style.display =
            selectedFulfilment === 'Delivery' ? 'block' : 'none';

        btnsEl.querySelectorAll('.fulfillment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedFulfilment = btn.dataset.value;
                const cart = Cart.get();
                renderFulfilmentOptions(cart);
                updateSummary(cart);
            });
        });
    }

    function updateSummary(cart) {
        const subtotal = cart.items.reduce((sum, i) => sum + (i.isFree ? 0 : (i.price || 0) * i.quantity), 0);
        const deliveryFee = selectedFulfilment === 'Delivery'
            ? cart.items.reduce((sum, i) => sum + (i.deliveryFee || 0), 0)
            : 0;
        const total = subtotal + deliveryFee;

        document.getElementById('cart-subtotal').textContent = subtotal > 0 ? formatCurrency(subtotal) : 'Free';

        if (deliveryFee > 0) {
            document.getElementById('cart-delivery-row').style.display = 'flex';
            document.getElementById('cart-delivery-fee').textContent = formatCurrency(deliveryFee);
        } else {
            document.getElementById('cart-delivery-row').style.display = 'none';
        }

        document.getElementById('cart-total').textContent = total > 0 ? formatCurrency(total) : 'Free';
    }

    document.getElementById('checkout-btn').addEventListener('click', async () => {
        const errorEl = document.getElementById('cart-error');
        errorEl.style.display = 'none';

        const cart = Cart.get();
        if (!cart || cart.items.length === 0) return;

        if (!selectedFulfilment) {
            showCartError('Please select a fulfilment method.');
            return;
        }

        const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
        if (selectedFulfilment === 'Delivery' && !deliveryAddress) {
            showCartError('Please enter your delivery address.');
            return;
        }

        if (!Auth.isLoggedIn() || !Auth.hasRole('app_customer')) {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
            return;
        }

        setCheckoutLoading(true);

        const payload = {
            items: cart.items.map(i => ({ listingId: i.listingId, quantity: i.quantity })),
            fulfilmentType: selectedFulfilment === 'PickUp' ? 0 : 1,
            deliveryAddress: selectedFulfilment === 'Delivery' ? deliveryAddress : null
        };

        const result = await OrderAPI.place(payload);
        setCheckoutLoading(false);

        if (!result.isSuccessful) {
            showCartError(result.message || 'Checkout failed. Please try again.');
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

    function showCartError(msg) {
        const el = document.getElementById('cart-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function setCheckoutLoading(loading) {
        const btn = document.getElementById('checkout-btn');
        const text = document.getElementById('checkout-btn-text');
        const spinner = document.getElementById('checkout-spinner');
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('show', loading);
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }
});