import * as THREE from 'three'

export interface GeoPoint {
  lat: number
  lng: number
  name?: string
  region?: string
}

export interface ThreatActor {
  name: string
  origin: GeoPoint
  country: string
  type: string
  color: string
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
  target: GeoPoint,
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

// Known threat actor origins
export const threatActors: ThreatActor[] = [
  { name: 'Volt Typhoon', origin: { lat: 31.2, lng: 121.5 }, country: 'China', type: 'apt', color: '#ff3333' },
  { name: 'APT41', origin: { lat: 23.1, lng: 113.3 }, country: 'China', type: 'apt', color: '#ff3333' },
  { name: 'Sandworm', origin: { lat: 55.8, lng: 37.6 }, country: 'Russia', type: 'apt', color: '#ff4444' },
  { name: 'APT28', origin: { lat: 59.9, lng: 30.3 }, country: 'Russia', type: 'apt', color: '#ff4444' },
  { name: 'APT29', origin: { lat: 55.8, lng: 37.6 }, country: 'Russia', type: 'apt', color: '#ff6644' },
  { name: 'Lazarus', origin: { lat: 39.0, lng: 125.8 }, country: 'North Korea', type: 'apt', color: '#ff2222' },
  { name: 'APT33', origin: { lat: 35.7, lng: 51.4 }, country: 'Iran', type: 'apt', color: '#ff6600' },
  { name: 'APT35', origin: { lat: 32.7, lng: 53.7 }, country: 'Iran', type: 'apt', color: '#ff6600' },
  { name: 'Turla', origin: { lat: 55.8, lng: 37.6 }, country: 'Russia', type: 'apt', color: '#ff5533' },
  { name: 'Kimsuky', origin: { lat: 39.0, lng: 125.8 }, country: 'North Korea', type: 'apt', color: '#ff3333' },
]

// US energy infrastructure targets
export const energyTargets: GeoPoint[] = [
  { lat: 29.76, lng: -95.37, name: 'Houston Energy Hub', region: 'energy' },
  { lat: 40.71, lng: -74.01, name: 'NYC Grid', region: 'energy' },
  { lat: 38.91, lng: -77.04, name: 'Washington DC', region: 'energy' },
  { lat: 41.88, lng: -87.63, name: 'Chicago Grid', region: 'energy' },
  { lat: 34.05, lng: -118.24, name: 'LA Power Grid', region: 'energy' },
  { lat: 39.74, lng: -104.99, name: 'Denver Hub', region: 'energy' },
  { lat: 33.75, lng: -84.39, name: 'Atlanta Grid', region: 'energy' },
  { lat: 47.61, lng: -122.33, name: 'Seattle BPA', region: 'energy' },
  { lat: 36.17, lng: -115.14, name: 'Hoover Dam Region', region: 'energy' },
  { lat: 30.27, lng: -97.74, name: 'Austin ERCOT', region: 'energy' },
  { lat: 44.98, lng: -93.27, name: 'Minneapolis Grid', region: 'energy' },
  { lat: 25.76, lng: -80.19, name: 'Miami FPL', region: 'energy' },
]

// Simplified landmass dot coordinates for globe visualization
// Organized by continent with enough density to see shapes
export const landPoints: GeoPoint[] = [
  // ===== NORTH AMERICA =====
  // Alaska
  { lat: 64, lng: -153, region: 'na' }, { lat: 61, lng: -150, region: 'na' },
  { lat: 58, lng: -134, region: 'na' }, { lat: 66, lng: -162, region: 'na' },
  { lat: 71, lng: -156, region: 'na' }, { lat: 63, lng: -145, region: 'na' },
  // Canada
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
  // US West Coast
  { lat: 48, lng: -124, region: 'na' }, { lat: 45, lng: -124, region: 'na' },
  { lat: 42, lng: -124, region: 'na' }, { lat: 38, lng: -123, region: 'na' },
  { lat: 35, lng: -120, region: 'na' }, { lat: 34, lng: -119, region: 'na' },
  { lat: 33, lng: -117, region: 'na' }, { lat: 32, lng: -117, region: 'na' },
  // US Interior
  { lat: 47, lng: -117, region: 'na' }, { lat: 47, lng: -111, region: 'na' },
  { lat: 47, lng: -104, region: 'na' }, { lat: 45, lng: -93, region: 'na' },
  { lat: 43, lng: -89, region: 'na' }, { lat: 42, lng: -83, region: 'na' },
  { lat: 39, lng: -105, region: 'na' }, { lat: 39, lng: -95, region: 'na' },
  { lat: 37, lng: -97, region: 'na' }, { lat: 35, lng: -97, region: 'na' },
  { lat: 35, lng: -90, region: 'na' }, { lat: 33, lng: -87, region: 'na' },
  { lat: 31, lng: -90, region: 'na' }, { lat: 30, lng: -95, region: 'na' },
  // US East Coast
  { lat: 42, lng: -71, region: 'na' }, { lat: 40, lng: -74, region: 'na' },
  { lat: 39, lng: -76, region: 'na' }, { lat: 37, lng: -76, region: 'na' },
  { lat: 35, lng: -79, region: 'na' }, { lat: 33, lng: -80, region: 'na' },
  { lat: 30, lng: -82, region: 'na' }, { lat: 27, lng: -80, region: 'na' },
  { lat: 26, lng: -80, region: 'na' }, { lat: 25, lng: -81, region: 'na' },
  // Mexico
  { lat: 32, lng: -117, region: 'na' }, { lat: 30, lng: -110, region: 'na' },
  { lat: 27, lng: -109, region: 'na' }, { lat: 24, lng: -107, region: 'na' },
  { lat: 23, lng: -105, region: 'na' }, { lat: 20, lng: -103, region: 'na' },
  { lat: 19, lng: -99, region: 'na' }, { lat: 17, lng: -97, region: 'na' },
  { lat: 19, lng: -90, region: 'na' }, { lat: 21, lng: -87, region: 'na' },
  // Central America & Caribbean
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
  // Scandinavia
  { lat: 70, lng: 25, region: 'eu' }, { lat: 68, lng: 16, region: 'eu' },
  { lat: 65, lng: 14, region: 'eu' }, { lat: 63, lng: 10, region: 'eu' },
  { lat: 60, lng: 5, region: 'eu' }, { lat: 58, lng: 12, region: 'eu' },
  { lat: 56, lng: 10, region: 'eu' }, { lat: 60, lng: 18, region: 'eu' },
  { lat: 63, lng: 20, region: 'eu' }, { lat: 66, lng: 26, region: 'eu' },
  // UK & Ireland
  { lat: 58, lng: -5, region: 'eu' }, { lat: 56, lng: -3, region: 'eu' },
  { lat: 54, lng: -3, region: 'eu' }, { lat: 52, lng: -1, region: 'eu' },
  { lat: 51, lng: 0, region: 'eu' }, { lat: 50, lng: -5, region: 'eu' },
  { lat: 53, lng: -6, region: 'eu' }, { lat: 55, lng: -7, region: 'eu' },
  // Western Europe
  { lat: 49, lng: 2, region: 'eu' }, { lat: 47, lng: 2, region: 'eu' },
  { lat: 44, lng: 0, region: 'eu' }, { lat: 43, lng: -8, region: 'eu' },
  { lat: 37, lng: -8, region: 'eu' }, { lat: 36, lng: -6, region: 'eu' },
  { lat: 38, lng: -1, region: 'eu' }, { lat: 40, lng: -4, region: 'eu' },
  { lat: 42, lng: 3, region: 'eu' }, { lat: 44, lng: 6, region: 'eu' },
  // Central Europe
  { lat: 54, lng: 10, region: 'eu' }, { lat: 52, lng: 13, region: 'eu' },
  { lat: 50, lng: 14, region: 'eu' }, { lat: 48, lng: 16, region: 'eu' },
  { lat: 47, lng: 11, region: 'eu' }, { lat: 46, lng: 14, region: 'eu' },
  // Eastern Europe
  { lat: 52, lng: 21, region: 'eu' }, { lat: 50, lng: 24, region: 'eu' },
  { lat: 48, lng: 24, region: 'eu' }, { lat: 46, lng: 24, region: 'eu' },
  { lat: 44, lng: 26, region: 'eu' }, { lat: 47, lng: 28, region: 'eu' },
  // Mediterranean
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
  // North Africa
  { lat: 37, lng: 10, region: 'af' }, { lat: 35, lng: 0, region: 'af' },
  { lat: 33, lng: -7, region: 'af' }, { lat: 30, lng: -10, region: 'af' },
  { lat: 27, lng: -13, region: 'af' }, { lat: 32, lng: 13, region: 'af' },
  { lat: 34, lng: 10, region: 'af' }, { lat: 36, lng: 3, region: 'af' },
  { lat: 30, lng: 3, region: 'af' }, { lat: 28, lng: 10, region: 'af' },
  // Egypt / NE Africa
  { lat: 31, lng: 30, region: 'af' }, { lat: 30, lng: 31, region: 'af' },
  { lat: 27, lng: 34, region: 'af' }, { lat: 24, lng: 33, region: 'af' },
  { lat: 15, lng: 33, region: 'af' }, { lat: 9, lng: 38, region: 'af' },
  // West Africa
  { lat: 14, lng: -17, region: 'af' }, { lat: 12, lng: -16, region: 'af' },
  { lat: 10, lng: -14, region: 'af' }, { lat: 7, lng: -8, region: 'af' },
  { lat: 5, lng: -4, region: 'af' }, { lat: 6, lng: 2, region: 'af' },
  { lat: 4, lng: 10, region: 'af' }, { lat: 10, lng: 0, region: 'af' },
  // Central & East Africa
  { lat: 5, lng: 18, region: 'af' }, { lat: 0, lng: 30, region: 'af' },
  { lat: -2, lng: 29, region: 'af' }, { lat: -6, lng: 35, region: 'af' },
  { lat: -4, lng: 18, region: 'af' }, { lat: 2, lng: 45, region: 'af' },
  { lat: 12, lng: 42, region: 'af' }, { lat: 8, lng: 48, region: 'af' },
  // Southern Africa
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
  // China
  { lat: 40, lng: 116, region: 'as' }, { lat: 35, lng: 117, region: 'as' },
  { lat: 31, lng: 121, region: 'as' }, { lat: 25, lng: 118, region: 'as' },
  { lat: 23, lng: 113, region: 'as' }, { lat: 22, lng: 114, region: 'as' },
  { lat: 25, lng: 102, region: 'as' }, { lat: 30, lng: 104, region: 'as' },
  { lat: 35, lng: 104, region: 'as' }, { lat: 38, lng: 106, region: 'as' },
  { lat: 40, lng: 112, region: 'as' }, { lat: 43, lng: 87, region: 'as' },
  { lat: 45, lng: 125, region: 'as' }, { lat: 48, lng: 125, region: 'as' },
  // Japan & Korea
  { lat: 35, lng: 129, region: 'as' }, { lat: 35, lng: 135, region: 'as' },
  { lat: 37, lng: 137, region: 'as' }, { lat: 39, lng: 140, region: 'as' },
  { lat: 42, lng: 141, region: 'as' }, { lat: 33, lng: 131, region: 'as' },
  { lat: 38, lng: 127, region: 'as' }, { lat: 36, lng: 127, region: 'as' },
  { lat: 34, lng: 126, region: 'as' },
  // Taiwan
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
  // Australia
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
  // New Zealand
  { lat: -37, lng: 175, region: 'oc' }, { lat: -39, lng: 176, region: 'oc' },
  { lat: -41, lng: 175, region: 'oc' }, { lat: -44, lng: 170, region: 'oc' },
  { lat: -46, lng: 168, region: 'oc' },
  // Pacific Islands
  { lat: -18, lng: 178, region: 'oc' }, { lat: -14, lng: 167, region: 'oc' },
  { lat: -9, lng: 160, region: 'oc' }, { lat: -6, lng: 155, region: 'oc' },
]

// Region color mapping for the globe dots
export const regionColors: Record<string, string> = {
  na: '#4a9eff',  // North America - blue
  sa: '#4ac7ff',  // South America - light blue
  eu: '#6b8aff',  // Europe - blue-violet
  ru: '#ff8844',  // Russia - orange-amber
  af: '#66cc88',  // Africa - green
  me: '#ffaa44',  // Middle East - amber
  as: '#ff9944',  // Asia - orange
  oc: '#44ddaa',  // Oceania - teal
}
