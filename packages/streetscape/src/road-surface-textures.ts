import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'
import {
  ROAD_SURFACE_MATERIALS,
  roadSurfaceTexturePixels,
  type RoadSurfaceMaterialKind,
} from './road-surface-material'

// One immutable tile per material, shared across roads and junctions for the
// lifetime of the module. No image requests or per-render texture allocation.
const textures = new Map<RoadSurfaceMaterialKind, DataTexture>()
export function roadSurfaceTexture(kind: RoadSurfaceMaterialKind | undefined): DataTexture | null {
  if (!kind) return null
  const cached = textures.get(kind)
  if (cached) return cached
  const texture = new DataTexture(roadSurfaceTexturePixels(kind), 128, 128)
  texture.name = `road-surface-${kind}`
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.repeat.setScalar(1 / ROAD_SURFACE_MATERIALS[kind].tileMeters)
  texture.needsUpdate = true
  textures.set(kind, texture)
  return texture
}
