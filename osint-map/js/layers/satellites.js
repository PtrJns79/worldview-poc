window.SatellitesLayer = {
    id: 'satellites',
    _entities: [],
    _updateListener: null,

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);
        
        const sats = [
            { name: "USA-234 (Topaz)", alt: 1050000, speed: 0.0002, angle: Math.PI/4, offset: 0, entity: null },
            { name: "Maxar WorldView-3", alt: 600000, speed: 0.0003, angle: Math.PI/3, offset: Math.PI/2, entity: null },
            { name: "Capella Space-2", alt: 500000, speed: 0.00035, angle: Math.PI/6, offset: Math.PI, entity: null },
            { name: "Tiangong Space Station", alt: 380000, speed: 0.0004, angle: 0, offset: Math.PI/1.5, entity: null },
            { name: "GaoFen-4", alt: 36000000, speed: 0.00005, angle: Math.PI/8, offset: Math.PI/4, entity: null }
        ];

        const timeStart = Date.now();

        sats.forEach(s => {
            s.entity = viewer.entities.add({
                position: new Cesium.Cartesian3(0,0,0), // Initial dummy
                point: { pixelSize: 10, color: Cesium.Color.YELLOW, outlineColor: Cesium.Color.BLACK, outlineWidth: 2 },
                label: { text: s.name, font: 'bold 12pt Courier New', fillColor: Cesium.Color.YELLOW, pixelOffset: new Cesium.Cartesian2(0, -30), showBackground: true, backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.8)') }
            });
            this._entities.push(s.entity);
        });

        this._updateListener = () => {
            const elapsed = (Date.now() - timeStart) / 1000.0;
            sats.forEach(s => {
                const r = 6371000 + s.alt;
                const t = (elapsed * s.speed) + s.offset;
                const x = r * Math.cos(t);
                const y = r * Math.sin(t) * Math.cos(s.angle);
                const z = r * Math.sin(t) * Math.sin(s.angle);
                if (s.entity) {
                    s.entity.position = new Cesium.Cartesian3(x, y, z);
                }
            });
        };
        viewer.scene.preUpdate.addEventListener(this._updateListener);

        // Add Live ISS Tracker with Dead-Reckoning Physics
        try {
            const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            const data = await res.json();
            
            const issSvg = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23ff0000' stroke='white' stroke-width='1.5' d='M12 2 L22 20 L12 16 L2 20 Z'/%3E%3C/svg%3E`;

            let issEntity = viewer.entities.add({
                name: "INTERNATIONAL SPACE STATION",
                position: Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, data.altitude * 1000),
                point: { pixelSize: 18, color: Cesium.Color.RED, outlineColor: Cesium.Color.WHITE, outlineWidth: 2 },
                label: { text: `ISS LIVE\nALT: ${Math.round(data.altitude)}km`, font: 'bold 13pt Courier New', fillColor: Cesium.Color.WHITE, pixelOffset: new Cesium.Cartesian2(0, -35), showBackground: true, backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.8)') }
            });
            
            issEntity._lon = data.longitude;
            issEntity._lat = data.latitude;
            issEntity._alt = data.altitude * 1000;
            // velocity is km/h, convert to m/s
            issEntity._velocity = data.velocity * (1000 / 3600);
            issEntity._heading = null;
            issEntity._lastTime = Date.now();
            issEntity._iss = true;

            this._entities.push(issEntity);
            
            // Background polling loop to resync ISS position
            const intId = setInterval(async () => {
                if (!issEntity) return;
                try {
                    const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
                    const d = await r.json();
                    
                    const newLon = d.longitude;
                    const newLat = d.latitude;
                    
                    // Natively calculate true heading based on delta
                    const dLon = newLon - issEntity._lon;
                    const dLat = newLat - issEntity._lat;
                    if (Math.abs(dLon) > 0 || Math.abs(dLat) > 0) {
                        let h = (Math.PI/2) - Math.atan2(dLat, dLon);
                        issEntity._heading = Cesium.Math.toDegrees(h);
                        
                        // Swap point for oriented arrow if heading is finally known
                        if (!issEntity.billboard) {
                            issEntity.point = undefined;
                            issEntity.billboard = new Cesium.BillboardGraphics({
                                image: issSvg,
                                width: 26,
                                height: 26,
                                alignedAxis: Cesium.Cartesian3.UNIT_Z,
                                rotation: new Cesium.CallbackProperty(() => {
                                    return -Cesium.Math.toRadians(issEntity._heading || 0);
                                }, false)
                            });
                        }
                    }

                    issEntity._lon = newLon;
                    issEntity._lat = newLat;
                    issEntity._alt = d.altitude * 1000;
                    issEntity._velocity = d.velocity * (1000 / 3600);
                    
                    issEntity.label.text = `ISS LIVE\nALT: ${Math.round(d.altitude)}km`;
                } catch(e) {}
            }, 5000);
            
            issEntity._intId = intId;

            // Physics extrapolation hook
            const physicsHook = () => {
                if (!issEntity || !issEntity._heading) return;
                const now = Date.now();
                const dt = (now - issEntity._lastTime) / 1000.0;
                issEntity._lastTime = now;
                
                const d = issEntity._velocity * dt;
                const R = 6378137.0 + issEntity._alt;
                
                const hRad = Cesium.Math.toRadians(issEntity._heading);
                const latRad = Cesium.Math.toRadians(issEntity._lat);
                
                const dLatRad = (d * Math.cos(hRad)) / R;
                const cosLat = Math.cos(latRad);
                const dLonRad = (cosLat < 0.0001) ? 0 : (d * Math.sin(hRad)) / (R * cosLat);
                
                issEntity._lat += Cesium.Math.toDegrees(dLatRad);
                issEntity._lon += Cesium.Math.toDegrees(dLonRad);
                issEntity.position = Cesium.Cartesian3.fromDegrees(issEntity._lon, issEntity._lat, issEntity._alt);
            };
            viewer.scene.preUpdate.addEventListener(physicsHook);
            issEntity._physicsHook = physicsHook;

        } catch(e) {}

        return `ACTIVE (${sats.length + 1} ASSETS TRACKED)`;
    },

    destroy(viewer) {
        if (this._updateListener) {
            viewer.scene.preUpdate.removeEventListener(this._updateListener);
            this._updateListener = null;
        }
        this._entities.forEach(e => {
            if (e._intId) clearInterval(e._intId);
            if (e._physicsHook) viewer.scene.preUpdate.removeEventListener(e._physicsHook);
            viewer.entities.remove(e);
        });
        this._entities = [];
    }
};
