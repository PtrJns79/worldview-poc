// 1. STRIP ALL EXTERNAL SECURITY CHECKS
Cesium.Ion.defaultAccessToken = ''; 

// 2. INITIALIZE WITH LOCAL GRID (Unblockable)
const viewer = new Cesium.Viewer('cesiumContainer', {
    imageryProvider: new Cesium.GridImageryProvider({
        color: Cesium.Color.fromCssColorString('#003300'),
        backgroundColor: Cesium.Color.BLACK,
        canvasSize: 256
    }),
    baseLayerPicker: false, geocoder: false, homeButton: false,
    sceneModePicker: false, navigationHelpButton: false,
    animation: false, timeline: false, fullscreenButton: false,
    skyBox: false, skyAtmosphere: false, baseLayer: false
});

// 3. TELEMETRY INJECTION
const telemetry = document.createElement('div');
telemetry.style.cssText = 'position:absolute; bottom:25px; right:25px; color:#00ff00; font-family:monospace; background:rgba(0,20,0,0.8); padding:10px; border:1px solid #00ff00; z-index:100; font-size:12px;';
document.getElementById('cesiumContainer').appendChild(telemetry);

viewer.scene.postRender.addEventListener(() => {
    const cam = viewer.camera.positionCartographic;
    if (cam) {
        telemetry.innerHTML = `ALTITUDE: ${(cam.height/1000).toFixed(2)} KM<br>MODE: TACTICAL_GRID<br>SECTOR: LONDON_CTR`;
    }
});

// 4. LONDON ANCHOR
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-0.1276, 51.5072, 25000.0)
});

// 5. AVIATION DATA FUSION
async function updateRadar() {
    const url = 'https://opensky-network.org/api/states/all?lamin=51.3&lomin=-0.5&lamax=51.7&lomax=0.3';
    try {
        const res = await fetch(url);
        const data = await res.json();
        viewer.entities.removeAll();
        if (data.states) {
            data.states.forEach(p => {
                if (p[5] && p[6]) {
                    viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(p[5], p[6], p[7] || 2000),
                        point: { pixelSize: 8, color: Cesium.Color.LIME, outlineWidth: 2 },
                        label: { 
                            text: `${p[1].trim()}\n${Math.round(p[7] || 0)}m`, 
                            font: '10pt monospace', fillColor: Cesium.Color.LIME,
                            pixelOffset: new Cesium.Cartesian2(0, -25),
                            showBackground: true, backgroundColor: Cesium.Color.BLACK
                        }
                    });
                }
            });
            document.getElementById('stats').innerText = `ACTIVE // ${data.states.length} TARGETS IN SECTOR`;
        }
    } catch (e) { document.getElementById('stats').innerText = "SIGNAL ERROR // RETRYING"; }
}

updateRadar();
setInterval(updateRadar, 15000);

// 6. ZOOM CONTROLS
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'z') viewer.camera.zoomIn(5000);
    if (e.key.toLowerCase() === 'x') viewer.camera.zoomOut(5000);
});