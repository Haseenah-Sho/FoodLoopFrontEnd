document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('verify-form');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const verifyBtn = document.getElementById('verify-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('emailInput').value.trim();
        const token = document.getElementById('tokenInput').value.trim();

        let hasError = false;

        if (!email || !isValidEmail(email)) {
            showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.');
            hasError = true;
        }
        if (!token) {
            showFieldError('token-error', document.getElementById('tokenInput'), 'Verification code is required.');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        hideFormMessages();

        const result = await AuthAPI.verifyEmail({ email, token });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Verification failed. Please try again.');
            return;
        }

        showFormSuccess('Email verified successfully! Redirecting to login...');
        setTimeout(() => window.location.href = 'login.html', 2000);
    });

    function setLoading(loading) {
        verifyBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.classList.toggle('show', loading);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});