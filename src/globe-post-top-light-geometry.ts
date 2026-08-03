import { CatmullRomCurve3, LatheGeometry, Vector2, Vector3 } from 'three'

/**
 * Shared proportions for the traditional acorn post-top light.
 *
 * The 430 mm refractor follows the common 17-inch acorn class. The remaining
 * dimensions describe a cast fitter, decorative capital, tapered shaft, and
 * anchor base at a pedestrian/civic scale.
 */
export const GLOBE_POST_TOP_LIGHT_DIMENSIONS = {
  basePlateSize: 0.44,
  basePlateHeight: 0.075,
  baseBoltOffset: 0.155,
  pedestalBottomRadius: 0.19,
  pedestalTopRadius: 0.135,
  pedestalHeight: 0.82,
  shaftBottomRadius: 0.105,
  shaftTopRadius: 0.072,
  shaftOverlap: 0.07,
  collarRadius: 0.13,
  capitalRadius: 0.22,
  capitalHeight: 0.24,
  fitterBottomRadius: 0.17,
  fitterTopRadius: 0.115,
  fitterHeight: 0.24,
  globeMaxRadius: 0.265,
  globeHeight: 0.56,
  globeBottomY: 0.36,
  finialRadius: 0.04,
  finialHeight: 0.07,
} as const

/** Radius samples for the acorn refractor, measured from its local origin. */
export const GLOBE_POST_TOP_LIGHT_REFRACTOR_PROFILE = [
  { y: 0, radius: 0.105 },
  { y: 0.035, radius: 0.14 },
  { y: 0.105, radius: 0.205 },
  { y: 0.205, radius: 0.255 },
  { y: 0.315, radius: 0.265 },
  { y: 0.41, radius: 0.225 },
  { y: 0.49, radius: 0.145 },
  { y: 0.54, radius: 0.065 },
  { y: GLOBE_POST_TOP_LIGHT_DIMENSIONS.globeHeight, radius: 0.018 },
] as const

export const GLOBE_POST_TOP_LIGHT_RIB_ANGLES = Array.from(
  { length: 12 },
  (_, index) => (index * Math.PI * 2) / 12,
)

export const GLOBE_POST_TOP_LIGHT_PRISM_LEVELS = [0.105, 0.205, 0.315, 0.41, 0.49] as const

export function globePostTopRadiusAt(y: number): number {
  const profile = GLOBE_POST_TOP_LIGHT_REFRACTOR_PROFILE
  if (y <= profile[0]!.y) return profile[0]!.radius
  if (y >= profile[profile.length - 1]!.y) return profile[profile.length - 1]!.radius

  for (let index = 1; index < profile.length; index += 1) {
    const previous = profile[index - 1]!
    const next = profile[index]!
    if (y <= next.y) {
      const t = (y - previous.y) / (next.y - previous.y)
      return previous.radius + (next.radius - previous.radius) * t
    }
  }

  return profile[profile.length - 1]!.radius
}

export function buildGlobePostTopRefractorGeometry(): LatheGeometry {
  const profile = GLOBE_POST_TOP_LIGHT_REFRACTOR_PROFILE.map(
    ({ radius, y }) => new Vector2(radius, y),
  )
  const geometry = new LatheGeometry(profile, 48)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function buildGlobePostTopRibCurves(): CatmullRomCurve3[] {
  return GLOBE_POST_TOP_LIGHT_RIB_ANGLES.map((angle) => {
    const points = GLOBE_POST_TOP_LIGHT_REFRACTOR_PROFILE.map(({ radius, y }) =>
      new Vector3(
        Math.cos(angle) * (radius + 0.003),
        y,
        Math.sin(angle) * (radius + 0.003),
      ),
    )
    return new CatmullRomCurve3(points, false, 'centripetal')
  })
}

export type GlobePostTopLightLayout = {
  height: number
  pedestalHeight: number
  shaftBottomY: number
  shaftHeight: number
  capitalCenterY: number
  fitterCenterY: number
  globeBottomY: number
  globeCenterY: number
  finialCenterY: number
  totalHeight: number
}

export function resolveGlobePostTopLightLayout(height: number): GlobePostTopLightLayout {
  const dimensions = GLOBE_POST_TOP_LIGHT_DIMENSIONS
  const resolvedHeight = Math.max(2.5, height)
  const shaftBottomY = dimensions.pedestalHeight - dimensions.shaftOverlap
  const shaftHeight = Math.max(1, resolvedHeight - shaftBottomY)
  const capitalCenterY = resolvedHeight + dimensions.capitalHeight / 2
  const fitterCenterY = resolvedHeight + dimensions.capitalHeight + dimensions.fitterHeight / 2
  const globeBottomY = resolvedHeight + dimensions.globeBottomY
  const globeCenterY = globeBottomY + dimensions.globeHeight / 2
  const finialCenterY = globeBottomY + dimensions.globeHeight + dimensions.finialHeight / 2

  return {
    height: resolvedHeight,
    pedestalHeight: dimensions.pedestalHeight,
    shaftBottomY,
    shaftHeight,
    capitalCenterY,
    fitterCenterY,
    globeBottomY,
    globeCenterY,
    finialCenterY,
    totalHeight: finialCenterY + dimensions.finialHeight / 2,
  }
}
