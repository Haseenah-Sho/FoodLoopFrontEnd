document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_admin'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Admin';
    document.getElementById('sidebar-avatar').textContent =
        name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
        const result = await AdminAPI.getListings();

        if (!result.isSuccessful) {
            document.getElementById('listings-container').innerHTML =
                `<div class="empty-state"><p>Could not load food items.</p></div>`;
            return;
        }

        allListings = result.data || [];
        renderListings(allListings);
    }

    function renderListings(listings) {
        const container = document.getElementById('listings-container');

        if (listings.length === 0) {
            container.innerHTML =
                `<div class="empty-state"><p>No food items found.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Food Name</th>
                        <th>Food Provider</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Remaining</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${listings.map(l => `
                        <tr>
                            <td class="food-name">${l.foodName}</td>
                            <td>${l.vendorName}</td>
                            <td>${l.isFree ? '<span class="status-pill status-confirmed">Free</span>' : formatCurrency(l.price)}</td>
                            <td>${l.quantity}</td>
                            <td>${l.remainingPortion} left</td>
                            <td>${listingStatusPill(l.status)}</td>
                            <td>${formatDateShort(l.createdOn)}</td>
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
        return `<span class="status-pill ${map[status] || 'status-pending'}">${status}</span>`;
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

    function formatDateShort(dateString) {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
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