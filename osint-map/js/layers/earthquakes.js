window.EarthquakesLayer = {
    id: 'earthquakes',
    _entities: [],
    
    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        
        try {
            const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson');
            const data = await res.json();
            
            if (!data.features) return "NO DATA";

            data.features.forEach(eq => {
                const coords = eq.geometry.coordinates; // [lon, lat, depth]
                const mag = eq.properties.mag;
                const place = eq.properties.place;
                const time = new Date(eq.properties.time).toLocaleString();
                
                // Color scaling based on magnitude
                let color = Cesium.Color.fromCssColorString('#ffaa00');
                if (mag > 4.5) color = Cesium.Color.fromCssColorString('#ff5500');
                if (mag > 6.0) color = Cesium.Color.fromCssColorString('#ff0000');
                
                const entity = viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1], 0),
                    cylinder: {
                        length: mag * 50000,
                        topRadius: mag * 10000,
                        bottomRadius: mag * 10000,
                        material: color.withAlpha(0.6),
                        outline: true,
                        outlineColor: color,
                        outlineWidth: 2
                    },
                    description: `
                        <b>LOCATION:</b> ${place}<br>
                        <b>MAGNITUDE:</b> ${mag}<br>
                        <b>DEPTH:</b> ${coords[2]} km<br>
                        <b>TIME:</b> ${time}
                    `
                });
                
                // Shift cylinder up so base is at ground level
                entity.position = Cesium.Cartesian3.fromDegrees(coords[0], coords[1], (mag * 50000) / 2);
                
                this._entities.push(entity);
            });
            
            return `ACTIVE (${data.features.length} EVENTS)`;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    destroy(viewer) {
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
    }
};
