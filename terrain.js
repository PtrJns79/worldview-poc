/**
 * LAYER: terrain.js
 * Source: Esri World Imagery (free, no auth for tile access)
 * Rate limit: none for standard tile usage
 * Strategy: swap the base imagery layer to satellite/terrain
 */

const TerrainLayer = {
    id: 'terrain',
    label: 'SATELLITE // ESRI',
    _imageryLayer: null,
    _originalBase: null,

    init(viewer) {
        this._viewer = viewer;
        return this.refresh(viewer);
    },

    refresh(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;

        // Remove any previously added imagery from this layer
        if (this._imageryLayer) {
            v.imageryLayers.remove(this._imageryLayer, true);
            this._imageryLayer = null;
        }

        try {
            const provider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                credit: 'Esri World Imagery',
                minimumLevel: 0,
                maximumLevel: 19
            });

            // Insert at index 1 — above base grid, below any overlays
            this._imageryLayer = v.imageryLayers.addImageryProvider(provider, 1);

            // Optional: add a roads/labels overlay on top of satellite
            const labelsProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
                credit: 'Esri',
                minimumLevel: 0,
                maximumLevel: 19
            });

            this._labelsLayer = v.imageryLayers.addImageryProvider(labelsProvider);
            this._labelsLayer.alpha = 0.6;

            console.log('[terrain] Esri satellite layer loaded');
            return { status: 'ok' };

        } catch (e) {
            console.error('[terrain] Failed to load imagery:', e);
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
        if (this._labelsLayer) {
            v.imageryLayers.remove(this._labelsLayer, true);
            this._labelsLayer = null;
        }
    }
};
