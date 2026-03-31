'use client';

import { useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  LayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  SelectedFeature,
  SECTOR_COLORS,
  INFRA_COLORS,
} from './types';
import { MAP_STYLE, CLUSTER_CONFIG, getCircleRadiusExpression, getClusterRadiusExpression } from './mapStyle';
import {
  sectorColorExpression,
  threatActorsToGeoJSON,
  buildAttackArcsGeoJSON,
  cableRoutesToGeoJSON,
  legacyFacilitiesToGeoJSON,
  riskScoreToColor,
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

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-98.5, 39.8], // Center of continental US
      zoom: 3.5,
      minZoom: 1.5,
      maxZoom: 18,
      attributionControl: false,
    });

    // Enable globe projection (MapLibre GL JS v4+)
    map.setProjection({ type: 'globe' });

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
      addSources(map);
      addLayers(map);
      setupInteractions(map);
      applyLayerVisibility(map, layersRef.current);
      startPulseAnimation(map);
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

    // Try loading external GeoJSON and swap if available
    fetchGeoJSON('/data/power-plants.geojson').then((data) => {
      if (data) {
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

    // Transmission lines — golden dashed
    map.addLayer({
      id: LAYER_IDS.TRANSMISSION_LINES,
      type: 'line',
      source: SOURCE_IDS.TRANSMISSION_LINES,
      paint: {
        'line-color': INFRA_COLORS.transmission_line,
        'line-width': 1.5,
        'line-opacity': 0.5,
        'line-dasharray': [4, 2],
      },
    });

    // Gas pipelines — orange
    map.addLayer({
      id: LAYER_IDS.GAS_PIPELINES,
      type: 'line',
      source: SOURCE_IDS.GAS_PIPELINES,
      paint: {
        'line-color': INFRA_COLORS.gas_pipeline,
        'line-width': 2,
        'line-opacity': 0.45,
      },
    });

    // Submarine cables — deep sky blue, dashed
    map.addLayer({
      id: LAYER_IDS.SUBMARINE_CABLES,
      type: 'line',
      source: SOURCE_IDS.SUBMARINE_CABLES,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], INFRA_COLORS.submarine_cable],
        'line-width': 1.5,
        'line-opacity': 0.4,
        'line-dasharray': [6, 3],
      },
    });

    // LNG shipping lanes — amber, dashed
    map.addLayer({
      id: LAYER_IDS.LNG_SHIPPING_LANES,
      type: 'line',
      source: SOURCE_IDS.LNG_LANES,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#f59e0b'],
        'line-width': 1.5,
        'line-opacity': 0.35,
        'line-dasharray': [4, 3],
      },
    });

    // Fiber routes — magenta, dashed
    map.addLayer({
      id: LAYER_IDS.FIBER_ROUTES,
      type: 'line',
      source: SOURCE_IDS.FIBER_ROUTES,
      paint: {
        'line-color': INFRA_COLORS.fiber_route,
        'line-width': 1.5,
        'line-opacity': 0.4,
        'line-dasharray': [5, 3],
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
        'line-color': ['coalesce', ['get', 'color'], '#ff3333'],
        'line-width': 1.5,
        'line-opacity': 0.35,
        'line-dasharray': [2, 2],
      },
    });

    // ============================
    // Power plant clusters
    // ============================

    // Cluster circles
    map.addLayer({
      id: LAYER_IDS.PLANTS_CLUSTER_CIRCLES,
      type: 'circle',
      source: SOURCE_IDS.PLANTS,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',   // < 10
          10, '#f1f075', // 10-49
          50, '#f28cb1', // 50+
        ],
        'circle-radius': getClusterRadiusExpression(),
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.5,
        'circle-opacity': 0.7,
      },
    });

    // Cluster count labels
    map.addLayer({
      id: LAYER_IDS.PLANTS_CLUSTER_COUNT,
      type: 'symbol',
      source: SOURCE_IDS.PLANTS,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 12,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Unclustered individual plant dots
    map.addLayer({
      id: LAYER_IDS.PLANTS_UNCLUSTERED,
      type: 'circle',
      source: SOURCE_IDS.PLANTS,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': sectorColorExpression() as maplibregl.ExpressionSpecification,
        'circle-radius': getCircleRadiusExpression(),
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.6)',
        'circle-opacity': 0.85,
      },
    });

    // Plant name labels at high zoom
    map.addLayer({
      id: LAYER_IDS.PLANTS_LABELS,
      type: 'symbol',
      source: SOURCE_IDS.PLANTS,
      filter: ['!', ['has', 'point_count']],
      minzoom: 9,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
        'text-size': 11,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-max-width': 12,
        'text-optional': true,
      },
      paint: {
        'text-color': '#e0e4e8',
        'text-halo-color': '#0a0e17',
        'text-halo-width': 1.5,
      },
    });

    // ============================
    // Infrastructure point layers
    // ============================

    // Substations — yellow squares (represented as circles with small radius)
    map.addLayer({
      id: LAYER_IDS.SUBSTATIONS,
      type: 'circle',
      source: SOURCE_IDS.SUBSTATIONS,
      paint: {
        'circle-color': INFRA_COLORS.substation,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          3, 2,
          8, 4,
          12, 6,
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,0,0.5)',
        'circle-opacity': 0.7,
      },
    });

    // Data centers — green squares
    map.addLayer({
      id: LAYER_IDS.DATA_CENTERS,
      type: 'circle',
      source: SOURCE_IDS.DATA_CENTERS,
      paint: {
        'circle-color': INFRA_COLORS.data_center,
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          3, 3,
          8, 5,
          12, 8,
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(0,255,0,0.4)',
        'circle-opacity': 0.7,
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
        'circle-color': ['coalesce', ['get', 'color'], '#ff3333'],
        'circle-radius': 14,
        'circle-opacity': 0.2,
        'circle-stroke-width': 0,
      },
    });

    // Core threat actor dot
    map.addLayer({
      id: LAYER_IDS.THREAT_ACTORS,
      type: 'circle',
      source: SOURCE_IDS.THREAT_ACTORS,
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#ff3333'],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          2, 5,
          6, 7,
          10, 10,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.7)',
        'circle-opacity': 0.9,
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

    // --- Hover tooltips for plants ---
    map.on('mousemove', LAYER_IDS.PLANTS_UNCLUSTERED, (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      const name = props.name ?? 'Unknown';
      const sector = props.sector ?? '';
      const operator = props.operator ?? '';
      const capacity = props.capacity ?? '';

      const sectorColor = SECTOR_COLORS[sector as keyof typeof SECTOR_COLORS] ?? '#C0C0C0';

      tooltipRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-tt-inner">
            <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(name)}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${sectorColor};display:inline-block;"></span>
              <span>${escapeHtml(sector)}</span>
            </div>
            ${operator ? `<div style="color:#9ca3af;font-size:11px;">${escapeHtml(operator)}</div>` : ''}
            ${capacity ? `<div style="color:#9ca3af;font-size:11px;">${escapeHtml(capacity)}</div>` : ''}
          </div>`,
        )
        .addTo(map);
    });

    map.on('mouseleave', LAYER_IDS.PLANTS_UNCLUSTERED, () => {
      tooltipRef.current?.remove();
    });

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

    // --- Click: unclustered plant ---
    map.on('click', LAYER_IDS.PLANTS_UNCLUSTERED, (e) => {
      if (!e.features || e.features.length === 0) return;
      const f = e.features[0];
      const props = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      const sectorColor = SECTOR_COLORS[props.sector as keyof typeof SECTOR_COLORS] ?? '#C0C0C0';

      popupRef.current
        ?.setLngLat(coords)
        .setHTML(
          `<div class="capri-popup-inner">
            <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;">${escapeHtml(props.name)}</h3>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${sectorColor};display:inline-block;"></span>
              <span style="font-weight:500;">${escapeHtml(props.sector)}</span>
            </div>
            <div style="font-size:12px;color:#9ca3af;line-height:1.5;">
              ${props.operator ? `<div>Operator: ${escapeHtml(props.operator)}</div>` : ''}
              ${props.capacity ? `<div>Capacity: ${escapeHtml(props.capacity)}</div>` : ''}
              ${props.id ? `<div style="color:#6b7280;font-size:10px;margin-top:4px;">ID: ${escapeHtml(props.id)}</div>` : ''}
            </div>
          </div>`,
        )
        .addTo(map);

      onFeatureSelectRef.current?.({
        type: 'plant',
        properties: props as Record<string, unknown>,
        coordinates: coords,
      });
    });

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
            <div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">${escapeHtml(props.type)} — ${escapeHtml(props.country)}</div>
            ${props.aliases ? `<div style="font-size:11px;color:#6b7280;margin-bottom:6px;">AKA: ${escapeHtml(props.aliases)}</div>` : ''}
            <div style="font-size:12px;line-height:1.5;">${escapeHtml(props.description)}</div>
            ${props.targetSectors ? `<div style="font-size:11px;color:#6b7280;margin-top:6px;">Targets: ${escapeHtml(props.targetSectors)}</div>` : ''}
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
            <h3 style="margin:0 0 6px;font-size:14px;font-weight:600;">${escapeHtml(props.name ?? 'Data Center')}</h3>
            ${props.operator ? `<div style="font-size:12px;color:#9ca3af;">Operator: ${escapeHtml(props.operator)}</div>` : ''}
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
            <h3 style="margin:0 0 6px;font-size:14px;font-weight:600;">${escapeHtml(props.name ?? 'Substation')}</h3>
            ${props.voltage ? `<div style="font-size:12px;color:#9ca3af;">Voltage: ${escapeHtml(props.voltage)}</div>` : ''}
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
    setVis(LAYER_IDS.PLANTS_CLUSTER_COUNT, anySectorVisible);
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

      try {
        if (map.getLayer(LAYER_IDS.PLANTS_UNCLUSTERED)) {
          map.setFilter(LAYER_IDS.PLANTS_UNCLUSTERED, [
            'all',
            ['!', ['has', 'point_count']],
            ['in', ['get', 'sector'], ['literal', visibleSectors]],
          ]);
          setVis(LAYER_IDS.PLANTS_UNCLUSTERED, true);
        }
        // Also filter labels
        if (map.getLayer(LAYER_IDS.PLANTS_LABELS)) {
          map.setFilter(LAYER_IDS.PLANTS_LABELS, [
            'all',
            ['!', ['has', 'point_count']],
            ['in', ['get', 'sector'], ['literal', visibleSectors]],
          ]);
        }
      } catch {
        // Filters may fail if layers aren't ready
      }
    } else {
      setVis(LAYER_IDS.PLANTS_UNCLUSTERED, false);
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
        background: '#0a0e17',
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
