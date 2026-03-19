window.AISLayer = {
    id: 'ais',
    _entities: [],
    _intervalId: null,

    filters: {
        cargo:     true,
        tanker:    true,
        passenger: true,
        naval:     true,
        unknown:   false
    },

    updateFilters(type, isChecked) {
        this.filters[type] = isChecked;
        this._entities.forEach(e => {
            if (e._aisType === type) e.show = isChecked;
        });
    },

    async init(viewer) {
        this._viewer = viewer;
        await this._fetch();
        this._intervalId = setInterval(() => this._fetch(), 30000);
        return 'LOADING...';
    },

    async _fetch() {
        try {
            // Digitraffic Finnish Transport Agency — open AIS, no key required
            // Coverage: Baltic Sea, North Sea, Norwegian coast
            const res = await fetch('https://meri.digitraffic.fi/api/ais/v1/locations');
            if (!res.ok) return;
            const data = await res.json();
            if (!data || !data.features) return;

            // Remove old entities
            this.destroy(this._viewer, true); // partialDestroy

            let counts = { cargo: 0, tanker: 0, passenger: 0, naval: 0, unknown: 0 };

            data.features.forEach(f => {
                const props = f.properties;
                const coords = f.geometry && f.geometry.coordinates;
                if (!coords || coords.length < 2) return;

                const lon = coords[0];
                const lat = coords[1];
                const mmsi = props.mmsi;
                const sog  = props.sog || 0;  // speed over ground (knots)
                const cog  = props.cog || 0;  // course over ground (degrees)
                const shipType = props.shipType || 0;

                // AIS ship type codes → our categories
                let aisType = 'unknown';
                if (shipType >= 70 && shipType <= 79) aisType = 'cargo';
                else if (shipType >= 80 && shipType <= 89) aisType = 'tanker';
                else if (shipType >= 60 && shipType <= 69) aisType = 'passenger';
                else if (shipType >= 35 && shipType <= 36) aisType = 'naval';
                else if (shipType >= 50 && shipType <= 59) aisType = 'cargo'; // service/pilot treated as cargo

                if (!this.filters[aisType]) return;
                counts[aisType]++;

                const colorMap = {
                    cargo:     '#4ade80',
                    tanker:    '#ff4444',
                    passenger: '#60a5fa',
                    naval:     '#ff0000',
                    unknown:   '#888888'
                };
                const hex = colorMap[aisType];

                const ent = this._viewer.entities.add({
                    name: `MMSI: ${mmsi}`,
                    show: this.filters[aisType],
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
                    billboard: {
                        image: this._makeArrow(hex, cog),
                        width: 14,
                        height: 14,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER
                    },
                    label: {
                        text: `${mmsi}`,
                        font: '9px monospace',
                        fillColor: Cesium.Color.fromCssColorString(hex),
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        pixelOffset: new Cesium.Cartesian2(0, -16),
                        showBackground: true,
                        backgroundColor: new Cesium.Color(0, 0, 0, 0.6),
                        backgroundPadding: new Cesium.Cartesian2(3, 2),
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000000)
                    },
                    description: `
                        <div style="font-family:monospace;color:#00ffff;padding:6px">
                            <h3 style="margin:0 0 8px;color:white">AIS VESSEL</h3>
                            <p><b>MMSI:</b> ${mmsi}</p>
                            <p><b>TYPE:</b> ${aisType.toUpperCase()}</p>
                            <p><b>SOG:</b> ${sog.toFixed(1)} kn</p>
                            <p><b>COG:</b> ${cog.toFixed(0)}°</p>
                            <p><b>SOURCE:</b> Digitraffic (Baltic/North Sea)</p>
                        </div>`
                });
                ent._aisType = aisType;
                this._entities.push(ent);
            });

            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const statusEl = document.getElementById('status-ais');
            if (statusEl) statusEl.innerText = `ACTIVE (${total} VESSELS)`;
        } catch (e) {
            console.warn('[AIS] Fetch failed:', e.message);
            const statusEl = document.getElementById('status-ais');
            if (statusEl) statusEl.innerText = 'ERROR // DIGITRAFFIC';
        }
    },

    _makeArrow(hex, headingDeg) {
        const c = document.createElement('canvas');
        c.width = 14; c.height = 14;
        const ctx = c.getContext('2d');
        ctx.save();
        ctx.translate(7, 7);
        ctx.rotate((headingDeg * Math.PI) / 180);
        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
        return c.toDataURL();
    },

    destroy(viewer, partial = false) {
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
        if (!partial && this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }
};
