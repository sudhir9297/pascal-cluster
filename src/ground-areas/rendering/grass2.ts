/** Experimental flowering grass, separate from the existing lawn renderer. */
import type { Grass2Settings, Point } from '../domain/schema'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Uint16BufferAttribute,
} from 'three'

type Grass2FlowerMix = Grass2Settings['flowerMix']
export const DEFAULT_GRASS2_SETTINGS: Grass2Settings = {
  density: 1,
  height: 1,
  flowerDensity: 0.6,
  flowerMix: 'mixed',
  wind: 0.55,
  seed: 1,
}
const MAX_TUFTS = 8000
const MAX_FLOWERS = 800
const FLOWER_COLORS = {
  dandelion: '#efc844',
  clover: '#e9e4d6',
  violet: '#8c74bd',
  blue: '#8ca8dc',
} as const
type Flower = keyof typeof FLOWER_COLORS
type Plant = {
  x: number
  z: number
  height: number
  angle: number
  phase: number
  shade: number
}
type Bloom = Plant & { kind: Flower; size: number }

function hash(x: number, z: number, seed: number) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(z, 668265263) ^
    Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function patch(x: number, z: number, seed: number, scale: number) {
  const px = x / scale,
    pz = z / scale
  const ix = Math.floor(px),
    iz = Math.floor(pz)
  const tx = px - ix,
    tz = pz - iz
  const sx = tx * tx * (3 - 2 * tx),
    sz = tz * tz * (3 - 2 * tz)
  const a = hash(ix, iz, seed) * (1 - sx) + hash(ix + 1, iz, seed) * sx
  const b = hash(ix, iz + 1, seed) * (1 - sx) + hash(ix + 1, iz + 1, seed) * sx
  return a * (1 - sz) + b * sz
}
function inside(outline: readonly Point[], x: number, z: number) {
  let hit = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i]!,
      b = outline[j]!
    if (
      a[1] > z !== b[1] > z &&
      x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit
  }
  return hit
}
function tuftGeometry(blades: number, segments: number) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = []
  const base = new Color('#657a3e'),
    middle = new Color('#809554'),
    tip = new Color('#a3ae70')
  for (let blade = 0; blade < blades; blade++) {
    const angle = (blade / blades) * Math.PI * 2 + hash(blade, 7, 3) * 0.5
    const dx = Math.cos(angle),
      dz = Math.sin(angle)
    const sx = -dz,
      sz = dx
    const short = blade >= 5
    const length = short
      ? 0.32 + hash(blade, 11, 9) * 0.2
      : 0.72 + hash(blade, 11, 9) * 0.3
    const lean = short
      ? 0.55 + hash(blade, 13, 7) * 0.2
      : 0.25 + hash(blade, 13, 7) * 0.27
    const vertexStart = positions.length / 3
    for (let segment = 0; segment <= segments; segment++) {
      const t = segment / segments
      const bend = lean * t * t
      const y = length * (t - 0.18 * t * t)
      const halfWidth =
        (short ? 0.025 : 0.02) *
        (0.8 + hash(blade, 17, 4) * 0.4) *
        (0.2 + 0.8 * Math.sin(Math.PI * Math.pow(t, 0.75)))
      const color =
        t < 0.45
          ? base.clone().lerp(middle, t / 0.45)
          : middle.clone().lerp(tip, (t - 0.45) / 0.55)
      for (const side of [-1, 1]) {
        positions.push(
          dx * bend + sx * halfWidth * side,
          y,
          dz * bend + sz * halfWidth * side,
        )
        colors.push(color.r, color.g, color.b)
      }
      if (segment < segments) {
        const v = vertexStart + segment * 2
        indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(new Uint16BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}
function flowerGeometry(kind: Flower) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = []
  const petalCount =
    kind === 'clover' ? 10 : kind === 'violet' ? 5 : kind === 'blue' ? 4 : 12
  const radius = kind === 'clover' ? 0.72 : 0.94
  const base = new Color(FLOWER_COLORS[kind])
  const center = kind === 'clover' ? new Color('#b3a993') : new Color('#c9a947')
  for (let petal = 0; petal < petalCount; petal++) {
    const angle = (petal * Math.PI * 2) / petalCount
    const width = kind === 'dandelion' ? 0.19 : kind === 'clover' ? 0.27 : 0.38
    const start = positions.length / 3
    const color = base.clone().multiplyScalar(0.88 + hash(petal, 31, 4) * 0.22)
    const petalRadius = radius * (0.88 + hash(petal, 47, 5) * 0.18)
    const coords: [number, number, number][] = [
      [0.1, 0, 0],
      [0.5, -width, 0.16],
      [petalRadius, -width * 0.58, 0.21],
      [petalRadius * 1.1, 0, 0.24],
      [petalRadius, width * 0.58, 0.21],
      [0.5, width, 0.16],
    ]
    for (const [r, sideways, y] of coords) {
      positions.push(
        Math.cos(angle) * r - Math.sin(angle) * sideways,
        y,
        Math.sin(angle) * r + Math.cos(angle) * sideways,
      )
      colors.push(color.r, color.g, color.b)
    }
    indices.push(
      start,
      start + 1,
      start + 2,
      start,
      start + 2,
      start + 3,
      start,
      start + 3,
      start + 4,
      start,
      start + 4,
      start + 5,
    )
  }
  const centerStart = positions.length / 3
  positions.push(0, 0.23, 0)
  colors.push(center.r, center.g, center.b)
  for (let i = 0; i <= 12; i++) {
    const angle = (i * Math.PI * 2) / 12
    positions.push(Math.cos(angle) * 0.18, 0.2, Math.sin(angle) * 0.18)
    colors.push(center.r, center.g, center.b)
    if (i > 0) indices.push(centerStart, centerStart + i, centerStart + i + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(new Uint16BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}
function stemGeometry() {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        -0.0025, 0, 0, 0.0025, 0, 0, -0.0018, 1, 0, 0.0018, 1, 0, 0, 0, -0.0025,
        0, 0, 0.0025, 0, 1, -0.0018, 0, 1, 0.0018,
      ],
      3,
    ),
  )
  geometry.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6])
  geometry.computeVertexNormals()
  return geometry
}
function flowerKind(
  x: number,
  z: number,
  seed: number,
  mix: Grass2FlowerMix,
): Flower {
  if (mix === 'clover') return 'clover'
  if (mix === 'dandelion') return 'dandelion'
  const clustered = patch(x, z, seed + 67, 1.8)
  if (mix === 'wildflowers') return clustered < 0.5 ? 'violet' : 'blue'
  if (clustered < 0.38) return 'clover'
  if (clustered < 0.7) return 'dandelion'
  return hash(Math.floor(x * 10), Math.floor(z * 10), seed) < 0.5
    ? 'violet'
    : 'blue'
}
function placements(
  outline: readonly Point[],
  contains: (x: number, z: number) => boolean,
  settings: Grass2Settings,
) {
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity
  for (const [x, z] of outline) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  const area = (maxX - minX) * (maxZ - minZ)
  if (!Number.isFinite(area) || area <= 0) return { plants: [], blooms: [] }
  const density = Math.max(0.15, Math.min(2, settings.density))
  const spacing = Math.max(
    0.13 / Math.sqrt(density),
    Math.sqrt(area / MAX_TUFTS),
  )
  const x0 = Math.floor(minX / spacing),
    x1 = Math.ceil(maxX / spacing)
  const z0 = Math.floor(minZ / spacing),
    z1 = Math.ceil(maxZ / spacing)
  const plants: Plant[] = [],
    blooms: Bloom[] = []
  const seed = Math.round(settings.seed)
  for (let iz = z0; iz < z1; iz++)
    for (let ix = x0; ix < x1; ix++) {
      const x = (ix + 0.5 + (hash(ix, iz, seed + 1) - 0.5) * 0.85) * spacing
      const z = (iz + 0.5 + (hash(ix, iz, seed + 2) - 0.5) * 0.85) * spacing
      if (!inside(outline, x, z) || !contains(x, z)) continue
      const broad = patch(x, z, seed + 11, 3.8)
      const fine = patch(x, z, seed + 17, 1.1)
      const coverage = Math.min(0.94, 0.46 + broad * 0.34 + fine * 0.16)
      if (hash(ix, iz, seed + 3) > coverage) continue
      const height =
        (0.18 + 0.22 * hash(ix, iz, seed + 4)) *
        Math.max(0.35, Math.min(2, settings.height)) *
        (0.75 + broad * 0.4)
      const plant = {
        x,
        z,
        height,
        angle: hash(ix, iz, seed + 5) * Math.PI * 2,
        phase: hash(ix, iz, seed + 6) * Math.PI * 2,
        shade: broad,
      }
      plants.push(plant)
      const flowerChance =
        Math.max(0, Math.min(1, settings.flowerDensity)) *
        (0.045 + 0.19 * Math.pow(patch(x, z, seed + 37, 2.2), 2))
      if (
        blooms.length < MAX_FLOWERS &&
        hash(ix, iz, seed + 7) < flowerChance
      ) {
        blooms.push({
          ...plant,
          kind: flowerKind(x, z, seed, settings.flowerMix),
          height: height * (0.75 + hash(ix, iz, seed + 8) * 0.45),
          size: 0.023 + hash(ix, iz, seed + 9) * 0.012,
        })
      }
    }
  return { plants, blooms }
}
function colorize(
  mesh: InstancedMesh,
  index: number,
  shade: number,
  hue: number,
) {
  const color = new Color().setHSL(hue, 0.29 + shade * 0.1, 0.75 + shade * 0.13)
  mesh.setColorAt(index, color)
}
export function makeGrass2(
  outline: readonly Point[],
  elevation: number,
  contains: (x: number, z: number) => boolean,
  overrides: Partial<Grass2Settings> = {},
): Group {
  const group = new Group()
  group.name = 'ground-area-grass2'
  if (outline.length < 3) return group
  const settings = { ...DEFAULT_GRASS2_SETTINGS, ...overrides }
  const { plants, blooms } = placements(outline, contains, settings)
  if (!plants.length) return group
  const dummy = new Object3D()
  const grass = new InstancedMesh(
    tuftGeometry(8, 4),
    new MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.92,
      side: DoubleSide,
      emissive: '#283719',
      emissiveIntensity: 0.12,
    }),
    plants.length,
  )
  grass.name = 'grass2-tufts'
  grass.castShadow = false
  grass.receiveShadow = true
  grass.raycast = () => {}
  grass.instanceMatrix.setUsage(DynamicDrawUsage)
  plants.forEach((p, i) => {
    dummy.position.set(p.x, elevation + 0.024, p.z)
    dummy.rotation.set(0, p.angle, 0)
    dummy.scale.set(p.height, p.height, p.height)
    dummy.updateMatrix()
    grass.setMatrixAt(i, dummy.matrix)
    colorize(grass, i, p.shade, 0.23 + (p.shade - 0.5) * 0.035)
  })
  grass.instanceMatrix.needsUpdate = true
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true
  grass.computeBoundingSphere()
  if (grass.boundingSphere) grass.boundingSphere.radius += 0.15
  group.add(grass)
  const stem = blooms.length
    ? new InstancedMesh(
        stemGeometry(),
        new MeshStandardMaterial({
          color: '#658340',
          roughness: 1,
          side: DoubleSide,
        }),
        blooms.length,
      )
    : null
  if (stem) {
    stem.name = 'grass2-flower-stems'
    stem.castShadow = false
    stem.raycast = () => {}
    stem.instanceMatrix.setUsage(DynamicDrawUsage)
    blooms.forEach((b, i) => {
      dummy.position.set(b.x, elevation + 0.025, b.z)
      dummy.rotation.set(0, b.angle, 0)
      dummy.scale.set(1, b.height, 1)
      dummy.updateMatrix()
      stem.setMatrixAt(i, dummy.matrix)
    })
    stem.instanceMatrix.needsUpdate = true
    stem.computeBoundingSphere()
    if (stem.boundingSphere) stem.boundingSphere.radius += 0.15
    group.add(stem)
  }
  const flowerMeshes: { mesh: InstancedMesh; flowers: Bloom[] }[] = []
  for (const kind of Object.keys(FLOWER_COLORS) as Flower[]) {
    const flowers = blooms.filter((b) => b.kind === kind)
    if (!flowers.length) continue
    const mesh = new InstancedMesh(
      flowerGeometry(kind),
      new MeshStandardMaterial({
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.85,
        side: DoubleSide,
        emissive: FLOWER_COLORS[kind],
        emissiveIntensity: 0.1,
      }),
      flowers.length,
    )
    mesh.name = `grass2-${kind}`
    mesh.castShadow = false
    mesh.raycast = () => {}
    mesh.instanceMatrix.setUsage(DynamicDrawUsage)
    flowers.forEach((b, i) => {
      dummy.position.set(b.x, elevation + 0.025 + b.height, b.z)
      dummy.rotation.set(0, b.angle, 0)
      dummy.scale.set(b.size, b.size, b.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.12
    flowerMeshes.push({ mesh, flowers })
    group.add(mesh)
  }
  const wind = Math.max(0, Math.min(1, settings.wind))
  if (wind > 0) {
    let last = 0
    grass.onBeforeRender = () => {
      const now = performance.now()
      if (now - last < 65) return
      last = now
      const time = now / 1000
      plants.forEach((p, i) => {
        const wave = Math.sin(time * 1.35 + p.x * 0.55 + p.z * 0.37 + p.phase)
        dummy.position.set(p.x, elevation + 0.024, p.z)
        dummy.rotation.set(wave * wind * 0.035, p.angle, wave * wind * 0.07)
        dummy.scale.set(p.height, p.height, p.height)
        dummy.updateMatrix()
        grass.setMatrixAt(i, dummy.matrix)
      })
      grass.instanceMatrix.needsUpdate = true
      blooms.forEach((b, i) => {
        const wave = Math.sin(time * 1.35 + b.x * 0.55 + b.z * 0.37 + b.phase)
        if (stem) {
          dummy.position.set(b.x, elevation + 0.025, b.z)
          dummy.rotation.set(wave * wind * 0.045, b.angle, wave * wind * 0.085)
          dummy.scale.set(1, b.height, 1)
          dummy.updateMatrix()
          stem.setMatrixAt(i, dummy.matrix)
        }
      })
      if (stem) stem.instanceMatrix.needsUpdate = true
      for (const { mesh, flowers } of flowerMeshes) {
        flowers.forEach((b, i) => {
          const wave = Math.sin(time * 1.35 + b.x * 0.55 + b.z * 0.37 + b.phase)
          dummy.position.set(
            b.x + wave * wind * b.height * 0.085,
            elevation + 0.025 + b.height,
            b.z + wave * wind * b.height * 0.045,
          )
          dummy.rotation.set(0, b.angle, 0)
          dummy.scale.set(b.size, b.size, b.size)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      }
    }
  }
  return group
}
