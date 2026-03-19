window.PortsLayer = {
    id: 'ports',
    _entities: [],

    filters: {
        commercial: true,
        naval: true,
        energy: true
    },

    updateFilters(type, isChecked) {
        this.filters[type] = isChecked;
        this._entities.forEach(e => {
            if (e._portType === type) e.show = isChecked;
        });
    },

    async init(viewer) {
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        this.destroy(viewer);

        // Major strategic global ports — World Port Index reference data
        const ports = [
            // --- COMMERCIAL ---
            { name: "Port of Shanghai", type: 'commercial', lat: 31.23, lon: 121.47, country: 'CN', note: 'Largest container port globally' },
            { name: "Port of Singapore", type: 'commercial', lat: 1.26, lon: 103.82, country: 'SG', note: 'Major transshipment hub' },
            { name: "Port of Rotterdam", type: 'commercial', lat: 51.89, lon: 4.48, country: 'NL', note: 'Largest port in Europe' },
            { name: "Port of Antwerp", type: 'commercial', lat: 51.27, lon: 4.38, country: 'BE', note: 'Second largest EU port' },
            { name: "Port of Hamburg", type: 'commercial', lat: 53.54, lon: 9.99, country: 'DE', note: 'Major North Sea hub' },
            { name: "Port of Los Angeles", type: 'commercial', lat: 33.74, lon: -118.28, country: 'US', note: 'Busiest US container port' },
            { name: "Port of Long Beach", type: 'commercial', lat: 33.77, lon: -118.22, country: 'US', note: 'Second busiest US container port' },
            { name: "Port of New York/NJ", type: 'commercial', lat: 40.69, lon: -74.04, country: 'US', note: 'Largest US East Coast port' },
            { name: "Port of Busan", type: 'commercial', lat: 35.10, lon: 129.04, country: 'KR', note: 'Trans-Pacific hub' },
            { name: "Port of Dubai (Jebel Ali)", type: 'commercial', lat: 24.98, lon: 55.06, country: 'AE', note: 'Largest port in Middle East' },
            { name: "Port of Colombo", type: 'commercial', lat: 6.93, lon: 79.85, country: 'LK', note: 'Indian Ocean transshipment' },
            { name: "Port Said", type: 'commercial', lat: 31.25, lon: 32.31, country: 'EG', note: 'Northern Suez Canal terminal' },
            { name: "Port of Suez", type: 'commercial', lat: 29.97, lon: 32.55, country: 'EG', note: 'Southern Suez Canal terminal' },
            { name: "Port of Piraeus", type: 'commercial', lat: 37.94, lon: 23.63, country: 'GR', note: 'Mediterranean hub (COSCO)' },
            { name: "Port of Felixstowe", type: 'commercial', lat: 51.96, lon: 1.34, country: 'GB', note: 'Largest UK container port' },
            { name: "Port of Liverpool", type: 'commercial', lat: 53.44, lon: -3.0, country: 'GB', note: 'Major UK Atlantic port' },
            { name: "Port of Mumbai", type: 'commercial', lat: 18.93, lon: 72.84, country: 'IN', note: 'India western hub' },
            { name: "Port of Karachi", type: 'commercial', lat: 24.84, lon: 66.99, country: 'PK', note: 'Pakistan primary port' },
            { name: "Port of Klang", type: 'commercial', lat: 2.99, lon: 101.39, country: 'MY', note: 'Malaysia national port' },
            { name: "Port of Hong Kong", type: 'commercial', lat: 22.31, lon: 114.17, country: 'HK', note: 'Pearl River Delta hub' },
            { name: "Port of Guangzhou (Nansha)", type: 'commercial', lat: 22.73, lon: 113.65, country: 'CN', note: 'South China hub' },
            { name: "Port of Tianjin (Xingang)", type: 'commercial', lat: 39.00, lon: 117.72, country: 'CN', note: 'Beijing\'s gateway port' },

            // --- NAVAL / MILITARY ---
            { name: "Portsmouth Naval Base", type: 'naval', lat: 50.80, lon: -1.11, country: 'GB', note: 'Royal Navy HQ' },
            { name: "Devonport Naval Base", type: 'naval', lat: 50.37, lon: -4.18, country: 'GB', note: 'Royal Navy — nuclear subs' },
            { name: "HMNB Clyde (Faslane)", type: 'naval', lat: 56.07, lon: -4.82, country: 'GB', note: 'UK nuclear deterrent — Trident' },
            { name: "Norfolk Naval Station", type: 'naval', lat: 36.97, lon: -76.33, country: 'US', note: 'Largest naval base in the world' },
            { name: "Bremerton (Puget Sound)", type: 'naval', lat: 47.55, lon: -122.63, country: 'US', note: 'US Pacific Fleet home port' },
            { name: "Pearl Harbor", type: 'naval', lat: 21.36, lon: -157.97, country: 'US', note: 'US Pacific Fleet HQ' },
            { name: "Rota Naval Base", type: 'naval', lat: 36.64, lon: -6.35, country: 'ES', note: 'NATO Southern Europe base' },
            { name: "Souda Bay", type: 'naval', lat: 35.53, lon: 24.15, country: 'GR', note: 'NATO Med deepwater base' },
            { name: "Tartus Naval Base", type: 'naval', lat: 34.90, lon: 35.89, country: 'SY', note: 'Russia\'s only Mediterranean base' },
            { name: "Vladivostok Naval Base", type: 'naval', lat: 43.12, lon: 131.90, country: 'RU', note: 'Russian Pacific Fleet HQ' },
            { name: "Sevastopol", type: 'naval', lat: 44.62, lon: 33.52, country: 'UA', note: 'Russian Black Sea Fleet — contested' },
            { name: "Diego Garcia", type: 'naval', lat: -7.31, lon: 72.43, country: 'GB', note: 'UK/US joint Indian Ocean base' },
            { name: "Changi Naval Base", type: 'naval', lat: 1.39, lon: 103.99, country: 'SG', note: 'Singapore — US carrier access' },
            { name: "Djibouti (Camp Lemonnier)", type: 'naval', lat: 11.55, lon: 43.17, country: 'DJ', note: 'US/French — Horn of Africa' },

            // --- ENERGY (LNG/OIL TERMINALS) ---
            { name: "Ras Tanura Oil Terminal", type: 'energy', lat: 26.65, lon: 50.16, country: 'SA', note: 'World\'s largest oil export terminal' },
            { name: "Kharg Island Terminal", type: 'energy', lat: 29.22, lon: 50.33, country: 'IR', note: 'Iran primary oil export' },
            { name: "Sullom Voe Oil Terminal", type: 'energy', lat: 60.46, lon: -1.30, country: 'GB', note: 'North Sea oil hub (Shetland)' },
            { name: "Milford Haven LNG", type: 'energy', lat: 51.70, lon: -5.03, country: 'GB', note: 'Major UK LNG import terminal' },
            { name: "Sabine Pass LNG", type: 'energy', lat: 29.73, lon: -93.87, country: 'US', note: 'US primary LNG export' },
            { name: "Freeport LNG", type: 'energy', lat: 28.93, lon: -95.35, country: 'US', note: 'Major US LNG export terminal' },
            { name: "Bonny Oil Terminal", type: 'energy', lat: 4.44, lon: 7.15, country: 'NG', note: 'Nigeria main oil export' },
            { name: "Novatek Sabetta LNG", type: 'energy', lat: 71.27, lon: 72.07, country: 'RU', note: 'Arctic LNG — Kara Sea' },
        ];

        const typeColors = {
            commercial: { hex: '#00ffff', css: 'cyan' },
            naval:      { hex: '#ff4444', css: 'red'  },
            energy:     { hex: '#ffaa00', css: 'orange' }
        };

        ports.forEach(p => {
            const col = typeColors[p.type];
            const ent = viewer.entities.add({
                name: p.name,
                show: this.filters[p.type],
                position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0),
                billboard: {
                    image: this._makeIcon(col.hex),
                    width: 18,
                    height: 18,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER
                },
                label: {
                    text: p.name,
                    font: '10px monospace',
                    fillColor: Cesium.Color.fromCssColorString(col.hex),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -22),
                    showBackground: true,
                    backgroundColor: new Cesium.Color(0, 0, 0, 0.65),
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000)
                },
                description: `
                    <div style="font-family:monospace;color:#00ffff;padding:6px">
                        <h3 style="margin:0 0 8px;color:white">${p.name}</h3>
                        <p><b>TYPE:</b> ${p.type.toUpperCase()}</p>
                        <p><b>COUNTRY:</b> ${p.country}</p>
                        <p><b>NOTE:</b> ${p.note}</p>
                        <p><b>COORDS:</b> ${p.lat.toFixed(3)}°, ${p.lon.toFixed(3)}°</p>
                    </div>`
            });
            ent._portType = p.type;
            this._entities.push(ent);
        });

        const counts = { commercial: 0, naval: 0, energy: 0 };
        ports.forEach(p => counts[p.type]++);
        return `ACTIVE (COM:${counts.commercial} NAV:${counts.naval} NRG:${counts.energy})`;
    },

    _makeIcon(hex) {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = hex;
        ctx.beginPath();
        // Diamond shape
        ctx.moveTo(8, 0); ctx.lineTo(16, 8); ctx.lineTo(8, 16); ctx.lineTo(0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        return c.toDataURL();
    },

    destroy(viewer) {
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
    }
};
