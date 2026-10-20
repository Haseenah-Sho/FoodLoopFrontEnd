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
        redirectToDashboard(Auth.getUser().roles || []);
        return;
    }

    if (returnUrl) {
        document.querySelectorAll('a[href^="register-customer.html"]').forEach(a => {
            a.href = `register-customer.html?returnUrl=${encodeURIComponent(returnUrl)}`;
        });
    }

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const formError = document.getElementById('form-error');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const loginBtn = document.getElementById('login-btn');
    const togglePassword = document.getElementById('togglePassword');
    const toggleIcon = document.getElementById('toggleIcon');

    // Toggle password visibility
    togglePassword.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'bi bi-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'bi bi-eye';
        }
    });

    // Clear errors on input
    emailInput.addEventListener('input', () => clearFieldError('email-error', emailInput));
    passwordInput.addEventListener('input', () => clearFieldError('password-error', passwordInput));

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        let hasError = false;

        if (!email) {
            showFieldError('email-error', emailInput, 'Email is required.');
            hasError = true;
        } else if (!isValidEmail(email)) {
            showFieldError('email-error', emailInput, 'Enter a valid email address.');
            hasError = true;
        }

        if (!password) {
            showFieldError('password-error', passwordInput, 'Password is required.');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        hideFormError();

        const result = await AuthAPI.login({ email, password });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Login failed. Please try again.');

            // Unverified account: take them to verification, keeping the item they came from
            if (/not been verified/i.test(result.message || '')) {
                const verifyUrl = `verify-email.html?email=${encodeURIComponent(email)}`
                    + (returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '');
                setTimeout(() => window.location.href = verifyUrl, 2500);
            }
            return;
        }

        Auth.setToken(result.data.token);
        Auth.setUser(result.data);

        showToast('Login successful!', 'success');

        setTimeout(() => redirectToDashboard(result.data.roles || []), 1200);
    });

    // Helpers

    function setLoading(loading) {
        loginBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.classList.toggle('show', loading);
    }

    function showFieldError(errorId, inputEl, message) {
        const el = document.getElementById(errorId);
        if (el) el.textContent = message;
        if (inputEl) inputEl.classList.add('is-invalid');
    }

    function clearFieldError(errorId, inputEl) {
        const el = document.getElementById(errorId);
        if (el) el.textContent = '';
        if (inputEl) inputEl.classList.remove('is-invalid');
    }

    function showFormError(message) {
        formError.textContent = message;
        formError.classList.add('show');
    }

    function hideFormError() {
        formError.classList.remove('show');
        formError.textContent = '';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function redirectToDashboard(roles) {
        if (roles.includes('app_admin')) {
            window.location.href = 'admin-dashboard.html';
        } else if (roles.includes('app_vendor')) {
            window.location.href = 'food-providers-dashboard.html';
        } else if (returnUrl && roles.includes('app_customer')) {
            window.location.href = returnUrl;
        } else {
            window.location.href = 'customer-dashboard.html';
        }
    }

});