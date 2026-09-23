import {
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  FrontSide,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  Object3D,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Uint16BufferAttribute,
} from 'three'
import type { Point } from '../domain/schema'

const TEXTURE_SIZE = 512
const MAX_BLADES = 12_000
const BLADE_SPACING = 0.17
const GRASS_COLORS = ['#748050', '#6c7d4d', '#89915b', '#5c7349']

function hash(x: number, z: number) {
  let value = Math.imul(x, 374761393) + Math.imul(z, 668265263)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function noise(x: number, z: number, period: number) {
  const ix = Math.floor(x)
  const iz = Math.floor(z)
  const fx = x - ix
  const fz = z - iz
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  const wrap = (value: number) => ((value % period) + period) % period
  const sample = (dx: number, dz: number) =>
    hash(wrap(ix + dx), wrap(iz + dz))
  const a = sample(0, 0) * (1 - sx) + sample(1, 0) * sx
  const b = sample(0, 1) * (1 - sx) + sample(1, 1) * sx
  return a * (1 - sz) + b * sz
}

// The texture covers sixteen world metres per repeat. Use the same broad
// noise when placing blades so pale and dark tufts follow the ground beneath.
function grassPatchAt(x: number, z: number) {
  return noise(x / 4, -z / 4, 4)
}

function makeGrassTexture() {
  const pixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
  for (let z = 0; z < TEXTURE_SIZE; z++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const u = x / TEXTURE_SIZE
      const v = z / TEXTURE_SIZE
      const broad = noise(u * 4, v * 4, 4)
      const fine = noise(u * 32, v * 32, 32)
      const grain = hash(x, z)
      const stripe = Math.sin(u * Math.PI * 4) * 0.018
      const shade = 0.82 + broad * 0.22 + fine * 0.07 + (grain - 0.5) * 0.035 + stripe
      const fleck = grain > 0.99 ? 0.06 : 0
      const offset = (z * TEXTURE_SIZE + x) * 4
      pixels[offset] = Math.min(255, Math.round(109 * (shade + fleck)))
      pixels[offset + 1] = Math.min(255, Math.round(130 * (shade + fleck)))
      pixels[offset + 2] = Math.min(255, Math.round(79 * (shade + fleck * 0.6)))
      pixels[offset + 3] = 255
    }
  }
  // Small, directional marks add close-up turf detail without extra meshes.
  // Their positions and tones are deterministic across reloads.
  for (let mark = 0; mark < 6500; mark++) {
    const x = Math.floor(hash(mark, 17) * TEXTURE_SIZE)
    const z = Math.floor(hash(mark, 43) * TEXTURE_SIZE)
    const length = 1 + Math.floor(hash(mark, 71) * 4)
    const lean = hash(mark, 97) < 0.5 ? -1 : 1
    const light = hash(mark, 131) < 0.48
    for (let step = 0; step < length; step++) {
      const px = (x + lean * Math.floor(step / 2) + TEXTURE_SIZE) % TEXTURE_SIZE
      const pz = (z + step) % TEXTURE_SIZE
      const offset = (pz * TEXTURE_SIZE + px) * 4
      const delta = light ? 10 : -9
      pixels[offset] = Math.max(0, Math.min(255, pixels[offset]! + delta))
      pixels[offset + 1] = Math.max(0, Math.min(255, pixels[offset + 1]! + delta))
      pixels[offset + 2] = Math.max(0, Math.min(255, pixels[offset + 2]! + delta * 0.7))
    }
  }
  const texture = new DataTexture(pixels, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1 / 16, 1 / 16)
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

export const grassTexture = makeGrassTexture()

function containsPoint(outline: readonly Point[], x: number, z: number) {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i]!
    const b = outline[j]!
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0])
      inside = !inside
  }
  return inside
}

function makeBladeGeometry() {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([
    -0.5, 0, 0,
    0.5, 0, 0,
    -0.3, 0.46, 0.035,
    0.3, 0.46, 0.035,
    0.12, 1, 0.14,
  ], 3))
  // The reference lawn lights each tiny blade as upward-facing turf. Explicit
  // upward normals keep the varied rotations from reading as black dashes.
  geometry.setAttribute('normal', new Float32BufferAttribute([
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  ], 3))
  // Draw both faces with front-facing triangles so the renderer does not flip
  // those normals when a blade is seen from behind.
  geometry.setIndex(new Uint16BufferAttribute([
    0, 1, 2, 1, 3, 2, 2, 3, 4,
    2, 1, 0, 2, 3, 1, 4, 3, 2,
  ], 1))
  return geometry
}

export function makeGrassBlades(outline: readonly Point[], elevation: number, contains: (x: number, z: number) => boolean): InstancedMesh | null {
  if (outline.length < 3) return null
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const [x, z] of outline) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  const width = maxX - minX
  const depth = maxZ - minZ
  if (width <= 0 || depth <= 0) return null

  const spacing = Math.max(
    BLADE_SPACING,
    Math.sqrt(width * depth / MAX_BLADES),
    width / MAX_BLADES,
    depth / MAX_BLADES,
  )
  const columns = Math.ceil(width / spacing)
  const rows = Math.ceil(depth / spacing)
  const placements: [number, number, number, number, number, number, number][] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const seedX = Math.floor(minX / spacing) + column
      const seedZ = Math.floor(minZ / spacing) + row
      const x = minX + (column + 0.15 + hash(seedX, seedZ) * 0.7) * spacing
      const z = minZ + (row + 0.15 + hash(seedZ, seedX + 7) * 0.7) * spacing
      if (!containsPoint(outline, x, z) || !contains(x, z)) continue
      const patch = grassPatchAt(x, z)
      // Let blade coverage ebb with the broad lawn color variation.
      if (hash(seedX + 13, seedZ - 47) > 0.64 + patch * 0.28) continue
      const variety = hash(seedX + 41, seedZ - 19)
      placements.push([x, z, variety, hash(seedX - 17, seedZ + 31), seedX, seedZ, patch])
    }
  }
  if (!placements.length) return null

  const material = new MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#617744',
    emissiveIntensity: 0.25,
    roughness: 0.98,
    side: FrontSide,
  })
  const blades = new InstancedMesh(makeBladeGeometry(), material, placements.length)
  const dummy = new Object3D()
  const color = material.color.clone()
  const poses: { x: number; z: number; height: number; width: number; depth: number; tiltX: number; tiltZ: number; angle: number; phase: number }[] = []
  placements.forEach(([x, z, variety, lean, seedX, seedZ, patch], index) => {
    const height = 0.055 + variety * 0.065
    const pose = {
      x, z, height,
      width: 0.012 + lean * 0.011,
      depth: 0.4 + variety * 0.5,
      tiltX: (lean - 0.5) * 0.16,
      tiltZ: (variety - 0.5) * 0.16,
      angle: hash(seedX + 91, seedZ) * Math.PI * 2,
      phase: x * 0.64 + z * 0.54 + hash(seedX - 11, seedZ + 29) * 0.65,
    }
    poses.push(pose)
    dummy.position.set(x, elevation + 0.025, z)
    dummy.rotation.set(pose.tiltX, pose.angle, pose.tiltZ)
    dummy.scale.set(pose.width, height, pose.depth)
    dummy.updateMatrix()
    blades.setMatrixAt(index, dummy.matrix)
    color.set(GRASS_COLORS[Math.min(GRASS_COLORS.length - 1, Math.floor(hash(seedX, seedZ + 53) * GRASS_COLORS.length))]!)
    color.multiplyScalar(0.86 + patch * 0.2 + hash(seedX - 29, seedZ + 61) * 0.12)
    blades.setColorAt(index, color)
  })
  blades.instanceMatrix.needsUpdate = true
  if (blades.instanceColor) blades.instanceColor.needsUpdate = true
  blades.computeBoundingSphere()
  if (blades.boundingSphere) blades.boundingSphere.radius += 0.02
  // Update visible grass at a modest rate. Instance transforms use the
  // regular material path, avoiding custom TSL nodes in the WebGPU renderer.
  let lastWindUpdate = 0
  blades.onBeforeRender = () => {
    const now = performance.now()
    if (now - lastWindUpdate < 40) return
    lastWindUpdate = now
    const seconds = now / 1000
    poses.forEach((pose, index) => {
      const phase = pose.phase + seconds * 0.83
      const sway = Math.sin(phase) + Math.sin(phase * 1.31 + seconds * 0.24) * 0.35
      dummy.position.set(pose.x, elevation + 0.025, pose.z)
      dummy.rotation.set(pose.tiltX + Math.cos(phase * 0.81) * 0.035, pose.angle, pose.tiltZ + sway * 0.08)
      dummy.scale.set(pose.width, pose.height, pose.depth)
      dummy.updateMatrix()
      blades.setMatrixAt(index, dummy.matrix)
    })
    blades.instanceMatrix.needsUpdate = true
  }
  blades.name = 'ground-area-grass-blades'
  blades.castShadow = false
  blades.receiveShadow = true
  blades.raycast = () => {}
  return blades
}
