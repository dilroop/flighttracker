export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Flight {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  barometricAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
}

export interface Airport {
  name: string;
  iata: string;
}

export interface FlightRoute {
  callsign: string;
  origin: Airport | null;
  destination: Airport | null;
  departureTime: string | null;
  arrivalTime: string | null;
  status: string | null;
  airline?: string;
}

export type FlightPaths = Record<string, Coordinates[]>;
export type FlightRoutes = Record<string, FlightRoute>;
