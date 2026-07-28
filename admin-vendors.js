document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_admin'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Admin';
    document.getElementById('sidebar-avatar').textContent =
        name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let allVendors = [];

    await loadVendors();

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;
            if (filter === 'all') renderVendors(allVendors);
            else if (filter === 'approved') renderVendors(allVendors.filter(v => v.isApproved));
            else if (filter === 'pending') renderVendors(allVendors.filter(v => !v.isApproved));
        });
    });

    async function loadVendors() {
        const result = await AdminAPI.getVendors();

        if (!result.isSuccessful) {
            document.getElementById('vendors-container').innerHTML =
                `<div class="empty-state"><p>Could not load vendors.</p></div>`;
            return;
        }

        allVendors = result.data || [];
        renderVendors(allVendors);
    }

    function renderVendors(vendors) {
        const container = document.getElementById('vendors-container');

        if (vendors.length === 0) {
            container.innerHTML =
                `<div class="empty-state"><p>No vendors found.</p></div>`;
            return;
        }

        container.innerHTML = `
            <table class="dash-table">
                <thead>
                    <tr>
                        <th>Organization / Household</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Listings</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${vendors.map(v => `
                        <tr id="vendor-row-${v.vendorId}">
                            <td class="food-name">${v.organizationName}</td>
                            <td>${v.email}</td>
                            <td>${v.phoneNumber}</td>
                            <td>${v.totalListings}</td>
                            <td>
                                <span class="status-pill ${v.isApproved ? 'status-confirmed' : 'status-pending'}">
                                    ${v.isApproved ? 'Approved' : 'Pending'}
                                </span>
                            </td>
                            <td>${formatDateShort(v.dateJoined)}</td>
                            <td>
                                ${!v.isApproved ? `
                                    <button class="btn-approve" onclick="handleApproval('${v.vendorId}', true)" id="approve-${v.vendorId}">
                                        Approve
                                    </button>
                                    <button class="btn-reject" onclick="handleApproval('${v.vendorId}', false)" id="reject-${v.vendorId}">
                                        Reject
                                    </button>` : `
                                    <button class="btn-reject" onclick="handleApproval('${v.vendorId}', false)" id="reject-${v.vendorId}">
                                        Revoke
                                    </button>`}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    window.handleApproval = async function(vendorId, isApproved) {
        const approveBtn = document.getElementById(`approve-${vendorId}`);
        const rejectBtn = document.getElementById(`reject-${vendorId}`);
        if (approveBtn) approveBtn.disabled = true;
        if (rejectBtn) rejectBtn.disabled = true;

        const result = await VendorAPI.approveReject({ vendorId, isApproved });

        if (!result.isSuccessful) {
            showToast(result.message || 'Action failed.', 'error');
            if (approveBtn) approveBtn.disabled = false;
            if (rejectBtn) rejectBtn.disabled = false;
            return;
        }

        showToast(
            isApproved ? 'Vendor approved.' : 'Vendor rejected/revoked.',
            isApproved ? 'success' : 'warning'
        );

        await loadVendors();
    };

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