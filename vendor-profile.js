document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Vendor';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let currentProfile = null;

    await loadProfile();

    // Toggle between view and edit
    document.getElementById('edit-btn').addEventListener('click', () => {
        document.getElementById('profile-edit').style.display = 'block';
        document.getElementById('edit-btn').style.display = 'none';
        // Pre-fill edit form with current values
        document.getElementById('orgName').value = currentProfile.organizationName;
        document.getElementById('phoneNumber').value = currentProfile.phoneNumber;
        // Scroll to edit form
        document.getElementById('profile-edit').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        document.getElementById('profile-edit').style.display = 'none';
        document.getElementById('edit-btn').style.display = 'inline-flex';
        hideFormBanners();
    });

    async function loadProfile() {
        const result = await VendorAPI.getProfile();

        document.getElementById('profile-loading').style.display = 'none';

        if (!result.isSuccessful) {
            document.getElementById('profile-details').innerHTML =
                `<p style="color:#c62828;font-size:0.875rem;">${result.message || 'Could not load profile.'}</p>`;
            document.getElementById('profile-details').style.display = 'block';
            return;
        }

        currentProfile = result.data;

        // Populate view
        document.getElementById('view-fullname').textContent = user.name || '—';
        document.getElementById('view-orgname').textContent = currentProfile.organizationName;
        document.getElementById('view-email').textContent = currentProfile.email;
        document.getElementById('view-phone').textContent = currentProfile.phoneNumber;
        document.getElementById('view-status').innerHTML = currentProfile.isApproved
            ? `<span class="status-pill status-confirmed">Approved</span>`
            : `<span class="status-pill status-pending">Pending Approval</span>`;

        // Approval banner
        const statusEl = document.getElementById('approval-status');
        if (currentProfile.isApproved) {
            statusEl.innerHTML = `
                <div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:12px 16px;
                    display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#2e7d32;">
                    <i class="bi bi-patch-check-fill"></i>
                    <strong>Account Approved</strong> - You can create and manage listings.
                </div>`;
        } else {
            statusEl.innerHTML = `
                <div style="background:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;padding:12px 16px;
                    display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#e65100;">
                    <i class="bi bi-hourglass-split"></i>
                    <strong>Pending Approval</strong> - Your account is awaiting admin's approval.
                </div>`;
        }

        document.getElementById('profile-details').style.display = 'block';
    }

    // Save changes
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const orgName = document.getElementById('orgName').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();

        let hasError = false;
        if (!orgName) {
            document.getElementById('orgName-error').textContent = 'Organization name is required.';
            document.getElementById('orgName').classList.add('is-invalid');
            hasError = true;
        }
        if (!phoneNumber) {
            document.getElementById('phoneNumber-error').textContent = 'Phone number is required.';
            document.getElementById('phoneNumber').classList.add('is-invalid');
            hasError = true;
        }
        if (hasError) return;

        setLoading(true);
        hideFormBanners();

        const result = await VendorAPI.updateProfile({
            organizationName: orgName,
            phoneNumber
        });

        setLoading(false);

        if (!result.isSuccessful) {
            document.getElementById('form-error').textContent = result.message || 'Update failed.';
            document.getElementById('form-error').style.display = 'block';
            return;
        }

        document.getElementById('form-success').textContent = result.message || 'Profile updated successfully.';
        document.getElementById('form-success').style.display = 'block';

        // Reload profile view with updated data
        await loadProfile();

        // Close edit form after short delay
        setTimeout(() => {
            document.getElementById('profile-edit').style.display = 'none';
            document.getElementById('edit-btn').style.display = 'inline-flex';
            hideFormBanners();
        }, 2000);
    });

    function setLoading(loading) {
        const btn = document.getElementById('save-btn');
        const text = document.getElementById('btn-text');
        const spinner = document.getElementById('btn-spinner');
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('show', loading);
    }

    function hideFormBanners() {
        document.getElementById('form-error').style.display = 'none';
        document.getElementById('form-success').style.display = 'none';
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