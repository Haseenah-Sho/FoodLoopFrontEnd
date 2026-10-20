document.addEventListener('DOMContentLoaded', async () => {

    const SUPPORT_EMAIL = 'foodloop49@gmail.com';   // change when you have a domain address

    const card = document.getElementById('pay-card');
    const params = new URLSearchParams(window.location.search);
    // Paystack adds both; either one is the payment reference
    const reference = params.get('reference') || params.get('trxref');

    // ── Small DOM helpers: values from the server are always set as text ──
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function render({ icon, tone, title, message, summary = [], buttons = [] }) {
        card.innerHTML = '';

        if (tone === 'loading') {
            const spinner = el('div', 'pay-spinner');
            spinner.style.margin = '0 auto 16px';
            card.append(spinner);
        } else {
            const iconWrap = el('div', `pay-icon ${tone}`);
            iconWrap.append(el('i', `bi ${icon}`));
            card.append(iconWrap);
        }

        card.append(el('h1', 'pay-title', title));
        card.append(el('p', 'pay-message', message));

        if (summary.length > 0) {
            const box = el('div', 'pay-summary');
            summary.forEach(([label, value]) => {
                const row = el('div', 'pay-row');
                row.append(el('span', '', label), el('span', '', value));
                box.append(row);
            });
            card.append(box);
        }

        if (buttons.length > 0) {
            const actions = el('div', 'pay-actions');
            buttons.forEach(b => {
                const a = el('a', `pay-btn${b.primary ? ' primary' : ''}`, b.label);
                a.href = b.href;
                actions.append(a);
            });
            card.append(actions);
        }
    }

    const loading = (message) => render({
        tone: 'loading',
        title: 'Confirming your payment',
        message
    });

    // ── 1. No reference in the address ──
    if (!reference) {
        render({
            tone: 'error', icon: 'bi-exclamation-circle',
            title: 'No payment found',
            message: 'We could not find a payment reference on this page. If you were charged, ' +
                     'your order will still be confirmed automatically. Check My Orders to see it.',
            buttons: [
                { label: 'View my orders', href: 'my-orders.html', primary: true },
                { label: 'Browse food', href: 'index.html#listings' }
            ]
        });
        return;
    }

    // ── 2. Not signed in (session may have expired while paying) ──
    if (!Auth.isLoggedIn() || !Auth.hasRole('app_customer')) {
        render({
            tone: 'info', icon: 'bi-person-circle',
            title: 'Sign in to see your order',
            message: 'Your payment is being processed. Sign in to confirm it and view your order.',
            buttons: [{
                label: 'Sign in',
                href: `login.html?returnUrl=${encodeURIComponent(window.location.href)}`,
                primary: true
            }]
        });
        return;
    }

    // ── 3. Confirm the payment. Paystack can take a few seconds, so retry. ──
    loading('Please wait. This usually takes a few seconds. Do not close this page.');

    const result = await verifyWithRetry();

    async function verifyWithRetry() {
        let last;
        for (let attempt = 1; attempt <= 5; attempt++) {
            last = await PaymentAPI.verify(reference);
            if (last.isSuccessful) return last;

            const retryable = /couldn't confirm|try again in a moment|network error/i.test(last.message || '');
            if (!retryable || attempt === 5) return last;

            loading(`Still confirming your payment… (${attempt}/5)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        return last;
    }

    // ── 4. Show the outcome and stay on this page ──
    if (result.isSuccessful) {
        await showSuccess(result.data?.orderId);
        return;
    }

    const msg = result.message || 'Something went wrong while confirming your payment.';

    if (/cancelled|amount/i.test(msg)) {
        // Money was taken but the order can't go ahead: a person has to sort this out
        render({
            tone: 'warning', icon: 'bi-exclamation-triangle',
            title: 'Please contact us',
            message: msg,
            buttons: [
                { label: 'Email support', href: `mailto:${SUPPORT_EMAIL}?subject=Payment%20${encodeURIComponent(reference)}`, primary: true },
                { label: 'View my orders', href: 'my-orders.html' }
            ]
        });
        return;
    }

    if (/not successful/i.test(msg)) {
        render({
            tone: 'error', icon: 'bi-x-circle',
            title: 'Payment was not successful',
            message: 'You have not been charged for this attempt. Open your order to try again.',
            buttons: [
                { label: 'View my orders', href: 'my-orders.html', primary: true },
                { label: 'Browse food', href: 'index.html#listings' }
            ]
        });
        return;
    }

    render({
        tone: 'error', icon: 'bi-exclamation-circle',
        title: 'We could not confirm your payment',
        message: msg + ' If you were charged, your order will be confirmed automatically. Check My Orders in a few minutes.',
        buttons: [
            { label: 'View my orders', href: 'my-orders.html', primary: true },
            { label: 'Try again', href: window.location.href }
        ]
    });

    async function showSuccess(orderId) {
        const summary = [];
        let message = 'Your payment was received and your order is confirmed.';

        if (orderId) {
            const orderResult = await OrderAPI.getDetails(orderId);
            if (orderResult.isSuccessful && orderResult.data) {
                const o = orderResult.data;

                summary.push(['Order number', o.orderNo]);
                summary.push(['Food provider', o.vendorName]);
                summary.push(['Amount paid', o.totalAmount > 0 ? formatCurrency(o.totalAmount) : 'Free']);

                if (o.fulfilmentType === 'Delivery') {
                    summary.push(['Delivery to', o.deliveryAddress || '-']);
                    message = `Thank you! ${o.vendorName} will contact you shortly to arrange delivery.`;
                } else {
                    const first = o.items && o.items[0];
                    if (first && first.pickUpStart) {
                        summary.push(['Pickup window', `${formatDate(first.pickUpStart)} to ${formatDate(first.pickUpEnd)}`]);
                    }
                    message = `Thank you! ${o.vendorName} will contact you shortly to arrange pickup.`;
                }
            }
        }

        render({
            tone: 'success', icon: 'bi-check-lg',
            title: 'Payment successful',
            message: message + ' You will also see updates in your notifications.',
            summary,
            buttons: [
                { label: orderId ? 'View my order' : 'View my orders', href: orderId ? `order-detail.html?id=${orderId}` : 'my-orders.html', primary: true },
                { label: 'Browse more food', href: 'index.html#listings' }
            ]
        });
    }
});