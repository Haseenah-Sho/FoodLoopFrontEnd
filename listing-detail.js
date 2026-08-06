document.addEventListener('DOMContentLoaded', async () => {

    // ── Mobile nav toggle ──
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const toggleIcon = document.getElementById('toggleIcon');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('open');
            toggleIcon.className = isOpen ? 'bi bi-x' : 'bi bi-list';
        });
    }

    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('id');

    if (!listingId) {
        showError();
        return;
    }

    let listing = null;
    let selectedFulfilment = null;
    let selectedStars = 0;
    let quantity = 1;

    await loadListing();
    await loadRatings();

    async function loadListing() {
        const result = await ListingAPI.getDetails(listingId);
        if (!result.isSuccessful || !result.data) {
            showError();
            return;
        }
        listing = result.data;
        renderListing(listing);
    }

    function renderListing(l) {
        document.title = `${l.foodName} — FoodLoop`;

        let imgSrc = l.imageUrls && l.imageUrls.length > 0 ? l.imageUrls[0] : null;
if (imgSrc && imgSrc.startsWith('/')) {
    imgSrc = `https://localhost:7208${imgSrc}`;
}

if (imgSrc) {
    const img = document.getElementById('detail-img');
    img.src = imgSrc;
    img.alt = l.foodName;
    img.onerror = function() {
        this.style.display = 'none';
        document.getElementById('detail-img-placeholder').style.display = 'flex';
    };
} else {
    document.getElementById('detail-img').style.display = 'none';
    document.getElementById('detail-img-placeholder').style.display = 'flex';
}
        document.getElementById('detail-name').textContent = l.foodName;
        document.getElementById('detail-vendor').innerHTML =
            `${l.vendorName}`;

        const badge = document.getElementById('detail-badge');
        badge.textContent = l.isFree ? 'Free' : 'Discounted';
        badge.className = l.isFree ? 'badge-free' : 'badge-paid';

        const priceEl = document.getElementById('detail-price');
        if (l.isFree) {
            priceEl.textContent = 'Free';
            priceEl.classList.add('free-price');
        } else {
            priceEl.textContent = formatCurrency(l.price);
        }

        const portionsEl = document.getElementById('detail-portions');
        const isLow = l.remainingPortion <= 3 && l.remainingPortion > 0;
        portionsEl.innerHTML = `
            ${l.remainingPortion} portion${l.remainingPortion !== 1 ? 's' : ''} left
        `;
        if (isLow) portionsEl.classList.add('low');

        document.getElementById('detail-description').textContent = l.foodDescription;

        if (l.pickUpAvailable) {
            document.getElementById('detail-pickup').style.display = 'flex';
            document.getElementById('detail-pickup-window').textContent =
                `${formatDate(l.pickUpStart)} - ${formatDate(l.pickUpEnd)}`;
        }

        if (l.deliveryAvailable) {
            document.getElementById('detail-delivery').style.display = 'flex';
            document.getElementById('detail-delivery-fee').textContent =
                l.deliveryFee > 0 ? formatCurrency(l.deliveryFee) : 'Free delivery';
        }

        document.getElementById('detail-qty-per-unit').textContent =
            `${l.quantityPerUnit} serving${l.quantityPerUnit !== 1 ? 's' : ''} per portion`;

        const isSoldOut = l.status !== 'Active' || l.remainingPortion <= 0;

        if (isSoldOut) {
            document.getElementById('sold-out').style.display = 'flex';
        } else if (!Auth.isLoggedIn()) {
            document.getElementById('login-prompt').style.display = 'flex';
        } else if (!Auth.hasRole('app_customer')) {
            document.getElementById('login-prompt').style.display = 'flex';
            document.getElementById('login-prompt').querySelector('p').textContent =
                'Only customers can place orders.';
        } else {
            document.getElementById('order-form').style.display = 'flex';
            setupOrderForm(l);
        }

        document.getElementById('detail-loading').style.display = 'none';
        document.getElementById('detail-content').style.display = 'block';
    }

    function setupOrderForm(l) {
        const fulfilmentBtns = document.getElementById('fulfillment-btns');
        const deliveryWrap = document.getElementById('delivery-address-wrap');

        if (l.pickUpAvailable) {
            const btn = createFulfilmentBtn('PickUp', '<i class="bi bi-bag-check"></i> Pickup');
            fulfilmentBtns.appendChild(btn);
        }

        if (l.deliveryAvailable) {
            const btn = createFulfilmentBtn('Delivery', '<i class="bi bi-bicycle"></i> Delivery');
            fulfilmentBtns.appendChild(btn);
        }

        const firstBtn = fulfilmentBtns.querySelector('.fulfillment-btn');
        if (firstBtn) {
            firstBtn.classList.add('active');
            selectedFulfilment = firstBtn.dataset.value;
            if (selectedFulfilment === 'Delivery') deliveryWrap.style.display = 'block';
        }

        const qtyInput = document.getElementById('orderQuantity');
        const maxQty = l.remainingPortion;

        document.getElementById('qty-plus').addEventListener('click', () => {
            if (quantity < maxQty) {
                quantity++;
                qtyInput.value = quantity;
                updateTotal(l);
            }
        });

        document.getElementById('qty-minus').addEventListener('click', () => {
            if (quantity > 1) {
                quantity--;
                qtyInput.value = quantity;
                updateTotal(l);
            }
        });

        updateTotal(l);
        document.getElementById('order-btn').addEventListener('click', () => placeOrder(l));
    }

    function createFulfilmentBtn(value, label) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fulfillment-btn';
        btn.dataset.value = value;
        btn.innerHTML = label;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.fulfillment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedFulfilment = value;
            const deliveryWrap = document.getElementById('delivery-address-wrap');
            deliveryWrap.style.display = value === 'Delivery' ? 'block' : 'none';
            updateTotal(listing);
        });
        return btn;
    }

    function updateTotal(l) {
        const totalEl = document.getElementById('order-total');
        let base = l.isFree ? 0 : (l.price * quantity);
        let delivery = (selectedFulfilment === 'Delivery' && l.deliveryAvailable) ? l.deliveryFee : 0;
        let total = base + delivery;

        if (total === 0) {
            totalEl.innerHTML = `Total: <span>Free</span>`;
        } else {
            let breakdown = `Total: <span>${formatCurrency(total)}</span>`;
            if (delivery > 0) breakdown += ` <small>(incl. ${formatCurrency(delivery)} delivery)</small>`;
            totalEl.innerHTML = breakdown;
        }
    }

    async function placeOrder(l) {
        hideOrderMessages();

        if (!selectedFulfilment) {
            showOrderError('Please select a fulfilment method.');
            return;
        }

        const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
        if (selectedFulfilment === 'Delivery' && !deliveryAddress) {
            showOrderError('Please enter your delivery address.');
            return;
        }

        setOrderLoading(true);

        const payload = {
            items: [{ listingId: listingId, quantity }],
            fulfilmentType: selectedFulfilment === 'PickUp' ? 0 : 1,
            deliveryAddress: selectedFulfilment === 'Delivery' ? deliveryAddress : null
        };

        const result = await OrderAPI.place(payload);
        setOrderLoading(false);

        if (!result.isSuccessful) {
            showOrderError(result.message || 'Order failed. Please try again.');
            return;
        }

        if (result.data.paymentAuthorizationUrl) {
            showOrderSuccess('Order placed! Redirecting to payment...');
            setTimeout(() => {
                window.location.href = result.data.paymentAuthorizationUrl;
            }, 1500);
            return;
        }

        showOrderSuccess('Order placed successfully! Check your orders for details.');
        document.getElementById('order-btn').disabled = true;
        await loadListing();
        await loadRatings();
    }

    async function loadRatings() {
        const result = await RatingAPI.getByListing(listingId);
        if (!result.isSuccessful) return;

        const data = result.data;
        const count = data.totalRatings;
        const avg = data.averageRating;
        const ratings = data.ratings;

        document.getElementById('ratings-count').textContent =
            count > 0 ? `${count} review${count !== 1 ? 's' : ''}` : 'No reviews yet';

        if (count > 0) {
            document.getElementById('ratings-summary').style.display = 'flex';
            document.getElementById('rating-avg').textContent = avg.toFixed(1);
            document.getElementById('rating-stars').innerHTML = buildStars(avg);
        }

        const list = document.getElementById('ratings-list');
        if (ratings.length === 0) {
            list.innerHTML = `<p class="ratings-empty">No reviews yet. Be the first to review this listing.</p>`;
        } else {
            list.innerHTML = ratings.map(r => `
                <div class="rating-item">
                    <div class="rating-item-header">
                        <span class="rating-item-name">${r.customerName}</span>
                        <span class="rating-item-date">${formatDateShort(r.ratedOn)}</span>
                    </div>
                    <div class="rating-item-stars">${buildStars(r.stars)}</div>
                    ${r.comment ? `<p class="rating-item-comment">${r.comment}</p>` : ''}
                </div>
            `).join('');
        }

        if (Auth.isLoggedIn() && Auth.hasRole('app_customer')) {
            document.getElementById('add-rating').style.display = 'flex';
            setupRatingForm();
        }
    }

    function setupRatingForm() {
        const stars = document.querySelectorAll('#star-picker i');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedStars = parseInt(star.dataset.value);
                stars.forEach(s => {
                    s.className = parseInt(s.dataset.value) <= selectedStars
                        ? 'bi bi-star-fill active' : 'bi bi-star';
                });
            });

            star.addEventListener('mouseover', () => {
                const hoverVal = parseInt(star.dataset.value);
                stars.forEach(s => {
                    s.className = parseInt(s.dataset.value) <= hoverVal
                        ? 'bi bi-star-fill active' : 'bi bi-star';
                });
            });

            star.addEventListener('mouseout', () => {
                stars.forEach(s => {
                    s.className = parseInt(s.dataset.value) <= selectedStars
                        ? 'bi bi-star-fill active' : 'bi bi-star';
                });
            });
        });

        document.getElementById('submit-rating-btn').addEventListener('click', submitRating);
    }

    async function submitRating() {
        const errorEl = document.getElementById('rating-error');
        errorEl.style.display = 'none';

        if (selectedStars === 0) {
            errorEl.textContent = 'Please select a star rating.';
            errorEl.style.display = 'block';
            return;
        }

        const comment = document.getElementById('ratingComment').value.trim();
        const btn = document.getElementById('submit-rating-btn');
        const btnText = document.getElementById('rating-btn-text');
        const spinner = document.getElementById('rating-spinner');

        btn.disabled = true;
        btnText.style.display = 'none';
        spinner.classList.add('show');

        const result = await RatingAPI.add({
            listingId,
            stars: selectedStars,
            comment: comment || null
        });

        btn.disabled = false;
        btnText.style.display = 'inline';
        spinner.classList.remove('show');

        if (!result.isSuccessful) {
            errorEl.textContent = result.message || 'Could not submit review.';
            errorEl.style.display = 'block';
            return;
        }

        showToast('Review submitted successfully!', 'success');
        document.getElementById('add-rating').style.display = 'none';
        await loadRatings();
    }

    function buildStars(rating) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        return [
            ...Array(full).fill('<i class="bi bi-star-fill"></i>'),
            ...Array(half).fill('<i class="bi bi-star-half"></i>'),
            ...Array(empty).fill('<i class="bi bi-star"></i>')
        ].join('');
    }

    function showError() {
        document.getElementById('detail-loading').style.display = 'none';
        document.getElementById('detail-error').style.display = 'flex';
    }

    function showOrderError(msg) {
        const el = document.getElementById('order-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function showOrderSuccess(msg) {
        const el = document.getElementById('order-success');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideOrderMessages() {
        document.getElementById('order-error').style.display = 'none';
        document.getElementById('order-success').style.display = 'none';
    }

    function setOrderLoading(loading) {
        const btn = document.getElementById('order-btn');
        const text = document.getElementById('order-btn-text');
        const spinner = document.getElementById('order-spinner');
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('show', loading);
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

    function formatDate(dateString) {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function formatDateShort(dateString) {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

});