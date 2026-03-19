/**
 * js/app.js
 * Bootstraps the application, creates the Cesium viewer, handles base maps and telemetry.
 */

Cesium.Ion.defaultAccessToken = '';

// Base Map Providers
const mapProviders = {
    dark: new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        credit: 'CartoDB Dark Matter', minimumLevel: 0, maximumLevel: 19
    }),
    light: new Cesium.UrlTemplateImageryProvider({
        url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        credit: 'CartoDB Positron', minimumLevel: 0, maximumLevel: 19
    }),
    satellite: new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri World Imagery', minimumLevel: 0, maximumLevel: 19
    })
};

const viewer = new Cesium.Viewer('cesiumContainer', {
    baseLayer: new Cesium.ImageryLayer(mapProviders.satellite),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    skyBox: false,
    skyAtmosphere: false,
    infoBox: true,
    selectionIndicator: true
});

viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-2.0, 54.0, 1000000.0)
});

// Remove Cesium's default zoom-out cap so camera can fly to any altitude including 10,000+ km
viewer.scene.screenSpaceCameraController.maximumZoomDistance = Number.POSITIVE_INFINITY;

// Telemetry update hook
viewer.scene.postRender.addEventListener(() => {
    const cam = viewer.camera.positionCartographic;
    if (cam) {
        document.getElementById('tel-alt').innerText = (cam.height / 1000).toFixed(1);
        document.getElementById('tel-lat').innerText = Cesium.Math.toDegrees(cam.latitude).toFixed(4);
        document.getElementById('tel-lon').innerText = Cesium.Math.toDegrees(cam.longitude).toFixed(4);
    }
});

// --- UI Hooks ---
viewer.selectedEntityChanged.addEventListener((selectedEntity) => {
    if (Cesium.defined(selectedEntity) && Cesium.defined(selectedEntity.position)) {
        viewer.trackedEntity = selectedEntity;
        
        if (selectedEntity._flightType) {
            const hex = selectedEntity._hex;
            const csign = selectedEntity._callsign || selectedEntity.name || 'UNKNOWN';
            
            if (selectedEntity._flightType === 'military' || selectedEntity._flightType === 'small') {
                selectedEntity.description = `
                    <div style="font-family: monospace; color: #a3e635;">
                        <p><b>ALTITUDE:</b> ${Math.round(selectedEntity._alt)} m</p>
                        <p><b>SPEED:</b> ${Math.round(selectedEntity._velocity || 0)} m/s</p>
                        <p><b>HEADING:</b> ${Math.round(selectedEntity._heading || 0)}&deg;</p>
                        <p><b>CLASS:</b> ${selectedEntity._flightType.toUpperCase()}</p>
                        ${hex ? `<p><b>HEX:</b> ${hex.toUpperCase()}</p>` : ''}
                        <div style="margin-top: 10px; color: #888;">Fetching visual database...</div>
                    </div>
                `;
                
                if (hex) {
                    fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`)
                        .then(r => r.json())
                        .then(data => {
                            let imgHtml = '<div style="color:#ff4444; border:1px solid #333; padding:5px; margin-bottom:10px;">NO DATABASE IMAGE DISCOVERED</div>';
                            if (data && data.photos && data.photos.length > 0) {
                                const src = data.photos[0].thumbnail_large.src;
                                const link = data.photos[0].link;
                                imgHtml = `<a href="${link}" target="_blank"><img src="${src}" style="width: 100%; border-radius: 4px; border: 1px solid #4ade80; margin-bottom: 10px;" /></a>`;
                            }
                            selectedEntity.description = `
                                <div style="font-family: monospace; color: #a3e635;">
                                    ${imgHtml}
                                    <table style="width:100%; color: white;">
                                        <tr><td style="color:#888;">CALLSIGN</td><td>${csign}</td></tr>
                                        <tr><td style="color:#888;">ALTITUDE</td><td>${Math.round(selectedEntity._alt)} m</td></tr>
                                        <tr><td style="color:#888;">SPEED</td><td>${Math.round(selectedEntity._velocity || 0)} m/s</td></tr>
                                        <tr><td style="color:#888;">HEADING</td><td>${Math.round(selectedEntity._heading || 0)}&deg;</td></tr>
                                        <tr><td style="color:#888;">CLASS</td><td>${selectedEntity._flightType.toUpperCase()}</td></tr>
                                        <tr><td style="color:#888;">ICAO HEX</td><td>${hex.toUpperCase()}</td></tr>
                                    </table>
                                </div>
                            `;
                        }).catch(e => {
                            console.warn("Planespotters error:", e);
                        });
                }
            } else {
                // Deny detailed overlay for civilian heavy/large craft per user instructions
                selectedEntity.description = `
                    <div style="font-family: monospace; color: #a3e635; padding: 10px;">
                        <h3 style="color:#60a5fa; margin: 0 0 10px 0;">${csign}</h3>
                        <p style="color:#ff4444; border:1px solid #ff4444; padding:2px;">[ CIVILIAN ASSET ] </p>
                        <p style="color:#888; font-size:10px;">DETAILED TRACKING TELEMETRY RESTRICTED</p>
                        <p><b>ALT:</b> ${Math.round(selectedEntity._alt)}m</p>
                    </div>
                `;
            }
        } else if (selectedEntity._iss) {
            selectedEntity.description = `
                <div style="font-family: monospace; color: #a3e635;">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/International_Space_Station_after_undocking_of_STS-132.jpg/320px-International_Space_Station_after_undocking_of_STS-132.jpg" style="width: 100%; border-radius: 4px; border: 1px solid #ff4444; margin-bottom: 10px;" />
                    <table style="width:100%; color: white;">
                        <tr><td style="color:#888;">ALTITUDE</td><td>${Math.round(selectedEntity._alt / 1000)} km</td></tr>
                        <tr><td style="color:#888;">VELOCITY</td><td>${Math.round(selectedEntity._velocity * 3.6)} km/h</td></tr>
                    </table>
                </div>
            `;
        } else if (selectedEntity._ship) {
            selectedEntity.description = `
                <div style="font-family: monospace; color: #00ffff;">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/HMM_Algeciras_%28ship%2C_2020%29_in_the_Maasmond_-_1.jpg/320px-HMM_Algeciras_%28ship%2C_2020%29_in_the_Maasmond_-_1.jpg" style="width: 100%; border-radius: 4px; border: 1px solid #00ffff; margin-bottom: 10px;" />
                    <p style="color:white;">TACTICAL MARITIME TARGET EN-ROUTE</p>
                </div>
            `;
        }

    } else {
        viewer.trackedEntity = undefined;
    }
});

window.OSINT.init(viewer);
window.OSINT.register(window.PortsLayer);
window.OSINT.register(window.AISLayer);

let _google3dTileset = null;
window.OSINT.setBaseMap = (key) => {
    const keyRow = document.getElementById('google-key-row');
    if (key === 'google3d') {
        if (keyRow) keyRow.style.display = 'block';
        return; // wait for APPLY with API key
    }
    if (keyRow) keyRow.style.display = 'none';
    // Remove Google 3D tileset if switching away
    if (_google3dTileset) {
        viewer.scene.primitives.remove(_google3dTileset);
        _google3dTileset = null;
    }
    if (mapProviders[key]) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(0), false);
        viewer.imageryLayers.addImageryProvider(mapProviders[key], 0);
    }
};

window.OSINT.applyGoogle3D = async () => {
    const key = document.getElementById('google-key-input').value.trim();
    if (!key) return;
    try {
        Cesium.GoogleMaps.defaultApiKey = key;
        if (_google3dTileset) viewer.scene.primitives.remove(_google3dTileset);
        _google3dTileset = await Cesium.createGooglePhotorealistic3DTileset();
        viewer.scene.primitives.add(_google3dTileset);
        console.log('[OSINT] Google Photorealistic 3D Tiles loaded');
    } catch (e) {
        console.error('[OSINT] Google 3D Tiles failed:', e.message);
        alert('Google 3D Tiles failed. Check your API key and ensure Map Tiles API is enabled.');
    }
};

window.OSINT.zoomIn = () => {
    const h = viewer.camera.positionCartographic.height;
    viewer.camera.zoomIn(h * 0.25);
};

window.OSINT.zoomOut = () => {
    const h = viewer.camera.positionCartographic.height;
    viewer.camera.zoomOut(h * 0.25);
};

window.OSINT.resetView = () => {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-2.0, 54.0, 1000000.0),
        duration: 1.5
    });
};

window.OSINT.setAltitude = () => {
    const el = document.getElementById('alt-input');
    const km = parseFloat(el.value);
    if (isNaN(km) || km <= 0) {
        console.warn('[OSINT] setAltitude: invalid value', el.value);
        return;
    }
    const metres = km * 1000;
    console.log(`[OSINT] Flying to altitude: ${km} km (${metres} m)`);
    const cart = viewer.camera.positionCartographic;
    // Use setView (not flyTo) to bypass Cesium's internal zoom distance clamping
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude, metres)
    });
};

window.OSINT.searchAsset = () => {
    const q = document.getElementById('asset-search').value.trim().toUpperCase();
    if (!q) return;
    const res = document.getElementById('search-result');
    res.innerText = 'SEARCHING GLOBAL INDEX...';
    
    let found = null;
    viewer.entities.values.forEach(e => {
        if (!e.show) return; // Must be visually active
        if (e._callsign && e._callsign.toUpperCase().includes(q)) found = e;
        else if (e._hex && e._hex.toUpperCase() === q) found = e;
        else if (e.name && e.name.toUpperCase().includes(q)) found = e;
    });
    
    if (found) {
        res.innerText = 'ASSET LOCATED!';
        res.style.color = '#4ade80';
        
        // Ensure entity is perfectly bounded before flying
        viewer.flyTo(found, { 
            duration: 2.5, 
            offset: new Cesium.HeadingPitchRange(0, -Math.PI / 4, 15000) 
        });
        viewer.trackedEntity = found;
        
        setTimeout(() => { res.innerText = ''; }, 3000);
    } else {
        res.innerText = 'ASSET NOT FOUND OR LAYER INACTIVE';
        res.style.color = '#ff4444';
    }
};

// --- Register All Layers ---
[
    'EarthquakesLayer', 'FlightsLayer', 'WeatherLayer', 'SatellitesLayer', 'AirspaceLayer'
].forEach(l => {
    if (window[l]) window.OSINT.register(window[l]);
});

console.log("[Boot] OSINT Dashboard Active v2");
