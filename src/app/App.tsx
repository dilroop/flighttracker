import { FlightMap } from '../features/flights/components/FlightMap';
import { LandingScreen } from '../features/flights/components/LandingScreen';
import { TrackingSidebar } from '../features/flights/components/TrackingSidebar';
import { useFlightTracker } from '../features/flights/hooks/useFlightTracker';

export default function App() {
  const tracker = useFlightTracker();

  if (!tracker.center) {
    return (
      <LandingScreen
        radius={tracker.radius}
        isSearching={tracker.isSearching}
        error={tracker.error}
        onRadiusChange={tracker.setRadius}
        onSearch={tracker.search}
        onUseLocation={tracker.useCurrentLocation}
      />
    );
  }

  return (
    <main className="tracker-layout">
      <FlightMap
        center={tracker.center}
        radius={tracker.radius}
        flights={tracker.flights}
        paths={tracker.flightPaths}
        routes={tracker.flightRoutes}
        selectedIcao={tracker.selectedFlightIcao}
        onAreaSelect={tracker.selectArea}
        onFlightSelect={tracker.setSelectedFlightIcao}
      />
      <TrackingSidebar
        center={tracker.center}
        radius={tracker.radius}
        flights={tracker.flights}
        routes={tracker.flightRoutes}
        selectedIcao={tracker.selectedFlightIcao}
        isSearching={tracker.isSearching}
        isRateLimited={tracker.isRateLimited}
        error={tracker.error}
        onRadiusChange={tracker.setRadius}
        onSearch={tracker.search}
        onUseLocation={tracker.useCurrentLocation}
        onSelect={tracker.setSelectedFlightIcao}
      />
    </main>
  );
}
