document.addEventListener('DOMContentLoaded', async () => {

    if (!requireAuth(['app_vendor'])) return;

    document.getElementById('sidebar-username').textContent = Auth.getUser().name || 'Food Provider';
    setupSidebar();

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
        window.location.href = 'my-food-items.html';
        return;
    }

    const FOOD_TYPE_LABELS = {
        FreshlyCookedMeal: 'Freshly Cooked Meal', BakedGoods: 'Baked Goods',
        RawProduce: 'Raw Produce', PackagedOrProcessed: 'Packaged / Processed'
    };
    const STORAGE_LABELS = {
        RoomTemperature: 'Room Temperature', Refrigerated: 'Keep Refrigerated',
        MustBeReheatedBeforeEating: 'Must Be Reheated Before Eating'
    };

    const publishBtn = document.getElementById('publish-btn');
    const discardBtn = document.getElementById('discard-btn');
    document.getElementById('edit-btn').href = `post-food-items.html?id=${id}`;

    const result = await ListingAPI.getMine(id);
    if (!result.isSuccessful || !result.data) {
        showError(result.message || 'Food item not found.');
        return;
    }

    const l = result.data;
    renderCard(l);

    const banner = document.getElementById('review-banner');
    const bannerText = document.getElementById('review-banner-text');
    banner.style.display = 'flex';

    if (l.status === 'Draft') {
        bannerText.innerHTML = '<strong>This is a draft.</strong> Customers cannot see it yet. ' +
            'Check everything below, then publish. Once published it cannot be edited, can only be withdrawn. ' +
            'Not ready? Your draft is saved. You can come back to it any time from My Food Items.';
        document.getElementById('review-actions').style.display = 'flex';
    } else {
        bannerText.innerHTML = `<strong>This food item is ${escapeHtml(l.status.toLowerCase())}.</strong> ` +
            'Published food items cannot be edited. <a href="my-food-items.html">Back to My Food Items</a>';
    }

    publishBtn.addEventListener('click', async () => {
        setBusy(true);
        hideError();
        const r = await ListingAPI.publish(id);
        setBusy(false);

        if (!r.isSuccessful) {
            showError(r.message || 'Could not publish this food item.');
            return;
        }

        showToast('Your food item is now live!', 'success');
        setTimeout(() => window.location.href = 'my-food-items.html', 1200);
    });

    discardBtn.addEventListener('click', async () => {
        if (!confirm(`Discard the draft "${l.foodName}"? This cannot be undone.`)) return;

        setBusy(true);
        const r = await ListingAPI.discardDraft(id);
        setBusy(false);

        if (!r.isSuccessful) {
            showError(r.message || 'Could not discard this draft.');
            return;
        }

        showToast('Draft discarded.', 'success');
        setTimeout(() => window.location.href = 'my-food-items.html', 800);
    });

    function renderCard(l) {
        const urls = (l.imageUrls || []).map(resolveImageUrl);
        const bestBefore = formatDateTime(l.bestBeforeDate);

        const pills = [];
        if (l.pickUpAvailable) pills.push(`Pickup: ${formatDateTime(l.pickUpStart)} to ${formatDateTime(l.pickUpEnd)}`);
        if (l.deliveryAvailable) pills.push('Delivery available');
        pills.push(`${l.quantityPerUnit} serving${l.quantityPerUnit !== 1 ? 's' : ''} per portion`);

        const card = document.getElementById('review-card');
        card.style.display = 'grid';
        card.innerHTML = `
            <div class="review-images">
                ${urls.length
                    ? `<img id="review-main-img" class="review-img-main" src="${escapeHtml(urls[0])}" alt="">`
                    : ''}
                ${urls.length > 1
                    ? `<div class="review-thumbs">${urls.map((u, i) =>
                        `<img src="${escapeHtml(u)}" data-src="${escapeHtml(u)}" class="${i === 0 ? 'active' : ''}" alt="">`
                      ).join('')}</div>`
                    : ''}
            </div>
            <div class="review-body">
                <div>
                    <div class="review-title">${escapeHtml(l.foodName)}</div>
                    <div class="review-sub">${escapeHtml(l.vendorName)}</div>
                </div>
                <div class="review-price ${l.isFree ? 'free' : ''}">
                    ${l.isFree ? 'Free' : formatCurrency(l.price)}
                    <span class="review-sub"> · ${l.quantity} portion${l.quantity !== 1 ? 's' : ''}</span>
                </div>
                <p class="review-desc">${escapeHtml(l.foodDescription)}</p>
                <div class="review-lines">
                    <div><i class="bi bi-geo-alt"></i>${escapeHtml(l.address)}</div>
                    <div><i class="bi bi-egg-fried"></i>${escapeHtml(FOOD_TYPE_LABELS[l.foodType] || l.foodType)}</div>
                    <div><i class="bi bi-thermometer-half"></i>${escapeHtml(STORAGE_LABELS[l.storageInstruction] || l.storageInstruction)}</div>
                    <div><i class="bi bi-clock-history"></i>Best before ${escapeHtml(bestBefore)}</div>
                    ${l.allergens ? `<div><i class="bi bi-exclamation-triangle"></i>Contains: ${escapeHtml(l.allergens)}</div>` : ''}
                </div>
                <div class="review-pills">
                    ${pills.map(p => `<span class="review-pill">${escapeHtml(p)}</span>`).join('')}
                </div>
            </div>`;

        card.querySelectorAll('.review-thumbs img').forEach(t => {
            t.addEventListener('click', () => {
                document.getElementById('review-main-img').src = t.dataset.src;
                card.querySelectorAll('.review-thumbs img').forEach(x => x.classList.remove('active'));
                t.classList.add('active');
            });
        });
    }

    const urls = (l.imageUrls || []).map(resolveImageUrl);

    function formatDateTime(s) {
        if (!s) return '-';
        return new Date(s).toLocaleString('en-NG', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function formatCurrency(amount) {
        return '₦' + Number(amount).toLocaleString('en-NG');
    }

    function setBusy(busy) {
        publishBtn.disabled = busy;
        discardBtn.disabled = busy;
    }

    function showError(msg) {
        const el = document.getElementById('review-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideError() {
        document.getElementById('review-error').style.display = 'none';
    }

    function setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            sidebar.classList.add('open'); overlay.classList.add('show');
        });
        document.getElementById('sidebarClose').addEventListener('click', () => {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        });
    }
});