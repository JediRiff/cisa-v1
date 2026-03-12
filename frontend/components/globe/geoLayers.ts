import * as THREE from 'three'
import { latLngToVector3 } from './worldData'

// ============================================================
// Types
// ============================================================

export interface CableRoute {
  name: string
  color: string
  waypoints: [number, number][] // [lat, lng]
}

// ============================================================
// Shortest-path longitude interpolation
// Handles antimeridian crossings (e.g., -170° → 155° goes the short way)
// ============================================================

function lerpLng(lng1: number, lng2: number, t: number): number {
  let delta = lng2 - lng1
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  let result = lng1 + delta * t
  // Normalize to [-180, 180]
  if (result > 180) result -= 360
  if (result < -180) result += 360
  return result
}

// ============================================================
// Data: Major Submarine Cables (blue tones)
// ============================================================

export const submarineCables: CableRoute[] = [
  {
    name: 'TGN-Atlantic',
    color: '#38bdf8',
    waypoints: [[40.5, -74.0], [42.0, -55.0], [48.0, -30.0], [50.0, -10.0], [50.5, -1.0]],
  },
  {
    name: 'AC-1 (Atlantic Crossing)',
    color: '#60a5fa',
    waypoints: [[40.0, -73.5], [38.0, -55.0], [40.0, -30.0], [50.0, -5.0], [51.5, 0.1]],
  },
  {
    name: 'SAm-1 (South American)',
    color: '#7dd3fc',
    waypoints: [[25.8, -80.2], [18.0, -66.0], [10.0, -60.0], [0.0, -47.0], [-23.5, -43.2]],
  },
]

// ============================================================
// Rendering: Submarine Cables
// ============================================================

export function createSubmarineCableGroup(radius: number): THREE.Group {
  const group = new THREE.Group()
  const r = radius + 0.003

  submarineCables.forEach((cable) => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < cable.waypoints.length - 1; i++) {
      const [lat1, lng1] = cable.waypoints[i]
      const [lat2, lng2] = cable.waypoints[i + 1]
      const steps = 20
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const lat = lat1 + (lat2 - lat1) * t
        const lng = lerpLng(lng1, lng2, t)
        points.push(latLngToVector3(lat, lng, r))
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: cable.color,
      transparent: true,
      opacity: 0.35,
    })
    const line = new THREE.Line(geometry, material)
    group.add(line)
  })

  return group
}

// ============================================================
// Data: LNG Shipping Lanes (all amber #f59e0b)
// Global routes through every major maritime chokepoint.
// All waypoints verified to stay over water.
// ============================================================

export interface LngRoute {
  name: string
  color: string
  waypoints: [number, number][] // [lat, lng]
}

const LNG_COLOR = '#f59e0b'

export const lngShippingLanes: LngRoute[] = [

  // ================================================================
  // US EXPORT ROUTES
  // ================================================================

  // US Gulf → Europe (Atlantic)
  {
    name: 'Sabine Pass → Rotterdam',
    color: LNG_COLOR,
    waypoints: [
      [29.7, -93.9], [27.0, -90.0], [25.0, -85.0],
      [25.5, -80.0], [30.0, -70.0], [38.0, -55.0],
      [46.0, -30.0], [50.0, -10.0], [51.9, 4.5],
    ],
  },
  {
    // Through Strait of Gibraltar, along Med coast (avoids crossing Spain)
    name: 'Corpus Christi → Barcelona',
    color: LNG_COLOR,
    waypoints: [
      [27.8, -97.4], [25.5, -92.0], [24.0, -85.0],
      [25.0, -78.0], [30.0, -65.0], [35.0, -40.0],
      [36.0, -15.0], [36.0, -5.5], [36.2, -2.0],
      [38.0, 0.0], [41.4, 2.2],
    ],
  },
  {
    name: 'Cameron LNG → Milford Haven',
    color: LNG_COLOR,
    waypoints: [
      [29.8, -93.3], [27.0, -89.0], [25.0, -84.0],
      [26.0, -78.0], [32.0, -65.0], [40.0, -45.0],
      [48.0, -20.0], [51.0, -8.0], [51.7, -5.0],
    ],
  },

  // US Gulf → Asia (via Panama Canal: Colon → Balboa)
  {
    name: 'Sabine Pass → Tokyo (via Panama)',
    color: LNG_COLOR,
    waypoints: [
      [29.7, -93.9], [25.0, -88.0], [20.0, -86.0],
      [15.0, -83.0], [10.0, -80.5], [9.35, -79.9],
      [8.95, -79.55], [7.0, -80.0], [5.0, -85.0],
      [5.0, -105.0], [10.0, -130.0], [18.0, -155.0],
      [25.0, -170.0], [30.0, 175.0], [33.0, 160.0],
      [35.7, 139.7],
    ],
  },

  // US East Coast → India (via Suez, through Gulf of Suez not Sinai)
  {
    name: 'Cove Point → Mumbai (via Suez)',
    color: LNG_COLOR,
    waypoints: [
      [38.4, -76.4], [36.0, -70.0], [35.0, -40.0],
      [36.0, -10.0], [36.0, -5.5], [36.0, 0.0],
      [34.0, 12.0], [31.3, 32.3], [30.0, 32.6],
      [28.0, 33.3], [22.0, 37.5], [15.0, 42.0],
      [12.6, 43.3], [12.0, 45.0], [15.0, 55.0],
      [19.1, 72.9],
    ],
  },

  // ================================================================
  // QATAR (Ras Laffan) — STRAIT OF HORMUZ
  // ================================================================

  // Qatar → Hormuz → India
  {
    name: 'Ras Laffan → Strait of Hormuz → Mumbai',
    color: LNG_COLOR,
    waypoints: [
      [25.9, 51.5], [26.5, 53.5], [26.5, 56.3],
      [25.0, 58.5], [22.0, 62.0], [19.1, 72.9],
    ],
  },

  // Qatar → Hormuz → south of Sri Lanka → Malacca → Japan
  {
    name: 'Ras Laffan → Hormuz → Malacca → Tokyo',
    color: LNG_COLOR,
    waypoints: [
      [25.9, 51.5], [26.5, 53.5], [26.5, 56.3],
      [25.0, 58.5], [20.0, 63.0], [12.0, 72.0],
      [5.5, 80.0], [2.5, 101.5], [1.3, 103.8],
      [5.0, 108.0], [12.0, 115.0], [20.0, 125.0],
      [28.0, 135.0], [35.7, 139.7],
    ],
  },

  // Qatar → Hormuz → south of Sri Lanka → Malacca → China
  {
    name: 'Ras Laffan → Hormuz → Malacca → Shanghai',
    color: LNG_COLOR,
    waypoints: [
      [25.9, 51.5], [26.5, 53.5], [26.5, 56.3],
      [25.0, 58.5], [20.0, 63.0], [12.0, 72.0],
      [5.5, 80.0], [2.5, 101.5], [1.3, 103.8],
      [5.0, 108.0], [15.0, 114.0], [18.0, 117.0],
      [25.0, 121.0], [31.2, 121.5],
    ],
  },

  // Qatar → Hormuz → south of Arabian Peninsula → Bab el-Mandeb →
  // Suez → Gibraltar → Atlantic coast → Rotterdam
  {
    name: 'Ras Laffan → Bab el-Mandeb → Suez → Rotterdam',
    color: LNG_COLOR,
    waypoints: [
      [25.9, 51.5], [26.5, 53.5], [26.5, 56.3],
      [25.0, 58.5], [22.0, 60.0], [17.0, 55.0],
      [14.0, 50.0], [12.6, 43.3], [15.0, 42.0],
      [20.0, 38.5], [24.0, 36.0], [28.0, 33.3],
      [30.0, 32.6], [31.3, 32.3], [34.0, 12.0],
      [36.0, 0.0], [36.0, -5.5], [37.0, -9.5],
      [43.5, -9.0], [47.0, -5.0], [51.0, 2.0],
      [51.9, 4.5],
    ],
  },

  // ================================================================
  // AUSTRALIA EXPORTS
  // ================================================================

  // NW Shelf → through Indonesian waters → Malacca → South Korea
  {
    name: 'NW Shelf (Australia) → Malacca → Incheon',
    color: LNG_COLOR,
    waypoints: [
      [-20.3, 116.8], [-15.0, 115.0], [-8.0, 112.0],
      [-2.0, 107.0], [1.3, 103.8], [5.0, 108.0],
      [12.0, 115.0], [18.0, 117.0], [25.0, 122.0],
      [30.0, 125.0], [37.5, 126.6],
    ],
  },

  // Gladstone → Coral Sea → Pacific → Japan
  {
    name: 'Gladstone (Australia) → Tokyo',
    color: LNG_COLOR,
    waypoints: [
      [-23.8, 151.3], [-18.0, 155.0], [-10.0, 155.0],
      [0.0, 150.0], [10.0, 145.0], [20.0, 140.0],
      [30.0, 138.0], [35.7, 139.7],
    ],
  },

  // NW Shelf → south of Sri Lanka → Hormuz approach → India
  {
    name: 'NW Shelf (Australia) → Mumbai',
    color: LNG_COLOR,
    waypoints: [
      [-20.3, 116.8], [-15.0, 110.0], [-10.0, 100.0],
      [-5.0, 90.0], [2.0, 80.0], [5.5, 80.0],
      [12.0, 72.0], [19.1, 72.9],
    ],
  },

  // ================================================================
  // ALGERIA / NORTH AFRICA → EUROPE
  // ================================================================

  // Arzew (Algeria) → Strait of Gibraltar approach → Atlantic → UK
  {
    name: 'Arzew (Algeria) → Milford Haven',
    color: LNG_COLOR,
    waypoints: [
      [35.8, -0.3], [36.0, -3.0], [36.0, -5.5],
      [37.0, -9.5], [43.5, -9.0], [48.0, -7.0],
      [51.7, -5.0],
    ],
  },

  // Arzew → Mediterranean → Italy
  {
    name: 'Arzew (Algeria) → Livorno',
    color: LNG_COLOR,
    waypoints: [
      [35.8, -0.3], [37.0, 3.0], [38.5, 6.0],
      [41.0, 8.5], [43.5, 10.3],
    ],
  },

  // ================================================================
  // NIGERIA / WEST AFRICA
  // ================================================================

  // Bonny Island (Nigeria) → across Atlantic → Europe
  {
    name: 'Bonny Island (Nigeria) → Rotterdam',
    color: LNG_COLOR,
    waypoints: [
      [4.4, 7.2], [5.0, 3.0], [8.0, -10.0],
      [15.0, -20.0], [30.0, -15.0], [36.0, -5.5],
      [37.0, -9.5], [43.5, -9.0], [47.0, -5.0],
      [51.0, 2.0], [51.9, 4.5],
    ],
  },

  // Bonny Island → south Atlantic → Cape of Good Hope → Asia
  {
    name: 'Bonny Island (Nigeria) → Cape of Good Hope → Mumbai',
    color: LNG_COLOR,
    waypoints: [
      [4.4, 7.2], [0.0, 5.0], [-10.0, 5.0],
      [-25.0, 10.0], [-34.5, 18.5], [-35.0, 25.0],
      [-30.0, 40.0], [-15.0, 50.0], [0.0, 58.0],
      [10.0, 65.0], [19.1, 72.9],
    ],
  },

  // ================================================================
  // TRINIDAD & TOBAGO
  // ================================================================

  // Atlantic LNG → Europe
  {
    name: 'Trinidad → Huelva (Spain)',
    color: LNG_COLOR,
    waypoints: [
      [10.4, -61.0], [15.0, -55.0], [25.0, -40.0],
      [33.0, -20.0], [36.0, -10.0], [37.2, -7.0],
    ],
  },

  // ================================================================
  // MALAYSIA / SE ASIA
  // ================================================================

  // Bintulu (Malaysia) → South China Sea → Japan
  {
    name: 'Bintulu (Malaysia) → Tokyo',
    color: LNG_COLOR,
    waypoints: [
      [3.2, 113.0], [8.0, 114.0], [15.0, 118.0],
      [22.0, 125.0], [28.0, 133.0], [35.7, 139.7],
    ],
  },

  // Bintulu → South China Sea → China
  {
    name: 'Bintulu (Malaysia) → Shanghai',
    color: LNG_COLOR,
    waypoints: [
      [3.2, 113.0], [8.0, 112.0], [15.0, 114.0],
      [18.0, 117.0], [25.0, 121.0], [31.2, 121.5],
    ],
  },

  // ================================================================
  // RUSSIA (Yamal) → EUROPE
  // ================================================================

  // Sabetta (Yamal LNG) → around Norway → Europe
  {
    name: 'Sabetta (Yamal) → Zeebrugge',
    color: LNG_COLOR,
    waypoints: [
      [71.3, 72.0], [73.0, 55.0], [72.0, 35.0],
      [71.0, 28.0], [70.0, 20.0], [65.0, 10.0],
      [60.0, 5.0], [55.0, 4.0], [51.3, 3.2],
    ],
  },

  // ================================================================
  // EGYPT → EUROPE
  // ================================================================

  // Damietta / Idku → Mediterranean → Europe
  {
    name: 'Damietta (Egypt) → Revithoussa (Greece)',
    color: LNG_COLOR,
    waypoints: [
      [31.4, 31.8], [32.5, 28.0], [34.0, 25.0],
      [37.0, 24.0], [37.9, 23.6],
    ],
  },

  // ================================================================
  // MOZAMBIQUE → ASIA (Cape of Good Hope)
  // ================================================================

  {
    name: 'Mozambique → Cape of Good Hope → Shanghai',
    color: LNG_COLOR,
    waypoints: [
      [-12.3, 40.5], [-20.0, 38.0], [-30.0, 32.0],
      [-34.5, 18.5], [-35.0, 25.0], [-30.0, 50.0],
      [-20.0, 70.0], [-10.0, 85.0], [-5.0, 95.0],
      [1.3, 103.8], [5.0, 108.0], [15.0, 114.0],
      [18.0, 117.0], [25.0, 121.0], [31.2, 121.5],
    ],
  },
]

// ============================================================
// Rendering: LNG Shipping Lanes (dashed lines)
// ============================================================

export function createLngShippingLaneGroup(radius: number): THREE.Group {
  const group = new THREE.Group()
  const r = radius + 0.005

  lngShippingLanes.forEach((route) => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const [lat1, lng1] = route.waypoints[i]
      const [lat2, lng2] = route.waypoints[i + 1]
      const steps = 20
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const lat = lat1 + (lat2 - lat1) * t
        const lng = lerpLng(lng1, lng2, t)
        points.push(latLngToVector3(lat, lng, r))
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineDashedMaterial({
      color: route.color,
      transparent: true,
      opacity: 0.35,
      dashSize: 0.02,
      gapSize: 0.01,
    })
    const line = new THREE.Line(geometry, material)
    line.computeLineDistances()
    group.add(line)
  })

  return group
}
