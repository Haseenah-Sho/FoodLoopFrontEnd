document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    document.getElementById('sidebar-username').textContent = user.name || 'Food Provider';

    setupSidebar();

    let allListings = [];
    let currentFilter = 'all';

    await loadListings();

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            applyFilter();
        });
    });

    document.getElementById('listings-grid').addEventListener('click', onActionClick);

    async function loadListings() {
        const result = await ListingAPI.getVendorListings();

        if (!result.isSuccessful) {
            document.getElementById('listings-grid').innerHTML =
                `<div class="empty-state"><p>Could not load food items.</p></div>`;
            return;
        }

        allListings = result.data || [];
        applyFilter();
    }

    function applyFilter() {
        renderListings(currentFilter === 'all'
            ? allListings
            : allListings.filter(l => l.status === currentFilter));
    }

    async function onActionClick(e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const { action, id } = btn.dataset;
        const listing = allListings.find(l => l.listingId === id);
        const name = listing ? listing.foodName : 'this food item';

        if (action === 'discard') {
            if (!confirm(`Discard the draft "${name}"? This cannot be undone.`)) return;
        } else if (action === 'withdraw') {
            if (!confirm(`Withdraw "${name}"? It will be removed from the site for good. ` +
                `To offer it again later, you will need to post it as a new food item.`)) return;
        }

        btn.disabled = true;
        const result = action === 'discard'
            ? await ListingAPI.discardDraft(id)
            : await ListingAPI.withdraw(id);

        if (!result.isSuccessful) {
            btn.disabled = false;
            showToast(result.message || 'Something went wrong. Please try again.', 'error');
            return;
        }

        showToast(result.message, 'success');
        await loadListings();
    }

    function renderListings(listings) {
        const container = document.getElementById('listings-grid');

        if (listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No listings found. <a href="post-food-items.html">Create your first listing</a>.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Food Name</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Remaining</th>
                        <th>Pickup</th>
                        <th>Delivery</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${listings.map(l => `
                        <tr>
                            <td class="food-name">${escapeHtml(l.foodName)}</td>
                            <td>${l.isFree ? '<span class="status-pill status-confirmed">Free</span>' : formatCurrency(l.price)}</td>
                            <td>${l.quantity ?? '-'}</td>
                            <td>${l.remainingPortion}</td>
                            <td>${l.pickUpAvailable ? '<i class="bi bi-check-circle" style="color:var(--primary)"></i>' : '<i class="bi bi-x-circle" style="color:#ccc"></i>'}</td>
                            <td>${l.deliveryAvailable ? '<i class="bi bi-check-circle" style="color:var(--primary)"></i>' : '<i class="bi bi-x-circle" style="color:#ccc"></i>'}</td>
                            <td>${listingStatusPill(l.status)}</td>
                            <td>${rowActions(l)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    function rowActions(l) {
        if (l.status === 'Draft') {
            return `
                <div class="row-actions">
                    <a class="btn-row primary" href="review-listing.html?id=${l.listingId}">Review</a>
                    <a class="btn-row" href="post-food-items.html?id=${l.listingId}">Edit</a>
                    <button class="btn-row danger" data-action="discard" data-id="${l.listingId}">Discard</button>
                </div>`;
        }
        if (l.status === 'Active') {
            return `
                <div class="row-actions">
                    <button class="btn-row danger" data-action="withdraw" data-id="${l.listingId}">Withdraw</button>
                </div>`;
        }
        return '<span style="color:var(--dark-muted)">-</span>';
    }

    function listingStatusPill(status) {
        const map = {
            'Draft': 'status-draft',
            'Active': 'status-confirmed',
            'Completed': 'status-completed',
            'Expired': 'status-cancelled',
            'Withdrawn': 'status-withdrawn'
        };
        return `<span class="status-pill ${map[status] || 'status-pending'}">${escapeHtml(status || 'Active')}</span>`;
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
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