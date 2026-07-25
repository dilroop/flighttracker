import { Activity } from 'lucide-react';
import { SearchControls } from './SearchControls';

interface LandingScreenProps {
  radius: number;
  isSearching: boolean;
  error: string | null;
  onRadiusChange: (radius: number) => void;
  onSearch: (address: string) => void;
  onUseLocation: () => void;
}

export function LandingScreen(props: LandingScreenProps) {
  return (
    <main className="landing">
      <div className="landing__content">
        <div className="landing__intro">
          <Activity className="icon-glow" aria-hidden="true" size={58} />
          <h1>AeroTracker</h1>
          <p>Scan the sky around any location and follow active aircraft in real time.</p>
        </div>
        {props.error && <div className="status-message" role="alert">{props.error}</div>}
        <SearchControls
          radius={props.radius}
          flightCount={0}
          isLoading={props.isSearching}
          onRadiusChange={props.onRadiusChange}
          onSearch={props.onSearch}
          onUseLocation={props.onUseLocation}
        />
      </div>
    </main>
  );
}
