document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_customer'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Customer';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let currentProfile = null;

    await loadProfile();

    // Toggle between view and edit
    document.getElementById('edit-btn').addEventListener('click', () => {
        document.getElementById('profile-edit').style.display = 'block';
        document.getElementById('edit-btn').style.display = 'none';
        document.getElementById('phoneNumber').value = currentProfile.phoneNumber;
        document.getElementById('address').value = currentProfile.address;
        document.getElementById('profile-edit').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        document.getElementById('profile-edit').style.display = 'none';
        document.getElementById('edit-btn').style.display = 'inline-flex';
        hideFormBanners();
    });

    async function loadProfile() {
        const result = await CustomerAPI.getProfile();

        document.getElementById('profile-loading').style.display = 'none';

        if (!result.isSuccessful) {
            document.getElementById('profile-details').innerHTML =
                `<p style="color:#c62828;font-size:0.875rem;">${result.message || 'Could not load profile.'}</p>`;
            document.getElementById('profile-details').style.display = 'block';
            return;
        }

        currentProfile = result.data;

        document.getElementById('view-fullname').textContent = currentProfile.name || '—';
        document.getElementById('view-email').textContent = currentProfile.email;
        document.getElementById('view-phone').textContent = currentProfile.phoneNumber || '—';
        document.getElementById('view-address').textContent = currentProfile.address || '—';

        document.getElementById('profile-details').style.display = 'block';
    }

    // Save changes
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const address = document.getElementById('address').value.trim();

        let hasError = false;
        if (!phoneNumber) {
            document.getElementById('phoneNumber-error').textContent = 'Phone number is required.';
            document.getElementById('phoneNumber').classList.add('is-invalid');
            hasError = true;
        }
        if (!address) {
            document.getElementById('address-error').textContent = 'Address is required.';
            document.getElementById('address').classList.add('is-invalid');
            hasError = true;
        }
        if (hasError) return;

        setLoading(true);
        hideFormBanners();

        const result = await CustomerAPI.updateProfile({ phoneNumber, address });

        setLoading(false);

        if (!result.isSuccessful) {
            document.getElementById('form-error').textContent = result.message || 'Update failed.';
            document.getElementById('form-error').style.display = 'block';
            return;
        }

        document.getElementById('form-success').textContent = result.message || 'Profile updated successfully.';
        document.getElementById('form-success').style.display = 'block';

        await loadProfile();

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