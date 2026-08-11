// Shared location picker using Leaflet + OpenStreetMap — free, no API key needed.
// Usage:
//   const picker = createLocationPicker('mapElementId', { lat, lng }); // initial optional
//   picker.getLocation() -> { lat, lng } or null if nothing picked yet
//   picker.setLocation(lat, lng)
//   picker.refresh() -> call after un-hiding a previously display:none map container

function createLocationPicker(elementId, initial) {
    const defaultCenter = [6.5244, 3.3792]; // Lagos, Nigeria
    const hasInitial = !!(initial && initial.lat && initial.lng);
    const startCenter = hasInitial ? [initial.lat, initial.lng] : defaultCenter;

    const map = L.map(elementId).setView(startCenter, hasInitial ? 15 : 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    let marker = null;

    function placeMarker(lat, lng) {
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        }
    }

    if (hasInitial) placeMarker(initial.lat, initial.lng);

    map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));

    // If we don't already have a saved point, try to center on the user's real location
    if (!hasInitial && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        }, () => { /* ignore — keep default Lagos view */ });
    }

    // Maps initialized inside a hidden container render blank until invalidateSize runs
    setTimeout(() => map.invalidateSize(), 200);

    return {
        getLocation() {
            if (!marker) return null;
            const ll = marker.getLatLng();
            return { lat: ll.lat, lng: ll.lng };
        },
        setLocation(lat, lng) {
            placeMarker(lat, lng);
            map.setView([lat, lng], 15);
        },
        refresh() {
            map.invalidateSize();
        }
    };
}