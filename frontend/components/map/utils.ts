// ============================================================
// Utility functions for the Threat Map
// ============================================================

import type { EnergySector } from './types';
import { SECTOR_COLORS } from './types';

/**
 * Convert a CAPRI 1-5 risk score to a CSS color.
 * 1 = Severe (red), 5 = Normal (green).
 */
export function riskScoreToColor(score: number): string {
  if (score <= 1.5) return '#ef4444'; // red — severe
  if (score <= 2.5) return '#f97316'; // orange — high
  if (score <= 3.5) return '#eab308'; // yellow — elevated
  if (score <= 4.5) return '#3b82f6'; // blue — guarded
  return '#22c55e';                    // green — low
}

/**
 * Convert a CAPRI 1-5 risk score to a human label.
 */
export function riskScoreToLabel(score: number): string {
  if (score <= 1.5) return 'Severe';
  if (score <= 2.5) return 'High';
  if (score <= 3.5) return 'Elevated';
  if (score <= 4.5) return 'Guarded';
  return 'Low';
}

/**
 * Generate a GeoJSON great-circle arc between two [lng, lat] points.
 * Returns an array of [lng, lat] coordinate pairs suitable for a
 * GeoJSON LineString geometry. Uses spherical interpolation for
 * proper curvature on the globe projection.
 */
export function greatCircleArc(
  from: [number, number],
  to: [number, number],
  numPoints: number = 64,
): [number, number][] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const lat1 = from[1] * toRad;
  const lng1 = from[0] * toRad;
  const lat2 = to[1] * toRad;
  const lng2 = to[0] * toRad;

  // Central angle via Vincenty formula (more numerically stable than haversine)
  const dLng = lng2 - lng1;
  const cosLat2 = Math.cos(lat2);
  const sinLat2 = Math.sin(lat2);
  const cosLat1 = Math.cos(lat1);
  const sinLat1 = Math.sin(lat1);

  const a = cosLat2 * Math.sin(dLng);
  const b = cosLat1 * sinLat2 - sinLat1 * cosLat2 * Math.cos(dLng);
  const centralAngle = Math.atan2(
    Math.sqrt(a * a + b * b),
    sinLat1 * sinLat2 + cosLat1 * cosLat2 * Math.cos(dLng),
  );

  if (centralAngle < 1e-10) {
    return [from, to];
  }

  const sinCentral = Math.sin(centralAngle);
  const coords: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * centralAngle) / sinCentral;
    const B = Math.sin(f * centralAngle) / sinCentral;

    const x = A * cosLat1 * Math.cos(lng1) + B * cosLat2 * Math.cos(lng2);
    const y = A * cosLat1 * Math.sin(lng1) + B * cosLat2 * Math.sin(lng2);
    const z = A * sinLat1 + B * sinLat2;

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);

    coords.push([lng * toDeg, lat * toDeg]);
  }

  return coords;
}

/**
 * Build a MapLibre color match expression for the 'sector' property.
 * Returns ['match', ['get', 'sector'], 'solar', '#FFD700', ... , fallback]
 */
export function sectorColorExpression(): unknown[] {
  const expr: unknown[] = ['match', ['get', 'sector']];
  for (const [sector, color] of Object.entries(SECTOR_COLORS)) {
    expr.push(sector, color);
  }
  expr.push('#C0C0C0'); // fallback for unknown sectors
  return expr;
}

/**
 * Format a numeric capacity value for display.
 * e.g. 1500 => "1.5 GW", 250 => "250 MW"
 */
export function formatCapacity(capacityMW: number): string {
  if (capacityMW >= 1000) {
    return `${(capacityMW / 1000).toFixed(1)} GW`;
  }
  return `${Math.round(capacityMW)} MW`;
}

/**
 * Build a GeoJSON FeatureCollection from the existing worldData threat actors.
 * Converts the internal ThreatActor model to a GeoJSON representation for MapLibre.
 */
export function threatActorsToGeoJSON(actors: Array<{
  name: string;
  origin: { lat: number; lng: number; name?: string };
  country: string;
  type: string;
  color: string;
  targetSectors: string[];
  description: string;
  aliases?: string[];
}>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: actors.map((actor) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [actor.origin.lng, actor.origin.lat],
      },
      properties: {
        name: actor.name,
        aliases: actor.aliases?.join(', ') ?? '',
        country: actor.country,
        type: actor.type,
        color: actor.color,
        targetSectors: actor.targetSectors.join(', '),
        description: actor.description,
        originName: actor.origin.name ?? '',
      },
    })),
  };
}

/**
 * Build a GeoJSON FeatureCollection of attack arcs from threat actors
 * to a set of target coordinates. Each actor is connected to each
 * facility whose sector is in the actor's targetSectors.
 */
export function buildAttackArcsGeoJSON(
  actors: Array<{
    name: string;
    origin: { lat: number; lng: number };
    color: string;
    targetSectors: string[];
  }>,
  facilities: Array<{
    lat: number;
    lng: number;
    name: string;
    sector: string;
  }>,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const actor of actors) {
    const targets = facilities.filter((f) =>
      actor.targetSectors.includes(f.sector),
    );
    // Limit arcs per actor to avoid visual overload
    const maxArcs = 5;
    const selectedTargets = targets.slice(0, maxArcs);

    for (const target of selectedTargets) {
      const arcCoords = greatCircleArc(
        [actor.origin.lng, actor.origin.lat],
        [target.lng, target.lat],
        48,
      );
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: arcCoords,
        },
        properties: {
          actorName: actor.name,
          targetName: target.name,
          color: actor.color,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Build GeoJSON for submarine cable routes from geoLayers data.
 * Converts [lat, lng] waypoint arrays to GeoJSON [lng, lat] LineStrings.
 */
export function cableRoutesToGeoJSON(
  routes: Array<{
    name: string;
    color: string;
    waypoints: [number, number][];
  }>,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes.map((route) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.waypoints.map(([lat, lng]) => [lng, lat]),
      },
      properties: {
        name: route.name,
        color: route.color,
      },
    })),
  };
}

/**
 * Convert the existing energyFacilities array (worldData.ts)
 * into a GeoJSON FeatureCollection for MapLibre rendering.
 * Maps old sector names to the new expanded EnergySector type where possible.
 */
export function legacyFacilitiesToGeoJSON(
  facilities: Array<{
    id: string;
    lat: number;
    lng: number;
    name: string;
    sector: string;
    operator: string;
    capacity?: string;
  }>,
): GeoJSON.FeatureCollection {
  // Map old sector names to new taxonomy
  const sectorMap: Record<string, EnergySector> = {
    nuclear: 'nuclear',
    hydro: 'hydro',
    grid: 'other',       // ISOs/RTOs map to 'other' — they are grid ops, not generation
    natural_gas: 'gas',
    oil: 'oil',
    water: 'other',      // Water systems map to 'other' in energy context
  };

  return {
    type: 'FeatureCollection',
    features: facilities.map((f) => {
      // Parse capacity string to numeric MW where possible
      let capacityMW = 0;
      if (f.capacity) {
        const gwMatch = f.capacity.match(/([\d,.]+)\s*GW/i);
        const mwMatch = f.capacity.match(/([\d,.]+)\s*MW/i);
        if (gwMatch) {
          capacityMW = parseFloat(gwMatch[1].replace(/,/g, '')) * 1000;
        } else if (mwMatch) {
          capacityMW = parseFloat(mwMatch[1].replace(/,/g, ''));
        }
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [f.lng, f.lat],
        },
        properties: {
          id: f.id,
          name: f.name,
          sector: sectorMap[f.sector] ?? 'other',
          originalSector: f.sector,
          operator: f.operator,
          capacity: f.capacity ?? '',
          capacity_mw: capacityMW,
        },
      };
    }),
  };
}
