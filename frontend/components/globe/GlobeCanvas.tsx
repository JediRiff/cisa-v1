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
  energyTargets,
  regionColors,
  GeoPoint,
} from './worldData'

interface ActiveArc {
  line: THREE.Line
  progress: number
  maxProgress: number
  head: THREE.Sprite
  fadeOut: boolean
  opacity: number
}

interface PulseMarker {
  mesh: THREE.Sprite
  phase: number
  baseScale: number
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

export default function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
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

    // Globe group (for synchronized rotation)
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

    // Energy target markers (bright cyan dots)
    energyTargets.forEach((target) => {
      const pos = latLngToVector3(target.lat, target.lng, 1.012)
      const markerGeo = new THREE.SphereGeometry(0.012, 8, 8)
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 })
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.copy(pos)
      globeGroup.add(marker)
    })

    // Threat origin pulse markers
    const markers: PulseMarker[] = []
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
      sprite.scale.set(0.06, 0.06, 1)
      globeGroup.add(sprite)
      markers.push({ mesh: sprite, phase: Math.random() * Math.PI * 2, baseScale: 0.06 })
    })

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

    // Active arcs tracking
    const arcs: ActiveArc[] = []

    // Spawn a new threat arc
    function spawnArc() {
      if (arcs.length >= 8) return

      const actor = threatActors[Math.floor(Math.random() * threatActors.length)]
      const target = energyTargets[Math.floor(Math.random() * energyTargets.length)]
      const curve = createArcCurve(actor.origin, target, 1.01)
      const points = curve.getPoints(80)

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      geometry.setDrawRange(0, 0)

      const severityColors = ['#ff3333', '#ff6600', '#ffcc00']
      const color = severityColors[Math.floor(Math.random() * severityColors.length)]

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.8,
      })

      const line = new THREE.Line(geometry, material)
      globeGroup.add(line)

      // Glowing head sprite
      const headMat = new THREE.SpriteMaterial({
        map: createGlowTexture('rgba(255, 255, 255, 0.8)'),
        color: new THREE.Color(color),
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

      // Pulse threat origin markers
      markers.forEach((m) => {
        const scale = m.baseScale + Math.sin(elapsed * 2 + m.phase) * 0.015
        m.mesh.scale.set(scale, scale, 1)
        if (m.mesh.material instanceof THREE.SpriteMaterial) {
          m.mesh.material.opacity = 0.5 + Math.sin(elapsed * 2 + m.phase) * 0.3
        }
      })

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
      if (sceneDataRef.current) {
        cancelAnimationFrame(sceneDataRef.current.frameId)
      }
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
