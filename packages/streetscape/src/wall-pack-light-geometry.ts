import { BufferGeometry, Float32BufferAttribute } from 'three'

/**
 * Dimensions for a medium, full-cutoff commercial LED wall pack, in metres.
 * The proportions follow a compact modern LED unit rather than an oversized
 * legacy HID box: a broad wall plate, shallow wedge, and recessed underside
 * optic that sends light away from the facade without exposing the LEDs above
 * the horizontal plane.
 */
export const WALL_PACK_LIGHT_DIMENSIONS = {
  width: 0.56,
  frontWidth: 0.49,
  housingHeight: 0.29,
  backPlateWidth: 0.5,
  backPlateHeight: 0.34,
  backPlateDepth: 0.035,
  minDepth: 0.22,
  maxDepth: 0.38,
  defaultDepth: 0.3,
  opticWidth: 0.39,
  opticInset: 0.085,
  opticFrontInset: 0.035,
  opticThickness: 0.014,
  photocellRadius: 0.024,
  photocellHeight: 0.027,
  sideFastenerRadius: 0.014,
  heatSinkFinCount: 5,
  lightThrowLength: 4.8,
  lightThrowHalfWidth: 2.25,
} as const

export const WALL_PACK_LIGHT_OPTIC_COLUMNS = [-0.145, -0.0725, 0, 0.0725, 0.145] as const
export const WALL_PACK_LIGHT_OPTIC_ROWS = [0.3, 0.7] as const

export type WallPackLightLayout = {
  depth: number
  opticAngle: number
  opticCenterX: number
  opticCenterY: number
  opticDepth: number
  topAngle: number
  topCenterX: number
  topCenterY: number
  topDepth: number
}

export function resolveWallPackLightLayout(requestedDepth: number): WallPackLightLayout {
  const depth = Math.max(
    WALL_PACK_LIGHT_DIMENSIONS.minDepth,
    Math.min(WALL_PACK_LIGHT_DIMENSIONS.maxDepth, requestedDepth),
  )
  const opticStartX = WALL_PACK_LIGHT_DIMENSIONS.opticInset
  const opticEndX = depth - WALL_PACK_LIGHT_DIMENSIONS.opticFrontInset
  const opticStartY = -0.118
  const opticEndY = -0.042
  const opticDeltaY = opticEndY - opticStartY
  const opticDeltaX = opticEndX - opticStartX
  const topStartX = 0.075
  const topEndX = depth - 0.045
  const topStartY = 0.151
  const topEndY = 0.077
  const topDeltaY = topEndY - topStartY
  const topDeltaX = topEndX - topStartX

  return {
    depth,
    opticAngle: Math.atan2(opticDeltaY, opticDeltaX),
    opticCenterX: (opticStartX + opticEndX) / 2,
    opticCenterY: (opticStartY + opticEndY) / 2,
    opticDepth: Math.hypot(opticDeltaY, opticDeltaX),
    topAngle: Math.atan2(topDeltaY, topDeltaX),
    topCenterX: (topStartX + topEndX) / 2,
    topCenterY: (topStartY + topEndY) / 2,
    topDepth: Math.hypot(topDeltaY, topDeltaX),
  }
}

type HousingSection = {
  x: number
  halfWidth: number
  top: number
  bottom: number
}

export function getWallPackHousingSections(depth: number): readonly HousingSection[] {
  const resolvedDepth = resolveWallPackLightLayout(depth).depth
  return [
    { x: 0.018, halfWidth: WALL_PACK_LIGHT_DIMENSIONS.width / 2, top: 0.145, bottom: -0.14 },
    { x: 0.07, halfWidth: WALL_PACK_LIGHT_DIMENSIONS.width / 2, top: 0.152, bottom: -0.126 },
    { x: resolvedDepth - 0.045, halfWidth: WALL_PACK_LIGHT_DIMENSIONS.frontWidth / 2 + 0.012, top: 0.078, bottom: -0.035 },
    { x: resolvedDepth, halfWidth: WALL_PACK_LIGHT_DIMENSIONS.frontWidth / 2, top: 0.045, bottom: -0.008 },
  ]
}

/** Builds the chamfered wedge casting shared by the detailed model and plan. */
export function buildWallPackHousingGeometry(depth: number): BufferGeometry {
  const sections = getWallPackHousingSections(depth)
  const vertices: number[] = []
  const indices: number[] = []
  const ringSize = 8

  for (const section of sections) {
    const bevel = Math.min(0.018, section.halfWidth * 0.15, (section.top - section.bottom) * 0.22)
    const ring = [
      [-section.halfWidth + bevel, section.top],
      [section.halfWidth - bevel, section.top],
      [section.halfWidth, section.top - bevel],
      [section.halfWidth, section.bottom + bevel],
      [section.halfWidth - bevel, section.bottom],
      [-section.halfWidth + bevel, section.bottom],
      [-section.halfWidth, section.bottom + bevel],
      [-section.halfWidth, section.top - bevel],
    ]
    for (const [z, y] of ring) vertices.push(section.x, y ?? 0, z ?? 0)
  }

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    const current = sectionIndex * ringSize
    const next = current + ringSize
    for (let ringIndex = 0; ringIndex < ringSize; ringIndex += 1) {
      const following = (ringIndex + 1) % ringSize
      indices.push(
        current + ringIndex,
        next + ringIndex,
        next + following,
        current + ringIndex,
        next + following,
        current + following,
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

/** Top-down outline used by the floorplan renderer. */
export function getWallPackPlanProfile(depth: number): readonly (readonly [number, number])[] {
  const sections = getWallPackHousingSections(depth)
  return [
    ...sections.map((section) => [section.x, -section.halfWidth] as const),
    ...[...sections].reverse().map((section) => [section.x, section.halfWidth] as const),
  ]
}
