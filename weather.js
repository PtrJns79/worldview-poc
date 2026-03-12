/**
 * LAYER: weather.js
 * Source: RainViewer API (free, no auth)
 * Rate limit: none documented — fetch timestamp once, tiles are static CDN
 * Strategy: fetch latest timestamp on init, overlay animated precip tiles
 */

const WeatherLayer = {
    id: 'weather',
    label: 'WEATHER // RAINVIEWER',
    _imageryLayer: null,

    async init(viewer) {
        this._viewer = viewer;
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;

        // Remove existing layer
        if (this._imageryLayer) {
            v.imageryLayers.remove(this._imageryLayer, true);
            this._imageryLayer = null;
        }

        try {
            // Get latest available radar frame timestamp
            const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await res.json();

            // Most recent radar frame
            const frames = data.radar?.past;
            if (!frames || frames.length === 0) {
                console.warn('[weather] No radar frames available');
                return;
            }

            const latest = frames[frames.length - 1];
            const path = latest.path; // e.g. /v2/radar/1234567890/256/{z}/{x}/{y}/2/1_1.png

            const tileUrl = `https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/2/1_1.png`;

            const provider = new Cesium.UrlTemplateImageryProvider({
                url: tileUrl,
                minimumLevel: 0,
                maximumLevel: 12,
                credit: 'RainViewer'
            });

            this._imageryLayer = v.imageryLayers.addImageryProvider(provider);
            this._imageryLayer.alpha = 0.7;

            console.log(`[weather] Loaded radar frame: ${new Date(latest.time * 1000).toISOString()}`);
            return { timestamp: latest.time };

        } catch (e) {
            console.error('[weather] Fetch failed:', e);
            return { error: e.message };
        }
    },

    destroy(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;
        if (this._imageryLayer) {
            v.imageryLayers.remove(this._imageryLayer, true);
            this._imageryLayer = null;
        }
    }
};
