import { CatmullRomCurve3, ExtrudeGeometry, Shape, Vector3 } from 'three'

/**
 * Proportions for a contemporary cable-suspended roadway luminaire.
 *
 * The 720 x 340 mm body is in the same practical size class as current
 * European catenary fixtures, while the suspension and support poles remain
 * deliberately generic so this is an original catalog asset.
 */
export const CATENARY_SUSPENDED_LIGHT_DIMENSIONS = {
  basePlateSize: 0.38,
  basePlateHeight: 0.065,
  baseBoltOffset: 0.13,
  baseBoltRadius: 0.02,
  poleBottomRadius: 0.115,
  poleTopRadius: 0.072,
  poleCapRadius: 0.092,
  poleCapHeight: 0.055,
  cableRadius: 0.009,
  anchorPlateWidth: 0.18,
  anchorPlateHeight: 0.24,
  anchorPlateDepth: 0.07,
  bodyLength: 0.72,
  bodyWidth: 0.34,
  bodyHeight: 0.2,
  bodyDropFromCable: 0.56,
  protectorLength: 0.62,
  protectorWidth: 0.27,
  protectorDepth: 0.024,
  opticModuleLength: 0.22,
  opticModuleWidth: 0.17,
  opticModuleDepth: 0.016,
  opticModuleCenters: [-0.18, 0.18] as const,
  opticCellXOffsets: [-0.066, 0, 0.066] as const,
  opticCellZOffsets: [-0.05, 0, 0.05] as const,
  clampOffset: 0.25,
  clampRadius: 0.042,
  yokeRadius: 0.018,
  lightPoolRadius: 2.4,
} as const

export const CATENARY_HOUSING_PLAN_PROFILE = [
  [-0.36, -0.11],
  [-0.32, -0.17],
  [0.32, -0.17],
  [0.36, -0.11],
  [0.36, 0.11],
  [0.32, 0.17],
  [-0.32, 0.17],
  [-0.36, 0.11],
] as const

export type CatenarySuspendedLightLayout = {
  cableCenterY: number
  fixtureCenterY: number
  height: number
  sag: number
  span: number
}

export function resolveCatenarySuspendedLightLayout(
  requestedHeight: number,
  requestedSpan: number,
): CatenarySuspendedLightLayout {
  const height = Math.max(2.5, requestedHeight)
  const span = Math.max(2, Math.min(12, requestedSpan))
  const sag = Math.max(0.22, Math.min(0.65, span * 0.055))
  const cableCenterY = height - sag

  return {
    cableCenterY,
    fixtureCenterY: cableCenterY - CATENARY_SUSPENDED_LIGHT_DIMENSIONS.bodyDropFromCable,
    height,
    sag,
    span,
  }
}

/** Solve the catenary parameter for a span with a prescribed centre sag. */
function solveCatenaryParameter(halfSpan: number, sag: number): number {
  let low = Math.max(halfSpan / 30, 0.03)
  let high = Math.max(halfSpan * halfSpan / (2 * sag) * 4, halfSpan * 4)

  for (let index = 0; index < 64; index += 1) {
    const middle = (low + high) / 2
    const middleSag = middle * (Math.cosh(halfSpan / middle) - 1)
    if (middleSag > sag) low = middle
    else high = middle
  }

  return (low + high) / 2
}

export function catenaryHeightAt(x: number, layout: CatenarySuspendedLightLayout): number {
  const halfSpan = layout.span / 2
  const clampedX = Math.max(-halfSpan, Math.min(halfSpan, x))
  const parameter = solveCatenaryParameter(halfSpan, layout.sag)
  return layout.height - layout.sag + parameter * (Math.cosh(clampedX / parameter) - 1)
}

export function buildCatenaryCableCurve(
  layout: CatenarySuspendedLightLayout,
): CatmullRomCurve3 {
  const halfSpan = layout.span / 2
  const points = Array.from({ length: 33 }, (_, index) => {
    const x = -halfSpan + layout.span * (index / 32)
    return new Vector3(x, catenaryHeightAt(x, layout), 0)
  })
  return new CatmullRomCurve3(points, false, 'centripetal')
}

export function buildCatenaryHousingGeometry(): ExtrudeGeometry {
  const dimensions = CATENARY_SUSPENDED_LIGHT_DIMENSIONS
  const halfLength = dimensions.bodyLength / 2
  const halfHeight = dimensions.bodyHeight / 2
  const profile = new Shape()

  profile.moveTo(-halfLength, -halfHeight * 0.55)
  profile.quadraticCurveTo(-halfLength, -halfHeight, -halfLength + 0.065, -halfHeight)
  profile.lineTo(halfLength - 0.065, -halfHeight)
  profile.quadraticCurveTo(halfLength, -halfHeight, halfLength, -halfHeight * 0.55)
  profile.quadraticCurveTo(halfLength - 0.07, halfHeight * 0.55, halfLength - 0.17, halfHeight)
  profile.lineTo(-halfLength + 0.17, halfHeight)
  profile.quadraticCurveTo(-halfLength + 0.07, halfHeight * 0.55, -halfLength, -halfHeight * 0.55)

  const geometry = new ExtrudeGeometry(profile, {
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 16,
    depth: dimensions.bodyWidth - 0.024,
    steps: 1,
  })
  geometry.translate(0, 0, -(dimensions.bodyWidth - 0.024) / 2)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function roundedRectangle(width: number, height: number, radius: number): Shape {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const shape = new Shape()
  shape.moveTo(-halfWidth + radius, -halfHeight)
  shape.lineTo(halfWidth - radius, -halfHeight)
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius)
  shape.lineTo(halfWidth, halfHeight - radius)
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight)
  shape.lineTo(-halfWidth + radius, halfHeight)
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius)
  shape.lineTo(-halfWidth, -halfHeight + radius)
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight)
  return shape
}

export function buildCatenaryOpticGeometry(): ExtrudeGeometry {
  const dimensions = CATENARY_SUSPENDED_LIGHT_DIMENSIONS
  const geometry = new ExtrudeGeometry(
    roundedRectangle(dimensions.opticModuleLength, dimensions.opticModuleWidth, 0.025),
    {
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.006,
      bevelThickness: 0.004,
      curveSegments: 8,
      depth: dimensions.opticModuleDepth,
      steps: 1,
    },
  )
  geometry.rotateX(Math.PI / 2)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
