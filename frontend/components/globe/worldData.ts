import * as THREE from 'three'

export interface GeoPoint {
  lat: number
  lng: number
  name?: string
  region?: string
}

export type Sector = 'nuclear' | 'hydro' | 'grid' | 'natural_gas' | 'oil' | 'water'

export interface EnergyFacility {
  id: string
  lat: number
  lng: number
  name: string
  sector: Sector
  operator: string
  capacity?: string
}

export interface ThreatActor {
  name: string
  origin: GeoPoint
  country: string
  type: string
  color: string
  targetSectors: Sector[]
  description: string
}

// Convert lat/lng to Three.js Vector3 on a sphere
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Create a curved arc between two points on the globe
export function createArcCurve(
  source: GeoPoint,
  target: GeoPoint | EnergyFacility,
  radius: number,
  elevation: number = 0.25
): THREE.QuadraticBezierCurve3 {
  const start = latLngToVector3(source.lat, source.lng, radius)
  const end = latLngToVector3(target.lat, target.lng, radius)
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dist = start.distanceTo(end)
  mid.normalize().multiplyScalar(radius + elevation + dist * 0.15)
  return new THREE.QuadraticBezierCurve3(start, mid, end)
}

// Sector display colors for globe markers
export const sectorColors: Record<Sector, string> = {
  nuclear: '#f59e0b',
  hydro: '#3b82f6',
  grid: '#22c55e',
  natural_gas: '#f97316',
  oil: '#ef4444',
  water: '#06b6d4',
}

export const sectorLabels: Record<Sector, string> = {
  nuclear: 'Nuclear',
  hydro: 'Hydroelectric',
  grid: 'Grid Operations',
  natural_gas: 'Natural Gas',
  oil: 'Oil & Petroleum',
  water: 'Water Systems',
}

// Keywords used to match CVEs/KEVs/alerts to sectors
export const sectorKeywords: Record<Sector, string[]> = {
  nuclear: ['nuclear', 'NRC', 'reactor', 'radiation', 'fuel rod', 'containment', 'IAEA', 'enrichment', 'centrifuge', 'Stuxnet', 'nuclear plant', 'nuclear power'],
  hydro: ['hydroelectric', 'dam', 'reservoir', 'spillway', 'hydropower', 'water turbine', 'FERC', 'flood control', 'penstock', 'hydro plant'],
  grid: ['power grid', 'SCADA', 'ICS', 'substation', 'transformer', 'transmission', 'NERC', 'CIP', 'EMS', 'DCS', 'RTU', 'PLC', 'HMI', 'smart grid', 'AMI', 'DERMS', 'Modbus', 'DNP3', 'IEC 61850', 'OT', 'industrial control', 'Industroyer', 'BlackEnergy', 'energy grid', 'electric grid', 'power system', 'SCADA', 'operational technology'],
  natural_gas: ['natural gas', 'LNG', 'pipeline', 'compressor station', 'gas turbine', 'methane', 'PHMSA', 'gas distribution', 'gas pipeline', 'liquefied natural gas'],
  oil: ['oil', 'petroleum', 'refinery', 'crude', 'strategic petroleum', 'SPR', 'petrochemical', 'distillation', 'oil pipeline', 'oil refinery', 'Shamoon', 'Triton', 'TRISIS'],
  water: ['water treatment', 'water utility', 'wastewater', 'drinking water', 'chlorination', 'water system', 'water infrastructure', 'water plant', 'sewage', 'water purification'],
}

// Known threat actor origins with targeting data
export const threatActors: ThreatActor[] = [
  {
    name: 'Volt Typhoon',
    origin: { lat: 39.9, lng: 116.4, name: 'Beijing' },
    country: 'China',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['grid', 'water', 'natural_gas'],
    description: 'Chinese state-sponsored group focused on pre-positioning within US critical infrastructure for potential disruption. Known for living-off-the-land techniques targeting grid operations, water systems, and communications infrastructure.',
  },
  {
    name: 'APT41',
    origin: { lat: 31.2, lng: 121.5, name: 'Shanghai' },
    country: 'China',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['grid', 'oil', 'natural_gas'],
    description: 'Chinese state-sponsored dual espionage and financially motivated group. Targets energy, telecommunications, and technology sectors with supply chain compromises.',
  },
  {
    name: 'Sandworm',
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (GRU Unit 74455)',
    color: '#ff4444',
    targetSectors: ['grid', 'nuclear'],
    description: 'Russian GRU-linked group responsible for BlackEnergy and Industroyer attacks on Ukrainian power grid. Capable of destructive attacks against energy infrastructure and industrial control systems.',
  },
  {
    name: 'APT28',
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (GRU Unit 26165)',
    color: '#ff4444',
    targetSectors: ['grid', 'nuclear', 'oil'],
    description: 'Russian military intelligence group targeting government and energy sectors. Known for spearphishing campaigns and exploitation of network infrastructure devices.',
  },
  {
    name: 'APT29',
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (SVR)',
    color: '#ff6644',
    targetSectors: ['grid', 'nuclear'],
    description: 'Russian SVR foreign intelligence group. Conducted SolarWinds supply chain attack. Targets government networks and critical infrastructure for intelligence collection.',
  },
  {
    name: 'Lazarus',
    origin: { lat: 39.0, lng: 125.8, name: 'Pyongyang' },
    country: 'North Korea',
    type: 'APT',
    color: '#ff2222',
    targetSectors: ['grid', 'nuclear'],
    description: 'North Korean state-sponsored group conducting espionage and financially motivated attacks. Targets energy and defense sectors with destructive malware capabilities.',
  },
  {
    name: 'APT33',
    origin: { lat: 35.7, lng: 51.4, name: 'Tehran' },
    country: 'Iran',
    type: 'APT',
    color: '#ff6600',
    targetSectors: ['oil', 'natural_gas'],
    description: 'Iranian state-sponsored group (Elfin/Refined Kitten) targeting oil, gas, and petrochemical sectors. Associated with destructive wiper malware campaigns including Shamoon variants.',
  },
  {
    name: 'APT35',
    origin: { lat: 35.7, lng: 51.4, name: 'Tehran' },
    country: 'Iran',
    type: 'APT',
    color: '#ff6600',
    targetSectors: ['nuclear', 'oil'],
    description: 'Iranian state-sponsored group (Charming Kitten) conducting espionage against nuclear energy and oil sectors. Uses social engineering and credential harvesting for initial access.',
  },
  {
    name: 'Turla',
    origin: { lat: 55.8, lng: 37.6, name: 'Moscow' },
    country: 'Russia',
    type: 'APT (FSB)',
    color: '#ff5533',
    targetSectors: ['grid', 'nuclear', 'water'],
    description: 'Russian FSB-linked group with highly sophisticated espionage capabilities. Targets government and critical infrastructure networks using satellite-based C2 and custom implants.',
  },
  {
    name: 'Kimsuky',
    origin: { lat: 39.0, lng: 125.8, name: 'Pyongyang' },
    country: 'North Korea',
    type: 'APT',
    color: '#ff3333',
    targetSectors: ['nuclear', 'grid'],
    description: 'North Korean intelligence group targeting nuclear energy research and grid operations. Conducts espionage through spearphishing and watering hole attacks against energy sector personnel.',
  },
]

// US Energy Infrastructure Facilities
export const energyFacilities: EnergyFacility[] = [
  // ===== NUCLEAR POWER PLANTS =====
  { id: 'nuc-palo-verde', lat: 33.39, lng: -112.86, name: 'Palo Verde Nuclear Generating Station', sector: 'nuclear', operator: 'Arizona Public Service', capacity: '3,937 MW' },
  { id: 'nuc-vogtle', lat: 33.14, lng: -81.76, name: 'Vogtle Electric Generating Plant', sector: 'nuclear', operator: 'Southern Nuclear', capacity: '4,600 MW' },
  { id: 'nuc-south-texas', lat: 28.80, lng: -96.05, name: 'South Texas Project', sector: 'nuclear', operator: 'STP Nuclear Operating', capacity: '2,710 MW' },
  { id: 'nuc-browns-ferry', lat: 34.70, lng: -87.12, name: 'Browns Ferry Nuclear Plant', sector: 'nuclear', operator: 'Tennessee Valley Authority', capacity: '3,309 MW' },
  { id: 'nuc-peach-bottom', lat: 39.76, lng: -76.27, name: 'Peach Bottom Atomic Power Station', sector: 'nuclear', operator: 'Exelon Generation', capacity: '2,770 MW' },
  { id: 'nuc-braidwood', lat: 41.24, lng: -88.21, name: 'Braidwood Nuclear Generating Station', sector: 'nuclear', operator: 'Exelon Generation', capacity: '2,386 MW' },
  { id: 'nuc-oconee', lat: 34.79, lng: -82.90, name: 'Oconee Nuclear Station', sector: 'nuclear', operator: 'Duke Energy', capacity: '2,538 MW' },
  { id: 'nuc-watts-bar', lat: 35.60, lng: -84.79, name: 'Watts Bar Nuclear Plant', sector: 'nuclear', operator: 'Tennessee Valley Authority', capacity: '2,330 MW' },
  { id: 'nuc-diablo', lat: 35.21, lng: -120.85, name: 'Diablo Canyon Power Plant', sector: 'nuclear', operator: 'Pacific Gas & Electric', capacity: '2,256 MW' },
  { id: 'nuc-comanche', lat: 32.30, lng: -97.78, name: 'Comanche Peak Nuclear Power Plant', sector: 'nuclear', operator: 'Luminant', capacity: '2,430 MW' },
  { id: 'nuc-calvert', lat: 38.43, lng: -76.44, name: 'Calvert Cliffs Nuclear Power Plant', sector: 'nuclear', operator: 'Exelon Generation', capacity: '1,756 MW' },
  { id: 'nuc-surry', lat: 37.17, lng: -76.70, name: 'Surry Nuclear Power Station', sector: 'nuclear', operator: 'Dominion Energy', capacity: '1,676 MW' },
  { id: 'nuc-columbia', lat: 46.47, lng: -119.33, name: 'Columbia Generating Station', sector: 'nuclear', operator: 'Energy Northwest', capacity: '1,190 MW' },
  { id: 'nuc-grand-gulf', lat: 32.01, lng: -91.05, name: 'Grand Gulf Nuclear Station', sector: 'nuclear', operator: 'Entergy', capacity: '1,443 MW' },
  { id: 'nuc-byron', lat: 42.08, lng: -89.28, name: 'Byron Nuclear Generating Station', sector: 'nuclear', operator: 'Exelon Generation', capacity: '2,347 MW' },

  // ===== HYDROELECTRIC DAMS =====
  { id: 'hyd-grand-coulee', lat: 47.96, lng: -118.98, name: 'Grand Coulee Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '6,809 MW' },
  { id: 'hyd-hoover', lat: 36.02, lng: -114.74, name: 'Hoover Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '2,080 MW' },
  { id: 'hyd-glen-canyon', lat: 36.94, lng: -111.49, name: 'Glen Canyon Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '1,320 MW' },
  { id: 'hyd-chief-joseph', lat: 47.99, lng: -119.63, name: 'Chief Joseph Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '2,614 MW' },
  { id: 'hyd-niagara', lat: 43.14, lng: -79.04, name: 'Robert Moses Niagara Power Plant', sector: 'hydro', operator: 'New York Power Authority', capacity: '2,675 MW' },
  { id: 'hyd-bonneville', lat: 45.64, lng: -121.94, name: 'Bonneville Dam', sector: 'hydro', operator: 'US Army Corps of Engineers / BPA', capacity: '1,084 MW' },
  { id: 'hyd-john-day', lat: 45.72, lng: -120.69, name: 'John Day Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '2,160 MW' },
  { id: 'hyd-dalles', lat: 45.62, lng: -121.13, name: 'The Dalles Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '1,779 MW' },
  { id: 'hyd-shasta', lat: 40.72, lng: -122.42, name: 'Shasta Dam', sector: 'hydro', operator: 'US Bureau of Reclamation', capacity: '676 MW' },
  { id: 'hyd-oroville', lat: 39.54, lng: -121.48, name: 'Oroville Dam', sector: 'hydro', operator: 'CA Dept of Water Resources', capacity: '819 MW' },
  { id: 'hyd-fort-peck', lat: 48.00, lng: -106.41, name: 'Fort Peck Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '185 MW' },
  { id: 'hyd-garrison', lat: 47.50, lng: -101.43, name: 'Garrison Dam', sector: 'hydro', operator: 'US Army Corps of Engineers', capacity: '583 MW' },

  // ===== GRID OPERATIONS / ISOs & RTOs =====
  { id: 'grd-pjm', lat: 40.09, lng: -75.47, name: 'PJM Interconnection', sector: 'grid', operator: 'PJM', capacity: '180 GW peak' },
  { id: 'grd-ercot', lat: 30.57, lng: -97.42, name: 'ERCOT Control Center', sector: 'grid', operator: 'ERCOT', capacity: '85 GW peak' },
  { id: 'grd-caiso', lat: 38.68, lng: -121.18, name: 'California ISO (CAISO)', sector: 'grid', operator: 'CAISO', capacity: '50 GW peak' },
  { id: 'grd-miso', lat: 39.98, lng: -86.13, name: 'MISO Control Center', sector: 'grid', operator: 'MISO', capacity: '127 GW peak' },
  { id: 'grd-spp', lat: 34.75, lng: -92.29, name: 'Southwest Power Pool', sector: 'grid', operator: 'SPP', capacity: '54 GW peak' },
  { id: 'grd-nyiso', lat: 42.64, lng: -73.74, name: 'New York ISO', sector: 'grid', operator: 'NYISO', capacity: '33 GW peak' },
  { id: 'grd-isone', lat: 42.20, lng: -72.62, name: 'ISO New England', sector: 'grid', operator: 'ISO-NE', capacity: '25 GW peak' },
  { id: 'grd-bpa', lat: 45.63, lng: -122.67, name: 'BPA Transmission Control', sector: 'grid', operator: 'Bonneville Power Administration', capacity: '31,000 mi transmission' },
  { id: 'grd-tva', lat: 35.05, lng: -85.31, name: 'TVA System Operations Center', sector: 'grid', operator: 'Tennessee Valley Authority', capacity: '30 GW capacity' },

  // ===== NATURAL GAS / LNG =====
  { id: 'gas-henry-hub', lat: 29.92, lng: -92.08, name: 'Henry Hub Natural Gas Terminal', sector: 'natural_gas', operator: 'Sabine Pipe Line LLC', capacity: 'US pricing benchmark' },
  { id: 'gas-sabine', lat: 29.77, lng: -93.84, name: 'Sabine Pass LNG Terminal', sector: 'natural_gas', operator: 'Cheniere Energy', capacity: '30 MTPA' },
  { id: 'gas-freeport', lat: 28.94, lng: -95.31, name: 'Freeport LNG Terminal', sector: 'natural_gas', operator: 'Freeport LNG', capacity: '15 MTPA' },
  { id: 'gas-cameron', lat: 30.01, lng: -93.33, name: 'Cameron LNG Terminal', sector: 'natural_gas', operator: 'Sempra Energy', capacity: '12 MTPA' },
  { id: 'gas-cove-point', lat: 38.40, lng: -76.39, name: 'Cove Point LNG Terminal', sector: 'natural_gas', operator: 'Dominion Energy', capacity: '5.25 MTPA' },
  { id: 'gas-elba', lat: 32.09, lng: -81.05, name: 'Elba Island LNG Terminal', sector: 'natural_gas', operator: 'Southern LNG', capacity: '2.5 MTPA' },
  { id: 'gas-corpus', lat: 27.83, lng: -97.20, name: 'Corpus Christi LNG Terminal', sector: 'natural_gas', operator: 'Cheniere Energy', capacity: '25 MTPA' },
  { id: 'gas-golden-pass', lat: 29.75, lng: -93.87, name: 'Golden Pass LNG Terminal', sector: 'natural_gas', operator: 'ExxonMobil / QatarEnergy', capacity: '18 MTPA' },

  // ===== OIL & PETROLEUM =====
  { id: 'oil-spr-bryan', lat: 29.05, lng: -95.44, name: 'Strategic Petroleum Reserve (Bryan Mound)', sector: 'oil', operator: 'US Dept of Energy', capacity: '247M barrels capacity' },
  { id: 'oil-cushing', lat: 35.98, lng: -96.77, name: 'Cushing Oil Hub', sector: 'oil', operator: 'Multiple operators', capacity: 'US pricing benchmark' },
  { id: 'oil-port-arthur', lat: 29.90, lng: -93.93, name: 'Motiva Port Arthur Refinery', sector: 'oil', operator: 'Saudi Aramco / Motiva', capacity: '636,500 bbl/day' },
  { id: 'oil-baytown', lat: 29.75, lng: -95.01, name: 'ExxonMobil Baytown Refinery', sector: 'oil', operator: 'ExxonMobil', capacity: '584,000 bbl/day' },
  { id: 'oil-garyville', lat: 30.06, lng: -90.62, name: 'Marathon Garyville Refinery', sector: 'oil', operator: 'Marathon Petroleum', capacity: '578,000 bbl/day' },
  { id: 'oil-whiting', lat: 41.68, lng: -87.50, name: 'BP Whiting Refinery', sector: 'oil', operator: 'BP', capacity: '440,000 bbl/day' },
  { id: 'oil-baton-rouge', lat: 30.50, lng: -91.19, name: 'ExxonMobil Baton Rouge Refinery', sector: 'oil', operator: 'ExxonMobil', capacity: '502,500 bbl/day' },
  { id: 'oil-el-segundo', lat: 33.91, lng: -118.41, name: 'Chevron El Segundo Refinery', sector: 'oil', operator: 'Chevron', capacity: '290,000 bbl/day' },

  // ===== WATER SYSTEMS =====
  { id: 'wtr-jardine', lat: 41.90, lng: -87.61, name: 'Jardine Water Purification Plant', sector: 'water', operator: 'City of Chicago DWM', capacity: '1.4B gallons/day' },
  { id: 'wtr-blue-plains', lat: 38.84, lng: -77.01, name: 'Blue Plains Advanced WWTP', sector: 'water', operator: 'DC Water', capacity: '384M gallons/day' },
  { id: 'wtr-newtown', lat: 40.74, lng: -73.95, name: 'Newtown Creek WWTP', sector: 'water', operator: 'NYC Dept of Environmental Protection', capacity: '310M gallons/day' },
  { id: 'wtr-hyperion', lat: 33.92, lng: -118.42, name: 'Hyperion Water Reclamation Plant', sector: 'water', operator: 'LA Bureau of Sanitation', capacity: '450M gallons/day' },
  { id: 'wtr-southeast', lat: 37.75, lng: -122.39, name: 'Southeast Water Pollution Control Plant', sector: 'water', operator: 'SFPUC', capacity: '85M gallons/day' },
  { id: 'wtr-detroit', lat: 42.29, lng: -83.09, name: 'Great Lakes Water Authority WTP', sector: 'water', operator: 'GLWA', capacity: '720M gallons/day' },
]

// Region color mapping for the globe land dots
export const regionColors: Record<string, string> = {
  na: '#4a9eff',
  sa: '#4ac7ff',
  eu: '#6b8aff',
  ru: '#ff8844',
  af: '#66cc88',
  me: '#ffaa44',
  as: '#ff9944',
  oc: '#44ddaa',
}

// Simplified landmass dot coordinates for globe visualization
export const landPoints: GeoPoint[] = [
  // ===== NORTH AMERICA =====
  { lat: 64, lng: -153, region: 'na' }, { lat: 61, lng: -150, region: 'na' },
  { lat: 58, lng: -134, region: 'na' }, { lat: 66, lng: -162, region: 'na' },
  { lat: 71, lng: -156, region: 'na' }, { lat: 63, lng: -145, region: 'na' },
  { lat: 49, lng: -123, region: 'na' }, { lat: 53, lng: -122, region: 'na' },
  { lat: 55, lng: -120, region: 'na' }, { lat: 58, lng: -122, region: 'na' },
  { lat: 60, lng: -129, region: 'na' }, { lat: 60, lng: -115, region: 'na' },
  { lat: 55, lng: -110, region: 'na' }, { lat: 52, lng: -106, region: 'na' },
  { lat: 50, lng: -100, region: 'na' }, { lat: 53, lng: -95, region: 'na' },
  { lat: 56, lng: -90, region: 'na' }, { lat: 48, lng: -85, region: 'na' },
  { lat: 46, lng: -79, region: 'na' }, { lat: 48, lng: -72, region: 'na' },
  { lat: 47, lng: -67, region: 'na' }, { lat: 52, lng: -60, region: 'na' },
  { lat: 56, lng: -61, region: 'na' }, { lat: 60, lng: -64, region: 'na' },
  { lat: 63, lng: -68, region: 'na' }, { lat: 68, lng: -95, region: 'na' },
  { lat: 65, lng: -85, region: 'na' }, { lat: 70, lng: -120, region: 'na' },
  { lat: 73, lng: -80, region: 'na' }, { lat: 75, lng: -95, region: 'na' },
  { lat: 48, lng: -124, region: 'na' }, { lat: 45, lng: -124, region: 'na' },
  { lat: 42, lng: -124, region: 'na' }, { lat: 38, lng: -123, region: 'na' },
  { lat: 35, lng: -120, region: 'na' }, { lat: 34, lng: -119, region: 'na' },
  { lat: 33, lng: -117, region: 'na' }, { lat: 32, lng: -117, region: 'na' },
  { lat: 47, lng: -117, region: 'na' }, { lat: 47, lng: -111, region: 'na' },
  { lat: 47, lng: -104, region: 'na' }, { lat: 45, lng: -93, region: 'na' },
  { lat: 43, lng: -89, region: 'na' }, { lat: 42, lng: -83, region: 'na' },
  { lat: 39, lng: -105, region: 'na' }, { lat: 39, lng: -95, region: 'na' },
  { lat: 37, lng: -97, region: 'na' }, { lat: 35, lng: -97, region: 'na' },
  { lat: 35, lng: -90, region: 'na' }, { lat: 33, lng: -87, region: 'na' },
  { lat: 31, lng: -90, region: 'na' }, { lat: 30, lng: -95, region: 'na' },
  { lat: 42, lng: -71, region: 'na' }, { lat: 40, lng: -74, region: 'na' },
  { lat: 39, lng: -76, region: 'na' }, { lat: 37, lng: -76, region: 'na' },
  { lat: 35, lng: -79, region: 'na' }, { lat: 33, lng: -80, region: 'na' },
  { lat: 30, lng: -82, region: 'na' }, { lat: 27, lng: -80, region: 'na' },
  { lat: 26, lng: -80, region: 'na' }, { lat: 25, lng: -81, region: 'na' },
  { lat: 32, lng: -117, region: 'na' }, { lat: 30, lng: -110, region: 'na' },
  { lat: 27, lng: -109, region: 'na' }, { lat: 24, lng: -107, region: 'na' },
  { lat: 23, lng: -105, region: 'na' }, { lat: 20, lng: -103, region: 'na' },
  { lat: 19, lng: -99, region: 'na' }, { lat: 17, lng: -97, region: 'na' },
  { lat: 19, lng: -90, region: 'na' }, { lat: 21, lng: -87, region: 'na' },
  { lat: 15, lng: -90, region: 'na' }, { lat: 12, lng: -85, region: 'na' },
  { lat: 10, lng: -84, region: 'na' }, { lat: 9, lng: -80, region: 'na' },
  { lat: 19, lng: -72, region: 'na' }, { lat: 18, lng: -77, region: 'na' },
  { lat: 22, lng: -80, region: 'na' }, { lat: 18, lng: -66, region: 'na' },

  // ===== SOUTH AMERICA =====
  { lat: 10, lng: -67, region: 'sa' }, { lat: 8, lng: -63, region: 'sa' },
  { lat: 7, lng: -58, region: 'sa' }, { lat: 5, lng: -52, region: 'sa' },
  { lat: 2, lng: -50, region: 'sa' }, { lat: 0, lng: -50, region: 'sa' },
  { lat: -3, lng: -60, region: 'sa' }, { lat: -3, lng: -42, region: 'sa' },
  { lat: -5, lng: -35, region: 'sa' }, { lat: -8, lng: -35, region: 'sa' },
  { lat: -10, lng: -37, region: 'sa' }, { lat: -13, lng: -38, region: 'sa' },
  { lat: -15, lng: -47, region: 'sa' }, { lat: -10, lng: -55, region: 'sa' },
  { lat: -15, lng: -50, region: 'sa' }, { lat: -20, lng: -44, region: 'sa' },
  { lat: -23, lng: -43, region: 'sa' }, { lat: -25, lng: -48, region: 'sa' },
  { lat: -28, lng: -49, region: 'sa' }, { lat: -30, lng: -51, region: 'sa' },
  { lat: -33, lng: -52, region: 'sa' }, { lat: -20, lng: -55, region: 'sa' },
  { lat: -25, lng: -55, region: 'sa' }, { lat: -5, lng: -81, region: 'sa' },
  { lat: -8, lng: -80, region: 'sa' }, { lat: -12, lng: -77, region: 'sa' },
  { lat: -16, lng: -73, region: 'sa' }, { lat: -20, lng: -70, region: 'sa' },
  { lat: -27, lng: -70, region: 'sa' }, { lat: -33, lng: -72, region: 'sa' },
  { lat: -40, lng: -74, region: 'sa' }, { lat: -46, lng: -68, region: 'sa' },
  { lat: -50, lng: -70, region: 'sa' }, { lat: -54, lng: -69, region: 'sa' },
  { lat: 4, lng: -74, region: 'sa' }, { lat: -1, lng: -78, region: 'sa' },

  // ===== EUROPE =====
  { lat: 70, lng: 25, region: 'eu' }, { lat: 68, lng: 16, region: 'eu' },
  { lat: 65, lng: 14, region: 'eu' }, { lat: 63, lng: 10, region: 'eu' },
  { lat: 60, lng: 5, region: 'eu' }, { lat: 58, lng: 12, region: 'eu' },
  { lat: 56, lng: 10, region: 'eu' }, { lat: 60, lng: 18, region: 'eu' },
  { lat: 63, lng: 20, region: 'eu' }, { lat: 66, lng: 26, region: 'eu' },
  { lat: 58, lng: -5, region: 'eu' }, { lat: 56, lng: -3, region: 'eu' },
  { lat: 54, lng: -3, region: 'eu' }, { lat: 52, lng: -1, region: 'eu' },
  { lat: 51, lng: 0, region: 'eu' }, { lat: 50, lng: -5, region: 'eu' },
  { lat: 53, lng: -6, region: 'eu' }, { lat: 55, lng: -7, region: 'eu' },
  { lat: 49, lng: 2, region: 'eu' }, { lat: 47, lng: 2, region: 'eu' },
  { lat: 44, lng: 0, region: 'eu' }, { lat: 43, lng: -8, region: 'eu' },
  { lat: 37, lng: -8, region: 'eu' }, { lat: 36, lng: -6, region: 'eu' },
  { lat: 38, lng: -1, region: 'eu' }, { lat: 40, lng: -4, region: 'eu' },
  { lat: 42, lng: 3, region: 'eu' }, { lat: 44, lng: 6, region: 'eu' },
  { lat: 54, lng: 10, region: 'eu' }, { lat: 52, lng: 13, region: 'eu' },
  { lat: 50, lng: 14, region: 'eu' }, { lat: 48, lng: 16, region: 'eu' },
  { lat: 47, lng: 11, region: 'eu' }, { lat: 46, lng: 14, region: 'eu' },
  { lat: 52, lng: 21, region: 'eu' }, { lat: 50, lng: 24, region: 'eu' },
  { lat: 48, lng: 24, region: 'eu' }, { lat: 46, lng: 24, region: 'eu' },
  { lat: 44, lng: 26, region: 'eu' }, { lat: 47, lng: 28, region: 'eu' },
  { lat: 41, lng: 12, region: 'eu' }, { lat: 40, lng: 18, region: 'eu' },
  { lat: 38, lng: 24, region: 'eu' }, { lat: 37, lng: 23, region: 'eu' },
  { lat: 35, lng: 25, region: 'eu' }, { lat: 42, lng: 18, region: 'eu' },

  // ===== RUSSIA =====
  { lat: 60, lng: 30, region: 'ru' }, { lat: 56, lng: 44, region: 'ru' },
  { lat: 55, lng: 38, region: 'ru' }, { lat: 54, lng: 56, region: 'ru' },
  { lat: 55, lng: 73, region: 'ru' }, { lat: 57, lng: 60, region: 'ru' },
  { lat: 60, lng: 60, region: 'ru' }, { lat: 62, lng: 40, region: 'ru' },
  { lat: 64, lng: 40, region: 'ru' }, { lat: 66, lng: 44, region: 'ru' },
  { lat: 56, lng: 85, region: 'ru' }, { lat: 55, lng: 83, region: 'ru' },
  { lat: 52, lng: 104, region: 'ru' }, { lat: 58, lng: 92, region: 'ru' },
  { lat: 60, lng: 120, region: 'ru' }, { lat: 58, lng: 130, region: 'ru' },
  { lat: 55, lng: 132, region: 'ru' }, { lat: 48, lng: 135, region: 'ru' },
  { lat: 50, lng: 130, region: 'ru' }, { lat: 64, lng: 140, region: 'ru' },
  { lat: 60, lng: 150, region: 'ru' }, { lat: 62, lng: 160, region: 'ru' },
  { lat: 65, lng: 170, region: 'ru' }, { lat: 68, lng: 180, region: 'ru' },

  // ===== AFRICA =====
  { lat: 37, lng: 10, region: 'af' }, { lat: 35, lng: 0, region: 'af' },
  { lat: 33, lng: -7, region: 'af' }, { lat: 30, lng: -10, region: 'af' },
  { lat: 27, lng: -13, region: 'af' }, { lat: 32, lng: 13, region: 'af' },
  { lat: 34, lng: 10, region: 'af' }, { lat: 36, lng: 3, region: 'af' },
  { lat: 30, lng: 3, region: 'af' }, { lat: 28, lng: 10, region: 'af' },
  { lat: 31, lng: 30, region: 'af' }, { lat: 30, lng: 31, region: 'af' },
  { lat: 27, lng: 34, region: 'af' }, { lat: 24, lng: 33, region: 'af' },
  { lat: 15, lng: 33, region: 'af' }, { lat: 9, lng: 38, region: 'af' },
  { lat: 14, lng: -17, region: 'af' }, { lat: 12, lng: -16, region: 'af' },
  { lat: 10, lng: -14, region: 'af' }, { lat: 7, lng: -8, region: 'af' },
  { lat: 5, lng: -4, region: 'af' }, { lat: 6, lng: 2, region: 'af' },
  { lat: 4, lng: 10, region: 'af' }, { lat: 10, lng: 0, region: 'af' },
  { lat: 5, lng: 18, region: 'af' }, { lat: 0, lng: 30, region: 'af' },
  { lat: -2, lng: 29, region: 'af' }, { lat: -6, lng: 35, region: 'af' },
  { lat: -4, lng: 18, region: 'af' }, { lat: 2, lng: 45, region: 'af' },
  { lat: 12, lng: 42, region: 'af' }, { lat: 8, lng: 48, region: 'af' },
  { lat: -15, lng: 28, region: 'af' }, { lat: -8, lng: 32, region: 'af' },
  { lat: -20, lng: 30, region: 'af' }, { lat: -25, lng: 25, region: 'af' },
  { lat: -26, lng: 28, region: 'af' }, { lat: -30, lng: 30, region: 'af' },
  { lat: -34, lng: 26, region: 'af' }, { lat: -34, lng: 18, region: 'af' },
  { lat: -22, lng: 14, region: 'af' }, { lat: -18, lng: 12, region: 'af' },
  { lat: -12, lng: 17, region: 'af' }, { lat: -15, lng: 35, region: 'af' },

  // ===== MIDDLE EAST =====
  { lat: 33, lng: 44, region: 'me' }, { lat: 30, lng: 47, region: 'me' },
  { lat: 25, lng: 45, region: 'me' }, { lat: 24, lng: 54, region: 'me' },
  { lat: 22, lng: 59, region: 'me' }, { lat: 25, lng: 51, region: 'me' },
  { lat: 32, lng: 36, region: 'me' }, { lat: 37, lng: 40, region: 'me' },
  { lat: 39, lng: 33, region: 'me' }, { lat: 36, lng: 44, region: 'me' },

  // ===== SOUTH ASIA =====
  { lat: 28, lng: 77, region: 'as' }, { lat: 26, lng: 80, region: 'as' },
  { lat: 23, lng: 72, region: 'as' }, { lat: 20, lng: 73, region: 'as' },
  { lat: 17, lng: 78, region: 'as' }, { lat: 13, lng: 80, region: 'as' },
  { lat: 8, lng: 77, region: 'as' }, { lat: 21, lng: 88, region: 'as' },
  { lat: 23, lng: 90, region: 'as' }, { lat: 30, lng: 78, region: 'as' },
  { lat: 34, lng: 74, region: 'as' }, { lat: 28, lng: 84, region: 'as' },
  { lat: 7, lng: 80, region: 'as' },

  // ===== CENTRAL ASIA =====
  { lat: 42, lng: 60, region: 'as' }, { lat: 40, lng: 65, region: 'as' },
  { lat: 38, lng: 58, region: 'as' }, { lat: 42, lng: 70, region: 'as' },
  { lat: 44, lng: 65, region: 'as' }, { lat: 48, lng: 52, region: 'as' },
  { lat: 45, lng: 75, region: 'as' }, { lat: 43, lng: 77, region: 'as' },

  // ===== EAST ASIA =====
  { lat: 40, lng: 116, region: 'as' }, { lat: 35, lng: 117, region: 'as' },
  { lat: 31, lng: 121, region: 'as' }, { lat: 25, lng: 118, region: 'as' },
  { lat: 23, lng: 113, region: 'as' }, { lat: 22, lng: 114, region: 'as' },
  { lat: 25, lng: 102, region: 'as' }, { lat: 30, lng: 104, region: 'as' },
  { lat: 35, lng: 104, region: 'as' }, { lat: 38, lng: 106, region: 'as' },
  { lat: 40, lng: 112, region: 'as' }, { lat: 43, lng: 87, region: 'as' },
  { lat: 45, lng: 125, region: 'as' }, { lat: 48, lng: 125, region: 'as' },
  { lat: 35, lng: 129, region: 'as' }, { lat: 35, lng: 135, region: 'as' },
  { lat: 37, lng: 137, region: 'as' }, { lat: 39, lng: 140, region: 'as' },
  { lat: 42, lng: 141, region: 'as' }, { lat: 33, lng: 131, region: 'as' },
  { lat: 38, lng: 127, region: 'as' }, { lat: 36, lng: 127, region: 'as' },
  { lat: 34, lng: 126, region: 'as' },
  { lat: 25, lng: 121, region: 'as' }, { lat: 23, lng: 120, region: 'as' },

  // ===== SOUTHEAST ASIA =====
  { lat: 13, lng: 100, region: 'as' }, { lat: 10, lng: 99, region: 'as' },
  { lat: 7, lng: 100, region: 'as' }, { lat: 1, lng: 104, region: 'as' },
  { lat: -2, lng: 106, region: 'as' }, { lat: -7, lng: 110, region: 'as' },
  { lat: -8, lng: 112, region: 'as' }, { lat: 2, lng: 111, region: 'as' },
  { lat: 5, lng: 115, region: 'as' }, { lat: 15, lng: 101, region: 'as' },
  { lat: 18, lng: 103, region: 'as' }, { lat: 21, lng: 106, region: 'as' },
  { lat: 14, lng: 121, region: 'as' }, { lat: 10, lng: 124, region: 'as' },
  { lat: 7, lng: 126, region: 'as' },

  // ===== OCEANIA =====
  { lat: -12, lng: 131, region: 'oc' }, { lat: -15, lng: 129, region: 'oc' },
  { lat: -17, lng: 122, region: 'oc' }, { lat: -20, lng: 119, region: 'oc' },
  { lat: -24, lng: 114, region: 'oc' }, { lat: -28, lng: 114, region: 'oc' },
  { lat: -32, lng: 116, region: 'oc' }, { lat: -35, lng: 117, region: 'oc' },
  { lat: -35, lng: 137, region: 'oc' }, { lat: -38, lng: 145, region: 'oc' },
  { lat: -37, lng: 150, region: 'oc' }, { lat: -34, lng: 151, region: 'oc' },
  { lat: -27, lng: 153, region: 'oc' }, { lat: -23, lng: 150, region: 'oc' },
  { lat: -19, lng: 146, region: 'oc' }, { lat: -16, lng: 145, region: 'oc' },
  { lat: -12, lng: 137, region: 'oc' }, { lat: -25, lng: 134, region: 'oc' },
  { lat: -30, lng: 136, region: 'oc' }, { lat: -28, lng: 142, region: 'oc' },
  { lat: -37, lng: 175, region: 'oc' }, { lat: -39, lng: 176, region: 'oc' },
  { lat: -41, lng: 175, region: 'oc' }, { lat: -44, lng: 170, region: 'oc' },
  { lat: -46, lng: 168, region: 'oc' },
  { lat: -18, lng: 178, region: 'oc' }, { lat: -14, lng: 167, region: 'oc' },
  { lat: -9, lng: 160, region: 'oc' }, { lat: -6, lng: 155, region: 'oc' },
]
