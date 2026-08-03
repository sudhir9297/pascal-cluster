export const CANOPY_SOFFIT_LIGHT_DIMENSIONS = {
  minFixtureSize: 0.34,
  maxFixtureSize: 0.62,
  defaultFixtureSize: 0.42,
  housingSizeRatio: 0.88,
  housingDepth: 0.092,
  trimDepth: 0.02,
  gasketSizeRatio: 0.84,
  gasketDepth: 0.01,
  faceplateSizeRatio: 0.76,
  faceplateDepth: 0.014,
  opticModuleCenterXRatio: 0.19,
  opticModuleWidthRatio: 0.27,
  opticModuleDepthRatio: 0.54,
  opticCoverDepth: 0.01,
  cornerRatio: 0.065,
  opticColumns: 3,
  opticRows: 4,
  opticRadiusRatio: 0.022,
  opticColumnSpacingRatio: 0.068,
  opticRowSpacingRatio: 0.105,
  trimFastenerInsetRatio: 0.1,
  sensorRadiusRatio: 0.034,
  sensorZRatio: 0.29,
  lightThrowRadius: 2.35,
} as const

export type CanopySoffitLightLayout = {
  height: number
  fixtureSize: number
  housingTopY: number
  trimTopY: number
  gasketTopY: number
  faceplateTopY: number
  opticCoverTopY: number
  opticY: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Resolve a ceiling-local fixture face and its stacked underside components.
 * Older nodes used a one-to-2.5-metre span; those values are scaled into the
 * 340-620 mm range instead of producing an implausibly oversized luminaire.
 */
export function resolveCanopySoffitLightLayout(
  requestedHeight: number = 4,
  requestedFixtureSize: number = CANOPY_SOFFIT_LIGHT_DIMENSIONS.defaultFixtureSize,
): CanopySoffitLightLayout {
  const legacyAdjustedSize = requestedFixtureSize > CANOPY_SOFFIT_LIGHT_DIMENSIONS.maxFixtureSize
    ? requestedFixtureSize * CANOPY_SOFFIT_LIGHT_DIMENSIONS.defaultFixtureSize
    : requestedFixtureSize
  const fixtureSize = clamp(
    legacyAdjustedSize,
    CANOPY_SOFFIT_LIGHT_DIMENSIONS.minFixtureSize,
    CANOPY_SOFFIT_LIGHT_DIMENSIONS.maxFixtureSize,
  )
  const height = Math.max(0, requestedHeight)
  const housingTopY = height + CANOPY_SOFFIT_LIGHT_DIMENSIONS.housingDepth * 0.72
  const trimTopY = height - 0.003
  const gasketTopY = trimTopY - CANOPY_SOFFIT_LIGHT_DIMENSIONS.trimDepth - 0.003
  const faceplateTopY = gasketTopY - CANOPY_SOFFIT_LIGHT_DIMENSIONS.gasketDepth - 0.003
  const opticCoverTopY = faceplateTopY - CANOPY_SOFFIT_LIGHT_DIMENSIONS.faceplateDepth - 0.003

  return {
    height,
    fixtureSize,
    housingTopY,
    trimTopY,
    gasketTopY,
    faceplateTopY,
    opticCoverTopY,
    opticY: opticCoverTopY - CANOPY_SOFFIT_LIGHT_DIMENSIONS.opticCoverDepth - 0.004,
  }
}

/** Two independently serviceable 3x4 optical modules, matching current canopy luminaires. */
export function canopySoffitOpticOffsets(fixtureSize: number): ReadonlyArray<readonly [number, number]> {
  const dimensions = CANOPY_SOFFIT_LIGHT_DIMENSIONS
  const moduleCenters = [
    -fixtureSize * dimensions.opticModuleCenterXRatio,
    fixtureSize * dimensions.opticModuleCenterXRatio,
  ]
  const halfColumns = (dimensions.opticColumns - 1) / 2
  const halfRows = (dimensions.opticRows - 1) / 2

  return moduleCenters.flatMap((moduleX) => Array.from(
    { length: dimensions.opticColumns * dimensions.opticRows },
    (_, index) => {
      const column = index % dimensions.opticColumns
      const row = Math.floor(index / dimensions.opticColumns)
      return [
        moduleX + (column - halfColumns) * fixtureSize * dimensions.opticColumnSpacingRatio,
        (row - halfRows) * fixtureSize * dimensions.opticRowSpacingRatio,
      ] as const
    },
  ))
}
