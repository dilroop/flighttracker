import type { Flight, FlightRoute } from '../model/types';

interface FlightCardProps {
  flight: Flight;
  route?: FlightRoute;
  selected: boolean;
  onSelect: () => void;
}

const formatAltitude = (flight: Flight) => {
  if (flight.onGround) return 'On ground';
  return flight.barometricAltitude === null
    ? 'Unavailable'
    : `${Math.round(flight.barometricAltitude).toLocaleString()} m`;
};

const formatSpeed = (velocity: number | null) =>
  velocity === null ? 'Unavailable' : `${Math.round(velocity * 3.6)} km/h`;

export function FlightCard({ flight, route, selected, onSelect }: FlightCardProps) {
  return (
    <button
      type="button"
      className={`flight-card${selected ? ' flight-card--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="flight-card__header">
        <span>
          <strong className="flight-callsign">{flight.callsign}</strong>
          {route?.airline && <small>{route.airline}</small>}
        </span>
        <span className="flight-country">{flight.originCountry}</span>
      </span>

      {route && (
        <span className="flight-route">
          <strong>{route.origin?.iata ?? '—'}</strong>
          <span aria-hidden="true" />
          <strong>{route.destination?.iata ?? '—'}</strong>
        </span>
      )}

      <span className="flight-details">
        <span>
          <small>Altitude</small>
          <strong>{formatAltitude(flight)}</strong>
        </span>
        <span>
          <small>Speed</small>
          <strong>{formatSpeed(flight.velocity)}</strong>
        </span>
      </span>
    </button>
  );
}
