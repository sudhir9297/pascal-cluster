/**
 * Dimensions for a professional twin-head landscape path light. The default
 * sits between a 24 in twin fixture and a 30 in architectural riser, with the
 * two opposed heads forming a clearly readable path-scale silhouette.
 */
export const PATH_GARDEN_LIGHT_DIMENSIONS = {
  defaultHeight: 0.78,
  minHeight: 0.55,
  maxHeight: 1.05,
  defaultHeadSpan: 0.46,
  minHeadSpan: 0.32,
  maxHeadSpan: 0.65,
  baseDiameter: 0.14,
  baseHeight: 0.045,
  stemBottomRadius: 0.035,
  stemTopRadius: 0.026,
  hubRadius: 0.052,
  headDepth: 0.13,
  headHeight: 0.065,
  headGap: 0.028,
  lensInset: 0.018,
  opticBezelThickness: 0.016,
  lensThickness: 0.012,
  lightThrowOffset: 0.62,
} as const

export type PathGardenLightLayout = {
  height: number
  headSpan: number
  halfHeadLength: number
  headCenterOffset: number
  headY: number
  headBottomY: number
  bezelY: number
  stemHeight: number
  stemTopY: number
  braceY: number
  lightY: number
  lightDistance: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function resolvePathGardenLightLayout(
  height: number = PATH_GARDEN_LIGHT_DIMENSIONS.defaultHeight,
  headSpan: number = PATH_GARDEN_LIGHT_DIMENSIONS.defaultHeadSpan,
): PathGardenLightLayout {
  // Older path lights inherited the six-metre roadway default. Translate
  // those values into the larger professional path-light range.
  const resolvedHeight = height > 1.2
    ? clamp(height * 0.13, 0.68, PATH_GARDEN_LIGHT_DIMENSIONS.maxHeight)
    : clamp(height, PATH_GARDEN_LIGHT_DIMENSIONS.minHeight, PATH_GARDEN_LIGHT_DIMENSIONS.maxHeight)
  const resolvedHeadSpan = clamp(
    headSpan,
    PATH_GARDEN_LIGHT_DIMENSIONS.minHeadSpan,
    PATH_GARDEN_LIGHT_DIMENSIONS.maxHeadSpan,
  )
  const halfHeadLength = (resolvedHeadSpan - PATH_GARDEN_LIGHT_DIMENSIONS.headGap) / 2
  const headCenterOffset = PATH_GARDEN_LIGHT_DIMENSIONS.headGap / 2 + halfHeadLength / 2
  const headY = resolvedHeight - PATH_GARDEN_LIGHT_DIMENSIONS.headHeight / 2
  const headBottomY = headY - PATH_GARDEN_LIGHT_DIMENSIONS.headHeight / 2
  // Sink the bezel two millimetres into the housing and the lens three
  // millimetres into the bezel so no camera angle can reveal an air gap.
  const bezelY = headBottomY - PATH_GARDEN_LIGHT_DIMENSIONS.opticBezelThickness / 2 + 0.002
  const lightY = headBottomY
    - PATH_GARDEN_LIGHT_DIMENSIONS.opticBezelThickness
    + 0.002
    - PATH_GARDEN_LIGHT_DIMENSIONS.lensThickness / 2
    + 0.003
  const stemTopY = headY - 0.055

  return {
    height: resolvedHeight,
    headSpan: resolvedHeadSpan,
    halfHeadLength,
    headCenterOffset,
    headY,
    headBottomY,
    bezelY,
    stemHeight: stemTopY - PATH_GARDEN_LIGHT_DIMENSIONS.baseHeight,
    stemTopY,
    braceY: stemTopY - 0.045,
    lightY,
    lightDistance: Math.max(4.2, resolvedHeight * 6),
  }
}
