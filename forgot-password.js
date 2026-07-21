document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('forgot-form');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const forgotBtn = document.getElementById('forgot-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('emailInput').value.trim();

        if (!email || !isValidEmail(email)) {
            showFieldError('email-error', document.getElementById('emailInput'), 'A valid email is required.');
            return;
        }

        setLoading(true);
        hideFormMessages();

        const result = await AuthAPI.forgotPassword({ email });

        setLoading(false);

        if (!result.isSuccessful) {
            showFormError(result.message || 'Something went wrong. Please try again.');
            return;
        }

        showFormSuccess('Reset code sent! Check your email and enter the code on the next page.');
        setTimeout(() => window.location.href = `reset-password.html`, 2500);
    });

    function setLoading(loading) {
        forgotBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : 'inline';
        btnSpinner.classList.toggle('show', loading);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
});