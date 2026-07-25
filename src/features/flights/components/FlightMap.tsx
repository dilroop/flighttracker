import { Fragment, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import planeIconUrl from '../../../assets/plane.png';
import type { Coordinates, Flight, FlightPaths, FlightRoutes } from '../model/types';

interface FlightMapProps {
  center: Coordinates;
  radius: number;
  flights: Flight[];
  paths: FlightPaths;
  routes: FlightRoutes;
  selectedIcao: string | null;
  onAreaSelect: (coordinates: Coordinates) => void;
  onFlightSelect: (icao: string | null) => void;
}

function MapInteractions({
  center,
  flights,
  selectedIcao,
  onAreaSelect,
}: Pick<FlightMapProps, 'center' | 'flights' | 'selectedIcao' | 'onAreaSelect'>) {
  const map = useMap();
  const previousCenter = useRef(center);
  const previousSelection = useRef<string | null>(null);

  useMapEvents({
    click: ({ latlng }) => onAreaSelect({ lat: latlng.lat, lon: latlng.lng }),
  });

  useEffect(() => {
    if (
      center.lat !== previousCenter.current.lat
      || center.lon !== previousCenter.current.lon
    ) {
      map.flyTo([center.lat, center.lon], map.getZoom(), { duration: 1 });
      previousCenter.current = center;
    }
  }, [center, map]);

  useEffect(() => {
    if (selectedIcao && selectedIcao !== previousSelection.current) {
      const selected = flights.find((flight) => flight.icao24 === selectedIcao);
      if (selected && selected.latitude !== null && selected.longitude !== null) {
        map.flyTo(
          [selected.latitude, selected.longitude],
          Math.max(map.getZoom(), 12),
          { duration: 0.8 },
        );
      }
    }
    previousSelection.current = selectedIcao;
  }, [flights, map, selectedIcao]);

  return null;
}

function FlightMarker({
  flight,
  selected,
  route,
  onSelect,
}: {
  flight: Flight;
  selected: boolean;
  route: FlightRoutes[string] | undefined;
  onSelect: () => void;
}) {
  const icon = useMemo(() => L.divIcon({
    html: `<img class="plane-marker__image" src="${planeIconUrl}" alt="" style="transform: rotate(${flight.heading ?? 0}deg)" />`,
    className: `plane-marker${selected ? ' plane-marker--selected' : ''}`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22],
  }), [flight.heading, selected]);

  if (flight.latitude === null || flight.longitude === null) return null;

  return (
    <Marker
      position={[flight.latitude, flight.longitude]}
      icon={icon}
      eventHandlers={{ click: onSelect }}
    >
      <Popup className="flight-popup">
        <article>
          <h3>{flight.callsign}</h3>
          {route?.airline && <p className="popup-airline">{route.airline}</p>}
          <dl>
            <div><dt>Country</dt><dd>{flight.originCountry}</dd></div>
            <div><dt>Altitude</dt><dd>{flight.onGround ? 'On ground' : flight.barometricAltitude === null ? 'N/A' : `${Math.round(flight.barometricAltitude)} m`}</dd></div>
            <div><dt>Speed</dt><dd>{flight.velocity === null ? 'N/A' : `${Math.round(flight.velocity * 3.6)} km/h`}</dd></div>
            <div><dt>Heading</dt><dd>{flight.heading === null ? 'N/A' : `${Math.round(flight.heading)}°`}</dd></div>
          </dl>
          {route && (
            <p className="popup-route">
              {route.origin?.iata ?? 'Unknown origin'} → {route.destination?.iata ?? 'Unknown destination'}
            </p>
          )}
        </article>
      </Popup>
    </Marker>
  );
}

export function FlightMap(props: FlightMapProps) {
  const homeIcon = useMemo(() => L.divIcon({
    html: '<span class="home-marker__dot"></span>',
    className: 'home-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  }), []);

  return (
    <section className="map" aria-label="Live aircraft map">
      <MapContainer center={[props.center.lat, props.center.lon]} zoom={11} zoomControl>
        <MapInteractions
          center={props.center}
          flights={props.flights}
          selectedIcao={props.selectedIcao}
          onAreaSelect={props.onAreaSelect}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <Circle
          center={[props.center.lat, props.center.lon]}
          radius={props.radius * 1_000}
          pathOptions={{
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '5, 10',
          }}
        />
        <Marker position={[props.center.lat, props.center.lon]} icon={homeIcon}>
          <Popup>Tracking center · {props.radius} km radius</Popup>
        </Marker>
        {props.flights.map((flight) => {
          const selected = props.selectedIcao === flight.icao24;
          const positions = (props.paths[flight.icao24] ?? []).map(
            ({ lat, lon }): [number, number] => [lat, lon],
          );
          return (
            <Fragment key={flight.icao24}>
              {positions.length > 1 && (
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: selected ? '#facc15' : '#38bdf8',
                    weight: selected ? 4 : 2,
                    opacity: selected ? 0.9 : 0.55,
                  }}
                />
              )}
              <FlightMarker
                flight={flight}
                selected={selected}
                route={props.routes[flight.icao24]}
                onSelect={() => props.onFlightSelect(selected ? null : flight.icao24)}
              />
            </Fragment>
          );
        })}
      </MapContainer>
    </section>
  );
}
