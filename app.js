// 1. GLOBAL OVERRIDE: Disable Cesium Ion Token Requirement
Cesium.Ion.defaultAccessToken = null;

// 2. INITIALISE VIEWER WITH RESILIENT MAP SOURCE
const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
    }),
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
    baseLayer: false
});

const statusElement = document.getElementById('stats');

// 3. LOCK CAMERA OVER LONDON GRID
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-0.1276, 51.5072, 20000.0),
    orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-90.0),
    }
});

// 4. LIVE TARGET FUSION LOGIC
async function updateLondonTraffic() {
    // London Bounds: minLat, minLon, maxLat, maxLon
    const url = 'https://opensky-network.org/api/states/all?lamin=51.3&lomin=-0.5&lamax=51.7&lomax=0.3';
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Clear previous frame data
        viewer.entities.removeAll();

        if (data.states && data.states.length > 0) {
            data.states.forEach(plane => {
                const lon = plane[5];
                const lat = plane[6];
                const alt = plane[7] || 5000; // Meters
                const callsign = plane[1].trim() || "TRK_UNK";

                // Draw Target
                viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                    point: {
                        pixelSize: 8,
                        color: Cesium.Color.LIME,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2
                    },
                    label: {
                        text: callsign,
                        font: '10pt monospace',
                        pixelOffset: new Cesium.Cartesian2(0, -15),
                        fillColor: Cesium.Color.LIME,
                        showBackground: true,
                        backgroundColor: new Cesium.Color(0, 0, 0, 0.7)
                    }
                });
            });
            statusElement.innerText = `STATUS: CONNECTED // ${data.states.length} TARGETS IN RANGE`;
        } else {
            statusElement.innerText = "STATUS: SCANNING... // NO TARGETS DETECTED";
        }
    } catch (error) {
        statusElement.innerText = "STATUS: SIGNAL ERROR // RETRYING";
        console.error("API Error:", error);
    }
}

// 5. RUNTIME CONTROLS
updateLondonTraffic();
setInterval(updateLondonTraffic, 10000); // Update every 10 seconds

// 6. ZOOM CONTROLS (Z for In, X for Out)
window.addEventListener('keydown', (e) => {
    if (e.key === 'z') viewer.camera.zoomIn(2000);
    if (e.key === 'x') viewer.camera.zoomOut(2000);
});

// Add a new UI element for Camera Telemetry
const telemetryDiv = document.createElement('div');
telemetryDiv.id = 'telemetry';
telemetryDiv.style.position = 'absolute';
telemetryDiv.style.bottom = '20px';
telemetryDiv.style.left = '20px';
telemetryDiv.style.color = '#00ff00';
telemetryDiv.style.fontFamily = 'monospace';
document.body.appendChild(telemetryDiv);

viewer.scene.postRender.addEventListener(() => {
    const camera = viewer.camera;
    const height = camera.positionCartographic.height / 1000; // Convert to km
    const lat = Cesium.Math.toDegrees(camera.positionCartographic.latitude).toFixed(4);
    const lon = Cesium.Math.toDegrees(camera.positionCartographic.longitude).toFixed(4);
    
    telemetryDiv.innerHTML = `
        ALTITUDE: ${height.toFixed(2)} KM<br>
        COORDS: ${lat}N, ${lon}E<br>
        ZOOM_STEP: 5000M
    `;
});