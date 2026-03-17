export interface Coordinates {
  lat: number;
  lon: number;
}

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

// Earth's radius in km
const R = 6371;

/**
 * Calculates a bounding box around a given coordinate with a specific radius (in km).
 */
export function getBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  const latDelta = (radiusKm / R) * (180 / Math.PI);
  const lonDelta = (radiusKm / R) * (180 / Math.PI) / Math.cos(center.lat * Math.PI / 180);

  return {
    lamin: center.lat - latDelta,
    lamax: center.lat + latDelta,
    lomin: center.lon - lonDelta,
    lomax: center.lon + lonDelta,
  };
}

/**
 * Calculate distance between two points in km (Haversine formula)
 */
export function getDistance(coord1: Coordinates, coord2: Coordinates): number {
  const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
  const dLon = (coord2.lon - coord1.lon) * (Math.PI / 180);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * (Math.PI / 180)) * Math.cos(coord2.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
