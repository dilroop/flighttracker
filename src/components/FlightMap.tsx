import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '../utils/geo';
import type { FlightData, FlightRoute } from '../services/api';

import planeIconUrl from '../assets/plane.png';

// Create a custom plane icon using the imported image
const createPlaneIcon = (rotation: number = 0, selected: boolean = false) => {
  const filterStyle = selected
    ? `drop-shadow(0 0 14px #facc15) drop-shadow(0 0 6px #fbbf24) brightness(1.3)`
    : `drop-shadow(0 0 10px var(--accent-glow))`;
  const scaleStyle = selected ? 'scale(1.25)' : 'scale(1)';
  return L.divIcon({
    html: `
      <div style="transform: rotate(${rotation}deg) ${scaleStyle}; transform-origin: center; transition: transform 0.4s ease-out;" class="plane-marker${selected ? ' plane-marker--selected' : ''}">
        <img src="${planeIconUrl}" style="width: 80px; height: 80px; filter: ${filterStyle}; transition: filter 0.3s;" alt="plane" />
      </div>
    `,
    className: 'custom-plane-icon',
    iconSize: [80, 80],
    iconAnchor: [40, 40],
    popupAnchor: [0, -40],
  });
};

interface FlightMapProps {
  center: Coordinates;
  radius: number; // in km
  flights: FlightData[];
  flightPaths: Record<string, Coordinates[]>;
  flightRoutes: Record<string, FlightRoute>;
  onMapClick: (coords: Coordinates) => void;
  selectedFlightIcao: string | null;
  onFlightSelect: (icao: string | null) => void;
}

// Helper component to smoothly animate the map center
const MapUpdater: React.FC<{ center: Coordinates }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lon], map.getZoom(), {
      animate: true,
      duration: 1.5
    });
  }, [center, map]);
  return null;
};

// Pan map to newly selected flight (when selected from sidebar)
const MapFocusFlight: React.FC<{
  flights: FlightData[];
  selectedIcao: string | null;
}> = ({ flights, selectedIcao }) => {
  const map = useMap();
  const prevIcao = useRef<string | null>(null);

  useEffect(() => {
    if (selectedIcao && selectedIcao !== prevIcao.current) {
      const flight = flights.find(f => f.icao24 === selectedIcao);
      if (flight?.latitude && flight?.longitude) {
        map.flyTo([flight.latitude, flight.longitude], Math.max(map.getZoom(), 12), {
          animate: true,
          duration: 1.2
        });
      }
    }
    prevIcao.current = selectedIcao;
  }, [selectedIcao, flights, map]);

  return null;
};

// Map click handler component
const MapClickHandler: React.FC<{ onClick: (coords: Coordinates) => void }> = ({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
};

export const FlightMap: React.FC<FlightMapProps> = ({ center, radius, flights, flightPaths, flightRoutes, onMapClick, selectedFlightIcao, onFlightSelect }) => {
  // Radius in meters for the Leaflet Circle
  const radiusMeters = radius * 1000;

  return (
    <div className="map-container">
      <MapContainer 
        center={[center.lat, center.lon]} 
        zoom={11} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapUpdater center={center} />
        <MapFocusFlight flights={flights} selectedIcao={selectedFlightIcao} />
        <MapClickHandler onClick={onMapClick} />
        
        {/* Dark mode carto map tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Tracking Radius Circle */}
        <Circle
          center={[center.lat, center.lon]}
          radius={radiusMeters}
          pathOptions={{ 
            color: 'var(--accent-color)', 
            fillColor: 'var(--accent-color)', 
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 10'
          }}
        />

        {/* Home Marker */}
        <Marker 
          position={[center.lat, center.lon]}
          icon={L.divIcon({
            html: `<div style="width: 16px; height: 16px; background: var(--accent-color); border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 15px var(--accent-color);"></div>`,
            className: 'home-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })}
        >
          <Popup className="flight-popup">
            <h3>Tracking Center</h3>
            <p>Scanning radius: {radius} km</p>
          </Popup>
        </Marker>

        {/* Flights and their trails */}
        {flights.map(flight => {
          if (!flight.latitude || !flight.longitude) return null;
          
          const isSelected = selectedFlightIcao === flight.icao24;
          const path = flightPaths[flight.icao24] || [];
          const positions: [number, number][] = path.map(p => [p.lat, p.lon]);
          
          return (
            <React.Fragment key={flight.icao24}>
              {/* Flight Trail */}
              {positions.length > 1 && (
                <Polyline 
                  positions={positions} 
                  pathOptions={{ 
                    color: isSelected ? '#facc15' : 'var(--accent-color)', 
                    weight: isSelected ? 5 : 3, 
                    opacity: isSelected ? 0.9 : 0.6,
                    lineJoin: 'round',
                    lineCap: 'round'
                  }} 
                />
              )}
              
              {/* Airplane Marker */}
              <Marker
                position={[flight.latitude, flight.longitude]}
                icon={createPlaneIcon(flight.true_track || 0, isSelected)}
                eventHandlers={{
                  click: () => onFlightSelect(isSelected ? null : flight.icao24),
                }}
              >
                <Popup className="flight-popup">
                  <h3>
                    ✈️ {flight.callsign} 
                  </h3>
                  {flightRoutes[flight.icao24]?.airline && (
                    <div style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                      {flightRoutes[flight.icao24].airline}
                    </div>
                  )}
                  <p><strong>Country:</strong> {flight.origin_country}</p>
                  <p><strong>Altitude:</strong> {flight.baro_altitude ? `${Math.round(flight.baro_altitude)}m` : 'N/A'}</p>
                  <p><strong>Speed:</strong> {flight.velocity ? `${Math.round(flight.velocity * 3.6)} km/h` : 'N/A'}</p>
                  <p><strong>Heading:</strong> {Math.round(flight.true_track || 0)}°</p>

                  {flightRoutes[flight.icao24] && (
                    <div className="route-container">
                      <div className="route-step">
                        <div className="route-dot origin"></div>
                        <div className="route-info">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span className="route-label">DEPARTURE</span>
                            <span className="route-time">{flightRoutes[flight.icao24].departureTime}</span>
                          </div>
                          <span className="route-value">{flightRoutes[flight.icao24].origin?.name || 'Unknown'} ({flightRoutes[flight.icao24].origin?.iata || 'N/A'})</span>
                        </div>
                      </div>
                      <div className="route-step">
                        <div className="route-dot destination"></div>
                        <div className="route-info">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                             <span className="route-label">DESTINATION</span>
                             <span className="route-time">{flightRoutes[flight.icao24].arrivalTime}</span>
                          </div>
                          <span className="route-value">{flightRoutes[flight.icao24].destination?.name || 'Unknown'} ({flightRoutes[flight.icao24].destination?.iata || 'N/A'})</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center', color: 'var(--accent-color)', fontWeight: '600', letterSpacing: '0.5px' }}>
                        STATUS: {flightRoutes[flight.icao24].scheduledTime}
                      </div>
                    </div>
                  )}
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};
