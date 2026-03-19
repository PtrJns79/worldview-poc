window.JammingLayer = {
    id: 'jamming',
    _entities: [],

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        
        let count = 0;
        // Generate a grid of points over Kaliningrad / Baltics
        for (let lon = 19.0; lon <= 24.0; lon += 0.5) {
            for (let lat = 54.0; lat <= 57.0; lat += 0.5) {
                // Random intensity
                let intensity = Math.random();
                if (intensity < 0.3) continue;

                let color = intensity > 0.8 ? Cesium.Color.RED : Cesium.Color.ORANGE;
                
                const e = viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(lon + (Math.random()*0.2), lat + (Math.random()*0.2), 0),
                    ellipse: {
                        semiMinorAxis: 15000,
                        semiMajorAxis: 15000,
                        material: color.withAlpha(0.4 * intensity),
                        outline: true,
                        outlineColor: color.withAlpha(0.8)
                    }
                });
                this._entities.push(e);
                count++;
            }
        }
        
        // Grid over Black Sea / Crimea
        for (let lon = 30.0; lon <= 38.0; lon += 0.6) {
            for (let lat = 43.0; lat <= 46.0; lat += 0.6) {
                let intensity = Math.random();
                if (intensity < 0.4) continue;
                const e = viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
                    ellipse: {
                        semiMinorAxis: 20000,
                        semiMajorAxis: 20000,
                        material: Cesium.Color.RED.withAlpha(0.5 * intensity)
                    }
                });
                this._entities.push(e);
                count++;
            }
        }
        
        return `ACTIVE (${count} JAMMING NODES)`;
    },

    destroy(viewer) {
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
    }
};
