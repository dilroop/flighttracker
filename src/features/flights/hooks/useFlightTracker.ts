import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchFlightRoute,
  fetchFlights,
  fetchFlightTrack,
  geocodeAddress,
  RateLimitError,
} from '../api/flightApi';
import type { Coordinates, Flight, FlightPaths, FlightRoutes } from '../model/types';

const POLLING_INTERVAL_MS = 30_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const MAX_TRACK_POINTS = 200;

export function useFlightTracker() {
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [radius, setRadius] = useState(30);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [flightPaths, setFlightPaths] = useState<FlightPaths>({});
  const [flightRoutes, setFlightRoutes] = useState<FlightRoutes>({});
  const [selectedFlightIcao, setSelectedFlightIcao] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchedTracks = useRef(new Set<string>());
  const fetchedRoutes = useRef(new Set<string>());
  const requestController = useRef<AbortController | null>(null);
  const rateLimitTimer = useRef<number | null>(null);

  const resetArea = useCallback((coordinates: Coordinates) => {
    requestController.current?.abort();
    fetchedTracks.current.clear();
    fetchedRoutes.current.clear();
    setCenter(coordinates);
    setFlights([]);
    setFlightPaths({});
    setFlightRoutes({});
    setSelectedFlightIcao(null);
    setError(null);
  }, []);

  const loadFlightMetadata = useCallback((flight: Flight, signal: AbortSignal) => {
    if (!fetchedTracks.current.has(flight.icao24)) {
      fetchedTracks.current.add(flight.icao24);
      void fetchFlightTrack(flight.icao24, signal)
        .then((track) => {
          if (track.length === 0) return;
          setFlightPaths((current) => ({
            ...current,
            [flight.icao24]: [...track, ...(current[flight.icao24] ?? [])].slice(-MAX_TRACK_POINTS),
          }));
        })
        .catch((requestError: unknown) => {
          if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
            fetchedTracks.current.delete(flight.icao24);
          }
        });
    }

    if (!fetchedRoutes.current.has(flight.icao24)) {
      fetchedRoutes.current.add(flight.icao24);
      void fetchFlightRoute(flight.callsign, signal)
        .then((route) => setFlightRoutes((current) => ({ ...current, [flight.icao24]: route })))
        .catch((requestError: unknown) => {
          if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
            fetchedRoutes.current.delete(flight.icao24);
          }
        });
    }
  }, []);

  const refreshFlights = useCallback(async () => {
    if (!center || isRateLimited || document.visibilityState === 'hidden') return;

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;

    try {
      const nextFlights = await fetchFlights(center, radius, controller.signal);
      setFlights(nextFlights);
      setError(null);
      nextFlights.forEach((flight) => loadFlightMetadata(flight, controller.signal));

      const visibleIcaos = new Set(nextFlights.map((flight) => flight.icao24));
      setFlightPaths((current) => {
        const next: FlightPaths = {};
        for (const flight of nextFlights) {
          const history = current[flight.icao24] ?? [];
          if (flight.latitude === null || flight.longitude === null) {
            if (history.length) next[flight.icao24] = history;
            continue;
          }
          const latest = history.at(-1);
          const position = { lat: flight.latitude, lon: flight.longitude };
          next[flight.icao24] = latest?.lat === position.lat && latest.lon === position.lon
            ? history
            : [...history, position].slice(-MAX_TRACK_POINTS);
        }
        fetchedTracks.current.forEach((icao) => {
          if (!visibleIcaos.has(icao)) fetchedTracks.current.delete(icao);
        });
        return next;
      });
    } catch (requestError: unknown) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      if (requestError instanceof RateLimitError) {
        setIsRateLimited(true);
        rateLimitTimer.current = window.setTimeout(() => setIsRateLimited(false), RATE_LIMIT_COOLDOWN_MS);
        return;
      }
      setError(requestError instanceof Error ? requestError.message : 'Unable to load flights.');
    }
  }, [center, isRateLimited, loadFlightMetadata, radius]);

  useEffect(() => {
    if (!center) return;
    void refreshFlights();
    const interval = window.setInterval(() => void refreshFlights(), POLLING_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      requestController.current?.abort();
    };
  }, [center, refreshFlights]);

  useEffect(() => () => {
    if (rateLimitTimer.current !== null) window.clearTimeout(rateLimitTimer.current);
  }, []);

  const search = useCallback(async (address: string) => {
    setIsSearching(true);
    setError(null);
    try {
      const coordinates = await geocodeAddress(address);
      if (coordinates) resetArea(coordinates);
      else setError('Location not found. Try a city, suburb, or more specific address.');
    } catch (searchError: unknown) {
      setError(searchError instanceof Error ? searchError.message : 'Location search failed.');
    } finally {
      setIsSearching(false);
    }
  }, [resetArea]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Location services are not supported by this browser.');
      return;
    }
    setIsSearching(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        resetArea({ lat: coords.latitude, lon: coords.longitude });
        setIsSearching(false);
      },
      () => {
        setError('Unable to access your location. Check browser permissions and try again.');
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [resetArea]);

  return {
    center,
    radius,
    setRadius,
    flights,
    flightPaths,
    flightRoutes,
    selectedFlightIcao,
    setSelectedFlightIcao,
    isSearching,
    isRateLimited,
    error,
    search,
    useCurrentLocation,
    selectArea: resetArea,
  };
}
