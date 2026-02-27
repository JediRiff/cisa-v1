'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
// @ts-ignore - Three.js examples JSM module
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  latLngToVector3,
  createArcCurve,
  landPoints,
  threatActors,
  energyFacilities,
  regionColors,
  sectorColors,
  EnergyFacility,
  ThreatActor,
  Sector,
} from './worldData'

interface ActiveArc {
  line: THREE.Line
  progress: number
  maxProgress: number
  head: THREE.Sprite
  fadeOut: boolean
  opacity: number
  actor: ThreatActor
  target: EnergyFacility
}

interface PulseMarker {
  mesh: THREE.Sprite
  phase: number
  baseScale: number
  actorName: string
}

interface FacilityMarkerRef {
  mesh: THREE.Mesh
  facility: EnergyFacility
  glowSprite: THREE.Sprite
}

interface ActorMarkerRef {
  mesh: THREE.Sprite
  actor: ThreatActor
}

export interface GlobeCanvasProps {
  onFacilityClick?: (facility: EnergyFacility) => void
  onThreatActorClick?: (actor: ThreatActor) => void
  onEmptyClick?: () => void
  selectedFacilityId?: string | null
  selectedActorName?: string | null
  activeCampaignActors?: string[]
  facilityRiskScores?: Record<string, number>
}

// Generate a circular glow texture via canvas
function createGlowTexture(color: string, size = 64): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.4, color)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// Build targeting map: for each actor, which facilities can they target
function buildTargetingMap(): Map<string, EnergyFacility[]> {
  const map = new Map<string, EnergyFacility[]>()
  threatActors.forEach((actor) => {
    const targets = energyFacilities.filter((f) =>
      actor.targetSectors.includes(f.sector)
    )
    map.set(actor.name, targets)
  })
  return map
}

// Minimal TopoJSON decoder - renders country border outlines on the globe
// US (ISO 3166-1 numeric 840) is highlighted in white; all others are dim
function loadCountryBorders(globeGroup: THREE.Group, radius: number) {
  fetch('/countries-110m.json')
    .then((r) => r.json())
    .then((topology) => {
      const { arcs: encodedArcs, transform } = topology
      const { scale, translate } = transform

      // Decode all arcs (delta-encoded coordinates -> [lng, lat])
      const decodedArcs: [number, number][][] = encodedArcs.map((arc: number[][]) => {
        let x = 0, y = 0
        return arc.map(([dx, dy]: number[]) => {
          x += dx
          y += dy
          return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number]
        })
      })

      const defaultBorderMat = new THREE.LineBasicMaterial({
        color: 0x1a2a3a,
        transparent: true,
        opacity: 0.25,
      })

      const usBorderMat = new THREE.LineBasicMaterial({
        color: 0xe0e4e8,
        transparent: true,
        opacity: 0.85,
      })

      const usFillMat = new THREE.MeshBasicMaterial({
        color: 0xd0d4d8,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      })

      // Dim fill for non-US countries
      const defaultFillMat = new THREE.MeshBasicMaterial({
        color: 0x1a2030,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
      })

      const US_ID = '840'

      // Helper: decode a ring of arc indices into [lng, lat] coordinates
      function decodeRing(ring: number[]): [number, number][] {
        const coords: [number, number][] = []
        ring.forEach((arcIdx: number) => {
          const reversed = arcIdx < 0
          const idx = reversed ? ~arcIdx : arcIdx
          const arc = decodedArcs[idx]
          if (!arc) return
          const points = reversed ? [...arc].reverse() : arc
          const start = coords.length > 0 ? 1 : 0
          for (let i = start; i < points.length; i++) {
            coords.push(points[i])
          }
        })
        return coords
      }

      const countries = topology.objects.countries
      if (!countries) return

      countries.geometries.forEach((geo: any) => {
        const isUS = String(geo.id) === US_ID
        const borderMat = isUS ? usBorderMat : defaultBorderMat

        // Normalize to array-of-polygons, each polygon is array-of-rings
        let polygons: number[][][]
        if (geo.type === 'Polygon') {
          polygons = [geo.arcs]
        } else if (geo.type === 'MultiPolygon') {
          polygons = geo.arcs
        } else {
          return
        }

        polygons.forEach((polygon: number[][]) => {
          const rings = polygon.map((ring: number[]) => decodeRing(ring))

          // Draw border lines for each ring
          rings.forEach((coords) => {
            if (coords.length < 2) return
            const points3d = coords.map(([lng, lat]) =>
              latLngToVector3(lat, lng, radius)
            )
            const geometry = new THREE.BufferGeometry().setFromPoints(points3d)
            globeGroup.add(new THREE.Line(geometry, borderMat))
          })

          // Fill country polygons
          if (rings[0] && rings[0].length >= 3) {
            try {
              const contour = rings[0].map(([lng, lat]) => new THREE.Vector2(lng, lat))
              const holes = rings.slice(1)
                .filter((r) => r.length >= 3)
                .map((r) => r.map(([lng, lat]) => new THREE.Vector2(lng, lat)))

              const faces = THREE.ShapeUtils.triangulateShape(contour, holes)
              const allVerts2D = [...contour]
              holes.forEach((h) => allVerts2D.push(...h))

              const allVerts3D = allVerts2D.map((v) =>
                latLngToVector3(v.y, v.x, radius + 0.001)
              )

              const positions = new Float32Array(faces.length * 9)
              faces.forEach((face, fi) => {
                for (let vi = 0; vi < 3; vi++) {
                  const v = allVerts3D[face[vi]]
                  positions[fi * 9 + vi * 3] = v.x
                  positions[fi * 9 + vi * 3 + 1] = v.y
                  positions[fi * 9 + vi * 3 + 2] = v.z
                }
              })

              const fillGeo = new THREE.BufferGeometry()
              fillGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
              fillGeo.computeVertexNormals()
              globeGroup.add(new THREE.Mesh(fillGeo, isUS ? usFillMat : defaultFillMat))
            } catch {
              // Triangulation can fail for complex island polygons — skip silently
            }
          }
        })
      })
    })
    .catch(() => {
      console.warn('Failed to load country borders')
    })
}

export default function GlobeCanvas({ onFacilityClick, onThreatActorClick, onEmptyClick, selectedFacilityId, selectedActorName, activeCampaignActors, facilityRiskScores }: GlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacksRef = useRef({ onFacilityClick, onThreatActorClick, onEmptyClick })
  const activeCampaignActorsRef = useRef<string[]>(activeCampaignActors || [])
  const facilityRiskScoresRef = useRef<Record<string, number>>(facilityRiskScores || {})
  const selectionRef = useRef({ selectedFacilityId, selectedActorName })
  const facilityMarkersRef = useRef<FacilityMarkerRef[]>([])
  const actorMarkersRef = useRef<ActorMarkerRef[]>([])
  const selectionRingRef = useRef<THREE.Mesh | null>(null)
  const sceneDataRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    globeGroup: THREE.Group
    arcs: ActiveArc[]
    markers: PulseMarker[]
    clock: THREE.Clock
    frameId: number
  } | null>(null)

  // Keep callbacks ref up to date without triggering re-render
  useEffect(() => {
    callbacksRef.current = { onFacilityClick, onThreatActorClick, onEmptyClick }
  })

  // Keep activeCampaignActors ref up to date
  useEffect(() => {
    activeCampaignActorsRef.current = activeCampaignActors || []
  }, [activeCampaignActors])

  // Keep facilityRiskScores ref up to date and update bar heights
  useEffect(() => {
    facilityRiskScoresRef.current = facilityRiskScores || {}
    // Update existing cylinder heights if markers already exist
    facilityMarkersRef.current.forEach(fm => {
      const score = facilityRiskScoresRef.current[fm.facility.id]
      if (score != null) {
        const height = 0.02 + (1 - (score - 1) / 4) * 0.15
        fm.mesh.scale.set(1, height / 0.02, 1) // Scale Y relative to base height
      }
    })
  }, [facilityRiskScores])

  // Keep selection ref up to date and update selection ring
  useEffect(() => {
    selectionRef.current = { selectedFacilityId, selectedActorName }
    updateSelectionRing()
  }, [selectedFacilityId, selectedActorName])

  function updateSelectionRing() {
    const ring = selectionRingRef.current
    if (!ring) return

    const { selectedFacilityId: fId, selectedActorName: aName } = selectionRef.current

    // Find the target position
    let targetPos: THREE.Vector3 | null = null
    let ringColor = '#ffffff'

    if (fId) {
      const fm = facilityMarkersRef.current.find((m) => m.facility.id === fId)
      if (fm) {
        targetPos = fm.mesh.position.clone()
        ringColor = sectorColors[fm.facility.sector]
      }
    } else if (aName) {
      const am = actorMarkersRef.current.find((m) => m.actor.name === aName)
      if (am) {
        targetPos = am.mesh.position.clone()
        ringColor = am.actor.color
      }
    }

    if (targetPos) {
      ring.position.copy(targetPos)
      ring.lookAt(0, 0, 0) // Face away from globe center
      ;(ring.material as THREE.MeshBasicMaterial).color.set(ringColor)
      ring.visible = true
    } else {
      ring.visible = false
    }
  }

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030810)

    // Camera
    const aspect = container.clientWidth / container.clientHeight
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    camera.position.set(0, 0.5, 2.8)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Stars — sparse and subtle for a clean look
    const starCount = 300
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0x8899aa, size: 0.08, transparent: true, opacity: 0.35 })
    scene.add(new THREE.Points(starGeo, starMat))

    // Globe group
    const globeGroup = new THREE.Group()
    scene.add(globeGroup)

    // Main globe sphere
    const globeGeo = new THREE.SphereGeometry(1, 64, 64)
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x080e1a,
      transparent: true,
      opacity: 0.95,
      shininess: 10,
    })
    globeGroup.add(new THREE.Mesh(globeGeo, globeMat))

    // Wireframe grid overlay — very subtle
    const wireGeo = new THREE.SphereGeometry(1.002, 36, 18)
    const wireEdges = new THREE.EdgesGeometry(wireGeo)
    const wireMat = new THREE.LineBasicMaterial({ color: 0x101828, transparent: true, opacity: 0.08 })
    globeGroup.add(new THREE.LineSegments(wireEdges, wireMat))

    // Atmosphere glow ring
    const atmosGeo = new THREE.SphereGeometry(1.05, 64, 64)
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(0.15, 0.35, 0.7, 1.0) * intensity * 0.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    })
    globeGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // Radar sweep — rotating scan line across globe surface
    const sweepGeo = new THREE.PlaneGeometry(2.2, 2.2)
    const sweepMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;
          if (dist > 1.02) discard;
          float angle = atan(center.y, center.x);
          // Narrow wedge: ~25 degrees visible, fading trail
          float wedge = smoothstep(0.0, 0.44, angle) * (1.0 - smoothstep(0.44, 0.52, angle));
          // Also a thin leading-edge line
          float line = (1.0 - smoothstep(0.42, 0.46, angle)) * smoothstep(0.40, 0.42, angle);
          float alpha = (wedge * 0.06 + line * 0.12) * (1.0 - dist * 0.7);
          if (alpha < 0.002) discard;
          gl_FragColor = vec4(0.25, 0.6, 0.9, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat)
    globeGroup.add(sweepMesh)

    // Country border outlines (loaded async from TopoJSON)
    loadCountryBorders(globeGroup, 1.005)

    // Land dots — monochrome for clean intelligence-map look
    const dotGeo = new THREE.BufferGeometry()
    const dotPositions = new Float32Array(landPoints.length * 3)

    landPoints.forEach((p, i) => {
      const vec = latLngToVector3(p.lat, p.lng, 1.008)
      dotPositions[i * 3] = vec.x
      dotPositions[i * 3 + 1] = vec.y
      dotPositions[i * 3 + 2] = vec.z
    })

    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3))
    const dotMat = new THREE.PointsMaterial({
      color: 0x2a3a4a,
      size: 0.015,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    })
    globeGroup.add(new THREE.Points(dotGeo, dotMat))

    // Declutter overlapping facility positions
    // Detect facilities within MIN_DIST degrees and spread them in a ring
    const MIN_DIST = 0.35 // ~25 miles at US latitudes
    const declutteredCoords: Map<string, { lat: number; lng: number }> = new Map()

    // Group facilities that are too close together
    const processed = new Set<string>()
    energyFacilities.forEach((f) => {
      if (processed.has(f.id)) return
      const cluster = energyFacilities.filter(
        (other) =>
          !processed.has(other.id) &&
          Math.abs(f.lat - other.lat) < MIN_DIST &&
          Math.abs(f.lng - other.lng) < MIN_DIST
      )
      if (cluster.length <= 1) {
        declutteredCoords.set(f.id, { lat: f.lat, lng: f.lng })
        processed.add(f.id)
        return
      }
      // Spread cluster members in a small ring around their centroid
      const cLat = cluster.reduce((s, c) => s + c.lat, 0) / cluster.length
      const cLng = cluster.reduce((s, c) => s + c.lng, 0) / cluster.length
      const spreadRadius = 0.25 + cluster.length * 0.06
      cluster.forEach((member, i) => {
        const angle = (i / cluster.length) * Math.PI * 2
        declutteredCoords.set(member.id, {
          lat: cLat + Math.sin(angle) * spreadRadius,
          lng: cLng + Math.cos(angle) * spreadRadius,
        })
        processed.add(member.id)
      })
    })

    // Energy facility markers - sector-colored, clickable
    const facilityMarkers: FacilityMarkerRef[] = []
    const facilityMeshGroup = new THREE.Group()
    globeGroup.add(facilityMeshGroup)

    energyFacilities.forEach((facility) => {
      const coords = declutteredCoords.get(facility.id) || { lat: facility.lat, lng: facility.lng }
      const pos = latLngToVector3(coords.lat, coords.lng, 1.012)
      const color = sectorColors[facility.sector]

      // Compute bar height from risk score (CAPRI 1=tallest/severe, 5=shortest/low)
      const riskScore = facilityRiskScoresRef.current[facility.id]
      const baseHeight = 0.02
      const height = riskScore != null
        ? 0.02 + (1 - (riskScore - 1) / 4) * 0.15
        : baseHeight

      // 3D risk bar (square column)
      const markerGeo = new THREE.BoxGeometry(0.018, height, 0.018)
      // Shift geometry so bottom sits at origin (cylinder is centered by default)
      markerGeo.translate(0, height / 2, 0)
      const markerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.95,
      })
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.copy(pos)
      // Orient cylinder to point radially outward from globe center
      // setFromUnitVectors rotates Y-axis (cylinder axis) to align with outward direction
      const outward = pos.clone().normalize()
      marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward)
      marker.userData = { type: 'facility', facility }
      facilityMeshGroup.add(marker)

      // Subtle glow sprite behind bar
      const glowMat = new THREE.SpriteMaterial({
        map: createGlowTexture(color, 32),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
      })
      const glow = new THREE.Sprite(glowMat)
      glow.position.copy(pos)
      glow.scale.set(0.05, 0.05, 1)
      facilityMeshGroup.add(glow)

      facilityMarkers.push({ mesh: marker, facility, glowSprite: glow })
    })
    facilityMarkersRef.current = facilityMarkers

    // Selection ring (torus around selected marker)
    const ringGeo = new THREE.RingGeometry(0.025, 0.032, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
    const selectionRing = new THREE.Mesh(ringGeo, ringMat)
    selectionRing.visible = false
    globeGroup.add(selectionRing)
    selectionRingRef.current = selectionRing

    // Threat origin pulse markers
    const markers: PulseMarker[] = []
    const actorMarkerRefs: ActorMarkerRef[] = []
    const glowTex = createGlowTexture('rgba(255, 60, 60, 0.6)')

    threatActors.forEach((actor) => {
      const pos = latLngToVector3(actor.origin.lat, actor.origin.lng, 1.015)
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(actor.color),
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(spriteMat)
      sprite.position.copy(pos)
      sprite.scale.set(0.07, 0.07, 1)
      sprite.userData = { type: 'actor', actor }
      globeGroup.add(sprite)
      markers.push({ mesh: sprite, phase: Math.random() * Math.PI * 2, baseScale: 0.07, actorName: actor.name })
      actorMarkerRefs.push({ mesh: sprite, actor })
    })
    actorMarkersRef.current = actorMarkerRefs

    // Lights
    const ambientLight = new THREE.AmbientLight(0x335577, 0.6)
    scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.set(5, 3, 5)
    scene.add(dirLight)
    const pointLight = new THREE.PointLight(0x3366ff, 0.3, 10)
    pointLight.position.set(-3, 2, -3)
    scene.add(pointLight)

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.rotateSpeed = 0.5
    controls.minDistance = 1.5
    controls.maxDistance = 5
    controls.enablePan = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3

    // Raycaster for click/hover detection
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let mouseDownPos = { x: 0, y: 0 }

    // Collect all clickable objects
    const clickableFacilityMeshes = facilityMarkers.map((m) => m.mesh)
    const clickableActorSprites = actorMarkerRefs.map((m) => m.mesh)

    function onMouseDown(event: MouseEvent) {
      mouseDownPos = { x: event.clientX, y: event.clientY }
    }

    function onMouseUp(event: MouseEvent) {
      const dx = event.clientX - mouseDownPos.x
      const dy = event.clientY - mouseDownPos.y
      // Only treat as click if mouse didn't move much (not a drag/rotate)
      if (Math.sqrt(dx * dx + dy * dy) > 5) return

      const rect = container.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // Check facility markers first
      const facilityHits = raycaster.intersectObjects(clickableFacilityMeshes)
      if (facilityHits.length > 0) {
        const hit = facilityHits[0].object
        const data = hit.userData as { type: string; facility: EnergyFacility }
        callbacksRef.current.onFacilityClick?.(data.facility)
        return
      }

      // Check threat actor sprites
      const actorHits = raycaster.intersectObjects(clickableActorSprites)
      if (actorHits.length > 0) {
        const hit = actorHits[0].object
        const data = hit.userData as { type: string; actor: ThreatActor }
        callbacksRef.current.onThreatActorClick?.(data.actor)
        return
      }

      // Clicked on empty space
      callbacksRef.current.onEmptyClick?.()
    }

    function onMouseMove(event: MouseEvent) {
      const rect = container.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      const allClickable = [...clickableFacilityMeshes, ...clickableActorSprites]
      const hits = raycaster.intersectObjects(allClickable)
      container.style.cursor = hits.length > 0 ? 'pointer' : 'grab'
    }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mouseup', onMouseUp)
    container.addEventListener('mousemove', onMouseMove)

    // Data-driven arc spawning
    const targetingMap = buildTargetingMap()
    const arcs: ActiveArc[] = []

    function spawnArc() {
      if (arcs.length >= 8) return

      // Pick a random threat actor
      const actor = threatActors[Math.floor(Math.random() * threatActors.length)]
      const validTargets = targetingMap.get(actor.name) || []
      if (validTargets.length === 0) return

      // Pick a random valid target for this actor
      const target = validTargets[Math.floor(Math.random() * validTargets.length)]
      const curve = createArcCurve(actor.origin, target, 1.01)
      const points = curve.getPoints(80)

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      geometry.setDrawRange(0, 0)

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(actor.color),
        transparent: true,
        opacity: 0.8,
      })

      const line = new THREE.Line(geometry, material)
      globeGroup.add(line)

      // Glowing head sprite
      const headMat = new THREE.SpriteMaterial({
        map: createGlowTexture('rgba(255, 255, 255, 0.8)'),
        color: new THREE.Color(actor.color),
        transparent: true,
        blending: THREE.AdditiveBlending,
      })
      const head = new THREE.Sprite(headMat)
      head.scale.set(0.04, 0.04, 1)
      head.position.copy(points[0])
      globeGroup.add(head)

      arcs.push({
        line,
        progress: 0,
        maxProgress: 80,
        head,
        fadeOut: false,
        opacity: 0.8,
        actor,
        target,
      })
    }

    // Clock for animation timing
    const clock = new THREE.Clock()
    let arcSpawnTimer = 0

    // Store refs for cleanup
    sceneDataRef.current = { scene, camera, renderer, controls, globeGroup, arcs, markers, clock, frameId: 0 }

    // Animation loop
    function animate() {
      const frameId = requestAnimationFrame(animate)
      if (sceneDataRef.current) sceneDataRef.current.frameId = frameId

      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()

      controls.update()

      // Pulse threat origin markers (enhanced for campaign actors)
      const campaignActorSet = new Set(activeCampaignActorsRef.current)
      markers.forEach((m) => {
        const isCampaignActor = campaignActorSet.has(m.actorName)
        const pulseSpeed = isCampaignActor ? 3 : 2
        const pulseAmplitude = isCampaignActor ? 0.035 : 0.018
        const baseOpacity = isCampaignActor ? 0.7 : 0.5
        const scale = m.baseScale + Math.sin(elapsed * pulseSpeed + m.phase) * pulseAmplitude
        m.mesh.scale.set(scale, scale, 1)
        if (m.mesh.material instanceof THREE.SpriteMaterial) {
          m.mesh.material.opacity = baseOpacity + Math.sin(elapsed * pulseSpeed + m.phase) * 0.3
        }
      })

      // Subtle pulse on facility glow sprites
      facilityMarkers.forEach((fm, i) => {
        const glowScale = 0.05 + Math.sin(elapsed * 1.5 + i * 0.5) * 0.008
        fm.glowSprite.scale.set(glowScale, glowScale, 1)
      })

      // Rotate radar sweep
      sweepMesh.rotation.y += delta * 0.4

      // Pulse selection ring
      if (selectionRing.visible) {
        const ringScale = 1 + Math.sin(elapsed * 3) * 0.15
        selectionRing.scale.set(ringScale, ringScale, 1)
        ringMat.opacity = 0.6 + Math.sin(elapsed * 3) * 0.3
      }

      // Spawn new arcs periodically
      arcSpawnTimer += delta
      if (arcSpawnTimer > 1.5 + Math.random() * 2) {
        spawnArc()
        arcSpawnTimer = 0
      }

      // Update arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i]
        if (!arc.fadeOut) {
          arc.progress += delta * 30
          const drawCount = Math.min(Math.floor(arc.progress), arc.maxProgress)
          arc.line.geometry.setDrawRange(0, drawCount)

          // Move head to leading edge
          const points = arc.line.geometry.attributes.position
          if (drawCount > 0 && drawCount <= arc.maxProgress) {
            const idx = Math.min(drawCount - 1, arc.maxProgress - 1)
            arc.head.position.set(
              points.getX(idx),
              points.getY(idx),
              points.getZ(idx)
            )
          }

          if (arc.progress >= arc.maxProgress) {
            arc.fadeOut = true
          }
        } else {
          arc.opacity -= delta * 0.8
          if (arc.line.material instanceof THREE.LineBasicMaterial) {
            arc.line.material.opacity = Math.max(0, arc.opacity)
          }
          if (arc.head.material instanceof THREE.SpriteMaterial) {
            arc.head.material.opacity = Math.max(0, arc.opacity)
          }
          if (arc.opacity <= 0) {
            globeGroup.remove(arc.line)
            globeGroup.remove(arc.head)
            arc.line.geometry.dispose()
            ;(arc.line.material as THREE.Material).dispose()
            ;(arc.head.material as THREE.Material).dispose()
            arcs.splice(i, 1)
          }
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('mousemove', onMouseMove)
      if (sceneDataRef.current) {
        cancelAnimationFrame(sceneDataRef.current.frameId)
      }
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
