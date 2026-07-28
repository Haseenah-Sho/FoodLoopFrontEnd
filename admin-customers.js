document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_admin'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Admin';
    document.getElementById('sidebar-avatar').textContent =
        name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();
    await loadCustomers();

    async function loadCustomers() {
        const result = await AdminAPI.getCustomers();
        const container = document.getElementById('customers-container');

        if (!result.isSuccessful) {
            container.innerHTML =
                `<div class="empty-state"><p>Could not load customers.</p></div>`;
            return;
        }

        const customers = result.data || [];

        if (customers.length === 0) {
            container.innerHTML =
                `<div class="empty-state"><p>No customers registered yet.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Total Orders</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map(c => `
                        <tr>
                            <td class="food-name">${c.name}</td>
                            <td>${c.email}</td>
                            <td>${c.phoneNumber}</td>
                            <td>${c.address || '—'}</td>
                            <td>${c.totalOrders}</td>
                            <td>${formatDateShort(c.dateJoined)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
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