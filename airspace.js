/**
 * LAYER: airspace.js
 * Source: Static GeoJSON — UK major airports + approach corridors
 * Rate limit: none — loads once, no external API
 * Strategy: inline GeoJSON data, rendered as polygons + markers
 */

const AirspaceLayer = {
    id: 'airspace',
    label: 'AIRSPACE // UK',
    _entities: [],
    _dataSource: null,

    // Inline data — major UK airports + rough CTR cylinders
    // Real airspace GeoJSON would come from UK CAA or OurAirports
    _airports: [
        { icao: 'EGLL', name: 'Heathrow', lon: -0.4543, lat: 51.4775, radius: 15000, class: 'A' },
        { icao: 'EGKK', name: 'Gatwick',  lon: -0.1903, lat: 51.1481, radius: 12000, class: 'D' },
        { icao: 'EGLC', name: 'London City', lon: 0.0552, lat: 51.5053, radius: 6000,  class: 'D' },
        { icao: 'EGSS', name: 'Stansted', lon: 0.2350,  lat: 51.8850, radius: 12000, class: 'D' },
        { icao: 'EGGW', name: 'Luton',    lon: -0.3683, lat: 51.8747, radius: 10000, class: 'D' },
        { icao: 'EGMC', name: 'Southend', lon: 0.6956,  lat: 51.5713, radius: 8000,  class: 'D' },
    ],

    _classColors: {
        'A': Cesium.Color.fromCssColorString('rgba(255, 50, 50, 0.15)'),
        'D': Cesium.Color.fromCssColorString('rgba(50, 150, 255, 0.12)'),
    },
    _classOutlines: {
        'A': Cesium.Color.fromCssColorString('rgba(255, 80, 80, 0.8)'),
        'D': Cesium.Color.fromCssColorString('rgba(80, 180, 255, 0.7)'),
    },

    init(viewer) {
        this._viewer = viewer;
        return this.refresh(viewer);
    },

    refresh(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;

        this._entities.forEach(e => v.entities.remove(e));
        this._entities = [];

        this._airports.forEach(ap => {
            // CTR cylinder (simplified as ground ellipse)
            const ctr = v.entities.add({
                position: Cesium.Cartesian3.fromDegrees(ap.lon, ap.lat, 10),
                ellipse: {
                    semiMinorAxis: ap.radius,
                    semiMajorAxis: ap.radius,
                    material: this._classColors[ap.class] || Cesium.Color.WHITE.withAlpha(0.1),
                    outline: true,
                    outlineColor: this._classOutlines[ap.class] || Cesium.Color.WHITE,
                    outlineWidth: 2,
                    height: 0,
                    extrudedHeight: ap.class === 'A' ? 7000 : 3000
                }
            });

            // Airport label
            const label = v.entities.add({
                position: Cesium.Cartesian3.fromDegrees(ap.lon, ap.lat, 100),
                point: {
                    pixelSize: 10,
                    color: ap.class === 'A'
                        ? Cesium.Color.fromCssColorString('#ff5050')
                        : Cesium.Color.fromCssColorString('#50aaff'),
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1
                },
                label: {
                    text: `${ap.icao}\nCLS ${ap.class}`,
                    font: '9pt Courier New',
                    fillColor: ap.class === 'A'
                        ? Cesium.Color.fromCssColorString('#ff8080')
                        : Cesium.Color.fromCssColorString('#80ccff'),
                    pixelOffset: new Cesium.Cartesian2(14, 0),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.75)'),
                    backgroundPadding: new Cesium.Cartesian2(4, 3)
                },
                properties: { layer: 'airspace', ...ap }
            });

            this._entities.push(ctr, label);
        });

        console.log(`[airspace] Loaded ${this._airports.length} CTRs`);
        return { count: this._airports.length };
    },

    destroy(viewer) {
        const v = viewer || this._viewer;
        if (!v) return;
        this._entities.forEach(e => v.entities.remove(e));
        this._entities = [];
    }
};
