async function apiFetch(endpoint, options = {}) {
    const token = Auth.getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { isSuccessful: false, message: 'Network error. Please try again.' };
    }
}

// Auth
const AuthAPI = {
    registerCustomer: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    verifyEmail: (data) => apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify(data) }),
    resendToken: (data) => apiFetch('/auth/resend-verification-token', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (data) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
    resetPassword: (data) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
};

// Vendor
const VendorAPI = {
    register: (data) => apiFetch('/vendor/register', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: () => apiFetch('/vendor/profile'),
    updateProfile: (data) => apiFetch('/vendor/profile', { method: 'PUT', body: JSON.stringify(data) }),
    getPending: () => apiFetch('/vendor/pending'),
    approveReject: (data) => apiFetch('/vendor/approve-reject', { method: 'PUT', body: JSON.stringify(data) }),
    getBanks: () => apiFetch('/vendor/banks'),
    resolveAccount: (accountNumber, bankCode) => apiFetch(`/vendor/resolve-account?accountNumber=${accountNumber}&bankCode=${bankCode}`),
    setBankDetails: (data) => apiFetch('/vendor/bank-details', { method: 'POST', body: JSON.stringify(data) }),
    getDeliveryZones: () => apiFetch('/vendor/delivery-zones'),
    addDeliveryZone: (data) => apiFetch('/vendor/delivery-zones', { method: 'POST', body: JSON.stringify(data) }),
    removeDeliveryZone: (zoneId) => apiFetch(`/vendor/delivery-zones/${zoneId}`, { method: 'DELETE' }),
    getPickupPoints: () => apiFetch('/vendor/pickup-points'),
    addPickupPoint: (data) => apiFetch('/vendor/pickup-points', { method: 'POST', body: JSON.stringify(data) }),
    removePickupPoint: (pointId) => apiFetch(`/vendor/pickup-points/${pointId}`, { method: 'DELETE' }),
    getPublicDeliveryZones: (vendorId) => apiFetch(`/vendor/${vendorId}/delivery-zones-public`),
};

// Customer
const CustomerAPI = {
    getProfile: () => apiFetch('/customer/profile'),
    updateProfile: (data) => apiFetch('/customer/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

// Notifications
const NotificationAPI = {
    getMine: () => apiFetch('/notification/my-notifications'),
    markRead: (id) => apiFetch(`/notification/mark-read/${id}`, { method: 'PUT' }),
    markAllRead: () => apiFetch('/notification/mark-all-read', { method: 'PUT' }),
};

// Listings
const ListingAPI = {
    getAll: (isFree) => apiFetch(`/listing${isFree !== undefined ? `?isFree=${isFree}` : ''}`),
    getDetails: (id) => apiFetch(`/listing/${id}`),
    create: (formData) => apiFetch('/listing', { method: 'POST', body: formData }),
    getVendorListings: () => apiFetch('/listing/vendor-listings'),
};

// Orders
const OrderAPI = {
    place: (data) => apiFetch('/order', { method: 'POST', body: JSON.stringify(data) }),
    getMyOrders: () => apiFetch('/order/my-orders'),
    getDetails: (id) => apiFetch(`/order/${id}`),
    lookup: (orderNo) => apiFetch(`/order/order-item/${orderNo}`),
    verifyPickup: (orderNo) => apiFetch(`/order/verify-pickup/${orderNo}`, { method: 'PUT' }),
    dispatchDelivery: (orderNo) => apiFetch(`/order/dispatch-order/${orderNo}`, { method: 'PUT' }),
    markDelivered: (orderNo) => apiFetch(`/order/mark-delivered/${orderNo}`, { method: 'PUT' }),
    getMyVendorOrders: () => apiFetch('/order/vendor-orders'),
    cancelOrder: (orderId) => apiFetch(`/order/${orderId}`, { method: 'DELETE' }),
    resumePayment: (orderId) => apiFetch(`/order/${orderId}/resume-payment`, { method: 'POST' }),
    flagMismatch: (orderId, note) => apiFetch(`/order/${orderId}/flag-mismatch`, { method: 'POST', body: JSON.stringify({ note }) }),
    confirmDelivery: (orderId) => apiFetch(`/order/${orderId}/confirm-delivery`, { method: 'POST' }),
};

// Payments
const PaymentAPI = {
    verify: (reference) => apiFetch('/payment/verify', { method: 'POST', body: JSON.stringify({ reference }) }),
    getMyPayments: () => apiFetch('/payment/customer-payments-transactions'),
    getVendorTransactions: () => apiFetch('/payment/vendor-transactions'),
};

// Ratings
const RatingAPI = {
    add: (data) => apiFetch('/rating', { method: 'POST', body: JSON.stringify(data) }),
    getByListing: (listingId) => apiFetch(`/rating/${listingId}`),
};

// Admin
const AdminAPI = {
    getVendors: () => apiFetch('/admin/vendors'),
    getCustomers: () => apiFetch('/admin/customers'),
    getListings: () => apiFetch('/admin/listings'),
    getFlaggedOrders: () => apiFetch('/admin/flagged-orders'),
    notifyVendorOfMismatch: (orderId) => apiFetch(`/admin/flagged-orders/${orderId}/notify-vendor`, { method: 'POST' }),
};