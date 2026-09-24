export const BOLLARD_LIGHT_DIMENSIONS = {
  minHeight: 0.45,
  maxHeight: 1.2,
  defaultHeight: 0.72,
  basePlateRadius: 0.16,
  basePlateHeight: 0.035,
  anchorRadius: 0.014,
  anchorOffset: 0.115,
  shaftBottomRadius: 0.108,
  shaftTopRadius: 0.096,
  opticRadius: 0.101,
  opticHeight: 0.165,
  louverRadius: 0.116,
  louverThickness: 0.016,
  louverCount: 3,
  capRadius: 0.126,
  capHeight: 0.045,
  emitterRadius: 0.031,
  serviceDoorWidth: 0.105,
  serviceDoorHeight: 0.2,
  lightThrowRadius: 1.35,
} as const

export type BollardLightLayout = {
  height: number
  shaftHeight: number
  shaftCenterY: number
  shaftTopY: number
  opticCenterY: number
  capCenterY: number
  louverY: readonly number[]
}

/**
 * Bollards used to inherit the six-metre catalog height. Preserve those saved
 * nodes at a believable pedestrian scale while letting new nodes use their
 * actual installation height directly.
 */
export function resolveBollardLightLayout(requestedHeight: number): BollardLightLayout {
  const legacyAdjustedHeight = requestedHeight > BOLLARD_LIGHT_DIMENSIONS.maxHeight
    ? requestedHeight * 0.15
    : requestedHeight
  const height = Math.max(
    BOLLARD_LIGHT_DIMENSIONS.minHeight,
    Math.min(BOLLARD_LIGHT_DIMENSIONS.maxHeight, legacyAdjustedHeight),
  )
  const shaftTopY = height - BOLLARD_LIGHT_DIMENSIONS.opticHeight - BOLLARD_LIGHT_DIMENSIONS.capHeight
  const shaftHeight = shaftTopY - BOLLARD_LIGHT_DIMENSIONS.basePlateHeight
  const opticCenterY = shaftTopY + BOLLARD_LIGHT_DIMENSIONS.opticHeight / 2
  const capCenterY = height - BOLLARD_LIGHT_DIMENSIONS.capHeight / 2
  const louverStep = BOLLARD_LIGHT_DIMENSIONS.opticHeight / (BOLLARD_LIGHT_DIMENSIONS.louverCount + 1)
  const louverY = Array.from(
    { length: BOLLARD_LIGHT_DIMENSIONS.louverCount },
    (_, index) => shaftTopY + louverStep * (index + 1),
  )

  return {
    height,
    shaftHeight,
    shaftCenterY: BOLLARD_LIGHT_DIMENSIONS.basePlateHeight + shaftHeight / 2,
    shaftTopY,
    opticCenterY,
    capCenterY,
    louverY,
  }
}
