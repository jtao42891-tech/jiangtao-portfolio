import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
varying vec2 v_texcoord;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  v_texcoord = uv;
}
`

// Adapted from the supplied React Bits ShapeBlur shader. The pointer input is
// replaced by an automatic sweep so the effect plays by itself after a click.
const fragmentShader = /* glsl */ `
varying vec2 v_texcoord;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_shapeSize;
uniform float u_roundness;
uniform float u_borderSize;
uniform float u_circleSize;
uniform float u_circleEdge;

vec2 coord(in vec2 p) {
  p = p / u_resolution.xy;
  if (u_resolution.x > u_resolution.y) {
    p.x *= u_resolution.x / u_resolution.y;
    p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
  } else {
    p.y *= u_resolution.y / u_resolution.x;
    p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
  }
  p -= 0.5;
  p *= vec2(-1.0, 1.0);
  return p;
}

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

float sdCircle(in vec2 st, in vec2 center) {
  return length(st - center) * 2.0;
}

float fill(float x, float size, float edge) {
  return 1.0 - smoothstep(size - edge, size + edge, x);
}

float strokeAA(float x, float size, float width, float edge) {
  float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
  float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + width * 0.5)
          - smoothstep(size - edge - afwidth, size + edge + afwidth, x - width * 0.5);
  return clamp(d, 0.0, 1.0);
}

void main() {
  vec2 st = coord(gl_FragCoord.xy) + 0.5;
  vec2 posMouse = coord(u_mouse * u_pixelRatio) * vec2(1.0, -1.0) + 0.5;
  float circle = fill(sdCircle(st, posMouse), u_circleSize, u_circleEdge);
  float shape = sdRoundRect(st, vec2(u_shapeSize), u_roundness);
  float alpha = strokeAA(shape, 0.0, u_borderSize, circle) * 4.0;
  gl_FragColor = vec4(vec3(1.0), alpha);
}
`

export default function ShapeBlur({
  className = '',
  pixelRatioProp = 2,
  shapeSize = 1.15,
  roundness = 0.44,
  borderSize = 0.045,
  circleSize = 0.48,
  circleEdge = 0.34,
  duration = 1350,
}) {
  const mountRef = useRef(null)
  const materialRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let active = true
    let animationFrameId = 0
    let renderer
    let observer
    const start = performance.now()
    const mouse = new THREE.Vector2()
    const resolution = new THREE.Vector2()
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera()
    camera.position.z = 1
    const geometry = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_mouse: { value: mouse },
        u_resolution: { value: resolution },
        u_pixelRatio: { value: pixelRatioProp },
        u_shapeSize: { value: shapeSize },
        u_roundness: { value: roundness },
        u_borderSize: { value: borderSize },
        u_circleSize: { value: circleSize },
        u_circleEdge: { value: circleEdge },
      },
      transparent: true,
    })
    materialRef.current = material
    const quad = new THREE.Mesh(geometry, material)
    scene.add(quad)

    const resize = () => {
      if (!active || !renderer) return
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      const dpr = Math.min(pixelRatioProp || window.devicePixelRatio || 1, 2)
      renderer.setPixelRatio(dpr)
      renderer.setSize(width, height, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()
      quad.scale.set(width, height, 1)
      resolution.set(width, height).multiplyScalar(dpr)
      material.uniforms.u_pixelRatio.value = dpr
    }

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.setClearColor(0x000000, 0)
      renderer.domElement.setAttribute('aria-hidden', 'true')
      mount.appendChild(renderer.domElement)
      resize()
      observer = new ResizeObserver(resize)
      observer.observe(mount)
    } catch {
      mount.dataset.shapeBlurFallback = 'true'
      geometry.dispose()
      material.dispose()
      materialRef.current = null
      return undefined
    }

    const update = now => {
      if (!active) return
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      mouse.set(
        width * (0.08 + 0.84 * eased),
        height * (0.5 + Math.sin(progress * Math.PI) * 0.13),
      )
      renderer.render(scene, camera)
      if (progress < 1) animationFrameId = requestAnimationFrame(update)
    }
    animationFrameId = requestAnimationFrame(update)

    return () => {
      active = false
      cancelAnimationFrame(animationFrameId)
      observer?.disconnect()
      if (renderer?.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
      materialRef.current = null
      renderer?.dispose()
      renderer?.forceContextLoss()
    }
  }, [duration])

  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.u_pixelRatio.value = pixelRatioProp
    material.uniforms.u_shapeSize.value = shapeSize
    material.uniforms.u_roundness.value = roundness
    material.uniforms.u_borderSize.value = borderSize
    material.uniforms.u_circleSize.value = circleSize
    material.uniforms.u_circleEdge.value = circleEdge
  }, [pixelRatioProp, shapeSize, roundness, borderSize, circleSize, circleEdge])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}
