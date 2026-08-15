// SignalR client — handles real-time notifications and live updates

// Load SignalR client library dynamically
const signalRScript = document.createElement('script');
signalRScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/microsoft-signalr/8.0.0/signalr.min.js';
document.head.appendChild(signalRScript);

signalRScript.onload = () => {
    initSignalR();
};

function initSignalR() {
    const token = Auth.getToken();
    if (!token) return; // Don't connect if not logged in

    const connection = new signalR.HubConnectionBuilder()
        .withUrl('https://localhost:7208/hubs/notifications', {
            accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

    // ── Connection events ──
    connection.onreconnecting(() => {
        console.log('SignalR reconnecting...');
    });

    connection.onreconnected(() => {
        console.log('SignalR reconnected.');
        joinGroups(connection);
    });

    connection.onclose(() => {
        console.log('SignalR disconnected.');
    });

    // ── Start connection ──
    connection.start()
    .then(() => {
        console.log('SignalR connected.');
        setTimeout(() => joinGroups(connection), 500);
    })
    .catch(err => console.error('SignalR connection error:', err));

    // ── Join appropriate groups based on role ──
    function joinGroups(conn) {
        const user = Auth.getUser();
        if (!user || !user.userId) return;

        // Every logged-in user joins their personal group
        conn.invoke('JoinUserGroup', user.userId.toString())
            .catch(err => console.error('JoinUserGroup error:', err));

        // Vendors join their vendor group
        // if (Auth.hasRole('app_vendor')) {
        //     // We need vendorId — store it after login or profile load
        //     const vendorId = sessionStorage.getItem('fl_vendor_id');
        //     if (vendorId) {
        //         conn.invoke('JoinVendorGroup', vendorId)
        //             .catch(err => console.error('JoinVendorGroup error:', err));
        //     }
        // }

        // Everyone on public pages joins browse group
        if (document.getElementById('listings-grid')) {
            conn.invoke('JoinBrowseGroup')
                .catch(err => console.error('JoinBrowseGroup error:', err));
        }

        // Join listing group if on detail page
        const params = new URLSearchParams(window.location.search);
        const listingId = params.get('id');
        if (listingId) {
            conn.invoke('JoinListingGroup', listingId)
                .catch(err => console.error('JoinListingGroup error:', err));
        }
    }

    // ── Event handlers ──

    // Stock changed — update listing card/detail live
    connection.on('ListingStockChanged', (data) => {
        console.log('Stock changed:', data);

        // Update listing card on landing page
        const card = document.querySelector(`.listing-card[data-id="${data.listingId}"]`);
        if (card) {
            const portionsEl = card.querySelector('.listing-card-portions');
            if (portionsEl) {
                const isLow = data.remainingPortion <= 3 && data.remainingPortion > 0;
                portionsEl.innerHTML = `
                    <i class="bi bi-${isLow ? 'exclamation-circle' : 'layers'}"></i>
                    ${data.remainingPortion} left
                `;
                portionsEl.className = `listing-card-portions${isLow ? ' low' : ''}`;
            }

            // Hide card if sold out
            if (data.remainingPortion <= 0 || data.status === 'Completed') {
                card.style.transition = 'opacity 0.5s';
                card.style.opacity = '0.4';
                card.style.pointerEvents = 'none';
            }
        }

        // Update detail page if open
        const portionsEl = document.getElementById('detail-portions');
        if (portionsEl) {
            const isLow = data.remainingPortion <= 3 && data.remainingPortion > 0;
            portionsEl.innerHTML = `
                <i class="bi bi-layers"></i>
                ${data.remainingPortion} portion${data.remainingPortion !== 1 ? 's' : ''} left
            `;
            if (isLow) portionsEl.classList.add('low');

            if (data.remainingPortion <= 0) {
                // Show sold out state
                document.getElementById('order-form')?.style &&
                    (document.getElementById('order-form').style.display = 'none');
                document.getElementById('sold-out')?.style &&
                    (document.getElementById('sold-out').style.display = 'flex');
            }
        }
    });

    // New Food Items posted — add card to browse grid live
    connection.on('NewListingPosted', (data) => {
        console.log('New Food Items:', data);

        const grid = document.getElementById('listings-grid');
        if (!grid) return;

        showToast(`New Food Items available: ${data.foodName}`, 'success');

        // Add new card to top of grid
        const newCard = document.createElement('div');
        newCard.className = 'listing-card';
        newCard.dataset.id = data.listingId;
        newCard.innerHTML = `
            <div class="listing-card-img-placeholder">
                <i class="bi bi-image"></i>
            </div>
            <div class="listing-card-body">
                <div class="listing-card-top">
                    <div class="listing-card-name">${data.foodName}</div>
                    <span class="badge-free">New</span>
                </div>
                <div class="listing-card-vendor">
                    <i class="bi bi-shop"></i> ${data.vendorName}
                </div>
                <div class="listing-card-footer">
                    <div class="listing-card-price">Just Listed</div>
                </div>
            </div>`;

        newCard.addEventListener('click', () => {
            window.location.href = `food-items-detail.html?id=${data.listingId}`;
        });

        grid.insertBefore(newCard, grid.firstChild);
    });

    // Order status changed — update customer dashboard/orders
    connection.on('OrderStatusChanged', (data) => {
        console.log('Order status changed:', data);

        showToast(`Your order ${data.orderNo} is now ${data.status}`, 'success');

        // If on orders page, refresh the table
        if (document.getElementById('orders-container')) {
            // Find the order row and update status pill
            const rows = document.querySelectorAll('.order-card');
            rows.forEach(row => {
                if (row.querySelector('.order-card-no')?.textContent === data.orderNo) {
                    const pillEl = row.querySelector('.status-pill');
                    if (pillEl) {
                        const map = {
                            'Confirmed': 'status-confirmed',
                            'Pending': 'status-pending',
                            'Completed': 'status-completed',
                            'Cancelled': 'status-cancelled'
                        };
                        pillEl.className = `status-pill ${map[data.status] || 'status-pending'}`;
                        pillEl.textContent = data.status;
                    }
                }
            });
        }
    });

    // New order received — notify vendor
    connection.on('NewOrderReceived', (data) => {
        console.log('New order received:', data);

        showToast(`New order received: ${data.orderNo} from ${data.customerName}`, 'success');

        // If on vendor orders page, refresh
        if (document.getElementById('orders-container') && Auth.hasRole('app_vendor')) {
            // Trigger reload if the function exists
            if (typeof loadOrders === 'function') loadOrders();
        }

        // Update order count on vendor dashboard
        const statOrders = document.getElementById('stat-orders');
        if (statOrders) {
            const current = parseInt(statOrders.textContent) || 0;
            statOrders.textContent = current + 1;
        }
    });

   connection.on('ReceiveNotification', (data) => {
        console.log('Notification:', data);
        showToast(data.title || data.messageContent, 'success');

        if (typeof NotifBell !== 'undefined') {
            NotifBell.handleLivePush(data);
        } else {
            // Fallback if the bell component isn't on this page
            const badge = document.getElementById('notifBadge');
            if (badge) {
                const current = parseInt(badge.textContent) || 0;
                badge.textContent = current + 1;
                badge.style.display = 'flex';
            }
        }
    });
}