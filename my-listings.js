document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Vendor';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let allListings = [];

    await loadListings();

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;
            renderListings(filter === 'all' ? allListings : allListings.filter(l => l.status === filter));
        });
    });

    async function loadListings() {
        const result = await ListingAPI.getAll();

        if (!result.isSuccessful) {
            document.getElementById('listings-grid').innerHTML =
                `<div class="empty-state"><p>Could not load listings.</p></div>`;
            return;
        }

        allListings = result.data || [];
        renderListings(allListings);
    }

    function renderListings(listings) {
        const container = document.getElementById('listings-grid');

        if (listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No listings found. <a href="create-listing.html">Create your first listing</a>.</p>
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
                    </tr>
                </thead>
                <tbody>
                    ${listings.map(l => `
                        <tr>
                            <td class="food-name">${l.foodName}</td>
                            <td>${l.isFree ? '<span class="status-pill status-confirmed">Free</span>' : formatCurrency(l.price)}</td>
                            <td>${l.quantity ?? '-'}</td>
                            <td>${l.remainingPortion} </td>
                            <td>${l.pickUpAvailable ? '<i class="bi bi-check-circle" style="color:var(--primary)"></i>' : '<i class="bi bi-x-circle" style="color:#ccc"></i>'}</td>
                            <td>${l.deliveryAvailable ? '<i class="bi bi-check-circle" style="color:var(--primary)"></i>' : '<i class="bi bi-x-circle" style="color:#ccc"></i>'}</td>
                            <td>${listingStatusPill(l.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    function listingStatusPill(status) {
        const map = {
            'Active': 'status-confirmed',
            'Completed': 'status-completed',
            'Expired': 'status-cancelled'
        };
        return `<span class="status-pill ${map[status] || 'status-pending'}">${status || 'Active'}</span>`;
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