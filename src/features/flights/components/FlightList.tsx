import { Activity } from 'lucide-react';
import type { Flight, FlightRoutes } from '../model/types';
import { FlightCard } from './FlightCard';

interface FlightListProps {
  flights: Flight[];
  routes: FlightRoutes;
  selectedIcao: string | null;
  onSelect: (icao: string | null) => void;
}

export function FlightList({ flights, routes, selectedIcao, onSelect }: FlightListProps) {
  return (
    <section className="flight-list" aria-labelledby="active-flights-heading">
      <h2 id="active-flights-heading">Active flights <span>{flights.length}</span></h2>
      {flights.length === 0 ? (
        <div className="empty-state">
          <Activity aria-hidden="true" size={30} />
          <p>No flights detected. Try expanding the radius.</p>
        </div>
      ) : (
        <div className="flight-list__items">
          {flights.map((flight) => (
            <FlightCard
              key={flight.icao24}
              flight={flight}
              route={routes[flight.icao24]}
              selected={selectedIcao === flight.icao24}
              onSelect={() => onSelect(selectedIcao === flight.icao24 ? null : flight.icao24)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
