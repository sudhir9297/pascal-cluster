import type { RoadStylePreset } from './schema'

export type RoadSurfaceMaterialKind = 'asphalt' | 'concrete' | 'paving-stones'

export const ROAD_SURFACE_MATERIALS = {
  asphalt: { label: 'Asphalt', color: '#3f4246', roughness: 0.96, tileMeters: 1 },
  concrete: { label: 'Concrete', color: '#b5b2a9', roughness: 0.86, tileMeters: 4 },
  'paving-stones': { label: 'Paving stones', color: '#a29886', roughness: 0.93, tileMeters: 0.8 },
} satisfies Record<
  RoadSurfaceMaterialKind,
  { label: string; color: string; roughness: number; tileMeters: number }
>

/** Unspecified, broad (paved), mixed, and unsupported tags retain the preset appearance. */
export function osmSurfaceMaterial(tag: string | undefined): RoadSurfaceMaterialKind | undefined {
  switch (tag?.trim().toLowerCase()) {
    case 'asphalt':
      return 'asphalt'
    case 'concrete':
    case 'concrete:plates':
      return 'concrete'
    case 'paving_stones':
      return 'paving-stones'
    default:
      return undefined
  }
}

export function roadSurfaceDescription(style: RoadStylePreset): string {
  const material = style.surfaceMaterial
    ? ROAD_SURFACE_MATERIALS[style.surfaceMaterial].label
    : 'Preset appearance'
  if (!style.surfaceSource) return material
  if (style.surfaceSource.kind === 'mapped')
    return `${material} · Mapped surface: ${style.surfaceSource.tag}`
  return style.surfaceSource.tag
    ? `${material} · Unresolved surface: ${style.surfaceSource.tag}`
    : `${material} · Surface not mapped`
}

/** Planar metre UVs are identical at shared road/junction vertices. */
export function roadSurfaceUvs(
  positions: ArrayLike<number>,
  origin: readonly number[] = [0, 0, 0],
): number[] {
  const uvs: number[] = []
  for (let i = 0; i < positions.length; i += 3)
    uvs.push(positions[i]! + origin[0]!, positions[i + 2]! + origin[2]!)
  return uvs
}

/** Small, deterministic tiles. Joint spacing is an illustration, not surveyed geometry. */
export function roadSurfaceTexturePixels(kind: RoadSurfaceMaterialKind, size = 128): Uint8Array {
  const pixels = new Uint8Array(size * size * 4)
  let seed = 9173
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const grain = (seed >>> 24) / 255
      let shade = 240 + Math.round(grain * 15)
      if (kind === 'concrete') {
        shade = x === 0 || y === 0 ? 190 : 247 + Math.round(grain * 8)
      } else if (kind === 'paving-stones') {
        const row = Math.floor(y / (size / 4))
        const staggeredX = (x + ((row % 2) * size) / 4) % (size / 2)
        const joint = y % (size / 4) < 1 || staggeredX < 1
        shade = joint ? 155 : 232 + Math.round(grain * 23)
      }
      const index = (y * size + x) * 4
      pixels[index] = pixels[index + 1] = pixels[index + 2] = shade
      pixels[index + 3] = 255
    }
  return pixels
}
