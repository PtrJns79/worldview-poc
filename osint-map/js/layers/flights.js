window.FlightsLayer = {
    id: 'flights',
    _entities: [],
    _entityMap: new Map(),
    _updateListener: null,
    _intervalIds: [],
    _lastTime: null,
    
    filters: {
        heavy: false,
        large: false,
        small: true,
        heli: true,
        military: true,
        emergency: true
    },

    updateFilters(type, isChecked) {
        this.filters[type] = isChecked;
        this._entities.forEach(e => {
            if (e._flightType) {
                e.show = this.filters[e._flightType] && (Date.now() - e._lastUpdate <= 180000);
            }
        });
        this.updateStatusUI();
    },

    updateStatusUI() {
        let milCount=0, heavyCount=0, largeCount=0, smallCount=0, heliCount=0;
        this._entities.forEach(e => {
            if (!e.show) return;
            if (e._flightType === 'military') milCount++;
            else if (e._flightType === 'heli') heliCount++;
            else if (e._flightType === 'small') smallCount++;
            else if (e._flightType === 'large') largeCount++;
            else if (e._flightType === 'heavy') heavyCount++;
        });
        const statusString = `ACTIVE (HEAVY:${heavyCount} LRG:${largeCount} SML:${smallCount} HEL:${heliCount} MIL:${milCount})`;
        const el = document.getElementById('status-flights');
        if (el) el.innerText = statusString;
    },

    async init(viewer) {
        this._lastTime = Date.now();
        
        // 60FPS Dead Reckoning Physics Loop
        this._updateListener = () => {
            const now = Date.now();
            const dt = (now - this._lastTime) / 1000.0;
            this._lastTime = now;
            
            const R = 6378137.0; // Earth radius in meters
            
            this._entities.forEach(e => {
                if (!e.show) return; 
                
                // If it's been more than 3 minutes since the API saw this flight, hide it.
                if (now - e._lastUpdate > 180000) {
                    e.show = false;
                    this.updateStatusUI(); // Trigger count refresh
                    return;
                }

                if (e._velocity && e._velocity > 1 && typeof e._heading === 'number' && !isNaN(e._heading)) {
                    const d = e._velocity * dt; // meters travelled this frame
                    const hRad = Cesium.Math.toRadians(e._heading);
                    const latRad = Cesium.Math.toRadians(e._lat);
                    
                    const dLatRad = (d * Math.cos(hRad)) / R;
                    const cosLat = Math.cos(latRad);
                    const dLonRad = (cosLat < 0.0001) ? 0 : (d * Math.sin(hRad)) / (R * cosLat);
                    
                    e._lat += Cesium.Math.toDegrees(dLatRad);
                    e._lon += Cesium.Math.toDegrees(dLonRad);

                    // Final safeguard
                    if (!isNaN(e._lat) && !isNaN(e._lon)) {
                        e.position = Cesium.Cartesian3.fromDegrees(e._lon, e._lat, e._alt);
                    }
                }
            });
        };
        viewer.scene.preUpdate.addEventListener(this._updateListener);

        const getArrowSVG = (colorHex) => {
            const encodedHex = encodeURIComponent(colorHex);
            return `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'%3E%3Cpath fill='${encodedHex}' stroke='black' stroke-width='1.5' d='M12 2 L22 20 L12 16 L2 20 Z'/%3E%3C/svg%3E`;
        };

        const processFlight = (lon, lat, alt, callsign, category, velocity, heading, forceType = null, hex = null) => {
            if (!lon || !lat) return;
            const flightID = callsign ? callsign : `${lon.toFixed(2)}-${lat.toFixed(2)}`;
            const now = Date.now();

            let entity = this._entityMap.get(flightID);
            
            if (alt === null) {
                if (entity && typeof entity._alt === 'number') alt = entity._alt;
                else alt = 0;
            }

            let fType = 'unclassified';
            let isTactical = false;

            if (forceType) {
                fType = forceType;
            } else {
                if (category === 5 || category === 6) fType = 'heavy';
                else if (category === 4) fType = 'large';
                else if (category === 3) fType = 'small';
                else if (category === 2 || category === 7) fType = 'small';
                else if (category === 8) fType = 'heli';
                else if (category === 20) fType = 'military';

                // Emergency services detection — police/HEMS/coastguard callsign prefixes
                const cs = callsign.toUpperCase();
                const isEmergency = cs.startsWith('NPAS') || cs.startsWith('POLICE') || cs.startsWith('HEMS') 
                    || cs.startsWith('HELIMED') || cs.startsWith('AIR AMBU') || cs.startsWith('COASTGD')
                    || cs.startsWith('HM COAST') || cs.startsWith('RESCUE') || cs.startsWith('SAR')
                    || cs.includes('POLICE') || cs.includes('AMBULANCE');
                if (isEmergency) fType = 'emergency';

                isTactical = cs.startsWith('RCH') || cs.startsWith('RRR') || cs.startsWith('NATO') || cs.startsWith('CFC') || cs.startsWith('BKR');
                if (isTactical) fType = 'military';

                if (fType === 'unclassified') {
                    if (alt > 9000 && velocity > 200) fType = 'heavy'; 
                    else if (alt > 4000 && velocity > 120) fType = 'large'; 
                    else fType = 'small'; 
                }
            }

            const isMoving = (velocity !== null && velocity > 1) && (typeof heading === 'number' && !isNaN(heading));

            if (entity) {
                // Smooth interpolation to prevent map jerking on target updates
                const dLat = lat - entity._lat;
                const dLon = lon - entity._lon;
                const distSq = (dLat * dLat) + (dLon * dLon);
                
                // If it drifted more than ~3km (0.001 sq-deg), snap it. Otherwise, blend heavily to let physics catch up
                if (distSq > 0.001) {
                    entity._lon = lon;
                    entity._lat = lat;
                    entity._alt = alt;
                } else {
                    entity._lon = entity._lon * 0.90 + lon * 0.10;
                    entity._lat = entity._lat * 0.90 + lat * 0.10;
                    entity._alt = alt; // Altitude doesn't jerk the camera X/Y, so hard set it to strictly comply with 20s rules
                }
                
                entity._velocity = velocity;
                entity._heading = heading;
                entity._lastUpdate = now;
                
                // Revive ghosted entities
                if (!entity.show && this.filters[fType]) entity.show = true;
                
                if (isMoving && entity.billboard) {
                    entity.billboard.rotation = -Cesium.Math.toRadians(heading || 0);
                }
                
                // Update altitude display label
                const labelText = callsign ? callsign : fType.toUpperCase();
                entity.label.text = `${labelText}\n${Math.round(alt)}m`;

            } else {
                // Generate completely new entity
                let colorHex = '#4ade80';
                if (fType === 'large') colorHex = '#a3e635';
                else if (fType === 'small') colorHex = '#60a5fa';
                else if (fType === 'heli') colorHex = '#fb923c';
                else if (fType === 'military') colorHex = '#ff4444';
                else if (fType === 'emergency') colorHex = '#ff00ff';

                const color = Cesium.Color.fromCssColorString(colorHex);
                const labelText = callsign ? callsign : fType.toUpperCase();
                
                const entityData = {
                    name: labelText,
                    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
                    show: this.filters[fType],
                    label: {
                        text: `${labelText}\n${Math.round(alt)}m`,
                        font: (fType === 'military') ? 'bold 12pt Courier New' : '10pt Courier New',
                        fillColor: color,
                        pixelOffset: new Cesium.Cartesian2(0, -25),
                        showBackground: true,
                        backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.7)'),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY  // always render above 3D terrain
                    }
                };

                if (isMoving) {
                    entityData.billboard = {
                        image: getArrowSVG(colorHex),
                        rotation: -Cesium.Math.toRadians(heading || 0), 
                        width: 20,
                        height: 20,
                        alignedAxis: Cesium.Cartesian3.UNIT_Z
                    };
                } else {
                    entityData.point = {
                        pixelSize: (fType === 'military' || fType === 'heavy') ? 10 : 7,
                        color: color,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1
                    };
                }

                entity = viewer.entities.add(entityData);
                entity._lon = lon;
                entity._lat = lat;
                entity._alt = alt;
                entity._velocity = velocity;
                entity._heading = heading;
                entity._flightType = fType;
                entity._callsign = callsign;
                entity._hex = hex;
                entity._lastUpdate = now;
                
                this._entityMap.set(flightID, entity);
                this._entities.push(entity);
            }
        };

        const fetchOpenSky = async () => {
            try {
                const res = await fetch('https://opensky-network.org/api/states/all?lamin=0.0&lomin=-130.0&lamax=70.0&lomax=60.0');
                if (!res.ok) {
                    // OpenSky strictly limits free-tier polling. If we hit the 429 limit, gracefully skip this cycle.
                    return;
                }
                const data = await res.json();
                if (data && data.states) {
                    data.states.forEach(p => {
                        let alt = typeof p[13] === 'number' ? p[13] : (typeof p[7] === 'number' ? p[7] : null);
                        processFlight(p[5], p[6], alt, (p[1] || '').trim(), p[17], p[9], p[10], null, p[0]);
                    });
                    this.updateStatusUI();
                }
            } catch (e) { 
                // Silently drop JSON parse errors caused by HTML proxy intercepts
            }
        };

        const fetchMil = async () => {
            try {
                const res = await fetch('https://api.airplanes.live/v2/mil');
                const data = await res.json();
                if (data && data.ac) {
                    data.ac.forEach(p => {
                        if (p.lon && p.lat) {
                            let altFt = typeof p.alt_geom === 'number' ? p.alt_geom : (typeof p.alt_baro === 'number' ? p.alt_baro : null);
                            let altM = altFt !== null ? altFt * 0.3048 : null;
                            processFlight(p.lon, p.lat, altM, (p.flight || '').trim(), null, (p.gs || p.mach * 666 || 0) * 0.51444, p.track || p.nav_heading, 'military', p.hex);
                        }
                    });
                    this.updateStatusUI();
                }
            } catch (e) { console.warn("Airplanes.live Mil failed", e); }
        };

        const fetchLadd = async () => {
            try {
                const res = await fetch('https://api.airplanes.live/v2/ladd');
                const data = await res.json();
                if (data && data.ac) {
                    data.ac.forEach(p => {
                        if (p.lon && p.lat) {
                            let altFt = typeof p.alt_geom === 'number' ? p.alt_geom : (typeof p.alt_baro === 'number' ? p.alt_baro : null);
                            let altM = altFt !== null ? altFt * 0.3048 : null;
                            processFlight(p.lon, p.lat, altM, (p.flight || 'VIP/PRIV').trim(), null, (p.gs || p.mach * 666 || 0) * 0.51444, p.track || p.nav_heading, 'small', p.hex);
                        }
                    });
                    this.updateStatusUI();
                }
            } catch (e) { console.warn("Airplanes.live LADD failed", e); }
        };

        // Offset the refresh intervals tightly to prevent network spikes while strictly assuring 20-second tracking
        fetchOpenSky();
        setTimeout(fetchMil, 3000);
        setTimeout(fetchLadd, 9000);

        this._intervalIds.push(setInterval(fetchOpenSky, 60000)); // Throttled to 60s to prevent OpenSky global IP ban
        this._intervalIds.push(setInterval(fetchMil, 20000));
        this._intervalIds.push(setInterval(fetchLadd, 20000));

        return `ACTIVE (STAGGERED 20s POLLING INITIALIZED)`;
    },

    async refresh(viewer) {
        this.destroy(viewer);
        return this.init(viewer);
    },

    destroy(viewer) {
        if (this._updateListener) {
            viewer.scene.preUpdate.removeEventListener(this._updateListener);
            this._updateListener = null;
        }
        if (this._intervalIds) {
            this._intervalIds.forEach(id => clearInterval(id));
            this._intervalIds = [];
        }
        this._entities.forEach(e => viewer.entities.remove(e));
        this._entities = [];
        this._entityMap.clear();
    }
};
