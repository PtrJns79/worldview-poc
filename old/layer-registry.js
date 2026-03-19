/**
 * layer-registry.js
 * Thin manager — registers layer modules, wires them to panes.
 * Does not care what any layer does internally.
 */

const LayerRegistry = (() => {
    const _layers = {};      // id -> layer module
    const _paneMap = {};     // paneId -> [layerId, ...]

    return {
        /**
         * Register a layer module.
         * @param {object} layer - must implement { id, label, init, refresh, destroy }
         */
        register(layer) {
            if (!layer.id || !layer.init || !layer.refresh || !layer.destroy) {
                console.error('[registry] Layer missing required interface:', layer);
                return;
            }
            _layers[layer.id] = layer;
            console.log(`[registry] Registered layer: ${layer.id}`);
        },

        /**
         * Assign one or more layers to a pane and initialise them.
         * @param {string} paneId - viewer/pane identifier
         * @param {Cesium.Viewer} viewer
         * @param {string[]} layerIds - array of registered layer IDs
         */
        async assignLayers(paneId, viewer, layerIds) {
            _paneMap[paneId] = layerIds;
            for (const id of layerIds) {
                const layer = _layers[id];
                if (!layer) {
                    console.warn(`[registry] Unknown layer: ${id}`);
                    continue;
                }
                await layer.init(viewer);
            }
        },

        /**
         * Refresh a specific layer across all panes it appears in.
         * Or pass a paneId to refresh only within that pane.
         */
        async refresh(layerId, paneId = null, viewers = {}) {
            const layer = _layers[layerId];
            if (!layer) return;

            const targetPanes = paneId
                ? [paneId]
                : Object.keys(_paneMap).filter(p => _paneMap[p].includes(layerId));

            for (const p of targetPanes) {
                if (viewers[p]) await layer.refresh(viewers[p]);
            }
        },

        /**
         * Refresh ALL layers across ALL panes.
         */
        async refreshAll(viewers = {}) {
            for (const paneId of Object.keys(_paneMap)) {
                for (const layerId of _paneMap[paneId]) {
                    const layer = _layers[layerId];
                    if (layer && viewers[paneId]) {
                        await layer.refresh(viewers[paneId]);
                    }
                }
            }
        },

        /**
         * Destroy a layer from a pane (removes its entities/imagery).
         */
        destroy(layerId, paneId, viewer) {
            const layer = _layers[layerId];
            if (layer && viewer) layer.destroy(viewer);
            if (_paneMap[paneId]) {
                _paneMap[paneId] = _paneMap[paneId].filter(id => id !== layerId);
            }
        },

        getPane(paneId) { return _paneMap[paneId] || []; },
        getLayers() { return { ..._layers }; },
        getPaneMap() { return { ..._paneMap }; }
    };
})();
