// ============================================================
// Map Styling Configuration for MapLibre GL JS
// ============================================================

import type { StyleSpecification } from 'maplibre-gl';

// Base map style — dark theme to match CAPRI aesthetic
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Minimal dark fallback style in case CartoDB is unavailable
export const DARK_STYLE_FALLBACK: StyleSpecification = {
  version: 8,
  name: 'CAPRI Dark Fallback',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#0a0e17',
      },
    },
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

// Clustering configuration for power plant sources
export const CLUSTER_CONFIG = {
  clusterMaxZoom: 12,  // Don't cluster above zoom 12
  clusterRadius: 50,   // Pixel radius for clustering
  clusterMinPoints: 3, // Min points to form a cluster
};

// MapLibre expression for circle radius based on zoom + capacity
// At zoom < 5:  small dots
// At zoom 5-8:  dots scale by capacity
// At zoom > 8:  larger dots, labels start appearing
export function getCircleRadiusExpression(): maplibregl.ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    // zoom 0-4: small fixed size per capacity tier
    2, [
      'step',
      ['coalesce', ['get', 'capacity_mw'], 0],
      2,     // default for 0 MW
      10, 2.5,
      100, 3,
      500, 3.5,
      1000, 4,
    ],
    // zoom 5-8: moderate scaling
    6, [
      'step',
      ['coalesce', ['get', 'capacity_mw'], 0],
      3,
      10, 4,
      100, 5,
      500, 6,
      1000, 8,
    ],
    // zoom 9+: larger, detail visible
    10, [
      'step',
      ['coalesce', ['get', 'capacity_mw'], 0],
      5,
      10, 6,
      100, 8,
      500, 10,
      1000, 14,
    ],
  ] as maplibregl.ExpressionSpecification;
}

// Capacity-based sizing helper (for non-expression contexts)
export function capacityToRadius(capacityMW: number): number {
  if (capacityMW >= 1000) return 8;   // 1+ GW
  if (capacityMW >= 500) return 6;
  if (capacityMW >= 100) return 5;
  if (capacityMW >= 10) return 4;
  return 3;
}

// Cluster circle radius expression (larger clusters = larger circles)
export function getClusterRadiusExpression(): maplibregl.ExpressionSpecification {
  return [
    'step',
    ['get', 'point_count'],
    15,    // < 10 points
    10, 20,
    50, 25,
    100, 30,
    500, 35,
  ] as maplibregl.ExpressionSpecification;
}
