'use client';

import { useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
// CSS is imported in globals.css to avoid issues with dynamic imports
import {
  LayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  SelectedFeature,
  SECTOR_COLORS,
  SECTOR_LABELS,
  INFRA_COLORS,
  EnergySector,
} from './types';
import { MAP_STYLE, CLUSTER_CONFIG, getClusterRadiusExpression } from './mapStyle';
import {
  sectorColorExpression,
  threatActorsToGeoJSON,
  buildAttackArcsGeoJSON,
  cableRoutesToGeoJSON,
  legacyFacilitiesToGeoJSON,
  riskScoreToColor,
  riskColorExpression,
  sectorRiskScore,
  formatCapacity,
} from './utils';
import { threatActors, energyFacilities } from '../globe/worldData';
import { submarineCables, lngShippingLanes } from '../globe/geoLayers';

// ============================================================
// Layer ID constants
// ============================================================

const LAYER_IDS = {
  // Power plants
  PLANTS_CLUSTER_CIRCLES: 'plants-cluster-circles',
  PLANTS_CLUSTER_COUNT: 'plants-cluster-count',
  PLANTS_RISK_GLOW: 'plants-risk-glow',
  PLANTS_RISK_BORDER: 'plants-risk-border',
  PLANTS_UNCLUSTERED: 'plants-unclustered',
  PLANTS_LABELS: 'plants-labels',
  // Infrastructure
  SUBMARINE_CABLES: 'submarine-cables',
  LNG_SHIPPING_LANES: 'lng-shipping-lanes',
  DATA_CENTERS: 'data-centers-layer',
  SUBSTATIONS: 'substations-layer',
  TRANSMISSION_LINES: 'transmission-lines-layer',
  FIBER_ROUTES: 'fiber-routes-layer',
  GAS_PIPELINES: 'gas-pipelines-layer',
  // Threats
  THREAT_ACTORS: 'threat-actors-layer',
  THREAT_ACTORS_PULSE: 'threat-actors-pulse',
  ATTACK_ARCS: 'attack-arcs-layer',
} as const;

const SOURCE_IDS = {
  PLANTS: 'power-plants-source',
  SUBMARINE_CABLES: 'submarine-cables-source',
  LNG_LANES: 'lng-lanes-source',
  DATA_CENTERS: 'data-centers-source',
  SUBSTATIONS: 'substations-source',
  TRANSMISSION_LINES: 'transmission-lines-source',
  FIBER_ROUTES: 'fiber-routes-source',
  GAS_PIPELINES: 'gas-pipelines-source',
  THREAT_ACTORS: 'threat-actors-source',
  ATTACK_ARCS: 'attack-arcs-source',
} as const;

// ============================================================
// Component Props
// ============================================================

interface ThreatMapProps {
  visibleLayers?: LayerVisibility;
  threatData?: Record<string, unknown>;
  onFeatureSelect?: (feature: SelectedFeature | null) => void;
  className?: string;
}

// ============================================================
// ThreatMap Component
// ============================================================

export default function ThreatMap({
  visibleLayers,
  threatData,
  onFeatureSelect,
  className,
}: ThreatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const tooltipRef = useRef<maplibregl.Popup | null>(null);
  const layersRef = useRef<LayerVisibility>(visibleLayers ?? DEFAULT_LAYER_VISIBILITY);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const pulseAnimationRef = useRef<number | null>(null);
  const mapReadyRef = useRef(false);

  // Keep callback ref current without triggering re-init
  useEffect(() => {
    onFeatureSelectRef.current = onFeatureSelect;
  });

  // --------------------------------------------------------
  // Initialize map
  // --------------------------------------------------------
  useEffect(() => {
    if (!mapContainer.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [-98.5, 39.8], // Center of continental US
        zoom: 2.8,
        minZoom: 1,
        maxZoom: 18,
        attributionControl: false,
      });
    } catch (err) {
      console.error('[ThreatMap] Failed to create map:', err);
      return;
    }

    // Globe projection + atmosphere MUST be set inside style.load
    // (setting before style loads silently fails and falls back to flat Mercator)
    map.on('style.load', () => {
      // 1. Enable globe projection
      try {
        map.setProjection({ type: 'globe' } as maplibregl.ProjectionSpecification);
      } catch {
        console.warn('[ThreatMap] Globe projection not supported, using mercator');
      }

      // 2. Atmosphere — fades out as you zoom in
      try {
        map.setSky({
          'atmosphere-blend': [
            'interpolate', ['linear'], ['zoom'],
            0, 1,   // Full atmosphere at global view
            5, 1,   // Maintain through zoom 5
            7, 0,   // Fade out by zoom 7 (regional view)
          ],
        } as any);
      } catch {
        // Atmosphere not supported
      }

      // 3. Light direction for atmosphere glow
      try {
        map.setLight({
          anchor: 'map',
          position: [1.5, 90, 80],
        } as any);
      } catch {
        // Light not supported
      }
    });

    // Compact attribution in bottom-right
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    // Navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    mapRef.current = map;

    // Reusable popup instances
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '360px',
      className: 'capri-popup',
    });

    tooltipRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '260px',
      className: 'capri-tooltip',
      offset: 12,
    });

    map.on('load', () => {
      mapReadyRef.current = true;
      try {
        addSources(map);
        addLayers(map);
        setupInteractions(map);
        applyLayerVisibility(map, layersRef.current);
        startPulseAnimation(map);
      } catch (err) {
        console.error('[ThreatMap] Failed to initialize map layers:', err);
      }
    });

    map.on('error', (e) => {
      console.warn('[ThreatMap] Map error:', e.error?.message || e);
    });

    // Cleanup
    return () => {
      if (pulseAnimationRef.current != null) {
        cancelAnimationFrame(pulseAnimationRef.current);
        pulseAnimationRef.current = null;
      }
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------
  // React to layer visibility changes
  // --------------------------------------------------------
  useEffect(() => {
    const lv = visibleLayers ?? DEFAULT_LAYER_VISIBILITY;
    layersRef.current = lv;
    const map = mapRef.current;
    if (map && mapReadyRef.current) {
      applyLayerVisibility(map, lv);
    }
  }, [visibleLayers]);

  // --------------------------------------------------------
  // Add all GeoJSON sources
  // --------------------------------------------------------
  const addSources = useCallback((map: maplibregl.Map) => {
    // --- Power plants (with clustering) ---
    // Try to load from /data/power-plants.geojson first;
    // fall back to converting legacy worldData facilities.
    const legacyPlantGeoJSON = legacyFacilitiesToGeoJSON(energyFacilities);

    map.addSource(SOURCE_IDS.PLANTS, {
      type: 'geojson',
      data: legacyPlantGeoJSON,
      cluster: true,
      clusterMaxZoom: CLUSTER_CONFIG.clusterMaxZoom,
      clusterRadius: CLUSTER_CONFIG.clusterRadius,
      clusterMinPoints: CLUSTER_CONFIG.clusterMinPoints,
    });

    // Try loading external GeoJSON and swap if available.
    // Inject risk_score into each feature for risk visualization layers.
    fetchGeoJSON('/data/power-plants.geojson').then((data) => {
      if (data) {
        for (const feature of data.features) {
          if (feature.properties && !feature.properties.risk_score) {
            const sector = (feature.properties.sector ?? 'other') as string;
            const cap = Number(feature.properties.capacityMW ?? feature.properties.capacity_mw ?? 0);
            feature.properties.risk_score = sectorRiskScore(sector, cap);
          }
        }
        const src = map.getSource(SOURCE_IDS.PLANTS) as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData(data);
      }
    });

    // --- Submarine cables ---
    map.addSource(SOURCE_IDS.SUBMARINE_CABLES, {
      type: 'geojson',
      data: cableRoutesToGeoJSON(submarineCables),
    });

    // --- LNG shipping lanes ---
    map.addSource(SOURCE_IDS.LNG_LANES, {
      type: 'geojson',
      data: cableRoutesToGeoJSON(lngShippingLanes),
    });

    // --- Infrastructure layers (loaded from /data/ if available) ---
    const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

    map.addSource(SOURCE_IDS.DATA_CENTERS, { type: 'geojson', data: emptyFC });
    map.addSource(SOURCE_IDS.SUBSTATIONS, { type: 'geojson', data: emptyFC });
    map.addSource(SOURCE_IDS.TRANSMISSION_LINES, { type: 'geojson', data: emptyFC });
    map.addSource(SOURCE_IDS.FIBER_ROUTES, { type: 'geojson', data: emptyFC });
    map.addSource(SOURCE_IDS.GAS_PIPELINES, { type: 'geojson', data: emptyFC });

    // Async-load external data files
    loadExternalSource(map, SOURCE_IDS.DATA_CENTERS, '/data/data-centers.geojson');
    loadExternalSource(map, SOURCE_IDS.SUBSTATIONS, '/data/substations.geojson');
    loadExternalSource(map, SOURCE_IDS.TRANSMISSION_LINES, '/data/transmission-lines.geojson');
    loadExternalSource(map, SOURCE_IDS.FIBER_ROUTES, '/data/fiber-routes.geojson');
    loadExternalSource(map, SOURCE_IDS.GAS_PIPELINES, '/data/gas-pipelines.geojson');

    // --- Threat actors ---
    map.addSource(SOURCE_IDS.THREAT_ACTORS, {
      type: 'geojson',
      data: threatActorsToGeoJSON(threatActors),
    });

    // --- Attack arcs ---
    map.addSource(SOURCE_IDS.ATTACK_ARCS, {
      type: 'geojson',
      data: buildAttackArcsGeoJSON(threatActors, energyFacilities),
    });
  }, []);

  // --------------------------------------------------------
  // Add all map layers
  // --------------------------------------------------------
  const addLayers = useCallback((map: maplibregl.Map) => {
    // ============================
    // Infrastructure line layers
    // ============================

    // Transmission lines — soft blue, subtle
    map.addLayer({
      id: LAYER_IDS.TRANSMISSION_LINES,
      type: 'line',
      source: SOURCE_IDS.TRANSMISSION_LINES,
      paint: {
        'line-color': INFRA_COLORS.transmission_line,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 8, 1, 12, 1.5],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.15, 8, 0.3, 12, 0.45],
      },
    });

    // Gas pipelines — warm orange, subtle
    map.addLayer({
      id: LAYER_IDS.GAS_PIPELINES,
      type: 'line',
      source: SOURCE_IDS.GAS_PIPELINES,
      paint: {
        'line-color': INFRA_COLORS.gas_pipeline,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 8, 1.2, 12, 2],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.15, 8, 0.3, 12, 0.4],
      },
    });

    // Submarine cables — cyan, dashed
    map.addLayer({
      id: LAYER_IDS.SUBMARINE_CABLES,
      type: 'line',
      source: SOURCE_IDS.SUBMARINE_CABLES,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], INFRA_COLORS.submarine_cable],
        'line-width': 1.2,
        'line-opacity': 0.3,
        'line-dasharray': [6, 4],
      },
    });

    // LNG shipping lanes — soft amber, dashed
    map.addLayer({
      id: LAYER_IDS.LNG_SHIPPING_LANES,
      type: 'line',
      source: SOURCE_IDS.LNG_LANES,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#fbbf24'],
        'line-width': 1,
        'line-opacity': 0.25,
        'line-dasharray': [4, 4],
      },
    });

    // Fiber routes — soft purple, dashed
    map.addLayer({
      id: LAYER_IDS.FIBER_ROUTES,
      type: 'line',
      source: SOURCE_IDS.FIBER_ROUTES,
      paint: {
        'line-color': INFRA_COLORS.fiber_route,
        'line-width': 1,
        'line-opacity': 0.3,
        'line-dasharray': [5, 4],
      },
    });

    // ============================
    // Attack arcs
    // ============================
    map.addLayer({
      id: LAYER_IDS.ATTACK_ARCS,
      type: 'line',
      source: SOURCE_IDS.ATTACK_ARCS,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#f87171'],
        'line-width': 1,
        'line-opacity': 0.2,
        'line-dasharray': [3, 3],
      },
    });

    // ============================
    // Power plant clusters
    // ============================

    // Cluster circles — luminescent blue theme
    map.addLayer({
      id: LAYER_IDS.PLANTS_CLUSTER_CIRCLES,
      type: 'circle',
      source: SOURCE_IDS.PLANTS,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#60a5fa',   // < 10: soft blue
          10, '#818cf8', // 10-49: indigo
          50, '#a78bfa', // 50-99: purple
          100, '#c084fc', // 100+: lavender
        ],
        'circle-radius': getClusterRadiusExpression(),
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.25)',
        'circle-stroke-opacity': 0.6,
        'circle-opacity': 0.55,
        'circle-blur': 0.3,
      },
    });

    // Cluster count labels removed — cluster size communicates density

    // ============================
    // Risk visualization layers (behind shape icons)
    // ============================

    // Risk glow — soft blurred halo, colored by risk score
    // Higher risk = more prominent glow
    map.addLayer({
      id: LAYER_IDS.PLANTS_RISK_GLOW,
      type: 'circle',
      source: SOURCE_IDS.PLANTS,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': riskColorExpression() as maplibregl.ExpressionSpecification,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          2, [
            'case',
            ['==', ['get', 'sector'], 'solar'], 3,
            ['<=', ['coalesce', ['get', 'risk_score'], 5], 2.5], 6,
            ['<=', ['coalesce', ['get', 'risk_score'], 5], 3.5], 5,
            4,
          ],
          6, [
            'case',
            ['==', ['get', 'sector'], 'solar'], 5,
            ['<=', ['coalesce', ['get', 'risk_score'], 5], 2.5], 10,
            ['<=', ['coalesce', ['get', 'risk_score'], 5], 3.5], 8,
            6,
          ],
          10, [
            'case',
            ['==', ['get', 'sector'], 'solar'], 8,
            ['<=', ['coalesce', ['get', 'risk_score'], 5], 2.5], 18,
            ['<=', ['coalesce', ['get', 'risk_score'], 5], 3.5], 14,
            10,
          ],
        ] as maplibregl.ExpressionSpecification,
        'circle-blur': 0.8,
        'circle-opacity': [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'risk_score'], 5],
          1.0, 0.35,   // Severe: bright glow
          2.5, 0.25,   // High: visible glow
          3.5, 0.12,   // Elevated: subtle glow
          4.5, 0.05,   // Guarded: barely visible
          5.0, 0.02,   // Low: almost none
        ] as maplibregl.ExpressionSpecification,
      },
    });

    // Risk border ring — sharp colored outline around each facility
    map.addLayer({
      id: LAYER_IDS.PLANTS_RISK_BORDER,
      type: 'circle',
      source: SOURCE_IDS.PLANTS,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': 'transparent',
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          2, [
            'case',
            ['==', ['get', 'sector'], 'solar'], 2,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000], 4.5,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500], 3.5,
            3,
          ],
          6, [
            'case',
            ['==', ['get', 'sector'], 'solar'], 3,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000], 7,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500], 5.5,
            4.5,
          ],
          10, [
            'case',
            ['==', ['get', 'sector'], 'solar'], 5,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000], 12,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500], 9,
            7,
          ],
        ] as maplibregl.ExpressionSpecification,
        'circle-stroke-width': [
          'interpolate', ['linear'], ['zoom'],
          2, 1,
          6, 1.5,
          10, 2,
        ] as maplibregl.ExpressionSpecification,
        'circle-stroke-color': riskColorExpression() as maplibregl.ExpressionSpecification,
        'circle-stroke-opacity': [
          'interpolate', ['linear'],
          ['coalesce', ['get', 'risk_score'], 5],
          1.0, 0.8,   // Severe: strong ring
          2.5, 0.6,   // High: clear ring
          3.5, 0.35,  // Elevated: visible
          4.5, 0.15,  // Guarded: subtle
          5.0, 0.08,  // Low: barely there
        ] as maplibregl.ExpressionSpecification,
        'circle-opacity': 0,
      },
    });

    // Unclustered facilities — circle layer colored by sector.
    // Radii are large enough to see AND click at all zoom levels.
    // Nuclear/hydro/gas get priority sizing so they're visible among 6k+ solar.
    map.addLayer({
      id: LAYER_IDS.PLANTS_UNCLUSTERED,
      type: 'circle',
      source: SOURCE_IDS.PLANTS,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': sectorColorExpression() as maplibregl.ExpressionSpecification,
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          // zoom 2: visible dots — nuclear/hydro/gas stand out
          2, [
            'case',
            ['in', ['get', 'sector'], ['literal', ['nuclear']]],
            5,
            ['in', ['get', 'sector'], ['literal', ['hydro', 'pump_storage']]],
            4,
            ['in', ['get', 'sector'], ['literal', ['gas', 'coal', 'oil', 'wind', 'offshore_wind']]],
            3,
            ['==', ['get', 'sector'], 'solar'],
            1.5,
            2.5,
          ],
          // zoom 5: all clearly visible
          5, [
            'case',
            ['in', ['get', 'sector'], ['literal', ['nuclear']]],
            7,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000],
            7,
            ['in', ['get', 'sector'], ['literal', ['hydro', 'pump_storage']]],
            6,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500],
            5.5,
            ['in', ['get', 'sector'], ['literal', ['gas', 'coal', 'oil', 'wind', 'offshore_wind']]],
            4.5,
            ['==', ['get', 'sector'], 'solar'],
            2.5,
            3.5,
          ],
          // zoom 8: detailed, capacity-scaled
          8, [
            'case',
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 2000],
            14,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000],
            11,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500],
            9,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 100],
            7,
            ['==', ['get', 'sector'], 'solar'],
            4,
            6,
          ],
          // zoom 12+: full detail
          12, [
            'case',
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 2000],
            18,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000],
            14,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500],
            11,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 100],
            9,
            ['==', ['get', 'sector'], 'solar'],
            6,
            7,
          ],
        ] as maplibregl.ExpressionSpecification,
        'circle-opacity': [
          'case',
          ['==', ['get', 'sector'], 'solar'],
          ['interpolate', ['linear'], ['zoom'], 2, 0.4, 6, 0.6, 9, 0.85],
          0.85,
        ] as maplibregl.ExpressionSpecification,
        'circle-stroke-width': [
          'interpolate', ['linear'], ['zoom'],
          2, 0.5,
          8, 1,
          12, 1.5,
        ] as maplibregl.ExpressionSpecification,
        'circle-stroke-color': 'rgba(255,255,255,0.2)',
      },
    });

    // Plant name labels — show major facilities (nuclear, large hydro/gas) earlier
    map.addLayer({
      id: LAYER_IDS.PLANTS_LABELS,
      type: 'symbol',
      source: SOURCE_IDS.PLANTS,
      filter: ['!', ['has', 'point_count']],
      minzoom: 6,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          6, 9,
          10, 11,
          14, 13,
        ] as maplibregl.ExpressionSpecification,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-max-width': 10,
        'text-optional': true,
        // Only show labels for significant facilities at lower zooms
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 1.0,
        'symbol-sort-key': [
          'case',
          ['in', ['get', 'sector'], ['literal', ['nuclear', 'hydro', 'pump_storage']]],
          0,  // Nuclear/hydro labels have highest priority
          ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500],
          1,  // Large plants (500+ MW) next
          ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 100],
          2,  // Medium plants
          ['==', ['get', 'sector'], 'solar'],
          10, // Solar labels get lowest priority
          5,  // Everything else
        ] as maplibregl.ExpressionSpecification,
      },
      paint: {
        'text-color': [
          'interpolate', ['linear'], ['zoom'],
          6, 'rgba(224,228,232,0.7)',
          10, '#e0e4e8',
        ] as maplibregl.ExpressionSpecification,
        'text-halo-color': '#060d1a',
        'text-halo-width': 2,
        'text-halo-blur': 1,
        // Fade in labels — nuclear/major always visible, solar only at high zoom
        'text-opacity': [
          'step',
          ['zoom'],
          // zoom 6-7: only nuclear/huge plants
          ['case',
            ['in', ['get', 'sector'], ['literal', ['nuclear']]],
            1,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 1000],
            0.8,
            0, // hide everything else
          ],
          8,
          // zoom 8: add hydro, large gas
          ['case',
            ['in', ['get', 'sector'], ['literal', ['nuclear', 'hydro', 'pump_storage']]],
            1,
            ['>=', ['coalesce', ['get', 'capacityMW'], ['get', 'capacity_mw'], 0], 500],
            0.8,
            0,
          ],
          10,
          // zoom 10+: show all labels
          0.9,
        ] as maplibregl.ExpressionSpecification,
      },
    });

    // ============================
    // Infrastructure point layers
    // ============================

    // Substations — amber, filter out unnamed (UNKNOWN*) and show only at higher zoom
    map.addLayer({
      id: LAYER_IDS.SUBSTATIONS,
      type: 'circle',
      source: SOURCE_IDS.SUBSTATIONS,
      minzoom: 7,
      filter: [
        'all',
        ['has', 'name'],
        ['!=', ['slice', ['get', 'name'], 0, 7], 'UNKNOWN'],
      ],
      paint: {
        'circle-color': INFRA_COLORS.substation,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          7, 1.5,
          10, 3,
          14, 5,
        ],
        'circle-stroke-width': 0.5,
        'circle-stroke-color': 'rgba(251,191,36,0.3)',
        'circle-opacity': [
          'interpolate', ['linear'], ['zoom'],
          7, 0.3,
          10, 0.5,
          14, 0.7,
        ],
        'circle-blur': 0.2,
      },
    });

    // Data centers — emerald, filter unnamed, show at moderate zoom
    map.addLayer({
      id: LAYER_IDS.DATA_CENTERS,
      type: 'circle',
      source: SOURCE_IDS.DATA_CENTERS,
      minzoom: 5,
      filter: [
        'all',
        ['has', 'name'],
        ['!=', ['get', 'name'], 'Unknown Facility'],
      ],
      paint: {
        'circle-color': INFRA_COLORS.data_center,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, 2,
          8, 4,
          12, 6,
        ],
        'circle-stroke-width': 0.5,
        'circle-stroke-color': 'rgba(52,211,153,0.3)',
        'circle-opacity': [
          'interpolate', ['linear'], ['zoom'],
          5, 0.4,
          8, 0.6,
          12, 0.8,
        ],
        'circle-blur': 0.15,
      },
    });

    // ============================
    // Threat actor markers
    // ============================

    // Outer pulse ring (animated via paint property updates)
    map.addLayer({
      id: LAYER_IDS.THREAT_ACTORS_PULSE,
      type: 'circle',
      source: SOURCE_IDS.THREAT_ACTORS,
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#f87171'],
        'circle-radius': 16,
        'circle-opacity': 0.12,
        'circle-stroke-width': 0,
        'circle-blur': 0.6,
      },
    });

    // Core threat actor dot — refined glow
    map.addLayer({
      id: LAYER_IDS.THREAT_ACTORS,
      type: 'circle',
      source: SOURCE_IDS.THREAT_ACTORS,
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#f87171'],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          2, 4,
          6, 6,
          10, 8,
        ],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(255,255,255,0.4)',
        'circle-opacity': 0.85,
      },
    });
  }, []);

  // --------------------------------------------------------
  // Setup click and hover interactions
  // --------------------------------------------------------
  const setupInteractions = useCallback((map: maplibregl.Map) => {
    // Clickable layers
    const clickableLayers = [
      LAYER_IDS.PLANTS_UNCLUSTERED,
      LAYER_IDS.PLANTS_RISK_BORDER,  // Larger click target around facilities
      LAYER_IDS.PLANTS_CLUSTER_CIRCLES,
      LAYER_IDS.THREAT_ACTORS,
      LAYER_IDS.DATA_CENTERS,
      LAYER_IDS.SUBSTATIONS,
    ];

    // Change cursor on hover
    for (const layerId of clickableLayers) {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    // --- Hover tooltips for plants --- shows name, sector, capacity, risk
    // Shared handler bound to both PLANTS_UNCLUSTERED and PLANTS_RISK_BORDER
    // so clicking the glow halo also shows the popup.
    function handlePlantHover(e: maplibregl.MapMouseEvent & { features?: maplibregl.GeoJSONFeature[] }) {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      const name = props.name ?? 'Unknown';
      const sector = (props.sector ?? '') as string;
      const operator = props.operator ?? '';
      const capacityMW = Number(props.capacityMW ?? props.capacity_mw) || 0;
      const sectorColor = SECTOR_COLORS[sector as EnergySector] ?? '#cbd5e1';
      const sectorLabel = SECTOR_LABELS[sector as EnergySector] ?? sector;
      const capStr = capacityMW >= 1000 ? `${(capacityMW / 1000).toFixed(1)} GW` : capacityMW > 0 ? `${Math.round(capacityMW)} MW` : '';

      // Simple risk estimate based on sector (nuclear/hydro = higher risk profile)
      const riskSectors: Record<string, { score: string; label: string; color: string }> = {
        nuclear: { score: '2.1', label: 'High', color: '#f97316' },
        hydro: { score: '3.2', label: 'Elevated', color: '#eab308' },
        pump_storage: { score: '3.4', label: 'Elevated', color: '#eab308' },
        gas: { score: '3.5', label: 'Guarded', color: '#60a5fa' },
        coal: { score: '3.8', label: 'Guarded', color: '#60a5fa' },
        oil: { score: '3.6', label: 'Guarded', color: '#60a5fa' },
      };
      const risk = riskSectors[sector] || { score: '4.2', label: 'Low', color: '#4ade80' };

      tooltipRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-tt-inner">
            <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#f1f5f9;">${escapeHtml(name)}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${sectorColor};display:inline-block;box-shadow:0 0 6px ${sectorColor}60;"></span>
              <span style="color:#cbd5e1;font-size:11px;">${escapeHtml(sectorLabel)}</span>
              ${capStr ? `<span style="color:#64748b;font-size:10px;margin-left:auto;">${capStr}</span>` : ''}
            </div>
            ${operator ? `<div style="color:#64748b;font-size:10px;margin-bottom:4px;">${escapeHtml(operator)}</div>` : ''}
            <div style="display:flex;align-items:center;gap:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:10px;color:#64748b;">Risk:</span>
              <span style="font-size:11px;font-weight:600;color:${risk.color};">${risk.score}</span>
              <span style="font-size:9px;color:${risk.color};opacity:0.8;">${risk.label}</span>
            </div>
          </div>`,
        )
        .addTo(map);
    }

    function handlePlantHoverLeave() {
      tooltipRef.current?.remove();
    }

    // Bind hover to both the main circle and the risk border (larger click target)
    map.on('mousemove', LAYER_IDS.PLANTS_UNCLUSTERED, handlePlantHover);
    map.on('mousemove', LAYER_IDS.PLANTS_RISK_BORDER, handlePlantHover);
    map.on('mouseleave', LAYER_IDS.PLANTS_UNCLUSTERED, handlePlantHoverLeave);
    map.on('mouseleave', LAYER_IDS.PLANTS_RISK_BORDER, handlePlantHoverLeave);

    // --- Hover tooltips for threat actors ---
    map.on('mousemove', LAYER_IDS.THREAT_ACTORS, (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      const name = props.name ?? 'Unknown';
      const country = props.country ?? '';
      const type = props.type ?? '';
      const color = props.color ?? '#ff3333';

      tooltipRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-tt-inner">
            <div style="font-weight:600;color:${escapeHtml(color)};margin-bottom:4px;">${escapeHtml(name)}</div>
            <div style="color:#9ca3af;font-size:11px;">${escapeHtml(type)} — ${escapeHtml(country)}</div>
          </div>`,
        )
        .addTo(map);
    });

    map.on('mouseleave', LAYER_IDS.THREAT_ACTORS, () => {
      tooltipRef.current?.remove();
    });

    // --- Click: unclustered plant (shared handler for main circle + risk border) ---
    function handlePlantClick(e: maplibregl.MapMouseEvent & { features?: maplibregl.GeoJSONFeature[] }) {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      const sector = (props.sector ?? '') as string;
      const sectorColor = SECTOR_COLORS[sector as EnergySector] ?? '#cbd5e1';
      const sectorLabel = SECTOR_LABELS[sector as EnergySector] ?? sector;
      const capacityMW = Number(props.capacityMW ?? props.capacity_mw) || 0;
      const capStr = capacityMW >= 1000 ? `${(capacityMW / 1000).toFixed(1)} GW` : capacityMW > 0 ? `${Math.round(capacityMW)} MW` : '';

      // Risk indicator
      const riskSectors: Record<string, { score: string; label: string; color: string }> = {
        nuclear: { score: '2.1', label: 'High', color: '#f97316' },
        hydro: { score: '3.2', label: 'Elevated', color: '#eab308' },
        pump_storage: { score: '3.4', label: 'Elevated', color: '#eab308' },
        gas: { score: '3.5', label: 'Guarded', color: '#60a5fa' },
        coal: { score: '3.8', label: 'Guarded', color: '#60a5fa' },
        oil: { score: '3.6', label: 'Guarded', color: '#60a5fa' },
      };
      const risk = riskSectors[sector] || { score: '4.2', label: 'Low', color: '#4ade80' };

      // Dependencies based on sector
      const depMap: Record<string, string> = {
        nuclear: 'Cooling water, Grid interconnect, NRC oversight',
        hydro: 'Watershed, Dam infrastructure, FERC license',
        gas: 'Pipeline supply, Gas compressors, Grid interconnect',
        coal: 'Rail/barge delivery, Ash disposal, Grid interconnect',
        oil: 'Fuel storage, Pipeline/tanker, Grid interconnect',
        solar: 'Inverters, Grid interconnect, Weather dependent',
        wind: 'Turbine maintenance, Grid interconnect, Weather dependent',
        offshore_wind: 'Subsea cables, Marine access, Grid interconnect',
        storage: 'Battery mgmt system, Grid interconnect',
        geothermal: 'Well infrastructure, Grid interconnect',
        biomass: 'Fuel supply chain, Grid interconnect',
      };
      const deps = depMap[sector] || 'Grid interconnect';

      popupRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-popup-inner">
            <h3 style="margin:0 0 4px;font-size:14px;font-weight:600;color:#f1f5f9;">${escapeHtml(props.name)}</h3>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${sectorColor};display:inline-block;box-shadow:0 0 8px ${sectorColor}50;"></span>
              <span style="font-weight:500;color:#e2e8f0;">${escapeHtml(sectorLabel)}</span>
              ${capStr ? `<span style="color:#64748b;font-size:11px;margin-left:auto;">${capStr}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:8px;">
              <div style="text-align:center;">
                <div style="font-size:18px;font-weight:700;color:${risk.color};line-height:1;">${risk.score}</div>
                <div style="font-size:9px;color:${risk.color};opacity:0.8;text-transform:uppercase;letter-spacing:0.5px;">${risk.label}</div>
              </div>
              <div style="width:1px;height:24px;background:rgba(255,255,255,0.08);"></div>
              <div style="font-size:10px;color:#94a3b8;line-height:1.4;">CAPRI Risk Score</div>
            </div>
            <div style="font-size:11px;color:#94a3b8;line-height:1.5;">
              ${props.operator ? `<div style="margin-bottom:2px;"><span style="color:#64748b;">Operator:</span> ${escapeHtml(props.operator)}</div>` : ''}
              <div style="margin-bottom:2px;"><span style="color:#64748b;">Dependencies:</span> ${escapeHtml(deps)}</div>
              ${props.state ? `<div><span style="color:#64748b;">State:</span> ${escapeHtml(props.state)}</div>` : ''}
            </div>
          </div>`,
        )
        .addTo(map);

      onFeatureSelectRef.current?.({
        type: 'plant',
        properties: props as Record<string, unknown>,
        coordinates: coords,
      });
    }

    // Bind click to both the main circle and the risk border (larger click target)
    map.on('click', LAYER_IDS.PLANTS_UNCLUSTERED, handlePlantClick);
    map.on('click', LAYER_IDS.PLANTS_RISK_BORDER, handlePlantClick);

    // --- Click: cluster => zoom in ---
    map.on('click', LAYER_IDS.PLANTS_CLUSTER_CIRCLES, (e) => {
      if (!e.features || e.features.length === 0) return;
      const clusterId = e.features[0].properties?.cluster_id;
      if (clusterId == null) return;

      const src = map.getSource(SOURCE_IDS.PLANTS) as maplibregl.GeoJSONSource;
      src.getClusterExpansionZoom(clusterId).then((zoom) => {
        const coords = (e.features![0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: zoom + 0.5 });
      });
    });

    // --- Click: threat actor ---
    map.on('click', LAYER_IDS.THREAT_ACTORS, (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const color = props.color ?? '#ff3333';

      popupRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-popup-inner">
            <h3 style="margin:0 0 4px;font-size:14px;font-weight:600;color:${escapeHtml(color)};">${escapeHtml(props.name)}</h3>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${escapeHtml(props.type)} — ${escapeHtml(props.country)}</div>
            ${props.aliases ? `<div style="font-size:10px;color:#64748b;margin-bottom:8px;">AKA: ${escapeHtml(props.aliases)}</div>` : ''}
            <div style="font-size:12px;line-height:1.5;color:#cbd5e1;">${escapeHtml(props.description)}</div>
            ${props.targetSectors ? `<div style="font-size:10px;color:#64748b;margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);"><span style="color:#94a3b8;">Targets:</span> ${escapeHtml(props.targetSectors)}</div>` : ''}
          </div>`,
        )
        .addTo(map);

      onFeatureSelectRef.current?.({
        type: 'threat_actor',
        properties: props as Record<string, unknown>,
        coordinates: coords,
      });
    });

    // --- Click: data center ---
    map.on('click', LAYER_IDS.DATA_CENTERS, (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      popupRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-popup-inner">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${INFRA_COLORS.data_center};display:inline-block;box-shadow:0 0 6px ${INFRA_COLORS.data_center}50;"></span>
              <span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Data Center</span>
            </div>
            <h3 style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f1f5f9;">${escapeHtml(props.name ?? 'Data Center')}</h3>
            ${props.operator ? `<div style="font-size:11px;color:#94a3b8;"><span style="color:#64748b;">Operator:</span> ${escapeHtml(props.operator)}</div>` : ''}
            <div style="font-size:10px;color:#64748b;margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06);"><span style="color:#94a3b8;">Dependencies:</span> Power supply, Cooling, Network connectivity</div>
          </div>`,
        )
        .addTo(map);

      onFeatureSelectRef.current?.({
        type: 'data_center',
        properties: props as Record<string, unknown>,
        coordinates: coords,
      });
    });

    // --- Click: substation ---
    map.on('click', LAYER_IDS.SUBSTATIONS, (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      popupRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-popup-inner">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${INFRA_COLORS.substation};display:inline-block;box-shadow:0 0 6px ${INFRA_COLORS.substation}50;"></span>
              <span style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Substation</span>
            </div>
            <h3 style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f1f5f9;">${escapeHtml(props.name ?? 'Substation')}</h3>
            ${props.voltage || props.maxVoltageKV ? `<div style="font-size:11px;color:#94a3b8;"><span style="color:#64748b;">Voltage:</span> ${escapeHtml(props.voltage || props.maxVoltageKV)} kV</div>` : ''}
            <div style="font-size:10px;color:#64748b;margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06);"><span style="color:#94a3b8;">Dependencies:</span> Transmission lines, Transformers, Grid control</div>
          </div>`,
        )
        .addTo(map);

      onFeatureSelectRef.current?.({
        type: 'substation',
        properties: props as Record<string, unknown>,
        coordinates: coords,
      });
    });

    // --- Click: deselect on empty area ---
    map.on('click', (e) => {
      // If click was on a feature layer, one of the above handlers will fire.
      // Query all clickable layers; if nothing hit, deselect.
      const features = map.queryRenderedFeatures(e.point, {
        layers: clickableLayers.filter((id) => {
          try { return !!map.getLayer(id); } catch { return false; }
        }),
      });
      if (features.length === 0) {
        popupRef.current?.remove();
        onFeatureSelectRef.current?.(null);
      }
    });
  }, []);

  // --------------------------------------------------------
  // Pulse animation for threat actor markers
  // --------------------------------------------------------
  const startPulseAnimation = useCallback((map: maplibregl.Map) => {
    let startTime = performance.now();

    function animate() {
      if (!mapReadyRef.current) return;

      const elapsed = performance.now() - startTime;
      const t = (elapsed % 2000) / 2000; // 0-1 over 2 seconds
      const pulseRadius = 14 + Math.sin(t * Math.PI * 2) * 6;
      const pulseOpacity = 0.15 + Math.sin(t * Math.PI * 2) * 0.1;

      try {
        if (map.getLayer(LAYER_IDS.THREAT_ACTORS_PULSE)) {
          map.setPaintProperty(LAYER_IDS.THREAT_ACTORS_PULSE, 'circle-radius', pulseRadius);
          map.setPaintProperty(LAYER_IDS.THREAT_ACTORS_PULSE, 'circle-opacity', Math.max(0.05, pulseOpacity));
        }
      } catch {
        // Layer may have been removed during cleanup
      }

      pulseAnimationRef.current = requestAnimationFrame(animate);
    }

    pulseAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // --------------------------------------------------------
  // Apply layer visibility
  // --------------------------------------------------------
  function applyLayerVisibility(map: maplibregl.Map, lv: LayerVisibility) {
    // Helper to safely set visibility
    const setVis = (layerId: string, visible: boolean) => {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      } catch {
        // Layer may not exist yet
      }
    };

    // Power plants (cluster + unclustered are always toggled together)
    // All plant sector toggles: if ANY sector is visible, show the plant layers.
    // Per-sector filtering uses a runtime filter expression.
    const anySectorVisible =
      lv.solar || lv.wind || lv.offshore_wind || lv.storage || lv.pump_storage ||
      lv.hydro || lv.nuclear || lv.gas || lv.coal || lv.oil ||
      lv.geothermal || lv.biomass;

    setVis(LAYER_IDS.PLANTS_CLUSTER_CIRCLES, anySectorVisible);
    setVis(LAYER_IDS.PLANTS_RISK_GLOW, anySectorVisible);
    setVis(LAYER_IDS.PLANTS_RISK_BORDER, anySectorVisible);
    setVis(LAYER_IDS.PLANTS_LABELS, anySectorVisible);

    // Build sector filter for unclustered points
    if (anySectorVisible) {
      const visibleSectors: string[] = [];
      if (lv.solar) visibleSectors.push('solar');
      if (lv.wind) visibleSectors.push('wind');
      if (lv.offshore_wind) visibleSectors.push('offshore_wind');
      if (lv.storage) visibleSectors.push('storage');
      if (lv.pump_storage) visibleSectors.push('pump_storage');
      if (lv.hydro) visibleSectors.push('hydro');
      if (lv.nuclear) visibleSectors.push('nuclear');
      if (lv.gas) visibleSectors.push('gas');
      if (lv.coal) visibleSectors.push('coal');
      if (lv.oil) visibleSectors.push('oil');
      if (lv.geothermal) visibleSectors.push('geothermal');
      if (lv.biomass) visibleSectors.push('biomass');

      const sectorFilter: maplibregl.FilterSpecification = [
        'all',
        ['!', ['has', 'point_count']],
        ['in', ['get', 'sector'], ['literal', visibleSectors]],
      ] as maplibregl.FilterSpecification;

      try {
        // Apply same sector filter to all unclustered layers
        for (const layerId of [
          LAYER_IDS.PLANTS_UNCLUSTERED,
          LAYER_IDS.PLANTS_RISK_GLOW,
          LAYER_IDS.PLANTS_RISK_BORDER,
          LAYER_IDS.PLANTS_LABELS,
        ]) {
          if (map.getLayer(layerId)) {
            map.setFilter(layerId, sectorFilter);
          }
        }
        setVis(LAYER_IDS.PLANTS_UNCLUSTERED, true);
      } catch {
        // Filters may fail if layers aren't ready
      }
    } else {
      setVis(LAYER_IDS.PLANTS_UNCLUSTERED, false);
      setVis(LAYER_IDS.PLANTS_RISK_GLOW, false);
      setVis(LAYER_IDS.PLANTS_RISK_BORDER, false);
    }

    // Infrastructure
    setVis(LAYER_IDS.SUBMARINE_CABLES, lv.submarine_cables);
    setVis(LAYER_IDS.LNG_SHIPPING_LANES, lv.submarine_cables); // LNG lanes follow cable toggle
    setVis(LAYER_IDS.DATA_CENTERS, lv.data_centers);
    setVis(LAYER_IDS.SUBSTATIONS, lv.substations);
    setVis(LAYER_IDS.TRANSMISSION_LINES, lv.transmission_lines);
    setVis(LAYER_IDS.FIBER_ROUTES, lv.fiber_routes);
    setVis(LAYER_IDS.GAS_PIPELINES, lv.gas_pipelines);

    // Threats
    setVis(LAYER_IDS.THREAT_ACTORS, lv.threat_actors);
    setVis(LAYER_IDS.THREAT_ACTORS_PULSE, lv.threat_actors);
    setVis(LAYER_IDS.ATTACK_ARCS, lv.attack_arcs);
  }

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------
  return (
    <div
      ref={mapContainer}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#030810',
      }}
    />
  );
}

// ============================================================
// Helper: fetch GeoJSON with graceful fallback
// ============================================================
async function fetchGeoJSON(url: string): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.type === 'FeatureCollection') {
      return data as GeoJSON.FeatureCollection;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// Helper: load external GeoJSON into an existing source
// ============================================================
function loadExternalSource(map: maplibregl.Map, sourceId: string, url: string) {
  fetchGeoJSON(url).then((data) => {
    if (data) {
      try {
        const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (src) src.setData(data);
      } catch {
        // Source may have been removed
      }
    }
  });
}

// ============================================================
// Helper: escape HTML to prevent XSS in popups
// ============================================================
function escapeHtml(str: unknown): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
