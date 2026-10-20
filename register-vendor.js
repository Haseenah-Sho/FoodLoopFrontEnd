document.addEventListener('DOMContentLoaded', () => {

    if (Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('register-form');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const registerBtn = document.getElementById('register-btn');
    const disclaimerCheck = document.getElementById('disclaimerCheck');
    const consentGroup = document.getElementById('consent-group');
    const disclaimerError = document.getElementById('disclaimer-error');

    setupToggle('togglePassword', 'passwordInput', 'toggleIcon');
    setupToggle('toggleConfirm', 'confirmPasswordInput', 'toggleConfirmIcon');

        disclaimerCheck.addEventListener('change', () => {
        disclaimerError.textContent = '';
        consentGroup.classList.remove('is-invalid');
    });

        const FIELD_ERRORS = {
        fullNameInput: 'fullname-error',
        orgNameInput: 'orgname-error',
        addressInput: 'address-error',
        phoneInput: 'phone-error',
        emailInput: 'email-error',
        passwordInput: 'password-error',
        confirmPasswordInput: 'confirm-error'
    };

    Object.entries(FIELD_ERRORS).forEach(([inputId, errorId]) => {
        const input = document.getElementById(inputId);
        if (input) input.addEventListener('input', () => clearFieldError(errorId, input));
    });

    function clearAllErrors() {
        Object.entries(FIELD_ERRORS).forEach(([inputId, errorId]) =>
            clearFieldError(errorId, document.getElementById(inputId)));
        disclaimerError.textContent = '';
        consentGroup.classList.remove('is-invalid');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullNameInput').value.trim();
        const organizationName = document.getElementById('orgNameInput').value.trim();
        const address = document.getElementById('addressInput').value.trim();
        const phoneNumber = document.getElementById('phoneInput').value.trim();
        const email = document.getElementById('emailInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        clearAllErrors();
        let hasError = false;

        if (!fullName) { showFieldError('fullname-error', document.getElementById('fullNameInput'), 'Full name is required.'); hasError = true; }
        if (!organizationName) { showFieldError('orgname-error', document.getElementById('orgNameInput'), 'Food provider name is required.'); hasError = true; }
        if (!address) { showFieldError('address-error', document.getElementById('addressInput'), 'Address is required.'); hasError = true; }
        if (!phoneNumber) { showFieldError('phone-error', document.getElementById('phoneInput'), 'Phone number is required.'); hasError = true; }
        if (!email || !isValidEmail(email)) { showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.'); hasError = true; }
        if (!password || password.length < 8) { showFieldError('password-error', document.getElementById('passwordInput'), 'Password must be at least 8 characters.'); hasError = true; }
        if (password !== confirmPassword) { showFieldError('confirm-error', document.getElementById('confirmPasswordInput'), 'Passwords do not match.'); hasError = true; }
        if (!disclaimerCheck.checked) {
            disclaimerError.textContent = 'Please accept the disclaimer to register.';
            consentGroup.classList.add('is-invalid');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        hideFormMessages();

        const result = await VendorAPI.register({
            fullName, organizationName, phoneNumber, email, password, confirmPassword, address,
            acceptedDisclaimer: disclaimerCheck.checked
        });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Registration failed. Please try again.');
            return;
        }

        showToast('Registration submitted! Check your email to verify your account. Admin approval is required before you can list food.', 'success');
        setTimeout(() => window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`, 3000);
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