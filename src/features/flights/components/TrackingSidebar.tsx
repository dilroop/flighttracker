import { Activity, AlertTriangle } from 'lucide-react';
import type { Coordinates, Flight, FlightRoutes } from '../model/types';
import { FlightList } from './FlightList';
import { SearchControls } from './SearchControls';

interface TrackingSidebarProps {
  center: Coordinates;
  radius: number;
  flights: Flight[];
  routes: FlightRoutes;
  selectedIcao: string | null;
  isSearching: boolean;
  isRateLimited: boolean;
  error: string | null;
  onRadiusChange: (radius: number) => void;
  onSearch: (address: string) => void;
  onUseLocation: () => void;
  onSelect: (icao: string | null) => void;
}

export function TrackingSidebar(props: TrackingSidebarProps) {
  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="brand">
          <Activity className="icon-glow" aria-hidden="true" size={24} />
          <span>AeroTracker</span>
        </div>
        <p className="monitoring-label">
          Monitoring {props.radius} km around {props.center.lat.toFixed(3)}, {props.center.lon.toFixed(3)}
        </p>
        {props.isRateLimited && (
          <div className="status-message status-message--warning" role="status">
            <AlertTriangle aria-hidden="true" size={16} />
            Live updates are paused briefly due to API limits.
          </div>
        )}
        {props.error && <div className="status-message" role="alert">{props.error}</div>}
        <SearchControls
          variant="inline"
          radius={props.radius}
          flightCount={props.flights.length}
          isLoading={props.isSearching}
          onRadiusChange={props.onRadiusChange}
          onSearch={props.onSearch}
          onUseLocation={props.onUseLocation}
        />
      </header>
      <FlightList
        flights={props.flights}
        routes={props.routes}
        selectedIcao={props.selectedIcao}
        onSelect={props.onSelect}
      />
    </aside>
  );
}
