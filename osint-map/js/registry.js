/**
 * js/registry.js
 * Manages layer lifecycles and provides a centralized API for toggling and refreshing data.
 */

window.OSINT = (() => {
    const _layers = {}; // id -> layer object
    let _viewer = null;

    return {
        init(viewer) {
            _viewer = viewer;
            console.log("[OSINT] Registry Initialized");
        },
        
        register(layer) {
            if (!layer.id || typeof layer.init !== 'function' || typeof layer.destroy !== 'function') {
                console.error("[OSINT] Invalid layer interface:", layer);
                return;
            }
            _layers[layer.id] = { module: layer, active: false };
            console.log(`[OSINT] Registered layer: ${layer.id}`);
        },

        async toggleLayer(id, state) {
            const l = _layers[id];
            if (!l) {
                console.warn(`[OSINT] Unknown layer: ${id}`);
                return;
            }
            const statusEl = document.getElementById(`status-${id}`);
            
            if (state) {
                l.active = true;
                if (statusEl) statusEl.innerText = "LOADING...";
                try {
                    const res = await l.module.init(_viewer);
                    if (statusEl) statusEl.innerText = res ? res : "ACTIVE";
                } catch (e) {
                    console.error(`[OSINT] Layer ${id} failed to init:`, e);
                    if (statusEl) statusEl.innerText = "ERROR // " + e.message;
                }
            } else {
                l.active = false;
                l.module.destroy(_viewer);
                if (statusEl) statusEl.innerText = "STANDBY";
            }
        },

        async refreshAll() {
            for (const id in _layers) {
                if (_layers[id].active && typeof _layers[id].module.refresh === 'function') {
                    const statusEl = document.getElementById(`status-${id}`);
                    if (statusEl) statusEl.innerText = "REFRESHING...";
                    try {
                        const res = await _layers[id].module.refresh(_viewer);
                        if (statusEl) statusEl.innerText = res ? res : "ACTIVE";
                    } catch (e) {
                        if (statusEl) statusEl.innerText = "REFRESH ERROR";
                    }
                }
            }
        }
    };
})();
