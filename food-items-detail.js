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

    // Route "Back" to the right place depending on where the customer came from

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
    let selectedZoneId = null;
    let selectedZoneFee = 0;
    let currentDeliveryZones = [];

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
    document.title = `${l.foodName} - FoodLoop`;

    // Show panels
    document.getElementById('detail-loading').style.display = 'none';
    document.getElementById('image-panel').style.display = 'flex';
    document.getElementById('info-panel').style.display = 'flex';

    // Image gallery
    let imageUrls = (l.imageUrls || []).map(u => u.startsWith('/') ? `https://localhost:7208${u}` : u);
    const img = document.getElementById('detail-img');
    const placeholder = document.getElementById('detail-img-placeholder');
    const thumbStrip = document.getElementById('detail-thumb-strip');

    function showImage(src) {
        if (!src) {
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            return;
        }
        img.style.display = 'block';
        placeholder.style.display = 'none';
        img.src = src;
        img.alt = l.foodName;
        img.onerror = function() {
            this.style.display = 'none';
            placeholder.style.display = 'flex';
        };
    }

    showImage(imageUrls[0] || null);

    if (imageUrls.length > 1) {
        thumbStrip.style.display = 'flex';
        thumbStrip.innerHTML = imageUrls.map((url, i) =>
            `<img src="${url}" class="detail-thumb${i === 0 ? ' active' : ''}" data-index="${i}">`
        ).join('');

        thumbStrip.querySelectorAll('.detail-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                showImage(imageUrls[index]);
                thumbStrip.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    } else {
        thumbStrip.style.display = 'none';
        thumbStrip.innerHTML = '';
    }

    // Name + vendor
    document.getElementById('detail-name').textContent = l.foodName;
    document.getElementById('detail-vendor').innerHTML =
        `${l.vendorName}`;
    document.getElementById('detail-location').innerHTML =
        `<i class="bi bi-geo-alt"></i> ${l.address}`;
    const foodTypeLabels = {
        FreshlyCookedMeal: 'Freshly Cooked Meal', BakedGoods: 'Baked Goods',
        RawProduce: 'Raw Produce', PackagedOrProcessed: 'Packaged / Processed'
    };
    const storageLabels = {
        RoomTemperature: 'Room Temperature', Refrigerated: 'Keep Refrigerated',
        MustBeReheatedBeforeEating: 'Must Be Reheated Before Eating'
    };
    const bestBefore = new Date(l.bestBeforeDate).toLocaleString('en-NG', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    document.getElementById('detail-safety-info').innerHTML = `
        <div class="safety-row"><i class="bi bi-egg-fried"></i> ${foodTypeLabels[l.foodType] || l.foodType}</div>
        <div class="safety-row"><i class="bi bi-thermometer-half"></i> ${storageLabels[l.storageInstruction] || l.storageInstruction}</div>
        <div class="safety-row safety-best-before"><i class="bi bi-clock-history"></i> Best before ${bestBefore}</div>
        ${l.allergens ? `<div class="safety-row"><i class="bi bi-exclamation-triangle"></i> Contains: ${l.allergens}</div>` : ''}
    `;

    // Badge
    const badge = document.getElementById('detail-badge');
    badge.textContent = l.isFree ? 'Free' : 'Discounted';
    badge.className = l.isFree ? 'badge-free' : 'badge-paid';

    // Price
    const priceEl = document.getElementById('detail-price');
    priceEl.textContent = l.isFree ? 'Free' : formatCurrency(l.price);
    if (l.isFree) priceEl.classList.add('free');

    // Portions
    const portionsEl = document.getElementById('detail-portions');
    const isLow = l.remainingPortion <= 3 && l.remainingPortion > 0;
    portionsEl.innerHTML = `${l.remainingPortion} left`;
    if (isLow) portionsEl.classList.add('low');

    // Description
    document.getElementById('detail-description').textContent = l.foodDescription;

    // Meta pills
    const meta = document.getElementById('detail-meta');
    const pills = [];
    if (l.pickUpAvailable) pills.push(`<span class="meta-pill">Pickup: ${formatDate(l.pickUpStart)} – ${formatDate(l.pickUpEnd)}</span>`);
    if (l.deliveryAvailable) pills.push(`<span class="meta-pill">Delivery ${l.deliveryFee > 0 ? formatCurrency(l.deliveryFee) : '(free)'}</span>`);
    pills.push(`<span class="meta-pill">${l.quantityPerUnit} serving${l.quantityPerUnit !== 1 ? 's' : ''}/portion</span>`);
    meta.innerHTML = pills.join('');

    // Action panel — hide all three first so re-renders (e.g. after placing an order) don't stack them
    document.getElementById('sold-out').style.display = 'none';
    document.getElementById('login-prompt').style.display = 'none';
    document.getElementById('order-form').style.display = 'none';

    const isSoldOut = l.status !== 'Active' || l.remainingPortion <= 0;
    if (isSoldOut) {
        document.getElementById('sold-out').style.display = 'flex';
    } else if (!Auth.isLoggedIn() || !Auth.hasRole('app_customer')) {
        const returnUrl = encodeURIComponent(window.location.href);
        document.getElementById('login-prompt-link').href = `login.html?returnUrl=${returnUrl}`;
        document.getElementById('register-prompt-link').href = `register-customer.html?returnUrl=${returnUrl}`;
        document.getElementById('login-prompt').style.display = 'flex';
    } else {
        document.getElementById('order-form').style.display = 'block';
        setupOrderForm(l);
    }
}

    async function setupOrderForm(l) {
        const fulfilmentBtns = document.getElementById('fulfillment-btns');
        const deliveryWrap = document.getElementById('delivery-address-wrap');

        currentDeliveryZones = [];
        if (l.deliveryAvailable) {
            const zonesResult = await VendorAPI.getPublicDeliveryZones(l.vendorId);
            if (zonesResult.isSuccessful && zonesResult.data) {
                currentDeliveryZones = zonesResult.data;
            }
        }

        if (l.pickUpAvailable) {
            const btn = createFulfilmentBtn('PickUp', '<i class="bi bi-bag-check"></i> Pickup');
            fulfilmentBtns.appendChild(btn);
        }

        if (l.deliveryAvailable && currentDeliveryZones.length > 0) {
            const btn = createFulfilmentBtn('Delivery', '<i class="bi bi-bicycle"></i> Delivery');
            fulfilmentBtns.appendChild(btn);
        }

        const firstBtn = fulfilmentBtns.querySelector('.fulfillment-btn');
        if (firstBtn) {
            firstBtn.classList.add('active');
            selectedFulfilment = firstBtn.dataset.value;
            if (selectedFulfilment === 'Delivery') {
                deliveryWrap.style.display = 'block';
                populateZoneSelect();
            }
        }

        const qtyInput = document.getElementById('orderQuantity');
        const maxQty = l.remainingPortion;

        const requestedQty = parseInt(params.get('qty'));
        if (requestedQty && requestedQty > 0) {
            quantity = Math.min(requestedQty, maxQty);
            qtyInput.value = quantity;
        }

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
        document.getElementById('add-cart-btn').addEventListener('click', () => addToCart(l));
    }

    function populateZoneSelect() {
        const select = document.getElementById('deliveryZoneSelect');
        select.innerHTML = '<option value="">Select your area</option>' +
            currentDeliveryZones.map(z =>
                `<option value="${z.zoneId}" data-fee="${z.fee}">${z.zoneName} - ${formatCurrency(z.fee)}</option>`
            ).join('');

        select.onchange = () => {
            const opt = select.selectedOptions[0];
            selectedZoneId = select.value || null;
            selectedZoneFee = select.value ? parseFloat(opt.dataset.fee) : 0;
            updateTotal(listing);
        };
    }

    function addToCart(l) {
        const btn = document.getElementById('add-cart-btn');
        const cartItem = {
            listingId,
            vendorId: l.vendorId,
            vendorName: l.vendorName,
            foodName: l.foodName,
            isFree: l.isFree,
            price: l.price,
            remainingPortion: l.remainingPortion,
            imageUrls: l.imageUrls,
            pickUpAvailable: l.pickUpAvailable,
            deliveryAvailable: l.deliveryAvailable,
            deliveryFee: l.deliveryFee
        };

        const result = Cart.add(cartItem, quantity);

        if (!result.success && result.conflict) {
            const proceed = confirm(
                `Your cart has items from ${result.vendorName}. An order can only include items from one food provider. Clear your cart and add this item instead?`
            );
            if (!proceed) return;
            Cart.clear();
            Cart.add(cartItem, quantity);
        }

        btn.classList.add('added');
        btn.innerHTML = '<i class="bi bi-check2"></i> Added to Cart';
        setTimeout(() => {
            btn.classList.remove('added');
            btn.innerHTML = '<i class="bi bi-cart-plus"></i> Add to Cart';
        }, 1500);
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
            selectedZoneId = null;
            selectedZoneFee = 0;
            const deliveryWrap = document.getElementById('delivery-address-wrap');
            deliveryWrap.style.display = value === 'Delivery' ? 'block' : 'none';
            if (value === 'Delivery') populateZoneSelect();
            updateTotal(listing);
        });
        return btn;
    }

    function updateTotal(l) {
        const totalEl = document.getElementById('order-total');
        let base = l.isFree ? 0 : (l.price * quantity);
        let delivery = (selectedFulfilment === 'Delivery') ? selectedZoneFee : 0;
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
        if (selectedFulfilment === 'Delivery' && !selectedZoneId) {
            showOrderError('Please select your delivery area.');
            return;
        }

        setOrderLoading(true);

        const payload = {
            items: [{ listingId: listingId, quantity }],
            fulfilmentType: selectedFulfilment === 'PickUp' ? 1 : 2,
            deliveryAddress: selectedFulfilment === 'Delivery' ? deliveryAddress : null,
            deliveryZoneId: selectedFulfilment === 'Delivery' ? selectedZoneId : null
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

        showOrderSuccess('Order placed successfully! Redirecting to your orders...');
        document.getElementById('order-btn').disabled = true;
        setTimeout(() => {
            window.location.href = 'my-orders.html';
        }, 1500);
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
            list.innerHTML = `<p class="ratings-empty">No reviews yet. Be the first to review this food item.</p>`;
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
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-NG', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function formatDateShort(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function haversineDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

});