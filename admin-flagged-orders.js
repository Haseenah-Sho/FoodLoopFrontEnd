document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_admin'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Admin';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();
    await loadFlagged();

    window.notifyVendor = async function(orderId, btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';

        const result = await AdminAPI.notifyVendorOfMismatch(orderId);

        if (result.isSuccessful) {
            showToast('Vendor notified.', 'success');
            await loadFlagged();
        } else {
            showToast(result.message || 'Could not notify vendor.', 'error');
            btn.disabled = false;
            btn.textContent = 'Notify Vendor';
        }
    };

    async function loadFlagged() {
        const result = await AdminAPI.getFlaggedOrders();
        const container = document.getElementById('flagged-container');

        if (!result.isSuccessful) {
            container.innerHTML = `<div class="empty-state"><p>${result.message || 'Could not load flagged orders.'}</p></div>`;
            return;
        }

        const orders = result.data || [];

        if (orders.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No description-mismatch reports yet.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Order No</th>
                        <th>Food Provider</th>
                        <th>Customer</th>
                        <th>What Didn't Match</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(o => `
                        <tr>
                            <td class="food-name">${o.orderNo}</td>
                            <td>${o.vendorName}</td>
                            <td>${o.customerName}</td>
                            <td>${o.note}</td>
                            <td>${formatDateShort(o.flaggedAt)}</td>
                            <td>${o.vendorNotified
                                ? `<span class="status-pill status-confirmed">Notified</span>`
                                : `<button class="btn-primary-sm" style="font-size:0.75rem;padding:5px 10px;" onclick="notifyVendor('${o.orderId}', this)">Notify Vendor</button>`
                            }</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    function formatDateShort(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            sidebar.classList.add('open'); overlay.classList.add('show');
        });
        document.getElementById('sidebarClose')?.addEventListener('click', () => {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        });
        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        });
    }
});