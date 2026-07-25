import type { Coordinates, Flight, FlightRoute } from '../model/types';

const AIRLINE_NAMES: Record<string, string> = {
  ANZ: 'Air New Zealand',
  AWK: 'Airwork (NZ)',
  CVA: 'Air Chathams',
  GBA: 'Barrier Air',
  GBY: 'Golden Bay Air',
  OGN: 'Originair',
  APK: 'Parcelair',
  SDA: 'Sounds Air',
  RKU: 'Stewart Island Flights',
  SAV: 'Sunair',
  TNZ: 'Texel Air',
  QFA: 'Qantas',
  VOZ: 'Virgin Australia',
  JST: 'Jetstar Airways',
  UAE: 'Emirates',
  SIA: 'Singapore Airlines',
  UAL: 'United Airlines',
  BAW: 'British Airways',
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getErrorMessage = (service: string, status: number) =>
  `${service} request failed (${status}).`;

export class RateLimitError extends Error {
  constructor() {
    super('The live flight service is temporarily rate limited.');
    this.name = 'RateLimitError';
  }
}

export async function geocodeAddress(
  address: string,
  signal?: AbortSignal,
): Promise<Coordinates | null> {
  const query = new URLSearchParams({ q: address, format: 'json', limit: '1' });
  const response = await fetch(`/geocode-api/search?${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(getErrorMessage('Location search', response.status));
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !isRecord(data[0])) return null;

  const lat = toFiniteNumber(data[0].lat);
  const lon = toFiniteNumber(data[0].lon);
  return lat === null || lon === null ? null : { lat, lon };
}

export async function fetchFlights(
  center: Coordinates,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<Flight[]> {
  const nauticalMiles = Math.max(1, Math.round(radiusKm * 0.539957));
  const response = await fetch(
    `/adsb-api/v2/lat/${center.lat}/lon/${center.lon}/dist/${nauticalMiles}`,
    { headers: { Accept: 'application/json' }, signal },
  );

  if (response.status === 429) throw new RateLimitError();
  if (!response.ok) throw new Error(getErrorMessage('Live flight', response.status));

  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.ac)) return [];

  return data.ac.flatMap((aircraft): Flight[] => {
    if (!isRecord(aircraft) || typeof aircraft.hex !== 'string') return [];

    const altitude = aircraft.alt_baro === 'ground'
      ? 0
      : toFiniteNumber(aircraft.alt_baro);
    const speedKnots = toFiniteNumber(aircraft.gs);

    return [{
      icao24: aircraft.hex,
      callsign: typeof aircraft.flight === 'string'
        ? aircraft.flight.trim() || 'UNKNOWN'
        : 'UNKNOWN',
      originCountry: typeof aircraft.country === 'string' ? aircraft.country : 'Unknown',
      longitude: toFiniteNumber(aircraft.lon),
      latitude: toFiniteNumber(aircraft.lat),
      barometricAltitude: altitude,
      onGround: aircraft.alt_baro === 'ground',
      velocity: speedKnots === null ? null : speedKnots * 0.514444,
      heading: toFiniteNumber(aircraft.track),
    }];
  });
}

export async function fetchFlightTrack(
  icao24: string,
  signal?: AbortSignal,
): Promise<Coordinates[]> {
  const query = new URLSearchParams({ icao24, time: '0' });
  const response = await fetch(`/opensky-api/api/tracks/all?${query}`, { signal });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(getErrorMessage('Flight track', response.status));

  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.path)) return [];

  return data.path.flatMap((point): Coordinates[] => {
    if (!Array.isArray(point)) return [];
    const lat = toFiniteNumber(point[1]);
    const lon = toFiniteNumber(point[2]);
    return lat === null || lon === null ? [] : [{ lat, lon }];
  });
}

export async function fetchFlightRoute(
  callsign: string,
  signal?: AbortSignal,
): Promise<FlightRoute> {
  const normalizedCallsign = callsign.trim();

  if (normalizedCallsign && normalizedCallsign !== 'UNKNOWN') {
    const response = await fetch(
      `/route-api/v0/callsign/${encodeURIComponent(normalizedCallsign)}`,
      { signal },
    );

    if (response.ok) {
      const data: unknown = await response.json();
      if (isRecord(data)) {
        const responseData = data.response;
        if (!isRecord(responseData) || !isRecord(responseData.flightroute)) {
          return createFallbackRoute(normalizedCallsign);
        }
        const route = responseData.flightroute;
        const origin = isRecord(route.origin) ? route.origin : null;
        const destination = isRecord(route.destination) ? route.destination : null;
        const airline = isRecord(route.airline) && typeof route.airline.name === 'string'
          ? route.airline.name
          : undefined;

        return {
          callsign: normalizedCallsign,
          airline,
          origin: origin && typeof origin.name === 'string'
            ? { name: origin.name, iata: String(origin.iata_code ?? 'N/A') }
            : null,
          destination: destination && typeof destination.name === 'string'
            ? { name: destination.name, iata: String(destination.iata_code ?? 'N/A') }
            : null,
          departureTime: null,
          arrivalTime: null,
          status: null,
        };
      }
    }
  }

  return createFallbackRoute(normalizedCallsign);
}

function createFallbackRoute(callsign: string): FlightRoute {
  const normalizedCallsign = callsign.trim();
  const airline = AIRLINE_NAMES[normalizedCallsign.slice(0, 3).toUpperCase()];
  return {
    callsign: normalizedCallsign || 'UNKNOWN',
    airline,
    origin: null,
    destination: null,
    departureTime: null,
    arrivalTime: null,
    status: airline ? `Operated by ${airline}` : 'Route unavailable',
  };
}
