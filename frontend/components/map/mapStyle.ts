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
// More aggressive clustering to keep the map clean at zoom-out
export const CLUSTER_CONFIG = {
  clusterMaxZoom: 11,  // Don't cluster above zoom 11
  clusterRadius: 60,   // Larger pixel radius for tighter grouping
  clusterMinPoints: 2, // Cluster even pairs to reduce visual noise
};

// MapLibre expression for circle radius based on zoom + capacity
// Designed to keep dots small and clean at low zoom, revealing detail as you zoom in.
// Solar facilities get smaller radii to prevent overwhelming the map.
export function getCircleRadiusExpression(): maplibregl.ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    // zoom 0-4: tiny dots — just show presence
    2, [
      'case',
      // Solar gets extra-small dots at low zoom
      ['==', ['get', 'sector'], 'solar'],
      1,
      // Everything else: small by capacity
      ['step', ['coalesce', ['get', 'capacity_mw'], 0],
        1.5,     // default
        100, 2,
        500, 2.5,
        1000, 3,
      ],
    ],
    // zoom 5-7: moderate, solar still restrained
    6, [
      'case',
      ['==', ['get', 'sector'], 'solar'],
      ['step', ['coalesce', ['get', 'capacity_mw'], 0],
        1.5,
        50, 2,
        200, 3,
      ],
      ['step', ['coalesce', ['get', 'capacity_mw'], 0],
        2.5,
        10, 3,
        100, 4,
        500, 5,
        1000, 7,
      ],
    ],
    // zoom 9+: full detail, all sectors visible
    10, [
      'step',
      ['coalesce', ['get', 'capacity_mw'], 0],
      4,
      10, 5,
      100, 7,
      500, 9,
      1000, 12,
    ],
  ] as maplibregl.ExpressionSpecification;
}

// Opacity expression — solar fades at low zoom to reduce visual noise
export function getCircleOpacityExpression(): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['==', ['get', 'sector'], 'solar'],
    ['interpolate', ['linear'], ['zoom'],
      2, 0.3,
      6, 0.5,
      9, 0.8,
    ],
    // All other sectors: higher baseline opacity
    ['interpolate', ['linear'], ['zoom'],
      2, 0.6,
      6, 0.75,
      9, 0.9,
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

// Cluster circle radius expression — smaller, cleaner clusters
export function getClusterRadiusExpression(): maplibregl.ExpressionSpecification {
  return [
    'step',
    ['get', 'point_count'],
    12,    // < 10 points
    10, 16,
    50, 20,
    100, 24,
    500, 28,
  ] as maplibregl.ExpressionSpecification;
}
