import { useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { FlightMap } from './components/FlightMap';
import { geocodeAddress, fetchFlightsByLocation, fetchFlightRoute } from './services/api';
import type { FlightData, FlightRoute } from './services/api';
import { fetchFlightTrack } from './services/api';
import type { Coordinates } from './utils/geo';
import { Activity } from 'lucide-react';

const POLLING_INTERVAL = 15000; // 15 seconds is reasonable for adsb.lol
const RATE_LIMIT_COOLDOWN = 60000; // 1 minute cooldown on 429

function App() {
  // Application State
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState<number>(30); // Default 30km
  const [isSearching, setIsSearching] = useState(false);
  const [flights, setFlights] = useState<FlightData[]>([]);
  
  // Ref for holding the polyline history of flights without causing full-app re-renders on every tiny change
  const [flightPaths, setFlightPaths] = useState<Record<string, Coordinates[]>>({});

  // Keeps track of which aircraft we've already fetched historical paths and routes for
  const fetchedTracksRef = useRef<Set<string>>(new Set());
  const fetchedRoutesRef = useRef<Set<string>>(new Set());
   const [flightRoutes, setFlightRoutes] = useState<Record<string, FlightRoute>>({});
  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitTimeoutRef = useRef<number | null>(null);

  // Selected flight ICAO for highlight + focus
  const [selectedFlightIcao, setSelectedFlightIcao] = useState<string | null>(null);
  // Ref map for scrolling sidebar cards into view
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Poll instance ref to cancel interval
  const pollingRef = useRef<number | null>(null);

  const fetchCurrentFlights = useCallback(async () => {
    if (!center || isRateLimited) return;
    
    try {
      const newFlights = await fetchFlightsByLocation(center, radius);
      
      setFlights(newFlights);
      
      // 1. Fetch historical tracks for newly discovered flights
      newFlights.forEach(flight => {
        if (!fetchedTracksRef.current.has(flight.icao24)) {
          fetchedTracksRef.current.add(flight.icao24);
          
          // Asynchronously fetch historical path
          fetchFlightTrack(flight.icao24).then(track => {
             if (track.length > 0) {
                setFlightPaths(prev => {
                  const existing = prev[flight.icao24] || [];
                  // Merge historical track with any real-time points we already collected
                  const merged = [...track];
                  
                  // If we already have some real-time points, append only the new ones
                  if (existing.length > 0) {
                    const lastHistorical = track[track.length - 1];
                    existing.forEach(p => {
                      if (p.lat !== lastHistorical.lat || p.lon !== lastHistorical.lon) {
                        merged.push(p);
                      }
                    });
                  }
                  
                  return {
                    ...prev,
                    [flight.icao24]: merged
                  };
                });
             }
          });
  
          // Fetch route info
          if (!fetchedRoutesRef.current.has(flight.icao24)) {
            fetchedRoutesRef.current.add(flight.icao24);
            fetchFlightRoute(flight.callsign).then(route => {
              setFlightRoutes(prev => ({
                ...prev,
                [flight.icao24]: route || {
                  callsign: flight.callsign,
                  origin: null,
                  destination: null,
                  departureTime: '--:--',
                  arrivalTime: '--:--',
                  scheduledTime: 'Fetching...'
                }
              }));
            }).catch(err => {
              console.error('Route fetch failed:', err);
            });
          }
        }
      });
  
      // 2. Update flight paths with current positions and cleanup
      setFlightPaths(prev => {
        const next = { ...prev };
        const currentIcaos = new Set(newFlights.map(f => f.icao24));
        
        newFlights.forEach(flight => {
          if (flight.latitude && flight.longitude) {
            const currentPos: Coordinates = { lat: flight.latitude, lon: flight.longitude };
            const history = next[flight.icao24] || [];
            
            // Only add to history if the position actually changed significantly
            const lastPos = history[history.length - 1];
            if (!lastPos || lastPos.lat !== currentPos.lat || lastPos.lon !== currentPos.lon) {
               // Keep last 200 points for a longer trail since we now have historical data
               const newHistory = [...history, currentPos].slice(-200);
               next[flight.icao24] = newHistory;
            }
          }
        });
        
        // Cleanup tracks for flights no longer in view
        Object.keys(next).forEach(icao => {
          if (!currentIcaos.has(icao)) {
            delete next[icao];
            fetchedTracksRef.current.delete(icao);
          }
        });
        
        return next;
      });
    } catch (error: any) {
      if (error.message && error.message.includes('429')) {
        setIsRateLimited(true);
        if (rateLimitTimeoutRef.current) window.clearTimeout(rateLimitTimeoutRef.current);
        rateLimitTimeoutRef.current = window.setTimeout(() => {
          setIsRateLimited(false);
        }, RATE_LIMIT_COOLDOWN);
      }
      console.error('Error fetching flight data:', error);
    }
  }, [center, radius, isRateLimited]);

  // Handle Search Execution
  const handleSearch = async (address: string) => {
    setIsSearching(true);
    const coords = await geocodeAddress(address);
    if (coords) {
      setCenter(coords);
      // Reset flight state for new area
      setFlights([]);
      setFlightPaths({});
    } else {
      alert('Address not found. Please try a different search term.');
    }
    setIsSearching(false);
  };

  // Handle Geolocation API fallback
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setFlights([]);
        setFlightPaths({});
        setIsSearching(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to retrieve your location. Please check your browser permissions.');
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMapClick = (coords: Coordinates) => {
    setCenter(coords);
    setFlights([]);
    setFlightPaths({});
    setSelectedFlightIcao(null);
  };

  // Handle flight selection (from map marker or sidebar card)
  const handleFlightSelect = (icao: string | null) => {
    setSelectedFlightIcao(icao);
    // Scroll selected card into view in the sidebar
    if (icao && cardRefs.current[icao]) {
      cardRefs.current[icao]!.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Automated Polling Effect
  useEffect(() => {
    if (center) {
      // Fetch immediately on center/radius change
      fetchCurrentFlights();
      
      // Set up polling
      pollingRef.current = window.setInterval(() => {
        fetchCurrentFlights();
      }, POLLING_INTERVAL);
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, [center, radius, fetchCurrentFlights, isRateLimited]);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
  };

  return (
    <div className="app-container">
      {!center && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px', maxWidth: '500px', padding: '0 20px' }}>
            <Activity className="icon-glow" size={64} style={{ marginBottom: '24px' }} />
            <h1 style={{ fontSize: '36px', marginBottom: '16px' }}>AeroTracker</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
              Enter your address to scan the skies above your neighborhood for active aircraft traffic.
            </p>
          </div>
          <ControlPanel
            onSearch={handleSearch}
            radius={radius}
            onRadiusChange={handleRadiusChange}
            isLoading={isSearching}
            flightCount={0}
            className="center-panel"
            hideTitle={true}
            onUseLocation={handleUseLocation}
          />
        </div>
      )}

      {center && (
        <div className="content-wrapper">
          <div className="map-section">
            <FlightMap
              center={center}
              radius={radius}
              flights={flights}
              flightPaths={flightPaths}
              flightRoutes={flightRoutes}
              onMapClick={handleMapClick}
              selectedFlightIcao={selectedFlightIcao}
              onFlightSelect={handleFlightSelect}
            />
          </div>

          <aside className="sidebar-section">
            <div className="sidebar-header">
              <div className="app-title" style={{ fontSize: '20px', marginBottom: '12px' }}>
                <Activity className="icon-glow" size={24} />
                <span>AeroTracker</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Monitoring {radius}km around: {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isRateLimited && (
                  <div style={{ 
                    padding: '8px 12px', 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '14px' }}>⚠️</span>
                    API Rate limit reached. Retrying soon...
                  </div>
                )}
                <ControlPanel
                  onSearch={handleSearch}
                  radius={radius}
                  onRadiusChange={handleRadiusChange}
                  isLoading={isSearching}
                  flightCount={flights.length}
                  className="inline-panel"
                  hideTitle={true}
                  onUseLocation={handleUseLocation}
                />
              </div>
            </div>

            <div className="flight-list">
              <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Active Flights ({flights.length})
              </h3>
              {flights.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Activity size={32} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>No flights detected in the current area. Try expanding the radius.</p>
                </div>
              ) : (
                flights.map(flight => {
                  const isSelected = selectedFlightIcao === flight.icao24;
                  return (
                  <div
                    key={flight.icao24}
                    ref={el => { cardRefs.current[flight.icao24] = el; }}
                    className={`flight-card${isSelected ? ' flight-card--selected' : ''}`}
                    onClick={() => handleFlightSelect(isSelected ? null : flight.icao24)}
                  >
                    <div className="flight-card-header">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="flight-callsign">{flight.callsign}</span>
                        {flightRoutes[flight.icao24] && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: '600' }}>
                            {flightRoutes[flight.icao24].airline || flightRoutes[flight.icao24].scheduledTime}
                          </span>
                        )}
                      </div>
                      <span className="flight-country">{flight.origin_country}</span>
                    </div>

                    {flightRoutes[flight.icao24] && (
                      <div className="route-container" style={{ margin: '8px 0', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                           <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{flightRoutes[flight.icao24].origin?.iata || '??'}</span>
                           <div style={{ flex: 1, borderBottom: '1px dashed var(--accent-color)', margin: '0 10px', alignSelf: 'center', opacity: 0.5 }}></div>
                           <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{flightRoutes[flight.icao24].destination?.iata || '??'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                           <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{flightRoutes[flight.icao24].departureTime}</span>
                           <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{flightRoutes[flight.icao24].arrivalTime}</span>
                        </div>
                      </div>
                    )}

                    <div className="flight-details">
                      <div className="detail-item">
                        <span className="detail-label">Altitude</span>
                        <span className="detail-value">{flight.baro_altitude ? `${Math.round(flight.baro_altitude)}m` : 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Speed</span>
                        <span className="detail-value">{flight.velocity ? `${Math.round(flight.velocity * 3.6)} km/h` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
