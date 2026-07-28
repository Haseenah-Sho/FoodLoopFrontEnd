document.addEventListener('DOMContentLoaded', () => {

    // ── Mobile nav toggle ──
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const toggleIcon = document.getElementById('toggleIcon');

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

    // ── Smooth scroll for anchor links ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ── Load listings ──
    let allListings = [];
    let activeFilter = 'all';

    loadListings();

    async function loadListings() {
        showSkeletons();

        const result = await ListingAPI.getAll();

        if (!result.isSuccessful || !result.data) {
            showEmpty('Unable to load listings right now.');
            return;
        }

        allListings = result.data;

        // Update live stat
        const statEl = document.getElementById('stat-listings');
        if (statEl) statEl.textContent = allListings.length + '+';

        renderListings(allListings);
    }

    function renderListings(listings) {
        const grid = document.getElementById('listings-grid');
        const toShow = listings.slice(0, 8);

        if (toShow.length === 0) {
            showEmpty('No listings available right now. Check back soon!');
            return;
        }

        grid.innerHTML = toShow.map(listing => createListingCard(listing)).join('');

        // Card click → listing detail
        document.getElementById('listings-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.listing-card');
    if (card && card.dataset.id) {
        window.location.href = `listing-detail.html?id=${card.dataset.id}`;
    }
});
}

    function createListingCard(listing) {
        const isFree = listing.isFree;
        const price = isFree ? 'Free' : formatCurrency(listing.price);
        const portions = listing.remainingPortion;
        const isLow = portions <= 3 && portions > 0;

let imageUrl = listing.primaryImageUrl;
if (imageUrl && imageUrl.startsWith('/')) {
    imageUrl = `https://localhost:7208${imageUrl}`;
}

const imgHtml = imageUrl
    ? `<img src="${imageUrl}" class="listing-card-img" alt="${listing.foodName}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
       <div class="listing-card-img-placeholder" style="display:none;"><i class="bi bi-image"></i></div>`
    : `<div class="listing-card-img-placeholder"><i class="bi bi-image"></i></div>`;

        const fulfillmentTags = [
            listing.pickUpAvailable ? '<span class="fulfillment-tag"> Pickup</span>' : '',
            listing.deliveryAvailable ? '<span class="fulfillment-tag"> Delivery</span>' : ''
        ].filter(Boolean).join('');

        return `
            <div class="listing-card" data-id="${listing.listingId}" data-free="${isFree}">
                ${imgHtml}
                <div class="listing-card-body">
                    <div class="listing-card-top">
                        <div class="listing-card-name">${listing.foodName}</div>
                        <span class="${isFree ? 'badge-free' : 'badge-paid'}">
                            ${isFree ? 'Free' : 'Discounted'}
                        </span>
                    </div>
                    <div class="listing-card-vendor">
                        ${listing.vendorName}
                    </div>
                    <div class="listing-card-fulfillment">
                        ${fulfillmentTags}
                    </div>
                    <div class="listing-card-footer">
                        <div class="listing-card-price ${isFree ? 'free' : ''}">${price}</div>
                        <div class="listing-card-portions ${isLow ? 'low' : ''}">
                           
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
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;

            let filtered = allListings;
            if (activeFilter === 'free') filtered = allListings.filter(l => l.isFree);
            if (activeFilter === 'paid') filtered = allListings.filter(l => !l.isFree);

            renderListings(filtered);
        });
    });


    function showEmpty(message) {
        const grid = document.getElementById('listings-grid');
        grid.innerHTML = `
            <div class="empty-state">
                
                <p>${message}</p>
            </div>
        `;
    }

    // ── Format currency (fallback if utils not loaded) ──
    function formatCurrency(amount) {
        if (typeof window.formatCurrency === 'function') return window.formatCurrency(amount);
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

});