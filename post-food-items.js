document.addEventListener('DOMContentLoaded', () => {

    if (!requireAuth(['app_vendor'])) return;

    const user = Auth.getUser();
    const name = user.name || 'Food Provider';
    document.getElementById('sidebar-username').textContent = name;

    setupSidebar();

    let isFree = true;
    let pickupAvailable = true;
    let deliveryAvailable = false;
    let selectedFiles = [];

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
        document.getElementById('delivery-fee-group').style.display = 'block';
    });

    document.getElementById('delivery-no').addEventListener('click', () => {
        deliveryAvailable = false;
        document.getElementById('delivery-no').classList.add('active');
        document.getElementById('delivery-yes').classList.remove('active');
        document.getElementById('delivery-fee-group').style.display = 'none';
    });

    // ── Toggle: Item location ──
    let useCustomLocation = false;
    let itemLocationPicker = null;

    document.getElementById('location-vendor').addEventListener('click', () => {
        useCustomLocation = false;
        document.getElementById('location-vendor').classList.add('active');
        document.getElementById('location-custom').classList.remove('active');
        document.getElementById('custom-location-group').style.display = 'none';
    });

    document.getElementById('location-custom').addEventListener('click', () => {
        useCustomLocation = true;
        document.getElementById('location-custom').classList.add('active');
        document.getElementById('location-vendor').classList.remove('active');
        document.getElementById('custom-location-group').style.display = 'block';

        if (!itemLocationPicker) {
            itemLocationPicker = createLocationPicker('location-map');
        } else {
            itemLocationPicker.refresh();
        }
    });

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

        renderPreviews();
    }

    function renderPreviews() {
        previews.innerHTML = selectedFiles.map((file, i) => `
            <div class="image-preview-item">
                <img src="${URL.createObjectURL(file)}" alt="Preview">
                <button type="button" class="remove-img" onclick="removeImage(${i})">✕</button>
            </div>
        `).join('');
    }

    window.removeImage = function(index) {
        selectedFiles.splice(index, 1);
        renderPreviews();
    };

    // ── Form submit ──
    document.getElementById('post-food-items-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const foodName = document.getElementById('foodName').value.trim();
        const foodDescription = document.getElementById('foodDescription').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const quantityPerUnit = parseInt(document.getElementById('quantityPerUnit').value);
        const price = parseFloat(document.getElementById('price').value) || 0;
        const pickUpStart = document.getElementById('pickUpStart').value;
        const pickUpEnd = document.getElementById('pickUpEnd').value;
        const deliveryFee = parseFloat(document.getElementById('deliveryFee').value) || 0;

        let hasError = false;

        if (!foodName) { showDashFieldError('foodName', 'Food name is required.'); hasError = true; }
        if (!foodDescription) { showDashFieldError('foodDescription', 'Description is required.'); hasError = true; }
        if (!quantity || quantity < 1) { showDashFieldError('quantity', 'Quantity must be at least 1.'); hasError = true; }
        if (!quantityPerUnit || quantityPerUnit < 1) { showDashFieldError('quantityPerUnit', 'Servings per portion must be at least 1.'); hasError = true; }
        if (!isFree && (!price || price < 1)) { showDashFieldError('price', 'Please enter a valid price.'); hasError = true; }
        if (pickupAvailable && !pickUpStart) { showDashFieldError('pickUpStart', 'Pickup start time is required.'); hasError = true; }
        if (pickupAvailable && !pickUpEnd) { showDashFieldError('pickUpEnd', 'Pickup end time is required.'); hasError = true; }
        if (selectedFiles.length === 0) { showDashFieldError('images', 'Please upload at least one image.'); hasError = true; }
        let itemAddress = null;
        let itemLocation = null;
        if (useCustomLocation) {
            itemAddress = document.getElementById('itemAddress').value.trim();
            itemLocation = itemLocationPicker ? itemLocationPicker.getLocation() : null;

            if (!itemAddress) { showDashFieldError('itemAddress', 'Address is required for a custom location.'); hasError = true; }
            if (!itemLocation) {
                document.getElementById('location-error').textContent = 'Please click on the map to pin this item\'s location.';
                hasError = true;
            }
        }
        if (!pickupAvailable && !deliveryAvailable) {
            showFormBanner('error', 'At least one option (pickup or delivery) must be selected.');
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        hideFormBanners();

        const formData = new FormData();
        formData.append('FoodName', foodName);
        formData.append('FoodDescription', foodDescription);
        formData.append('Quantity', quantity);
        formData.append('QuantityPerUnit', quantityPerUnit);
        formData.append('IsFree', isFree);
        if (!isFree) formData.append('Price', price);
        formData.append('PickUpAvailable', pickupAvailable);
        formData.append('DeliveryAvailable', deliveryAvailable);
        formData.append('PickUpStart', pickUpStart ? new Date(pickUpStart).toISOString() : new Date().toISOString());
        formData.append('PickUpEnd', pickUpEnd ? new Date(pickUpEnd).toISOString() : new Date().toISOString());
        formData.append('DeliveryFee', deliveryAvailable ? deliveryFee : 0);
        if (useCustomLocation && itemLocation) {
            formData.append('Address', itemAddress);
            formData.append('Latitude', itemLocation.lat);
            formData.append('Longitude', itemLocation.lng);
        }
        selectedFiles.forEach(file => formData.append('Images', file));

        const result = await ListingAPI.create(formData);
        setLoading(false);

        if (!result.isSuccessful) {
            showFormBanner('error', result.message || 'Failed to Post Food Items.');
            return;
        }

        showFormBanner('success', 'Food item posted successfully!');
        setTimeout(() => window.location.href = 'my-food-items.html', 1500);
    });

    function showDashFieldError(fieldId, message) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        const inputEl = document.getElementById(fieldId);
        if (errorEl) errorEl.textContent = message;
        if (inputEl) inputEl.classList.add('is-invalid');
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