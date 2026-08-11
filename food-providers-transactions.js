document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Food Provider';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();
    await loadTransactions();

    async function loadTransactions() {
        const result = await PaymentAPI.getVendorTransactions();
        const container = document.getElementById('transactions-container');

        if (!result.isSuccessful) {
            container.innerHTML =
                `<div class="empty-state"><p>Could not load transactions.</p></div>`;
            return;
        }

        const transactions = result.data || [];

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No transactions yet.</p>
                </div>`;
            return;
        }

        const total = transactions
            .filter(t => t.paymentStatus === 'Successful')
            .reduce((sum, t) => sum + t.amount, 0);

        container.innerHTML = `
            <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.85rem;color:var(--dark-muted);font-weight:600;">Total Amount</span>
                <span style="font-size:1.1rem;font-weight:800;color:var(--primary);">${formatCurrency(total)}</span>
            </div>
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Order No</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Paid On</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td class="food-name">${t.orderNo}</td>
                            <td>${t.customerName || '-'}</td>
                            <td>${formatCurrency(t.amount)}</td>
                            <td>${paymentPill(t.paymentStatus)}</td>
                            <td>${t.paidAt ? formatDateShort(t.paidAt) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    function paymentPill(status) {
        const map = {
            'Successful': 'status-completed',
            'Pending': 'status-pending',
            'Failed': 'status-cancelled'
        };
        return `<span class="status-pill ${map[status] || 'status-pending'}">${status}</span>`;
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
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