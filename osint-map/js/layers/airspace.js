window.AirspaceLayer = {
    id: 'airspace',
    _entities: [],

    filters: {
        civic: true,
        military: true,
        fir: true
    },

    updateFilters(type, isChecked) {
        this.filters[type] = isChecked;
        this._entities.forEach(e => {
            if (e._airspaceType === type) e.show = isChecked;
        });
    },

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);

        const zones = [
            // --- FIR: High-tension Flight Information Regions ---
            {
                name: "KALININGRAD FIR (UMKK)",
                type: 'fir',
                color: Cesium.Color.CYAN,
                coords: [19.6, 54.3, 22.8, 54.3, 22.8, 55.4, 19.6, 55.4]
            },
            {
                name: "TAIPEI FIR (RCAA)",
                type: 'fir',
                color: Cesium.Color.CYAN,
                coords: [117.5, 21.0, 124.0, 21.0, 124.0, 29.0, 117.5, 29.0]
            },
            {
                name: "TEHRAN FIR (OIIX)",
                type: 'fir',
                color: Cesium.Color.CYAN,
                coords: [44.0, 25.0, 63.0, 25.0, 63.0, 39.0, 44.0, 39.0]
            },
            {
                name: "PYONGYANG FIR (ZKKP)",
                type: 'fir',
                color: Cesium.Color.CYAN,
                coords: [124.0, 37.5, 131.0, 37.5, 131.0, 43.0, 124.0, 43.0]
            },

            // --- MILITARY: Permanently restricted airspace ---
            {
                name: "AREA 51 / NEVADA TEST RANGE",
                type: 'military',
                color: Cesium.Color.RED,
                coords: [-116.5, 37.0, -114.5, 37.0, -114.5, 38.0, -116.5, 38.0]
            },
            {
                name: "SALISBURY PLAIN DANGER AREA (EG D323)",
                type: 'military',
                color: Cesium.Color.RED,
                coords: [-2.1, 51.1, -1.7, 51.1, -1.7, 51.4, -2.1, 51.4]
            },
            {
                name: "NORTH SEA DANGER AREAS (EGD)",
                type: 'military',
                color: Cesium.Color.RED,
                coords: [0.5, 54.0, 2.5, 54.0, 2.5, 55.0, 0.5, 55.0]
            },

            // --- CIVIC: Major TFRs / Restricted Civil Corridors ---
            {
                name: "WASHINGTON D.C. SFRA (P-56)",
                type: 'civic',
                color: Cesium.Color.LIME,
                coords: [-77.3, 38.7, -76.9, 38.7, -76.9, 39.0, -77.3, 39.0]
            },
            {
                name: "LONDON TMA / HEATHROW CONTROL ZONE",
                type: 'civic',
                color: Cesium.Color.LIME,
                coords: [-0.8, 51.3, 0.2, 51.3, 0.2, 51.7, -0.8, 51.7]
            }
        ];

        zones.forEach(z => {
            const ent = viewer.entities.add({
                name: z.name,
                show: this.filters[z.type],
                polygon: {
                    hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(z.coords)),
                    height: 0,
                    extrudedHeight: 30000.0,
                    perPositionHeight: false,
                    material: z.color.withAlpha(0.25),
                    outline: true,
                    outlineColor: z.color
                },
                description: `
                    <div style="font-family: monospace; color: #00ffff;">
                        <h3 style="margin:0 0 10px 0; color:white;">${z.name}</h3>
                        <p><b>TYPE:</b> ${z.type.toUpperCase()}</p>
                        <p><b>CEILING:</b> 30,000m</p>
                        <p><b>STATUS:</b> ACTIVE RESTRICTION</p>
                    </div>
                `
            });
            ent._airspaceType = z.type;
            this._entities.push(ent);
        });

        const counts = { fir: 0, military: 0, civic: 0 };
        zones.forEach(z => counts[z.type]++);
        return `ACTIVE (FIR:${counts.fir} MIL:${counts.military} CIV:${counts.civic})`;
    },

    destroy(viewer) {
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
    }
};
