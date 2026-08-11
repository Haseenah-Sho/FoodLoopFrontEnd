document.addEventListener('DOMContentLoaded', () => {

    if (Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('register-form');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const registerBtn = document.getElementById('register-btn');

    setupToggle('togglePassword', 'passwordInput', 'toggleIcon');
    setupToggle('toggleConfirm', 'confirmPasswordInput', 'toggleConfirmIcon');

    const picker = createLocationPicker('location-map');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullNameInput').value.trim();
        const organizationName = document.getElementById('orgNameInput').value.trim();
        const address = document.getElementById('addressInput').value.trim();
        const phoneNumber = document.getElementById('phoneInput').value.trim();
        const email = document.getElementById('emailInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;
        const location = picker.getLocation();

        let hasError = false;

        if (!fullName) { showFieldError('fullname-error', document.getElementById('fullNameInput'), 'Full name is required.'); hasError = true; }
        if (!organizationName) { showFieldError('orgname-error', document.getElementById('orgNameInput'), 'Food provider name is required.'); hasError = true; }
        if (!address) { showFieldError('address-error', document.getElementById('addressInput'), 'Address is required.'); hasError = true; }
        if (!location) { showFieldError('location-error', null, 'Please click on the map to pin your location.'); hasError = true; }
        if (!phoneNumber) { showFieldError('phone-error', document.getElementById('phoneInput'), 'Phone number is required.'); hasError = true; }
        if (!email || !isValidEmail(email)) { showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.'); hasError = true; }
        if (!password || password.length < 8) { showFieldError('password-error', document.getElementById('passwordInput'), 'Password must be at least 8 characters.'); hasError = true; }
        if (password !== confirmPassword) { showFieldError('confirm-error', document.getElementById('confirmPasswordInput'), 'Passwords do not match.'); hasError = true; }

        if (hasError) return;

        setLoading(true);
        hideFormMessages();

        const result = await VendorAPI.register({
            fullName, organizationName, phoneNumber, email, password, confirmPassword,
            address, latitude: location.lat, longitude: location.lng
        });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Registration failed. Please try again.');
            return;
        }

        showToast('Registration submitted! Check your email to verify your account. Admin approval is required before you can list food.', 'success');
        setTimeout(() => window.location.href = 'verify-email.html', 3000);
    });

    function setLoading(loading) {
        registerBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.classList.toggle('show', loading);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});