document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_admin'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Admin';
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    document.getElementById('sidebar-username').textContent = name;
    document.getElementById('topbar-greeting').textContent = `Hi, ${name.split(' ')[0]}`;

    // Mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    }

    toggleBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Load all data
    await Promise.all([
        loadPendingVendors(),
        loadAllVendors(),
        loadAllCustomers(),
        loadAllListings()
    ]);

    // ── Pending vendor approvals ──
    async function loadPendingVendors() {
        const result = await VendorAPI.getPending();

        if (!result.isSuccessful) {
            document.getElementById('pending-vendors').innerHTML =
                `<div class="empty-state"><p>Could not load pending food providers.</p></div>`;
            document.getElementById('stat-pending').textContent = '0';
            return;
        }

        const vendors = result.data || [];
        document.getElementById('stat-pending').textContent = vendors.length;

        const container = document.getElementById('pending-vendors');

        if (vendors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No pending approvals. All food providers have been reviewed.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Food Providers</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Registered</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="pending-vendors-body">
                    ${vendors.map(v => `
                        <tr id="vendor-row-${v.vendorId}">
                            <td class="food-name">${v.organizationName}</td>
                            <td>${v.email}</td>
                            <td>${v.phoneNumber}</td>
                            <td>${formatDateShort(v.registeredOn)}</td>
                            <td>
                                <button
                                    class="btn-approve"
                                    onclick="handleApproval('${v.vendorId}', true)"
                                    id="approve-${v.vendorId}">
                                    Approve
                                </button>
                                <button
                                    class="btn-reject"
                                    onclick="handleApproval('${v.vendorId}', false)"
                                    id="reject-${v.vendorId}">
                                    Reject
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    // ── All vendors count ──
    async function loadAllVendors() {
        const result = await AdminAPI.getVendors();
        if (!result.isSuccessful) {
            document.getElementById('stat-vendors').textContent = '0';
            return;
        }
        document.getElementById('stat-vendors').textContent = result.data?.length || 0;
    }

    // ── All customers count ──
    async function loadAllCustomers() {
        const result = await AdminAPI.getCustomers();
        if (!result.isSuccessful) {
            document.getElementById('stat-customers').textContent = '0';
            return;
        }
        document.getElementById('stat-customers').textContent = result.data?.length || 0;
    }

    // ── Recent listings ──
    async function loadAllListings() {
        const result = await AdminAPI.getListings();

        if (!result.isSuccessful) {
            document.getElementById('recent-listings').innerHTML =
                `<div class="empty-state"><p>Could not load food items.</p></div>`;
            document.getElementById('stat-listings').textContent = '0';
            return;
        }

        const listings = result.data || [];
        const active = listings.filter(l => l.status === 'Active');
        document.getElementById('stat-listings').textContent = active.length;

        const recent = listings.slice(0, 6);
        const container = document.getElementById('recent-listings');

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No food items on the platform yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Food Name</th>
                        <th>Food Providers</th>
                        <th>Price</th>
                        <th>Remaining</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(l => `
                        <tr>
                            <td class="food-name">${l.foodName}</td>
                            <td>${l.vendorName}</td>
                            <td>${l.isFree ? 'Free' : formatCurrency(l.price)}</td>
                            <td>${l.remainingPortion} left</td>
                            <td>${listingStatusPill(l.status)}</td>
                            <td>${formatDateShort(l.createdOn)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    // ── Approve / Reject vendor ──
    window.handleApproval = async function(vendorId, isApproved) {
        const approveBtn = document.getElementById(`approve-${vendorId}`);
        const rejectBtn = document.getElementById(`reject-${vendorId}`);

        approveBtn.disabled = true;
        rejectBtn.disabled = true;

        const result = await VendorAPI.approveReject({ vendorId, isApproved });

        if (!result.isSuccessful) {
            showToast(result.message || 'Action failed.', 'error');
            approveBtn.disabled = false;
            rejectBtn.disabled = false;
            return;
        }

        showToast(
            isApproved ? 'Food provider approved successfully.' : 'Food provider rejected.',
            isApproved ? 'success' : 'warning'
        );

        
        const row = document.getElementById(`vendor-row-${vendorId}`);
        if (row) {
            row.style.transition = 'opacity 0.3s';
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
                
                const currentCount = parseInt(document.getElementById('stat-pending').textContent) || 0;
                document.getElementById('stat-pending').textContent = Math.max(0, currentCount - 1);
            }, 300);
        }
    };

    // ── Helpers ──
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

});