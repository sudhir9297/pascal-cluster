export type FloodlightPoleLayout = {
  height: number
  armLength: number
  basePlateSize: number
  basePlateHeight: number
  baseBoltOffset: number
  shaftBottomRadius: number
  shaftTopRadius: number
  shaftTopY: number
  armY: number
  armRadius: number
  headCenterX: number
  headCenterY: number
  headTilt: number
  housingLength: number
  housingHeight: number
  housingWidth: number
  lensLength: number
  lensWidth: number
}

/**
 * Shared dimensions for the single-projector floodlight pole.
 *
 * The proportions follow common commercial die-cast LED floodlights: a broad
 * face, shallow driver housing, adjustable yoke, and a 30-degree nominal aim.
 * Keeping these values in one module makes the 3D model, plan symbol, footprint,
 * and tests describe the same physical object.
 */
export const FLOODLIGHT_POLE_DIMENSIONS = {
  basePlateSize: 0.5,
  basePlateHeight: 0.085,
  baseBoltOffset: 0.17,
  shaftBottomRadius: 0.15,
  shaftTopRadius: 0.085,
  armRadius: 0.055,
  headCenterOffsetX: 0.22,
  headTilt: Math.PI / 6,
  housingLength: 0.96,
  housingHeight: 0.32,
  housingWidth: 0.68,
  lensLength: 0.7,
  lensWidth: 0.46,
} as const

/** Top-view outline of the slightly tapered die-cast projector housing. */
export const FLOODLIGHT_HOUSING_PLAN_PROFILE = [
  [-0.48, -0.27],
  [0.29, -0.34],
  [0.48, -0.27],
  [0.48, 0.27],
  [0.29, 0.34],
  [-0.48, 0.27],
] as const

export function resolveFloodlightPoleLayout(height: number, armLength: number): FloodlightPoleLayout {
  const resolvedHeight = Math.max(1.4, height)
  const resolvedArmLength = Math.max(0.4, armLength)
  const armY = resolvedHeight - 0.5

  return {
    height: resolvedHeight,
    armLength: resolvedArmLength,
    basePlateSize: FLOODLIGHT_POLE_DIMENSIONS.basePlateSize,
    basePlateHeight: FLOODLIGHT_POLE_DIMENSIONS.basePlateHeight,
    baseBoltOffset: FLOODLIGHT_POLE_DIMENSIONS.baseBoltOffset,
    shaftBottomRadius: FLOODLIGHT_POLE_DIMENSIONS.shaftBottomRadius,
    shaftTopRadius: FLOODLIGHT_POLE_DIMENSIONS.shaftTopRadius,
    shaftTopY: armY + 0.08,
    armY,
    armRadius: FLOODLIGHT_POLE_DIMENSIONS.armRadius,
    headCenterX: resolvedArmLength + FLOODLIGHT_POLE_DIMENSIONS.headCenterOffsetX,
    headCenterY: resolvedHeight - 0.34,
    headTilt: FLOODLIGHT_POLE_DIMENSIONS.headTilt,
    housingLength: FLOODLIGHT_POLE_DIMENSIONS.housingLength,
    housingHeight: FLOODLIGHT_POLE_DIMENSIONS.housingHeight,
    housingWidth: FLOODLIGHT_POLE_DIMENSIONS.housingWidth,
    lensLength: FLOODLIGHT_POLE_DIMENSIONS.lensLength,
    lensWidth: FLOODLIGHT_POLE_DIMENSIONS.lensWidth,
  }
}
