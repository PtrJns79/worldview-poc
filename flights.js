/**
 * LAYER: flights.js
 * Source: OpenSky Network (anonymous)
 * Rate limit: 400 credits/day, 10s resolution
 * Strategy: single fetch on init, manual refresh only — no polling
 */

const FlightsLayer = {
    id: 'flights',
    label: 'FLIGHTS // OPENSKY',
    _entities: [],

    init(viewer) {
        this._viewer = viewer;
        return this.refresh(viewer);
    },

    async refresh(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;

        // Clear previous entities
        this._entities.forEach(e => v.entities.remove(e));
        this._entities = [];

        // Slightly wider bbox to guarantee hits at quiet times
        const url = 'https://opensky-network.org/api/states/all?lamin=51.2&lomin=-0.8&lamax=51.9&lomax=0.6';

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (!data.states || data.states.length === 0) {
                console.warn('[flights] No states returned');
                return { count: 0 };
            }

            data.states.forEach(p => {
                const lon = p[5], lat = p[6], alt = p[7] || 1000;
                const callsign = (p[1] || 'UNKNWN').trim();
                const speed = p[9] ? Math.round(p[9] * 1.94384) : '?'; // m/s to knots
                const heading = p[10] ? Math.round(p[10]) : '?';

                if (!lon || !lat) return;

                const entity = v.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                    point: {
                        pixelSize: 8,
                        color: Cesium.Color.LIME,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1
                    },
                    label: {
                        text: `${callsign}\n${Math.round(alt)}m  ${speed}kt`,
                        font: '9pt Courier New',
                        fillColor: Cesium.Color.LIME,
                        pixelOffset: new Cesium.Cartesian2(0, -28),
                        showBackground: true,
                        backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.75)'),
                        backgroundPadding: new Cesium.Cartesian2(4, 3)
                    },
                    properties: { callsign, alt, speed, heading, layer: 'flights' }
                });

                this._entities.push(entity);
            });

            console.log(`[flights] Loaded ${this._entities.length} aircraft`);
            return { count: this._entities.length };

        } catch (e) {
            console.error('[flights] Fetch failed:', e);
            return { count: 0, error: e.message };
        }
    },

    destroy(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;
        this._entities.forEach(e => v.entities.remove(e));
        this._entities = [];
    }
};
