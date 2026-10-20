function safeReturnUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url, window.location.href);
        return u.origin === window.location.origin ? u.href : null;
    } catch {
        return null;
    }
}
document.addEventListener('DOMContentLoaded', () => {

    const returnUrl = safeReturnUrl(new URLSearchParams(window.location.search).get('returnUrl'));

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

    // Password toggles
    setupToggle('togglePassword', 'passwordInput', 'toggleIcon');
    setupToggle('toggleConfirm', 'confirmPasswordInput', 'toggleConfirmIcon');

    
        const FIELD_ERRORS = {
        fullNameInput: 'fullname-error',
        usernameInput: 'username-error',
        phoneInput: 'phone-error',
        emailInput: 'email-error',
        addressInput: 'address-error',
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
        const userName = document.getElementById('usernameInput').value.trim();
        const phoneNumber = document.getElementById('phoneInput').value.trim();
        const email = document.getElementById('emailInput').value.trim();
        const address = document.getElementById('addressInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        clearAllErrors();
        let hasError = false;

        if (!fullName) { showFieldError('fullname-error', document.getElementById('fullNameInput'), 'Full name is required.'); hasError = true; }
        if (!userName) { showFieldError('username-error', document.getElementById('usernameInput'), 'Username is required.'); hasError = true; }
        if (!phoneNumber) { showFieldError('phone-error', document.getElementById('phoneInput'), 'Phone number is required.'); hasError = true; }
        if (!email || !isValidEmail(email)) { showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.'); hasError = true; }
        if (!address) { showFieldError('address-error', document.getElementById('addressInput'), 'Address is required.'); hasError = true; }
        if (!password || password.length < 8) { showFieldError('password-error', document.getElementById('passwordInput'), 'Password must be at least 8 characters.'); hasError = true; }
        if (password !== confirmPassword) { showFieldError('confirm-error', document.getElementById('confirmPasswordInput'), 'Passwords do not match.'); hasError = true; }
        if (!disclaimerCheck.checked) {
            disclaimerError.textContent = 'Please accept the disclaimer to create an account.';
            consentGroup.classList.add('is-invalid');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        hideFormMessages();

        const result = await AuthAPI.registerCustomer({
            fullName, userName, phoneNumber, email, address, password, confirmPassword,
            acceptedDisclaimer: disclaimerCheck.checked
        });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Registration failed. Please try again.');
            return;
        }

        showToast('Account created! Please check your email for a verification code.', 'success');
        const verifyUrl = returnUrl ? `verify-email.html?email=${encodeURIComponent(email)}&returnUrl=${encodeURIComponent(returnUrl)}` : `verify-email.html?email=${encodeURIComponent(email)}`;
        setTimeout(() => window.location.href = verifyUrl, 2000);
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