window.BlackoutsLayer = {
    id: 'blackouts',
    _entities: [],
    _updateListener: null,

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        
        const regions = [
            { name: "Sudan (Khartoum)", lon: 32.5599, lat: 15.5007, radius: 300000, entity: null },
            { name: "Yemen (Sanaa)", lon: 44.2066, lat: 15.3694, radius: 150000, entity: null }
        ];

        regions.forEach(r => {
            r.entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(r.lon, r.lat, 0),
                ellipse: {
                    semiMinorAxis: r.radius,
                    semiMajorAxis: r.radius,
                    material: Cesium.Color.MAGENTA.withAlpha(0.3),
                    outline: true,
                    outlineColor: Cesium.Color.MAGENTA
                },
                label: {
                    text: `INTERNET BLACKOUT\n${r.name}`,
                    font: 'bold 10pt Courier New',
                    fillColor: Cesium.Color.MAGENTA,
                    pixelOffset: new Cesium.Cartesian2(0, -30),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.8)')
                }
            });
            this._entities.push(r.entity);
        });

        // Use preUpdate instead of CallbackProperty to bypass Cesium property wrapper TypeErrors
        this._updateListener = () => {
            const alpha = 0.3 + (Math.sin(Date.now() / 300.0) * 0.2);
            const dynamicColor = Cesium.Color.MAGENTA.withAlpha(alpha);
            regions.forEach(r => {
                if (r.entity) {
                    r.entity.ellipse.material = dynamicColor;
                }
            });
        };
        viewer.scene.preUpdate.addEventListener(this._updateListener);
        
        return `ACTIVE (${regions.length} ZONES)`;
    },

    destroy(viewer) {
        if (this._updateListener) {
            viewer.scene.preUpdate.removeEventListener(this._updateListener);
            this._updateListener = null;
        }
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
    }
};
