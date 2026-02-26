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

      const borderMat = new THREE.LineBasicMaterial({
        color: 0x3a6a8a,
        transparent: true,
        opacity: 0.4,
      })

      const countries = topology.objects.countries
      if (!countries) return

      countries.geometries.forEach((geo: any) => {
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
          polygon.forEach((ring: number[]) => {
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

            if (coords.length < 2) return

            const points3d = coords.map(([lng, lat]) =>
              latLngToVector3(lat, lng, radius)
            )
            const geometry = new THREE.BufferGeometry().setFromPoints(points3d)
            globeGroup.add(new THREE.Line(geometry, borderMat))
          })
        })
      })
    })
    .catch(() => {
      console.warn('Failed to load country borders')
    })
}

export default function GlobeCanvas({ onFacilityClick, onThreatActorClick, onEmptyClick, selectedFacilityId, selectedActorName, activeCampaignActors }: GlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbacksRef = useRef({ onFacilityClick, onThreatActorClick, onEmptyClick })
  const activeCampaignActorsRef = useRef<string[]>(activeCampaignActors || [])
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

    // Stars
    const starCount = 1500
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
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.7 })
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

    // Wireframe grid overlay
    const wireGeo = new THREE.SphereGeometry(1.002, 36, 18)
    const wireEdges = new THREE.EdgesGeometry(wireGeo)
    const wireMat = new THREE.LineBasicMaterial({ color: 0x1a2a4a, transparent: true, opacity: 0.25 })
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
          gl_FragColor = vec4(0.2, 0.5, 1.0, 1.0) * intensity * 0.6;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    })
    globeGroup.add(new THREE.Mesh(atmosGeo, atmosMat))

    // Country border outlines (loaded async from TopoJSON)
    loadCountryBorders(globeGroup, 1.005)

    // Land dots - colored by region
    const dotGeo = new THREE.BufferGeometry()
    const dotPositions = new Float32Array(landPoints.length * 3)
    const dotColors = new Float32Array(landPoints.length * 3)

    landPoints.forEach((p, i) => {
      const vec = latLngToVector3(p.lat, p.lng, 1.008)
      dotPositions[i * 3] = vec.x
      dotPositions[i * 3 + 1] = vec.y
      dotPositions[i * 3 + 2] = vec.z

      const color = new THREE.Color(regionColors[p.region || 'na'] || '#4a9eff')
      dotColors[i * 3] = color.r
      dotColors[i * 3 + 1] = color.g
      dotColors[i * 3 + 2] = color.b
    })

    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3))
    dotGeo.setAttribute('color', new THREE.BufferAttribute(dotColors, 3))
    const dotMat = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
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

      // Solid marker sphere
      const markerGeo = new THREE.SphereGeometry(0.015, 10, 10)
      const markerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.95,
      })
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.copy(pos)
      marker.userData = { type: 'facility', facility }
      facilityMeshGroup.add(marker)

      // Subtle glow sprite behind marker
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
