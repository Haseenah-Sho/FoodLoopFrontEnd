document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_customer'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Customer';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();
    await loadPayments();

    async function loadPayments() {
        const result = await PaymentAPI.getMyPayments();

        if (!result.isSuccessful) {
            document.getElementById('payments-container').innerHTML =
                `<div class="empty-state"><p>Could not load payments.</p></div>`;
            return;
        }

        const payments = result.data || [];
        const container = document.getElementById('payments-container');

        if (payments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No payment records yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Order No</th>
                        <th>Amount</th>
                        <th>Reference</th>
                        <th>Status</th>
                        <th>Paid On</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td class="food-name">${p.orderNo}</td>
                            <td>${formatCurrency(p.amount)}</td>
                            <td style="font-size:0.78rem;color:var(--dark-muted);">
                                ${p.paystackReference || '—'}
                            </td>
                            <td>${paymentStatusPill(p.status)}</td>
                            <td>${p.paidAt ? formatDateShort(p.paidAt) : '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    function paymentStatusPill(status) {
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
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');
        const closeBtn = document.getElementById('sidebarClose');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('show');
        });

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

});