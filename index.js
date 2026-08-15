document.addEventListener('DOMContentLoaded', () => {

    // ── Auth-aware nav ──
    setupAuthNav();

    function setupAuthNav() {
        if (Auth.isLoggedIn()) {
            document.getElementById('nav-guest-actions').style.display = 'none';
            document.getElementById('nav-user-actions').style.display = 'flex';

            const roles = Auth.getUser().roles || [];
            const dashboardLink = document.getElementById('nav-dashboard-link');
            if (roles.includes('app_admin')) {
                dashboardLink.href = 'admin-dashboard.html';
            } else if (roles.includes('app_vendor')) {
                dashboardLink.href = 'food-providers-dashboard.html';
            } else {
                dashboardLink.href = 'customer-dashboard.html';
            }
        }
    }

    // ── Mobile nav toggle ──
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const toggleIcon = document.getElementById('toggleIcon');

    if (navToggle && navMenu && toggleIcon) {
        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('open');
            toggleIcon.className = isOpen ? 'bi bi-x' : 'bi bi-list';
        });

        // Close nav on link click
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                toggleIcon.className = 'bi bi-list';
            });
        });
    }

    // ── Smooth scroll for anchor links ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));

            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ── Cart drawer ──
    initCartDrawer();
    renderCartDrawer();

    function initCartDrawer() {
        const drawer = document.getElementById('cartDrawer');
        const overlay = document.getElementById('cartOverlay');

        const open = () => { drawer.classList.add('open'); overlay.classList.add('open'); };
        const close = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); };

        document.getElementById('cartToggleBtn').addEventListener('click', open);
        document.getElementById('cartCloseBtn').addEventListener('click', close);
        overlay.addEventListener('click', close);
    }

    function renderCartDrawer() {
        const cart = Cart.get();
        const body = document.getElementById('cartBody');
        const foot = document.getElementById('cartFoot');

        if (!cart || cart.items.length === 0) {
            body.innerHTML = `
                <div class="empty-state" id="cartEmptyState">
                    <i class="bi bi-cart-x"></i>
                    <p>Your cart is empty.</p>
                    <span class="cart-empty-hint">Add food items to get started.</span>
                </div>`;
            foot.style.display = 'none';
            return;
        }

        foot.style.display = 'block';
        document.getElementById('cartVendorNote').innerHTML =
            `<i class="bi bi-shop"></i> Items from ${cart.vendorName}`;

        body.innerHTML = cart.items.map(item => {
            const lineTotal = item.isFree ? 0 : (item.price || 0) * item.quantity;
            const imgUrl = item.imageUrl
                ? (item.imageUrl.startsWith('/') ? `https://localhost:7208${item.imageUrl}` : item.imageUrl)
                : null;

            return `
                <div class="cart-drawer-line" data-id="${item.listingId}">
                    ${imgUrl
                        ? `<img src="${imgUrl}" class="cart-drawer-thumb" alt="${item.foodName}" onerror="this.outerHTML='<div class=\\'cart-drawer-thumb-placeholder\\'><i class=\\'bi bi-image\\'></i></div>'">`
                        : `<div class="cart-drawer-thumb-placeholder"><i class="bi bi-image"></i></div>`}
                    <div class="cart-drawer-info">
                        <div class="cart-drawer-name">${item.foodName}</div>
                        <div class="cart-drawer-price">${item.isFree ? 'Free' : formatCurrency(item.price) + ' each'}</div>
                        <div class="cart-drawer-controls">
                            <div class="cart-drawer-qty">
                                <button class="qty-dec" data-id="${item.listingId}" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
                                <span>${item.quantity}</span>
                                <button class="qty-inc" data-id="${item.listingId}" ${item.quantity >= item.maxQty ? 'disabled' : ''}>+</button>
                            </div>
                            <button class="cart-drawer-remove" data-id="${item.listingId}"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>`;
        }).join('');

        const total = cart.items.reduce((sum, i) => sum + (i.isFree ? 0 : (i.price || 0) * i.quantity), 0);
        document.getElementById('cartTotal').textContent = total > 0 ? formatCurrency(total) : 'Free';

        body.querySelectorAll('.qty-inc').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = cart.items.find(i => i.listingId === btn.dataset.id);
                if (item) Cart.updateQuantity(item.listingId, item.quantity + 1);
                renderCartDrawer();
            });
        });
        body.querySelectorAll('.qty-dec').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = cart.items.find(i => i.listingId === btn.dataset.id);
                if (item) Cart.updateQuantity(item.listingId, item.quantity - 1);
                renderCartDrawer();
            });
        });
        body.querySelectorAll('.cart-drawer-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                Cart.remove(btn.dataset.id);
                renderCartDrawer();
            });
        });
    }

    // ── Listings ──
    let allListings = [];
    let activeFilter = 'all';

    loadListings();

    async function loadListings() {


        try {
            const result = await ListingAPI.getAll();

            if (!result.isSuccessful || !result.data) {
                showEmpty('Unable to load food items right now.');
                return;
            }

            allListings = result.data;

            // Update live stat
            const statEl = document.getElementById('stat-listings');

            if (statEl) {
                statEl.textContent = allListings.length + '+';
            }

            renderListings(allListings);

        } catch (error) {
            console.error("Error loading listings:", error);
            showEmpty('Unable to load food items right now.');
        }
    }

    // ── Loading state ──
    function showSkeletons() {
        const grid = document.getElementById('listings-grid');

        if (!grid) return;

        grid.innerHTML = `
            <div class="empty-state">
                <p>Loading food items...</p>
            </div>
        `;
    }

    // ── Render listings ──
    function renderListings(listings) {

        const grid = document.getElementById('listings-grid');

        if (!grid) return;

        const toShow = listings;

        if (toShow.length === 0) {
            showEmpty('No food items available right now. Check back soon!');
            return;
        }

        grid.innerHTML = toShow
            .map(listing => createListingCard(listing))
            .join('');

        // Card click → listing detail
        grid.onclick = (e) => {

            const card = e.target.closest('.listing-card');

            if (card && card.dataset.id) {
                window.location.href =
                    `food-items-detail.html?id=${card.dataset.id}`;
            }
        };
    }

    // ── Post Food Items card ──
    function createListingCard(listing) {

        const isFree = listing.isFree;

        const price = isFree
            ? 'Free'
            : formatCurrency(listing.price);

        const portions = listing.remainingPortion;

        const isLow =
            portions <= 3 &&
            portions > 0;

        // ── Image ──
        let imageUrl = listing.primaryImageUrl;

        if (imageUrl && imageUrl.startsWith('/')) {
            imageUrl = `https://localhost:7208${imageUrl}`;
        }

        const imgHtml = imageUrl
            ? `
                <img
                    src="${imageUrl}"
                    class="listing-card-img"
                    alt="${listing.foodName}"
                    loading="lazy"
                    onerror="
                        this.style.display='none';
                        this.nextElementSibling.style.display='flex';
                    "
                >

                <div
                    class="listing-card-img-placeholder"
                    style="display:none;"
                >
                    <i class="bi bi-image"></i>
                </div>
              `
            : `
                <div class="listing-card-img-placeholder">
                    <i class="bi bi-image"></i>
                </div>
              `;

        // ── Fulfillment ──
        const fulfillmentTags = [
            listing.pickUpAvailable
                ? '<span class="fulfillment-tag">Pickup</span>'
                : '',

            listing.deliveryAvailable
                ? '<span class="fulfillment-tag">Delivery</span>'
                : ''
        ]
        .filter(Boolean)
        .join('');

        return `
            <div
                class="listing-card"
                data-id="${listing.listingId}"
                data-free="${isFree}"
            >

                ${imgHtml}

                <div class="listing-card-body">

                    <div class="listing-card-top">

                        <div class="listing-card-name">
                            ${listing.foodName}
                        </div>

                        <span class="${isFree ? 'badge-free' : 'badge-paid'}">
                            ${isFree ? 'Free' : 'Discounted'}
                        </span>

                    </div>

                    <div class="listing-card-vendor">
                        ${listing.vendorName}
                    </div>

                    <div class="listing-card-address">
                        <i class="bi bi-geo-alt"></i> ${listing.address}
                    </div>

                    <div class="listing-card-fulfillment">
                        ${fulfillmentTags}
                    </div>

                    <div class="listing-card-footer">

                        <div
                            class="listing-card-price ${isFree ? 'free' : ''}"
                        >
                            ${price}
                        </div>

                        <div
                            class="listing-card-portions ${isLow ? 'low' : ''}"
                        >
                            ${portions} left
                        </div>

                    </div>

                </div>

            </div>
        `;
    }

    // ── Filter buttons ──
    document.querySelectorAll('.filter-btn').forEach(btn => {

        btn.addEventListener('click', () => {

            document
                .querySelectorAll('.filter-btn')
                .forEach(b => b.classList.remove('active'));

            btn.classList.add('active');

            activeFilter = btn.dataset.filter;

            let filtered = allListings;

            if (activeFilter === 'free') {
                filtered = allListings.filter(l => l.isFree);
            }

            if (activeFilter === 'paid') {
                filtered = allListings.filter(l => !l.isFree);
            }

            renderListings(filtered);
        });

    });

    // ── Empty state ──
    function showEmpty(message) {

        const grid = document.getElementById('listings-grid');

        if (!grid) return;

        grid.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
            </div>
        `;
    }

    // ── Format currency ──
    function formatCurrency(amount) {

        if (typeof window.formatCurrency === 'function') {
            return window.formatCurrency(amount);
        }

        return '₦' + Number(amount).toLocaleString('en-NG');
    }

});