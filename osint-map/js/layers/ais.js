window.AISLayer = {
    id: 'ais',
    _entities: [],
    _updateListener: null,

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        
        const count = 45;
        const ships = [];
        
        // Define realistic water channel waypoints through the Strait of Hormuz
        const route = [
            [54.80, 25.60], 
            [55.30, 25.90],
            [55.80, 26.20],
            [56.25, 26.45], 
            [56.50, 26.15],
            [56.70, 25.60],
            [57.10, 24.80]  
        ];
        
        for (let i = 0; i < count; i++) {
            const isOutbound = Math.random() > 0.5;
            ships.push({
                baseProgress: Math.random() * (route.length - 1.01),
                // Real cargo ships move at 15-25 km/h. 
                // At 0.5 degrees per segment (~55,000 meters)
                // A speed of 6 m/s (21km/h) means it crosses a segment in 9,166 seconds.
                // Velocity coefficient = 1 / 9166 = 0.000109 progress-units per second
                velocityCoef: (0.00008 + (Math.random() * 0.00006)), 
                dir: isOutbound ? 1 : -1,
                name: `VESSEL-${Math.floor(Math.random() * 9000)+1000}`,
                entity: null,
                offsetLon: (Math.random() - 0.5) * 0.08,
                offsetLat: (Math.random() - 0.5) * 0.08
            });
        }
        
        const shipSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M10 0 L20 20 L10 15 L0 20 Z" fill="cyan"/></svg>';

        ships.forEach(s => {
            s.entity = viewer.entities.add({
                name: s.name,
                position: Cesium.Cartesian3.fromDegrees(0, 0, 0),
                billboard: {
                    image: shipSvg,
                    width: 20,
                    height: 20,
                    alignedAxis: Cesium.Cartesian3.UNIT_Z
                },
                label: {
                    text: s.name,
                    font: 'bold 10pt Courier New',
                    fillColor: Cesium.Color.CYAN,
                    pixelOffset: new Cesium.Cartesian2(0, -25),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.8)')
                }
            });
            s.entity._ship = true;
            this._entities.push(s.entity);
        });

        const timeStart = Date.now();
        const maxProgress = route.length - 1.01;

        this._updateListener = () => {
            const elapsedSecs = (Date.now() - timeStart) / 1000.0;
            
            ships.forEach(s => {
                // Calculate absolute progress based strictly on time
                let progress = s.baseProgress + (elapsedSecs * s.velocityCoef * s.dir);
                
                // Wrap smoothly
                progress = progress % maxProgress;
                if (progress < 0) progress += maxProgress;
                
                const idx = Math.floor(progress);
                const t = progress - idx;
                
                const p1 = route[idx];
                const p2 = route[idx + 1];
                
                const currentLon = p1[0] + (p2[0] - p1[0]) * t;
                const currentLat = p1[1] + (p2[1] - p1[1]) * t;
                
                const dLon = p2[0] - p1[0];
                const dLat = p2[1] - p1[1];
                
                let heading = (Math.PI/2) - Math.atan2(dLat, dLon); 
                if (s.dir === -1) heading += Math.PI; 
                
                if (s.entity) {
                    s.entity.position = Cesium.Cartesian3.fromDegrees(currentLon + s.offsetLon, currentLat + s.offsetLat, 0);
                    s.entity.billboard.rotation = -heading;
                    s.entity.billboard.alignedAxis = Cesium.Cartesian3.UNIT_Z;
                }
            });
        };
        viewer.scene.preUpdate.addEventListener(this._updateListener);

        return `ACTIVE (${count} VESSELS IN HORMUZ CHOKEPOINT)`;
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
