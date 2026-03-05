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

export interface GridCorridor {
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
    name: 'MAREA',
    color: '#818cf8',
    waypoints: [[39.0, -74.2], [41.0, -50.0], [43.5, -25.0], [42.5, -8.0], [43.3, -3.0]],
  },
  {
    name: 'Dunant',
    color: '#a78bfa',
    waypoints: [[40.8, -74.0], [44.0, -48.0], [47.0, -20.0], [48.0, -5.0], [44.6, -1.2]],
  },
  {
    name: 'AC-1 (Atlantic Crossing)',
    color: '#22d3ee',
    waypoints: [[40.0, -73.5], [38.0, -55.0], [40.0, -30.0], [50.0, -5.0], [51.5, 0.1]],
  },
  // ── Pacific cables (cross antimeridian) ──
  {
    name: 'PC-1 (Pacific Crossing)',
    color: '#f472b6',
    waypoints: [
      [37.4, -122.4], [39.0, -135.0], [40.0, -150.0],
      [42.0, -165.0], [42.5, -175.0], [42.0, 175.0],
      [40.0, 165.0], [38.0, 155.0], [35.7, 139.7],
    ],
  },
  {
    name: 'Southern Cross',
    color: '#fb923c',
    waypoints: [
      [37.8, -122.4], [30.0, -140.0], [20.0, -155.0],
      [10.0, -165.0], [0.0, -175.0], [-8.0, 178.0],
      [-15.0, 175.0], [-25.0, 175.5], [-36.8, 174.8],
    ],
  },
  {
    name: 'Pacific Light Cable Network',
    color: '#c084fc',
    waypoints: [
      [33.7, -118.2], [28.0, -135.0], [21.3, -157.8],
      [15.0, -170.0], [10.0, 175.0], [13.4, 155.0],
      [16.0, 140.0], [20.0, 125.0], [22.3, 114.2],
    ],
  },
  {
    name: 'APC (Asia Pacific Cable)',
    color: '#f87171',
    waypoints: [
      [37.4, -122.4], [42.0, -140.0], [45.0, -160.0],
      [48.0, -175.0], [50.0, 175.0], [48.0, 160.0],
      [43.0, 145.0], [38.0, 135.0], [35.0, 129.0],
    ],
  },
  // ── Caribbean / South American cables ──
  {
    name: 'SAm-1 (South American)',
    color: '#34d399',
    waypoints: [[25.8, -80.2], [18.0, -66.0], [10.0, -60.0], [0.0, -47.0], [-23.5, -43.2]],
  },
  {
    name: 'ARCOS-1 (Americas Region Caribbean)',
    color: '#fbbf24',
    waypoints: [[25.8, -80.2], [20.0, -75.0], [18.5, -70.0], [10.5, -67.0], [10.6, -62.0]],
  },
]

// ============================================================
// Data: US Power Grid Corridors
// ============================================================

export const powerGridCorridors: GridCorridor[] = [
  {
    name: 'Eastern-Western Interconnect Boundary',
    color: '#4ade80',
    waypoints: [[49.0, -104.0], [46.0, -104.0], [42.0, -104.5], [37.0, -104.0], [33.0, -103.5], [29.0, -103.0]],
  },
  {
    name: 'ERCOT Boundary',
    color: '#facc15',
    waypoints: [[34.0, -100.0], [33.5, -97.0], [30.5, -97.5], [29.5, -95.0], [29.0, -94.5], [28.5, -97.5], [27.5, -99.0]],
  },
  {
    name: 'PJM 500kV Backbone',
    color: '#60a5fa',
    waypoints: [[41.5, -81.7], [40.5, -80.0], [39.9, -77.0], [39.5, -75.5], [40.0, -74.5], [40.7, -74.0]],
  },
  {
    name: 'Western 500kV Backbone',
    color: '#c084fc',
    waypoints: [[48.8, -122.0], [46.0, -122.7], [42.0, -122.5], [37.8, -121.5], [34.0, -118.2]],
  },
  {
    name: 'Pacific DC Intertie',
    color: '#f472b6',
    waypoints: [[46.0, -119.5], [42.0, -120.0], [37.5, -118.5], [34.1, -118.3]],
  },
  {
    name: 'TVA Transmission Corridor',
    color: '#fb923c',
    waypoints: [[36.2, -86.8], [35.5, -85.5], [35.0, -84.0], [34.7, -87.1], [33.5, -86.8]],
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
// Rendering: Power Grid Corridors
// ============================================================

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

// ============================================================
// Rendering: Power Grid Corridors
// ============================================================

export function createGridCorridorGroup(radius: number): THREE.Group {
  const group = new THREE.Group()
  const r = radius + 0.004

  powerGridCorridors.forEach((corridor) => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < corridor.waypoints.length - 1; i++) {
      const [lat1, lng1] = corridor.waypoints[i]
      const [lat2, lng2] = corridor.waypoints[i + 1]
      const steps = 15
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const lat = lat1 + (lat2 - lat1) * t
        const lng = lng1 + (lng2 - lng1) * t
        points.push(latLngToVector3(lat, lng, r))
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: corridor.color,
      transparent: true,
      opacity: 0.25,
    })
    const line = new THREE.Line(geometry, material)
    group.add(line)
  })

  return group
}
