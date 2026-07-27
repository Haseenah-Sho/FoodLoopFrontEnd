document.addEventListener('DOMContentLoaded', () => {

    if (Auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('register-form');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const registerBtn = document.getElementById('register-btn');

    // Password toggles
    setupToggle('togglePassword', 'passwordInput', 'toggleIcon');
    setupToggle('toggleConfirm', 'confirmPasswordInput', 'toggleConfirmIcon');

    
    ['fullNameInput','usernameInput','phoneInput','emailInput','addressInput','passwordInput','confirmPasswordInput']
        .forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                clearFieldError(id.replace('Input', '').toLowerCase() + '-error',
                    document.getElementById(id));
            });
        });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullNameInput').value.trim();
        const userName = document.getElementById('usernameInput').value.trim();
        const phoneNumber = document.getElementById('phoneInput').value.trim();
        const email = document.getElementById('emailInput').value.trim();
        const address = document.getElementById('addressInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        let hasError = false;

        if (!fullName) { showFieldError('fullname-error', document.getElementById('fullNameInput'), 'Full name is required.'); hasError = true; }
        if (!userName) { showFieldError('username-error', document.getElementById('usernameInput'), 'Username is required.'); hasError = true; }
        if (!phoneNumber) { showFieldError('phone-error', document.getElementById('phoneInput'), 'Phone number is required.'); hasError = true; }
        if (!email || !isValidEmail(email)) { showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.'); hasError = true; }
        if (!address) { showFieldError('address-error', document.getElementById('addressInput'), 'Address is required.'); hasError = true; }
        if (!password || password.length < 8) { showFieldError('password-error', document.getElementById('passwordInput'), 'Password must be at least 8 characters.'); hasError = true; }
        if (password !== confirmPassword) { showFieldError('confirm-error', document.getElementById('confirmPasswordInput'), 'Passwords do not match.'); hasError = true; }

        if (hasError) return;

        setLoading(true);
        hideFormMessages();

        const result = await AuthAPI.registerCustomer({
            fullName, userName, phoneNumber, email, address, password, confirmPassword
        });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Registration failed. Please try again.');
            return;
        }

        showToast('Account created! Please check your email for a verification code.', 'success');
        setTimeout(() => window.location.href = 'verify-email.html', 2000);
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