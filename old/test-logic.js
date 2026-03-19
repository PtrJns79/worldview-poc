/**
 * test-logic.js
 * Wires panes to layers. All actual logic lives in layers/ and layer-registry.js.
 * To change what a pane shows, edit the PANE_CONFIG below.
 */

Cesium.Ion.defaultAccessToken = '';

const LONDON = Cesium.Cartesian3.fromDegrees(-0.1276, 51.5072, 25000.0);
const LOOK_DOWN = { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 };

// ─── PANE CONFIGURATION ──────────────────────────────────────────────────────
// Edit this to change what each pane shows.
// Each pane can have multiple layer IDs — they stack.
const PANE_CONFIG = [
    { id: 'map-a', label: 'FLIGHTS',   layers: ['flights']          },
    { id: 'map-b', label: 'WEATHER',   layers: ['weather']          },
    { id: 'map-c', label: 'AIRSPACE',  layers: ['airspace']         },
    { id: 'map-d', label: 'SATELLITE', layers: ['terrain']          },
];
// ─────────────────────────────────────────────────────────────────────────────

const viewers = {};
let activeMaster = 'map-a';

// Base layer options per pane — dark tactical grid default
const BASE_PROVIDERS = {
    'map-a': () => new Cesium.UrlTemplateImageryProvider({ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png' }),
    'map-b': () => new Cesium.UrlTemplateImageryProvider({ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png' }),
    'map-c': () => new Cesium.UrlTemplateImageryProvider({ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png' }),
    'map-d': () => new Cesium.GridImageryProvider({ color: Cesium.Color.fromCssColorString('#001a00'), backgroundColor: Cesium.Color.BLACK })
};

async function initPane(config) {
    const provider = BASE_PROVIDERS[config.id]?.() || new Cesium.GridImageryProvider();

    const viewer = new Cesium.Viewer(config.id, {
        baseLayer: new Cesium.ImageryLayer(provider),
        baseLayerPicker: false,
        geocoder: false,
        animation: false,
        timeline: false,
        navigationHelpButton: false,
        infoBox: true,
        selectionIndicator: true,
        contextOptions: { webgl: { preserveDrawingBuffer: true } }
    });

    viewer.camera.setView({ destination: LONDON, orientation: LOOK_DOWN });

    // Pane label
    const labelEl = document.createElement('div');
    labelEl.className = 'pane-label';
    labelEl.innerText = `[ ${config.label} ]`;
    viewer.container.appendChild(labelEl);

    viewers[config.id] = viewer;

    // Register master on hover
    viewer.container.addEventListener('mouseenter', () => {
        activeMaster = config.id;
        updateStatusBar();
    });

    // Assign layers via registry
    await LayerRegistry.assignLayers(config.id, viewer, config.layers);
}

function setupCameraSync() {
    Object.keys(viewers).forEach(id => {
        viewers[id].scene.postRender.addEventListener(() => {
            if (id !== activeMaster) return;
            const cam = viewers[id].camera;
            const dest = cam.position.clone();
            const dir = cam.direction.clone();
            const up = cam.up.clone();

            Object.keys(viewers).forEach(targetId => {
                if (targetId !== id) {
                    viewers[targetId].camera.setView({ destination: dest, orientation: { direction: dir, up } });
                }
            });

            updateStatusBar();
        });
    });
}

function updateStatusBar() {
    const master = viewers[activeMaster];
    if (!master) return;
    const cart = master.camera.positionCartographic;
    const alt = cart ? (cart.height / 1000).toFixed(1) : '?';
    document.getElementById('status-master').innerText = `MASTER: ${activeMaster.toUpperCase().replace('-','_')}`;
    document.getElementById('status-alt').innerText = `ALT: ${alt}KM`;
}

// ─── ZOOM ─────────────────────────────────────────────────────────────────────
function handleZoom(dir) {
    const master = viewers[activeMaster];
    if (!master) return;
    const h = master.camera.positionCartographic.height;
    dir === 'in' ? master.camera.zoomIn(h * 0.25) : master.camera.zoomOut(h * 0.25);
}
document.getElementById('zoom-in').addEventListener('click', () => handleZoom('in'));
document.getElementById('zoom-out').addEventListener('click', () => handleZoom('out'));

// ─── REFRESH (flights only — conserve API credits) ────────────────────────────
document.getElementById('refresh-btn').addEventListener('click', async () => {
    document.getElementById('refresh-btn').innerText = 'FETCHING...';
    await LayerRegistry.refresh('flights', null, viewers);
    document.getElementById('refresh-btn').innerText = 'REFRESH_FLIGHTS';
});

// ─── SCREENSHOT ───────────────────────────────────────────────────────────────
document.getElementById('screenshot-btn').addEventListener('click', async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const grid = document.querySelector('.test-grid');
    canvas.width = grid.clientWidth;
    canvas.height = grid.clientHeight;

    ['map-a', 'map-b', 'map-c', 'map-d'].forEach((id, i) => {
        const vCanvas = document.querySelector(`#${id} canvas`);
        if (!vCanvas) return;
        const x = (i % 2) * (canvas.width / 2);
        const y = Math.floor(i / 2) * (canvas.height / 2);
        ctx.drawImage(vCanvas, x, y, canvas.width / 2, canvas.height / 2);
    });

    canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        document.getElementById('screenshot-btn').innerText = 'COPIED!';
        setTimeout(() => document.getElementById('screenshot-btn').innerText = 'COPY_ALL', 2000);
    });
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────

// Register all layers
LayerRegistry.register(FlightsLayer);
LayerRegistry.register(WeatherLayer);
LayerRegistry.register(AirspaceLayer);
LayerRegistry.register(TerrainLayer);

// Init all panes then set up sync
Promise.all(PANE_CONFIG.map(initPane)).then(() => {
    setupCameraSync();
    updateStatusBar();
    console.log('[boot] All panes initialised');
});
