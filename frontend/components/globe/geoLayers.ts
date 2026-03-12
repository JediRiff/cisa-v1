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
// Data: Major Submarine Cables (US-connected)
// ============================================================

export const submarineCables: CableRoute[] = [
  // ── Atlantic cables ──
  {
    name: 'TGN-Atlantic',
    color: '#38bdf8',
    waypoints: [[40.5, -74.0], [42.0, -55.0], [48.0, -30.0], [50.0, -10.0], [50.5, -1.0]],
  },
  {
    name: 'AC-1 (Atlantic Crossing)',
    color: '#22d3ee',
    waypoints: [[40.0, -73.5], [38.0, -55.0], [40.0, -30.0], [50.0, -5.0], [51.5, 0.1]],
  },
  // ── Caribbean / South American cables ──
  {
    name: 'SAm-1 (South American)',
    color: '#34d399',
    waypoints: [[25.8, -80.2], [18.0, -66.0], [10.0, -60.0], [0.0, -47.0], [-23.5, -43.2]],
  },
]


// ============================================================
// Rendering: Submarine Cables
// Uses shortest-path longitude interpolation for antimeridian crossings
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
// Data: LNG Shipping Lanes (US export terminals → major import hubs)
// ============================================================

export interface LngRoute {
  name: string
  color: string
  waypoints: [number, number][] // [lat, lng]
}

export const lngShippingLanes: LngRoute[] = [
  // ── Atlantic routes ──
  {
    name: 'Sabine Pass → Rotterdam',
    color: '#06b6d4',
    waypoints: [
      [29.7, -93.9], [27.0, -90.0], [25.0, -85.0],
      [25.5, -80.0], [30.0, -70.0], [38.0, -55.0],
      [46.0, -30.0], [50.0, -10.0], [51.9, 4.5],
    ],
  },
  {
    name: 'Corpus Christi → Barcelona',
    color: '#22d3ee',
    waypoints: [
      [27.8, -97.4], [25.5, -92.0], [24.0, -85.0],
      [25.0, -78.0], [30.0, -65.0], [35.0, -40.0],
      [36.0, -15.0], [36.0, -5.5], [41.4, 2.2],
    ],
  },
  {
    name: 'Cameron LNG → Milford Haven',
    color: '#67e8f9',
    waypoints: [
      [29.8, -93.3], [27.0, -89.0], [25.0, -84.0],
      [26.0, -78.0], [32.0, -65.0], [40.0, -45.0],
      [48.0, -20.0], [51.0, -8.0], [51.7, -5.0],
    ],
  },
  // ── Pacific routes (cross antimeridian via Panama) ──
  {
    name: 'Sabine Pass → Tokyo',
    color: '#06b6d4',
    waypoints: [
      [29.7, -93.9], [25.0, -88.0], [20.0, -85.0],
      [12.0, -82.0], [9.0, -79.5], [8.0, -80.0],
      [5.0, -85.0], [5.0, -105.0], [10.0, -130.0],
      [18.0, -155.0], [25.0, -170.0], [30.0, 175.0],
      [33.0, 160.0], [35.0, 145.0], [35.7, 139.7],
    ],
  },
  {
    name: 'Freeport → Incheon',
    color: '#22d3ee',
    waypoints: [
      [28.9, -95.3], [25.0, -90.0], [20.0, -86.0],
      [12.0, -82.0], [9.0, -79.5], [8.0, -82.0],
      [5.0, -90.0], [5.0, -110.0], [10.0, -135.0],
      [18.0, -158.0], [25.0, -172.0], [30.0, 175.0],
      [33.0, 155.0], [35.0, 135.0], [37.5, 126.6],
    ],
  },
  // ── Suez route ──
  {
    name: 'Cove Point → Mumbai',
    color: '#67e8f9',
    waypoints: [
      [38.4, -76.4], [36.0, -70.0], [35.0, -40.0],
      [36.0, -10.0], [36.0, -5.5], [36.0, 0.0],
      [34.0, 12.0], [31.5, 32.3], [28.0, 34.0],
      [15.0, 42.0], [12.5, 45.0], [15.0, 55.0],
      [19.1, 72.9],
    ],
  },
  // ── Strait of Hormuz routes (Qatar Ras Laffan exports) ──
  {
    name: 'Ras Laffan → Strait of Hormuz → Mumbai',
    color: '#06b6d4',
    waypoints: [
      [25.9, 51.5], [26.5, 53.0], [26.2, 56.5],
      [24.5, 58.5], [22.0, 62.0], [19.1, 72.9],
    ],
  },
  {
    name: 'Ras Laffan → Strait of Hormuz → Malacca → Tokyo',
    color: '#22d3ee',
    waypoints: [
      [25.9, 51.5], [26.5, 53.0], [26.2, 56.5],
      [24.5, 58.5], [20.0, 64.0], [15.0, 70.0],
      [8.0, 77.0], [4.0, 100.0], [1.3, 104.0],
      [5.0, 110.0], [12.0, 115.0], [20.0, 125.0],
      [28.0, 135.0], [35.7, 139.7],
    ],
  },
  {
    name: 'Ras Laffan → Strait of Hormuz → Malacca → Shanghai',
    color: '#67e8f9',
    waypoints: [
      [25.9, 51.5], [26.5, 53.0], [26.2, 56.5],
      [24.5, 58.5], [20.0, 64.0], [15.0, 70.0],
      [8.0, 77.0], [4.0, 100.0], [1.3, 104.0],
      [5.0, 110.0], [15.0, 115.0], [22.0, 118.0],
      [31.2, 121.5],
    ],
  },
  // ── Bab el-Mandeb / Red Sea route ──
  {
    name: 'Ras Laffan → Bab el-Mandeb → Suez → Rotterdam',
    color: '#06b6d4',
    waypoints: [
      [25.9, 51.5], [26.5, 53.0], [26.2, 56.5],
      [24.5, 58.5], [18.0, 57.0], [14.0, 48.0],
      [12.6, 43.3], [15.0, 42.0], [20.0, 38.5],
      [28.0, 34.0], [31.5, 32.3], [34.0, 12.0],
      [36.0, 0.0], [43.0, -5.0], [48.0, 0.0],
      [51.9, 4.5],
    ],
  },
  // ── Australian exports ──
  {
    name: 'NW Shelf (Australia) → Malacca → Incheon',
    color: '#22d3ee',
    waypoints: [
      [-20.3, 116.8], [-15.0, 115.0], [-8.0, 112.0],
      [-2.0, 107.0], [1.3, 104.0], [5.0, 110.0],
      [12.0, 115.0], [20.0, 120.0], [30.0, 125.0],
      [37.5, 126.6],
    ],
  },
  {
    name: 'Gladstone (Australia) → Tokyo',
    color: '#67e8f9',
    waypoints: [
      [-23.8, 151.3], [-18.0, 155.0], [-10.0, 155.0],
      [0.0, 150.0], [10.0, 145.0], [20.0, 140.0],
      [30.0, 138.0], [35.7, 139.7],
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

