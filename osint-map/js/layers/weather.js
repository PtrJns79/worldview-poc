window.WeatherLayer = {
    id: 'weather',
    _imageryLayer: null,

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        try {
            const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
            const data = await res.json();
            
            const frames = data.radar?.past;
            if (!frames || frames.length === 0) return "NO RADAR DATA";
            
            const latest = frames[frames.length - 1];
            const tileUrl = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

            const provider = new Cesium.UrlTemplateImageryProvider({
                url: tileUrl,
                minimumLevel: 0,
                maximumLevel: 12,
                credit: 'RainViewer'
            });

            this._imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
            this._imageryLayer.alpha = 0.6;
            
            return `ACTIVE (${new Date(latest.time * 1000).toLocaleTimeString()})`;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    destroy(viewer) {
        if (this._imageryLayer) {
            viewer.imageryLayers.remove(this._imageryLayer, true);
            this._imageryLayer = null;
        }
    }
};
