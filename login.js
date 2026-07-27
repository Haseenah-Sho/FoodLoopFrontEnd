document.addEventListener('DOMContentLoaded', () => {

    // Redirect if already logged in
    if (Auth.isLoggedIn()) {
        redirectToDashboard(Auth.getUser().roles || []);
        return;
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

    //  Toggle password visibility 
    togglePassword.addEventListener('click', function(e) {
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

    //  Clear errors on input 
    emailInput.addEventListener('input', () => clearFieldError('email-error', emailInput));
    passwordInput.addEventListener('input', () => clearFieldError('password-error', passwordInput));

    //  Form submit 
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
            return;
        }

        Auth.setToken(result.data.token);
        Auth.setUser(result.data);

if (result.data.roles.includes('app_vendor')) {
    const profileResult = await VendorAPI.getProfile();
    if (profileResult.isSuccessful) {
        localStorage.setItem('fl_vendor_id', profileResult.data.vendorId);
    }
}

        showToast('Login successful!', 'success');

        setTimeout(() => redirectToDashboard(result.data.roles || []), 1200);
    });

    //  Helpers 

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
            window.location.href = 'vendor-dashboard.html';
        } else {
            window.location.href = 'customer-dashboard.html';
        }
    }

});