document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Food Provider';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let currentProfile = null;
    let locationPicker = null;
    let banksList = [];
    let resolvedAccountName = null;

    await loadProfile();

    // Toggle between view and edit
    document.getElementById('edit-btn').addEventListener('click', () => {
        document.getElementById('profile-edit').style.display = 'block';
        document.getElementById('edit-btn').style.display = 'none';
        document.getElementById('orgName').value = currentProfile.organizationName;
        document.getElementById('phoneNumber').value = currentProfile.phoneNumber;
        document.getElementById('addressInput').value = currentProfile.address;

        if (!locationPicker) {
            locationPicker = createLocationPicker('location-map', {
                lat: currentProfile.latitude,
                lng: currentProfile.longitude
            });
        } else {
            locationPicker.refresh();
        }

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

        document.getElementById('view-fullname').textContent = user.name || '—';
        document.getElementById('view-orgname').textContent = currentProfile.organizationName;
        document.getElementById('view-email').textContent = currentProfile.email;
        document.getElementById('view-phone').textContent = currentProfile.phoneNumber;
        document.getElementById('view-address').textContent = currentProfile.address;
        document.getElementById('view-status').innerHTML = currentProfile.isApproved
            ? `<span class="status-pill status-confirmed">Approved</span>`
            : `<span class="status-pill status-pending">Pending Approval</span>`;

        const statusEl = document.getElementById('approval-status');
        if (currentProfile.isApproved) {
            statusEl.innerHTML = `
                <div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;padding:12px 16px;
                    display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#2e7d32;">
                    <i class="bi bi-patch-check-fill"></i>
                    <strong>Account Approved</strong> - You can create and manage food items.
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

        renderPayoutSection();
    }

    // ── Payout account section ──
    function renderPayoutSection() {
        const linkedEl = document.getElementById('payout-linked');
        const unlinkedEl = document.getElementById('payout-unlinked');

        if (currentProfile.hasPayoutAccountLinked) {
            document.getElementById('payout-bank').textContent = currentProfile.bankName;
            document.getElementById('payout-account-number').textContent = currentProfile.bankAccountNumber;
            document.getElementById('payout-account-name').textContent = currentProfile.accountName;
            linkedEl.style.display = 'block';
            unlinkedEl.style.display = 'none';
        } else {
            linkedEl.style.display = 'none';
            unlinkedEl.style.display = 'block';
            if (banksList.length === 0) loadBanks();
        }
    }

    async function loadBanks() {
        const select = document.getElementById('bankSelect');
        const result = await VendorAPI.getBanks();

        if (!result.isSuccessful || !result.data || result.data.length === 0) {
            select.innerHTML = `<option value="">${result.message || 'Could not load banks — try refreshing'}</option>`;
            return;
        }

        banksList = result.data;
        select.innerHTML = '<option value="">Select your bank</option>' +
            banksList.map(b => `<option value="${b.code}">${b.name}</option>`).join('');
    }

    // Resolve account name once both bank and a full 10-digit account number are present
    async function tryResolveAccount() {
        const bankCode = document.getElementById('bankSelect').value;
        const accountNumber = document.getElementById('accountNumberInput').value.trim();
        const resolvedEl = document.getElementById('resolved-name');

        resolvedAccountName = null;
        resolvedEl.style.display = 'none';

        if (!bankCode || accountNumber.length !== 10) return;

        resolvedEl.style.display = 'block';
        resolvedEl.textContent = 'Verifying account...';

        const result = await VendorAPI.resolveAccount(accountNumber, bankCode);

        if (!result.isSuccessful || !result.data) {
            resolvedEl.textContent = result.message || 'Could not verify this account number.';
            resolvedEl.style.color = '#c62828';
            return;
        }

        resolvedAccountName = result.data;
        resolvedEl.style.color = 'var(--primary)';
        resolvedEl.textContent = `Account name: ${resolvedAccountName}`;
    }

    document.getElementById('bankSelect').addEventListener('change', tryResolveAccount);

    let resolveTimeout;
    document.getElementById('accountNumberInput').addEventListener('input', () => {
        clearTimeout(resolveTimeout);
        resolveTimeout = setTimeout(tryResolveAccount, 400);
    });

    document.getElementById('link-account-btn').addEventListener('click', async () => {
        const bankSelect = document.getElementById('bankSelect');
        const bankCode = bankSelect.value;
        const bankName = bankSelect.options[bankSelect.selectedIndex]?.text || '';
        const accountNumber = document.getElementById('accountNumberInput').value.trim();

        hidePayoutBanners();

        if (!bankCode) {
            document.getElementById('bankSelect-error').textContent = 'Please select a bank.';
            return;
        }
        if (accountNumber.length !== 10) {
            document.getElementById('accountNumberInput-error').textContent = 'Enter a valid 10-digit account number.';
            return;
        }
        if (!resolvedAccountName) {
            document.getElementById('payout-error').textContent = 'Please wait for account verification to complete before linking.';
            document.getElementById('payout-error').style.display = 'block';
            return;
        }

        setLinkLoading(true);

        const result = await VendorAPI.setBankDetails({ bankCode, bankName, accountNumber });

        setLinkLoading(false);

        if (!result.isSuccessful) {
            document.getElementById('payout-error').textContent = result.message || 'Could not link this account.';
            document.getElementById('payout-error').style.display = 'block';
            return;
        }

        document.getElementById('payout-success').textContent = result.message || 'Payout account linked successfully.';
        document.getElementById('payout-success').style.display = 'block';

        await loadProfile();
    });

    function hidePayoutBanners() {
        document.getElementById('payout-error').style.display = 'none';
        document.getElementById('payout-success').style.display = 'none';
        document.getElementById('bankSelect-error').textContent = '';
        document.getElementById('accountNumberInput-error').textContent = '';
    }

    function setLinkLoading(loading) {
        const btn = document.getElementById('link-account-btn');
        const text = document.getElementById('link-btn-text');
        const spinner = document.getElementById('link-btn-spinner');
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('show', loading);
    }

    // ── Existing profile edit form ──
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const orgName = document.getElementById('orgName').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const address = document.getElementById('addressInput').value.trim();
        const location = locationPicker ? locationPicker.getLocation() : null;

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
        if (!address) {
            document.getElementById('addressInput-error').textContent = 'Address is required.';
            hasError = true;
        }
        if (!location) {
            document.getElementById('location-error').textContent = 'Please click on the map to pin your location.';
            hasError = true;
        }
        if (hasError) return;

        setLoading(true);
        hideFormBanners();

        const result = await VendorAPI.updateProfile({
            organizationName: orgName, phoneNumber, address,
            latitude: location.lat, longitude: location.lng
        });

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