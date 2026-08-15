// Shared cart utility — single vendor per cart, sessionStorage-backed (per-tab, matches Auth)
const CART_KEY = 'fl_cart';

const Cart = {
    // { vendorId, vendorName, items: [{ listingId, foodName, isFree, price, quantity, maxQty, imageUrl, pickUpAvailable, deliveryAvailable, deliveryFee }] }
    get: () => {
        const raw = sessionStorage.getItem(CART_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },

    save: (cart) => {
        sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
        Cart.updateBadge();
    },

    clear: () => {
        sessionStorage.removeItem(CART_KEY);
        Cart.updateBadge();
    },

    count: () => {
        const cart = Cart.get();
        if (!cart) return 0;
        return cart.items.reduce((sum, i) => sum + i.quantity, 0);
    },

    // Returns { success: true } or { success: false, conflict: true, vendorName } if cart has a different vendor's items
    add: (listing, quantity) => {
        const cart = Cart.get();

        if (cart && cart.vendorId !== listing.vendorId && cart.items.length > 0) {
            return { success: false, conflict: true, vendorName: cart.vendorName };
        }

        const newCart = cart && cart.items.length > 0
            ? cart
            : { vendorId: listing.vendorId, vendorName: listing.vendorName, items: [] };

        const existing = newCart.items.find(i => i.listingId === listing.listingId);
        if (existing) {
            existing.quantity = Math.min(existing.quantity + quantity, existing.maxQty);
        } else {
            newCart.items.push({
                listingId: listing.listingId,
                foodName: listing.foodName,
                isFree: listing.isFree,
                price: listing.price,
                quantity: Math.min(quantity, listing.remainingPortion),
                maxQty: listing.remainingPortion,
                imageUrl: listing.imageUrls?.[0] || null,
                pickUpAvailable: listing.pickUpAvailable,
                deliveryAvailable: listing.deliveryAvailable
            });
        }

        Cart.save(newCart);
        return { success: true };
    },

    updateQuantity: (listingId, quantity) => {
        const cart = Cart.get();
        if (!cart) return;
        const item = cart.items.find(i => i.listingId === listingId);
        if (!item) return;
        item.quantity = Math.max(1, Math.min(quantity, item.maxQty));
        Cart.save(cart);
    },

    remove: (listingId) => {
        const cart = Cart.get();
        if (!cart) return;
        cart.items = cart.items.filter(i => i.listingId !== listingId);
        if (cart.items.length === 0) {
            Cart.clear();
        } else {
            Cart.save(cart);
        }
    },

    // Called by SignalR when a listing's stock changes — caps quantity, removes if sold out
    syncStock: (listingId, remainingPortion, status) => {
        const cart = Cart.get();
        if (!cart) return null;
        const item = cart.items.find(i => i.listingId === listingId);
        if (!item) return null;

        if (remainingPortion <= 0 || status === 'Expired' || status === 'Completed') {
            cart.items = cart.items.filter(i => i.listingId !== listingId);
            if (cart.items.length === 0) Cart.clear(); else Cart.save(cart);
            return { removed: true, foodName: item.foodName };
        }

        if (item.quantity > remainingPortion) {
            item.maxQty = remainingPortion;
            item.quantity = remainingPortion;
            Cart.save(cart);
            return { adjusted: true, foodName: item.foodName, newQty: remainingPortion };
        }

        item.maxQty = remainingPortion;
        Cart.save(cart);
        return null;
    },

    updateBadge: () => {
        const badge = document.getElementById('cart-badge');
        if (!badge) return;
        const count = Cart.count();
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());