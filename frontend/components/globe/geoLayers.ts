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

export interface Chokepoint {
  name: string
  lat: number
  lng: number
}

export interface GridCorridor {
  name: string
  color: string
  waypoints: [number, number][] // [lat, lng]
}

// ============================================================
// Data: Major Submarine Cables (US-connected)
// ============================================================

export const submarineCables: CableRoute[] = [
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
  {
    name: 'PC-1 (Pacific Crossing)',
    color: '#f472b6',
    waypoints: [[37.4, -122.4], [40.0, -150.0], [42.0, -170.0], [40.0, 155.0], [35.7, 139.7]],
  },
  {
    name: 'Southern Cross',
    color: '#fb923c',
    waypoints: [[37.8, -122.4], [20.0, -155.0], [0.0, -170.0], [-15.0, 175.0], [-36.8, 174.8]],
  },
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
  {
    name: 'Pacific Light Cable Network',
    color: '#c084fc',
    waypoints: [[33.7, -118.2], [21.3, -157.8], [13.4, 144.7], [22.3, 114.2]],
  },
  {
    name: 'APC (Asia Pacific Cable)',
    color: '#f87171',
    waypoints: [[37.4, -122.4], [45.0, -160.0], [50.0, 170.0], [43.0, 145.0], [35.0, 129.0]],
  },
]

// ============================================================
// Data: Maritime Chokepoints
// ============================================================

export const maritimeChokepoints: Chokepoint[] = [
  { name: 'Strait of Hormuz', lat: 26.6, lng: 56.3 },
  { name: 'Strait of Malacca', lat: 2.5, lng: 101.0 },
  { name: 'Suez Canal', lat: 30.5, lng: 32.3 },
  { name: 'Panama Canal', lat: 9.1, lng: -79.7 },
  { name: 'Bab el-Mandeb', lat: 12.6, lng: 43.3 },
  { name: 'Strait of Gibraltar', lat: 35.9, lng: -5.5 },
  { name: 'Bosporus Strait', lat: 41.1, lng: 29.1 },
  { name: 'Danish Straits', lat: 55.7, lng: 11.0 },
  { name: 'Cape of Good Hope', lat: -34.4, lng: 18.5 },
  { name: 'Lombok Strait', lat: -8.5, lng: 115.7 },
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
// ============================================================

export function createSubmarineCableGroup(radius: number): THREE.Group {
  const group = new THREE.Group()
  const r = radius + 0.003 // just below country borders at +0.005

  submarineCables.forEach((cable) => {
    const points: THREE.Vector3[] = []
    // Interpolate between waypoints for smooth curves
    for (let i = 0; i < cable.waypoints.length - 1; i++) {
      const [lat1, lng1] = cable.waypoints[i]
      const [lat2, lng2] = cable.waypoints[i + 1]
      const steps = 20
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const lat = lat1 + (lat2 - lat1) * t
        const lng = lng1 + (lng2 - lng1) * t
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
// Rendering: Maritime Chokepoints
// ============================================================

function createDiamondTexture(color: string, size = 64): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const cy = size / 2

  // Glow
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.3, color)
  gradient.addColorStop(0.7, color + '40')
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Diamond shape
  ctx.beginPath()
  ctx.moveTo(cx, cy - size * 0.25)
  ctx.lineTo(cx + size * 0.18, cy)
  ctx.lineTo(cx, cy + size * 0.25)
  ctx.lineTo(cx - size * 0.18, cy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createLabelTexture(text: string, fontSize = 28): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 48
  const ctx = canvas.getContext('2d')!

  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(250, 204, 21, 0.8)'
  ctx.fillText(text, 128, 24)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function createChokepointGroup(radius: number): THREE.Group {
  const group = new THREE.Group()
  const r = radius + 0.015
  const diamondTex = createDiamondTexture('#facc15')

  maritimeChokepoints.forEach((cp) => {
    const pos = latLngToVector3(cp.lat, cp.lng, r)

    // Diamond marker
    const spriteMat = new THREE.SpriteMaterial({
      map: diamondTex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthTest: false,
    })
    const sprite = new THREE.Sprite(spriteMat)
    sprite.position.copy(pos)
    sprite.scale.set(0.05, 0.05, 1)
    group.add(sprite)

    // Label
    const labelMat = new THREE.SpriteMaterial({
      map: createLabelTexture(cp.name, 22),
      transparent: true,
      opacity: 0.7,
      depthTest: false,
    })
    const label = new THREE.Sprite(labelMat)
    const labelPos = latLngToVector3(cp.lat, cp.lng, r + 0.025)
    label.position.copy(labelPos)
    label.scale.set(0.15, 0.03, 1)
    group.add(label)
  })

  return group
}

// ============================================================
// Rendering: Power Grid Corridors
// ============================================================

export function createGridCorridorGroup(radius: number): THREE.Group {
  const group = new THREE.Group()
  const r = radius + 0.004 // between cables and borders

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
