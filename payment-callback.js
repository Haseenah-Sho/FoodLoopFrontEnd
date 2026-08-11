document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    // Paystack sends either "reference" or "trxref" depending on integration type
    const reference = params.get('reference') || params.get('trxref');

    const spinner = document.getElementById('callback-spinner');
    const title = document.getElementById('callback-title');
    const message = document.getElementById('callback-message');
    const btn = document.getElementById('callback-btn');
    const icon = document.getElementById('callback-icon');

    if (!reference) {
        showResult(false, 'Missing Reference', "We couldn't find a payment reference to confirm. If money left your account, check My Orders — it may already be confirmed.");
        return;
    }

    const result = await PaymentAPI.verify(reference);

    if (result.isSuccessful) {
        showResult(true, 'Payment Successful', 'Your order has been confirmed. The food provider has been notified.');
        setTimeout(() => window.location.href = 'customer-dashboard.html', 2500);
    } else {
        showResult(false, 'Payment Not Confirmed', result.message || "We couldn't confirm this payment. If you were charged, it may still be processing — check My Orders shortly.");
    }

    function showResult(success, titleText, messageText) {
        spinner.style.display = 'none';
        title.textContent = titleText;
        message.textContent = messageText;
        btn.style.display = 'inline-flex';

        const iconEl = document.createElement('div');
        iconEl.className = `callback-icon ${success ? 'success' : 'error'}`;
        iconEl.innerHTML = success ? '<i class="bi bi-check-circle-fill"></i>' : '<i class="bi bi-x-circle-fill"></i>';
        document.getElementById('callback-card').insertBefore(iconEl, title);
    }
});