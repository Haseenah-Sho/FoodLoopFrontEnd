document.addEventListener('DOMContentLoaded', () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    document.getElementById('sidebar-username').textContent = user.name || 'Food Provider';

    setupSidebar();

    // ── State ──
    let isFree = true;
    let pickupAvailable = true;
    let deliveryAvailable = false;
    let selectedFiles = [];
    let existingImageUrls = [];

    // ?id=... means we are editing an existing draft
    const editId = new URLSearchParams(window.location.search).get('id');

    // Backend returns enum names; the form's selects use numbers.
    const FOOD_TYPE_VALUES = { FreshlyCookedMeal: '1', BakedGoods: '2', RawProduce: '3', PackagedOrProcessed: '4' };
    const STORAGE_VALUES = { RoomTemperature: '1', Refrigerated: '2', MustBeReheatedBeforeEating: '3' };

    // ── Clear a field's error as soon as the user changes it ──
    const FIELD_IDS = [
        'foodName', 'foodDescription', 'foodType', 'storageInstruction', 'bestBeforeDate',
        'quantity', 'quantityPerUnit', 'price', 'pickUpStart', 'pickUpEnd', 'itemAddress'
    ];

    FIELD_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => clearDashFieldError(id));
        el.addEventListener('change', () => clearDashFieldError(id));
    });

    document.getElementById('attestationCheck').addEventListener('change', () => {
        document.getElementById('attestation-error').textContent = '';
    });

    // ── Toggle: Free / Paid ──
    document.getElementById('free-yes').addEventListener('click', () => {
        isFree = true;
        document.getElementById('free-yes').classList.add('active');
        document.getElementById('free-no').classList.remove('active');
        document.getElementById('price-group').style.display = 'none';
    });

    document.getElementById('free-no').addEventListener('click', () => {
        isFree = false;
        document.getElementById('free-no').classList.add('active');
        document.getElementById('free-yes').classList.remove('active');
        document.getElementById('price-group').style.display = 'block';
    });

    // ── Toggle: Pickup ──
    document.getElementById('pickup-yes').addEventListener('click', () => {
        pickupAvailable = true;
        document.getElementById('pickup-yes').classList.add('active');
        document.getElementById('pickup-no').classList.remove('active');
        document.getElementById('pickup-window-group').style.display = 'block';
    });

    document.getElementById('pickup-no').addEventListener('click', () => {
        pickupAvailable = false;
        document.getElementById('pickup-no').classList.add('active');
        document.getElementById('pickup-yes').classList.remove('active');
        document.getElementById('pickup-window-group').style.display = 'none';
    });

    // ── Toggle: Delivery ──
    document.getElementById('delivery-yes').addEventListener('click', () => {
        deliveryAvailable = true;
        document.getElementById('delivery-yes').classList.add('active');
        document.getElementById('delivery-no').classList.remove('active');
    });

    document.getElementById('delivery-no').addEventListener('click', () => {
        deliveryAvailable = false;
        document.getElementById('delivery-no').classList.add('active');
        document.getElementById('delivery-yes').classList.remove('active');
    });

    // Show the defaults as selected (edit mode overrides these below)
    document.getElementById('free-yes').click();
    document.getElementById('pickup-yes').click();
    document.getElementById('delivery-no').click();

    // ── Image upload ──
    const uploadArea = document.getElementById('image-upload-area');
    const fileInput = document.getElementById('images');
    const previews = document.getElementById('image-previews');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--border)';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--border)';
        handleFiles(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', () => {
        handleFiles(Array.from(fileInput.files));
    });

    function handleFiles(files) {
        const remaining = 5 - selectedFiles.length;
        const toAdd = files.slice(0, remaining);

        toAdd.forEach(file => {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
            if (file.size > 5 * 1024 * 1024) return;
            selectedFiles.push(file);
        });

        clearDashFieldError('images');
        renderPreviews();
    }

    function renderPreviews() {
        // In edit mode with no new files picked, show the images already saved
        if (selectedFiles.length === 0 && existingImageUrls.length > 0) {
            previews.innerHTML = existingImageUrls.map(u => `
                <div class="image-preview-item">
                    <img src="${escapeHtml(resolveImageUrl(u))}" alt="Current image">
                </div>`).join('') +
                `<div class="dash-hint" style="width:100%;">These are the current images. Upload new ones to replace them.</div>`;
            return;
        }

        previews.innerHTML = selectedFiles.map((file, i) => `
            <div class="image-preview-item">
                <img src="${URL.createObjectURL(file)}" alt="Preview">
                <button type="button" class="remove-img" onclick="removeImage(${i})">✕</button>
            </div>
        `).join('');
    }

    window.removeImage = function (index) {
        selectedFiles.splice(index, 1);
        renderPreviews();
    };

    // ── Saved locations ──
    loadSavedLocations();

    async function loadSavedLocations() {
        const result = await VendorAPI.getPickupPoints();

        if (!result.isSuccessful || !result.data || result.data.length === 0) {
            return; // no saved locations: the dropdown just stays hidden
        }

        const select = document.getElementById('savedLocationSelect');

        result.data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.address;
            opt.textContent = `${p.pointName} — ${p.address}`;
            select.appendChild(opt);
        });

        document.getElementById('saved-location-group').style.display = 'block';

        select.addEventListener('change', () => {
            if (select.value) {
                document.getElementById('itemAddress').value = select.value;
                clearDashFieldError('itemAddress');
            }
        });
    }

    // ── Edit mode: load the draft into the form ──
    if (editId) loadDraftForEdit();

    async function loadDraftForEdit() {
        document.querySelector('.topbar-title').textContent = 'Edit Draft';
        document.title = 'Edit Draft - FoodLoop';
        document.getElementById('btn-text').textContent = 'Save Changes & Review';

        const result = await ListingAPI.getMine(editId);
        if (!result.isSuccessful || !result.data) {
            showFormBanner('error', result.message || 'Could not load this food item.');
            document.getElementById('submit-btn').disabled = true;
            return;
        }

        const l = result.data;

        if (l.status !== 'Draft') {
            showFormBanner('error', 'Published food items cannot be edited. Withdraw it and post a new one if something is wrong.');
            document.getElementById('submit-btn').disabled = true;
            setTimeout(() => window.location.href = 'my-food-items.html', 2500);
            return;
        }

        document.getElementById('foodName').value = l.foodName;
        document.getElementById('foodDescription').value = l.foodDescription;
        document.getElementById('foodType').value = FOOD_TYPE_VALUES[l.foodType] || '';
        document.getElementById('storageInstruction').value = STORAGE_VALUES[l.storageInstruction] || '';
        document.getElementById('bestBeforeDate').value = toLocalInput(l.bestBeforeDate);
        document.getElementById('quantity').value = l.quantity;
        document.getElementById('quantityPerUnit').value = l.quantityPerUnit;
        document.getElementById('itemAddress').value = l.address;

        const chosen = (l.allergens || '').split(',').map(a => a.trim());
        document.querySelectorAll('.allergen-check input').forEach(cb => {
            cb.checked = chosen.includes(cb.value);
        });

        document.getElementById(l.isFree ? 'free-yes' : 'free-no').click();
        if (!l.isFree) document.getElementById('price').value = l.price;

        document.getElementById(l.pickUpAvailable ? 'pickup-yes' : 'pickup-no').click();
        if (l.pickUpAvailable) {
            document.getElementById('pickUpStart').value = toLocalInput(l.pickUpStart);
            document.getElementById('pickUpEnd').value = toLocalInput(l.pickUpEnd);
        }

        document.getElementById(l.deliveryAvailable ? 'delivery-yes' : 'delivery-no').click();

        existingImageUrls = l.imageUrls || [];
        renderPreviews();

                const cancel = document.getElementById('cancel-link');
        if (cancel) cancel.href = `review-listing.html?id=${editId}`;

        const back = document.getElementById('back-link');
        if (back) {
            back.href = `review-listing.html?id=${editId}`;
            back.innerHTML = '<i class="bi bi-arrow-left"></i> Back to review';
        }
    }

    // datetime-local needs "YYYY-MM-DDTHH:mm" in the browser's local time
    function toLocalInput(value) {
        if (!value) return '';
        const d = new Date(value);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // ── Form submit ──
    document.getElementById('post-food-items-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        // Start from a clean slate every time
        hideFormBanners();
        document.querySelectorAll('.dash-field-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        const foodName = document.getElementById('foodName').value.trim();
        const foodDescription = document.getElementById('foodDescription').value.trim();
        const foodType = document.getElementById('foodType').value;
        const storageInstruction = document.getElementById('storageInstruction').value;
        const bestBeforeDate = document.getElementById('bestBeforeDate').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        const quantityPerUnit = parseInt(document.getElementById('quantityPerUnit').value);
        const price = parseFloat(document.getElementById('price').value) || 0;
        const pickUpStart = document.getElementById('pickUpStart').value;
        const pickUpEnd = document.getElementById('pickUpEnd').value;
        const itemAddress = document.getElementById('itemAddress').value.trim();
        const allergens = Array.from(document.querySelectorAll('.allergen-check input:checked'))
            .map(cb => cb.value).join(',');
        const attestationConfirmed = document.getElementById('attestationCheck').checked;

        let hasError = false;

        if (!foodName) { showDashFieldError('foodName', 'Food name is required.'); hasError = true; }
        if (!foodDescription) { showDashFieldError('foodDescription', 'Description is required.'); hasError = true; }
        else if (foodDescription.length < 20) { showDashFieldError('foodDescription', 'Please give a fuller description (at least 20 characters).'); hasError = true; }
        if (!foodType) { showDashFieldError('foodType', 'Please select the food type.'); hasError = true; }
        if (!storageInstruction) { showDashFieldError('storageInstruction', 'Please select a storage/serving instruction.'); hasError = true; }

        if (!bestBeforeDate) { showDashFieldError('bestBeforeDate', 'Best before date/time is required.'); hasError = true; }
        else if (new Date(bestBeforeDate) <= new Date()) { showDashFieldError('bestBeforeDate', 'Best before must be in the future.'); hasError = true; }

        if (!quantity || quantity < 1) { showDashFieldError('quantity', 'Quantity must be at least 1.'); hasError = true; }
        if (!quantityPerUnit || quantityPerUnit < 1) { showDashFieldError('quantityPerUnit', 'Servings per portion must be at least 1.'); hasError = true; }
        if (!isFree && (!price || price < 1)) { showDashFieldError('price', 'Please enter a valid price.'); hasError = true; }

        if (pickupAvailable && !pickUpStart) { showDashFieldError('pickUpStart', 'Pickup start time is required.'); hasError = true; }
        if (pickupAvailable && !pickUpEnd) { showDashFieldError('pickUpEnd', 'Pickup end time is required.'); hasError = true; }
        if (pickupAvailable && pickUpStart && pickUpEnd && new Date(pickUpEnd) <= new Date(pickUpStart)) {
            showDashFieldError('pickUpEnd', 'Pickup end must be after pickup start.');
            hasError = true;
        }

        if (!itemAddress) { showDashFieldError('itemAddress', 'Please enter where this food actually is.'); hasError = true; }

        if (selectedFiles.length === 0 && existingImageUrls.length === 0) {
            showDashFieldError('images', 'Please upload at least one image.');
            hasError = true;
        }

        if (!attestationConfirmed) {
            document.getElementById('attestation-error').textContent = 'Please confirm the checkbox above before saving.';
            hasError = true;
        }

        if (!pickupAvailable && !deliveryAvailable) {
            showFormBanner('error', 'At least one option (pickup or delivery) must be selected.');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);

        const formData = new FormData();
        formData.append('FoodName', foodName);
        formData.append('FoodDescription', foodDescription);
        formData.append('FoodType', foodType);
        formData.append('StorageInstruction', storageInstruction);
        formData.append('Allergens', allergens);
        formData.append('BestBeforeDate', new Date(bestBeforeDate).toISOString());
        formData.append('AttestationConfirmed', attestationConfirmed);
        formData.append('Quantity', quantity);
        formData.append('QuantityPerUnit', quantityPerUnit);
        formData.append('IsFree', isFree);
        if (!isFree) formData.append('Price', price);
        formData.append('PickUpAvailable', pickupAvailable);
        formData.append('DeliveryAvailable', deliveryAvailable);

        // Delivery-only: the "pickup window" runs from now until the best-before time.
        formData.append('PickUpStart', pickupAvailable
            ? new Date(pickUpStart).toISOString()
            : new Date().toISOString());
        formData.append('PickUpEnd', pickupAvailable
            ? new Date(pickUpEnd).toISOString()
            : new Date(bestBeforeDate).toISOString());

        formData.append('Address', itemAddress);
        selectedFiles.forEach(file => formData.append('Images', file));

        const result = editId
            ? await ListingAPI.updateDraft(editId, formData)
            : await ListingAPI.create(formData);

        setLoading(false);

        if (!result.isSuccessful) {
            showFormBanner('error', result.message || 'Failed to save the food item.');
            return;
        }

        const listingId = editId || result.data.listingId;
        showFormBanner('success', 'Saved as a draft. Taking you to the review page...');
        setTimeout(() => window.location.href = `review-listing.html?id=${listingId}`, 1000);
    });

    // ── Helpers ──
    function showDashFieldError(fieldId, message) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        const inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = message;
        if (inputEl) inputEl.classList.add('is-invalid');
    }

    function clearDashFieldError(fieldId) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        const inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = '';
        if (inputEl) inputEl.classList.remove('is-invalid');
    }

    function showFormBanner(type, message) {
        const el = document.getElementById(`form-${type}`);
        if (el) { el.textContent = message; el.style.display = 'block'; }
    }

    function hideFormBanners() {
        ['form-error', 'form-success'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.style.display = 'none'; el.textContent = ''; }
        });
    }

    function setLoading(loading) {
        const btn = document.getElementById('submit-btn');
        const text = document.getElementById('btn-text');
        const spinner = document.getElementById('btn-spinner');
        btn.disabled = loading;
        text.style.display = loading ? 'none' : 'inline';
        spinner.classList.toggle('show', loading);
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