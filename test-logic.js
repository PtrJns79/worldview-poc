Cesium.Ion.defaultAccessToken = ''; 

const LONDON_10KM = Cesium.Cartesian3.fromDegrees(-0.1276, 51.5072, 10000.0);
const viewers = {};
let activeMaster = 'map-a';

async function initSector(id, providerPromise, label) {
    try {
        const provider = await Promise.resolve(providerPromise);
        const viewer = new Cesium.Viewer(id, {
            baseLayer: new Cesium.ImageryLayer(provider),
            baseLayerPicker: false,
            geocoder: false,
            animation: false,
            timeline: false,
            navigationHelpButton: false,
            contextOptions: { webgl: { preserveDrawingBuffer: true } }
        });

        viewer.camera.setView({
            destination: LONDON_10KM,
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
        });

        const labelEl = document.createElement('div');
        labelEl.style.cssText = "position:absolute; top:10px; left:10px; color:#0f0; font-family:monospace; background:rgba(0,0,0,0.8); padding:4px 8px; border:1px solid #0f0; font-size:11px; z-index:100; pointer-events:none;";
        labelEl.innerText = `[ ${label} ]`;
        viewer.container.appendChild(labelEl);

        viewers[id] = viewer;
        
    } catch (e) { console.error(`ERR_${id}:`, e); }
}

function setupMasterSync() {
    Object.keys(viewers).forEach(id => {
        const viewer = viewers[id];

        // Dynamic Master Switching
        viewer.container.addEventListener('mouseenter', () => {
            activeMaster = id;
            document.querySelector('.status-indicator').innerText = `MASTER_SYNC: ${id.toUpperCase().replace('-', '_')}`;
        });

        viewer.scene.postRender.addEventListener(() => {
            if (id !== activeMaster) return;

            const dest = viewer.camera.position.clone();
            const dir = viewer.camera.direction.clone();
            const up = viewer.camera.up.clone();

            Object.keys(viewers).forEach(targetId => {
                if (targetId !== id) {
                    viewers[targetId].camera.setView({
                        destination: dest,
                        orientation: { direction: dir, up: up }
                    });
                }
            });
        });
    });
}

document.getElementById('screenshot-btn').addEventListener('click', async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const grid = document.querySelector('.test-grid');
    canvas.width = grid.clientWidth;
    canvas.height = grid.clientHeight;

    ['map-a', 'map-b', 'map-c', 'map-d'].forEach((id, index) => {
        const vCanvas = document.querySelector(`#${id} canvas`);
        const x = (index % 2) * (canvas.width / 2);
        const y = Math.floor(index / 2) * (canvas.height / 2);
        ctx.drawImage(vCanvas, x, y, canvas.width / 2, canvas.height / 2);
    });

    canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        alert("COPIED!");
    });
});

// INITIALIZATION SEQUENCE
const sectors = [
    { id: 'map-a', label: 'MASTER_A',  p: new Cesium.UrlTemplateImageryProvider({ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png' }) },
    { id: 'map-b', label: 'OSM_B',     p: new Cesium.OpenStreetMapImageryProvider({ url: 'https://a.tile.openstreetmap.org/' }) },
    { id: 'map-c', label: 'VOYAGER_C', p: new Cesium.UrlTemplateImageryProvider({ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png' }) },
    { id: 'map-d', label: 'LIGHT_D',   p: new Cesium.UrlTemplateImageryProvider({ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png' }) }
];

Promise.all(sectors.map(s => initSector(s.id, s.p, s.label))).then(setupMasterSync);

// GLOBAL ZOOM LOGIC
const zoomFactor = 0.25; // 25% change per click

function handleZoom(direction) {
    const master = viewers[activeMaster];
    if (!master) return;
    const height = master.camera.positionCartographic.height;
    const amount = height * zoomFactor;
    direction === 'in' ? master.camera.zoomIn(amount) : master.camera.zoomOut(amount);
}
document.getElementById('zoom-in').addEventListener('click', () => handleZoom('in'));
document.getElementById('zoom-out').addEventListener('click', () => handleZoom('out'));