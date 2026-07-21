document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('reset-form');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const resetBtn = document.getElementById('reset-btn');

    setupToggle('togglePassword', 'passwordInput', 'toggleIcon');
    setupToggle('toggleConfirm', 'confirmPasswordInput', 'toggleConfirmIcon');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('emailInput').value.trim();
        const token = document.getElementById('tokenInput').value.trim();
        const newPassword = document.getElementById('passwordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        let hasError = false;

        if (!email || !isValidEmail(email)) { showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.'); hasError = true; }
        if (!token) { showFieldError('token-error', document.getElementById('tokenInput'), 'Reset code is required.'); hasError = true; }
        if (!newPassword || newPassword.length < 8) { showFieldError('password-error', document.getElementById('passwordInput'), 'Password must be at least 8 characters.'); hasError = true; }
        if (newPassword !== confirmPassword) { showFieldError('confirm-error', document.getElementById('confirmPasswordInput'), 'Passwords do not match.'); hasError = true; }

        if (hasError) return;

        setLoading(true);
        hideFormMessages();

        const result = await AuthAPI.resetPassword({ email, token, newPassword, confirmPassword });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Reset failed. Please try again.');
            return;
        }

        showFormSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => window.location.href = 'login.html', 2000);
    });

    function setLoading(loading) {
        resetBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.classList.toggle('show', loading);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});