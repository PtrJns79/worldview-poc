window.ClosuresLayer = {
    id: 'closures',
    _entities: [],

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        
        const ukraine = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray([
                    22.0, 48.0, 32.0, 52.0, 40.0, 50.0, 38.0, 47.0, 30.0, 45.0
                ])),
                material: Cesium.Color.RED.withAlpha(0.15),
                outline: true,
                outlineColor: Cesium.Color.RED,
                height: 0,
                extrudedHeight: 20000
            },
            label: {
                position: Cesium.Cartesian3.fromDegrees(32.0, 49.0, 20000),
                text: "RESTRICTED AIRSPACE (UKR)",
                font: 'bold 12pt Courier New',
                fillColor: Cesium.Color.RED
            }
        });

        const mideast = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray([
                    35.0, 33.0, 36.0, 34.0, 39.0, 33.0, 40.0, 29.0, 34.0, 29.0
                ])),
                material: Cesium.Color.ORANGE.withAlpha(0.15),
                outline: true,
                outlineColor: Cesium.Color.ORANGE,
                height: 0,
                extrudedHeight: 15000
            },
            label: {
                position: Cesium.Cartesian3.fromDegrees(37.0, 31.0, 15000),
                text: "HAZARD AREA (MID-EAST)",
                font: 'bold 10pt Courier New',
                fillColor: Cesium.Color.ORANGE
            }
        });

        this._entities.push(ukraine, mideast);
        return "ACTIVE (2 RESTRICTION ZONES)";
    },

    destroy(viewer) {
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
    }
};
