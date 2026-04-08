// ============================================================
// Threat Map Type System
// Expanded energy sector taxonomy + infrastructure types
// ============================================================

// Energy sector types — expanded from the original 6 to 13+
export type EnergySector =
  | 'solar' | 'wind' | 'offshore_wind' | 'storage' | 'pump_storage'
  | 'hydro' | 'nuclear' | 'gas' | 'coal' | 'oil'
  | 'geothermal' | 'biomass' | 'other';

// Infrastructure types beyond power plants
export type InfrastructureType =
  | 'data_center' | 'substation' | 'transmission_line'
  | 'submarine_cable' | 'fiber_route' | 'gas_pipeline';

// Layer visibility state
export interface LayerVisibility {
  // Power plant sectors
  solar: boolean;
  wind: boolean;
  offshore_wind: boolean;
  storage: boolean;
  pump_storage: boolean;
  hydro: boolean;
  nuclear: boolean;
  gas: boolean;
  coal: boolean;
  oil: boolean;
  geothermal: boolean;
  biomass: boolean;
  // Infrastructure
  data_centers: boolean;
  substations: boolean;
  transmission_lines: boolean;
  submarine_cables: boolean;
  fiber_routes: boolean;
  gas_pipelines: boolean;
  // Threat overlays
  threat_actors: boolean;
  attack_arcs: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  solar: true,
  wind: true,
  offshore_wind: true,
  storage: true,
  pump_storage: true,
  hydro: true,
  nuclear: true,
  gas: true,
  coal: true,
  oil: true,
  geothermal: true,
  biomass: true,
  data_centers: true,
  substations: true,
  transmission_lines: true,
  submarine_cables: true,
  fiber_routes: true,
  gas_pipelines: true,
  threat_actors: true,
  attack_arcs: true,
};

// Sector colors — CISA/USA-themed professional palette
// Subdued, governmental tones that read as authoritative on dark backgrounds
export const SECTOR_COLORS: Record<EnergySector, string> = {
  solar: '#D4A84B',        // Muted gold
  wind: '#6B9BC3',         // Steel blue
  offshore_wind: '#4A7FAF', // Deeper steel blue
  storage: '#8B7EC8',      // Muted violet
  pump_storage: '#7B6DB8', // Deeper violet
  hydro: '#4B98B5',        // Teal
  nuclear: '#C75050',      // CISA red — most critical sector
  gas: '#C8884B',          // Amber/bronze
  coal: '#7A8694',         // Cool slate
  oil: '#A0876E',          // Warm stone
  geothermal: '#B86B5A',   // Muted terra cotta
  biomass: '#6B9B7A',      // Sage green
  other: '#8A95A5',        // Blue-gray
};

// Sector labels for UI display
export const SECTOR_LABELS: Record<EnergySector, string> = {
  solar: 'Solar',
  wind: 'Wind',
  offshore_wind: 'Offshore Wind',
  storage: 'Storage',
  pump_storage: 'Pumped Storage',
  hydro: 'Hydroelectric',
  nuclear: 'Nuclear',
  gas: 'Natural Gas',
  coal: 'Coal',
  oil: 'Oil/Petroleum',
  geothermal: 'Geothermal',
  biomass: 'Biomass',
  other: 'Other',
};

// Infrastructure colors — luminescent, subtle on dark
export const INFRA_COLORS: Record<InfrastructureType, string> = {
  data_center: '#34d399',     // Emerald glow
  substation: '#fbbf24',      // Warm amber
  transmission_line: '#60a5fa', // Soft blue
  submarine_cable: '#38bdf8',  // Cyan
  fiber_route: '#c084fc',     // Soft purple
  gas_pipeline: '#fb923c',    // Warm orange
};

// Shape type for each sector — distinguishes facility types at a glance
export type MarkerShape = 'triangle' | 'circle' | 'square' | 'diamond' | 'star' | 'hexagon' | 'dot';

export const SECTOR_SHAPES: Record<EnergySector, MarkerShape> = {
  nuclear: 'triangle',
  hydro: 'diamond',
  pump_storage: 'diamond',
  gas: 'square',
  coal: 'square',
  oil: 'square',
  wind: 'circle',
  offshore_wind: 'circle',
  solar: 'dot',
  storage: 'hexagon',
  geothermal: 'star',
  biomass: 'star',
  other: 'circle',
};

// Facility threat score — preserves the existing worldData.ts model
export interface FacilityThreatScore {
  score: number;            // 1-5 (1=Severe, 5=Normal)
  label: string;
  color: string;
  actorCount: number;
  actorNames: string[];
  relevantCveCount: number;
  relevantKevCount: number;
  factors: string[];
  gridStressScore: number;
  gridHeadroom?: number;
  vendorExposureScore: number;
  exposedVendors: string[];
  rawTotal: number;
}

// Selected feature for detail panel
export interface SelectedFeature {
  type: 'plant' | 'data_center' | 'substation' | 'cable' | 'threat_actor';
  properties: Record<string, unknown>;
  coordinates: [number, number];
  threatScore?: FacilityThreatScore;
}

// Map interaction callbacks
export interface ThreatMapCallbacks {
  onFeatureSelect?: (feature: SelectedFeature | null) => void;
  onLayerChange?: (layers: LayerVisibility) => void;
  onZoomChange?: (zoom: number) => void;
}
