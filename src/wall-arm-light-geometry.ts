import { BufferGeometry, Float32BufferAttribute } from 'three'

/**
 * Contemporary wall-mounted roadway light proportions, expressed in metres.
 *
 * The 60 mm luminaire interface and 0.75 m-class default outreach follow common
 * commercial wall brackets. The tapered upper spar and curved lower tie are
 * inspired by modern lateral-wall bracket families rather than a utility pole.
 */
export const WALL_ARM_LIGHT_DIMENSIONS = {
  mountPlateDepth: 0.07,
  mountPlateHeight: 0.62,
  mountPlateWidth: 0.34,
  mountPadDepth: 0.035,
  mountPadHeight: 0.46,
  mountPadWidth: 0.23,
  mountBoltRadius: 0.025,
  mountBoltX: 0.062,
  mountBoltY: 0.21,
  mountBoltZ: 0.115,
  upperArmBaseX: 0.055,
  upperArmTipInset: 0.03,
  armBaseHalfWidth: 0.07,
  armTipHalfWidth: 0.047,
  armTopAtBase: 0.2,
  armBottomAtBase: 0.075,
  armTopAtTip: 0.105,
  armBottomAtTip: 0.015,
  lowerTieRadius: 0.026,
  lowerTieStartX: 0.075,
  lowerTieStartY: -0.19,
  lowerTieControlY: -0.16,
  lowerTieEndY: 0.015,
  jointRadius: 0.057,
  headStartX: -0.16,
  headEndX: 0.7,
  headWidth: 0.34,
  headHeight: 0.12,
  lensStartX: 0,
  lensEndX: 0.62,
  lensWidth: 0.25,
  lensDrop: 0.006,
  opticFrameThickness: 0.018,
  opticFrameHeight: 0.012,
  defaultArmLength: 0.78,
} as const

export const WALL_ARM_LIGHT_HOUSING_SECTIONS = [
  {
    x: WALL_ARM_LIGHT_DIMENSIONS.headStartX,
    halfWidth: WALL_ARM_LIGHT_DIMENSIONS.headWidth / 2,
    top: WALL_ARM_LIGHT_DIMENSIONS.headHeight / 2,
    bottom: -WALL_ARM_LIGHT_DIMENSIONS.headHeight / 2,
  },
  {
    x: WALL_ARM_LIGHT_DIMENSIONS.headEndX,
    halfWidth: WALL_ARM_LIGHT_DIMENSIONS.headWidth / 2,
    top: WALL_ARM_LIGHT_DIMENSIONS.headHeight / 2,
    bottom: -WALL_ARM_LIGHT_DIMENSIONS.headHeight / 2,
  },
] as const

export const WALL_ARM_LIGHT_OPTIC_MODULE_CENTERS = [0.12, 0.32, 0.52] as const
export const WALL_ARM_LIGHT_OPTIC_CELL_X_OFFSETS = [-0.046, 0.046] as const
export const WALL_ARM_LIGHT_OPTIC_CELL_Z_OFFSETS = [-0.065, 0.065] as const

export type WallArmLightLayout = {
  armLength: number
  headOriginX: number
  lightCenterX: number
}

export function resolveWallArmLightLayout(armLength?: number): WallArmLightLayout {
  const resolvedArmLength = Math.max(0.5, Math.min(3, armLength ?? WALL_ARM_LIGHT_DIMENSIONS.defaultArmLength))
  return {
    armLength: resolvedArmLength,
    headOriginX: resolvedArmLength,
    lightCenterX: resolvedArmLength + (WALL_ARM_LIGHT_DIMENSIONS.lensStartX + WALL_ARM_LIGHT_DIMENSIONS.lensEndX) / 2,
  }
}

type LoftSection = {
  x: number
  halfWidth: number
  top: number
  bottom: number
}

function buildChamferedLoft(sections: readonly LoftSection[], bevel: number): BufferGeometry {
  const vertices: number[] = []
  const indices: number[] = []
  const ringSize = 8

  for (const section of sections) {
    const sectionBevel = Math.min(bevel, section.halfWidth * 0.3, (section.top - section.bottom) * 0.3)
    const ring = [
      [section.top - sectionBevel, -section.halfWidth],
      [section.top, -section.halfWidth + sectionBevel],
      [section.top, section.halfWidth - sectionBevel],
      [section.top - sectionBevel, section.halfWidth],
      [section.bottom + sectionBevel, section.halfWidth],
      [section.bottom, section.halfWidth - sectionBevel],
      [section.bottom, -section.halfWidth + sectionBevel],
      [section.bottom + sectionBevel, -section.halfWidth],
    ]
    for (const [y, z] of ring) vertices.push(section.x, y ?? 0, z ?? 0)
  }

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    const current = sectionIndex * ringSize
    const next = current + ringSize
    for (let ringIndex = 0; ringIndex < ringSize; ringIndex += 1) {
      const following = (ringIndex + 1) % ringSize
      indices.push(
        current + ringIndex,
        next + following,
        next + ringIndex,
        current + ringIndex,
        current + following,
        next + following,
      )
    }
  }

  for (let index = 1; index < ringSize - 1; index += 1) {
    indices.push(0, index + 1, index)
    const end = (sections.length - 1) * ringSize
    indices.push(end, end + index, end + index + 1)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function buildWallArmUpperSparGeometry(armLength: number): BufferGeometry {
  const dimensions = WALL_ARM_LIGHT_DIMENSIONS
  const tipX = Math.max(dimensions.upperArmBaseX + 0.3, armLength - dimensions.upperArmTipInset)
  return buildChamferedLoft(
    [
      {
        x: dimensions.upperArmBaseX,
        halfWidth: dimensions.armBaseHalfWidth,
        top: dimensions.armTopAtBase,
        bottom: dimensions.armBottomAtBase,
      },
      {
        x: tipX * 0.62,
        halfWidth: dimensions.armTipHalfWidth + 0.012,
        top: 0.135,
        bottom: 0.045,
      },
      {
        x: tipX,
        halfWidth: dimensions.armTipHalfWidth,
        top: dimensions.armTopAtTip,
        bottom: dimensions.armBottomAtTip,
      },
    ],
    0.012,
  )
}

export function buildWallArmHousingGeometry(): BufferGeometry {
  return buildChamferedLoft(WALL_ARM_LIGHT_HOUSING_SECTIONS, 0.01)
}

export function buildWallArmLensGeometry(): BufferGeometry {
  const dimensions = WALL_ARM_LIGHT_DIMENSIONS
  const top = -dimensions.headHeight / 2 + 0.001
  return buildChamferedLoft(
    [
      {
        x: dimensions.lensStartX,
        halfWidth: dimensions.lensWidth / 2,
        top,
        bottom: top - dimensions.lensDrop,
      },
      {
        x: dimensions.lensEndX,
        halfWidth: dimensions.lensWidth / 2,
        top,
        bottom: top - dimensions.lensDrop,
      },
    ],
    0.003,
  )
}
