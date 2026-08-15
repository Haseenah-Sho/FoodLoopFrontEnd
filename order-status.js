// Single source of truth for order status display - used everywhere an order status appears,
// so no page can independently drift out of sync with another (which is what caused the original bug).

// Compact pill - used in dense contexts: tables, list cards.
function statusPill(order) {
    const map = {
        'Confirmed': 'status-confirmed',
        'Pending': 'status-pending',
        'Completed': 'status-completed',
        'Cancelled': 'status-cancelled'
    };
    let html = `<span class="status-pill ${map[order.status] || 'status-pending'}">${order.status}</span>`;
    if (order.fulfilmentType === 'Delivery' && order.deliveryStatus) {
        html += ` <span class="status-pill status-confirmed">${order.deliveryStatus}</span>`;
    }
    return html;
}

// Full visual timeline - used where there's room to show the whole journey at once.
function renderStatusTimeline(order) {
    if (order.status === 'Cancelled') {
        return `<div class="status-timeline-cancelled"><i class="bi bi-x-circle-fill"></i> Order Cancelled</div>`;
    }

    const steps = [{ key: 'Placed', label: 'Placed' }, { key: 'Confirmed', label: 'Confirmed' }];
    if (order.fulfilmentType === 'Delivery') {
        steps.push({ key: 'Dispatched', label: 'Dispatched' });
        steps.push({ key: 'Delivered', label: 'Delivered' });
    }
    steps.push({ key: 'Completed', label: 'Completed' });

    let currentIndex = 0;
    if (order.status === 'Pending') {
        currentIndex = 0;
    } else if (order.status === 'Confirmed' && order.deliveryStatus === 'Delivered') {
        currentIndex = steps.findIndex(s => s.key === 'Delivered');
    } else if (order.status === 'Confirmed' && order.deliveryStatus === 'Dispatched') {
        currentIndex = steps.findIndex(s => s.key === 'Dispatched');
    } else if (order.status === 'Confirmed') {
        currentIndex = 1;
    } else if (order.status === 'Completed') {
        currentIndex = steps.length - 1;
    }

    return `
        <div class="status-timeline">
            ${steps.map((step, i) => `
                <div class="status-step ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}">
                    <div class="status-step-dot">${i < currentIndex ? '<i class="bi bi-check"></i>' : ''}</div>
                    <div class="status-step-label">${step.label}</div>
                </div>
                ${i < steps.length - 1 ? `<div class="status-step-line ${i < currentIndex ? 'done' : ''}"></div>` : ''}
            `).join('')}
        </div>
    `;
}