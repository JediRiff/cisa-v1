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

// Sector colors — distinct, accessible palette
export const SECTOR_COLORS: Record<EnergySector, string> = {
  solar: '#FFD700',        // Gold
  wind: '#00CED1',         // Dark turquoise
  offshore_wind: '#4169E1', // Royal blue
  storage: '#FF69B4',      // Hot pink
  pump_storage: '#8A2BE2', // Blue violet
  hydro: '#1E90FF',        // Dodger blue
  nuclear: '#FF4500',      // Orange red
  gas: '#FFA500',          // Orange
  coal: '#808080',         // Gray
  oil: '#8B4513',          // Saddle brown
  geothermal: '#DC143C',   // Crimson
  biomass: '#32CD32',      // Lime green
  other: '#C0C0C0',        // Silver
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

// Infrastructure colors
export const INFRA_COLORS: Record<InfrastructureType, string> = {
  data_center: '#00FF00',
  substation: '#FFFF00',
  transmission_line: '#FFD700',
  submarine_cable: '#00BFFF',
  fiber_route: '#FF00FF',
  gas_pipeline: '#FF8C00',
};

// Facility risk — preserves the existing worldData.ts model
export interface FacilityRisk {
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
  risk?: FacilityRisk;
}

// Map interaction callbacks
export interface ThreatMapCallbacks {
  onFeatureSelect?: (feature: SelectedFeature | null) => void;
  onLayerChange?: (layers: LayerVisibility) => void;
  onZoomChange?: (zoom: number) => void;
}
