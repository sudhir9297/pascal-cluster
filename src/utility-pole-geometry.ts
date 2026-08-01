import type { UtilityPoleNode } from './schema'

/** Residential distribution default: nominal 35 ft pole, 5.5 ft embedded. */
export const STANDARD_UTILITY_POLE_TOTAL_LENGTH_M = 10.668
export const STANDARD_UTILITY_POLE_EMBEDMENT_M = 1.6764
export const STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M =
  STANDARD_UTILITY_POLE_TOTAL_LENGTH_M - STANDARD_UTILITY_POLE_EMBEDMENT_M
export const STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M = 2.4384

export type UtilityPoleWireAttachment = {
  id: 'phase-left' | 'phase-center' | 'phase-right' | 'neutral'
  kind: 'primary' | 'neutral'
  position: readonly [number, number, number]
}

export type UtilityPoleWireAttachmentId = UtilityPoleWireAttachment['id']

export type UtilityPoleLayout = {
  height: number
  crossarmLength: number
  poleBottomRadius: number
  poleTopRadius: number
  crossarmY: number
  crossarmHeight: number
  crossarmDepth: number
  outerPinX: number
  neutralCrossarmY: number
  transformerY: number
  wireAttachments: readonly UtilityPoleWireAttachment[]
}

/** Shared dimensions and future conductor anchors for the procedural pole. */
export function resolveUtilityPoleLayout(node: UtilityPoleNode): UtilityPoleLayout {
  const height = Math.max(7.62, node.height ?? STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M)
  const crossarmLength = Math.max(
    STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
    node.crossarmLength ?? STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  )
  const poleBottomRadius = Math.min(0.205, 0.155 + height * 0.0018)
  const poleTopRadius = Math.min(0.115, 0.084 + height * 0.0012)
  const crossarmY = height - 0.48
  const crossarmHeight = 0.105
  const crossarmDepth = 0.13
  const outerPinX = crossarmLength * 0.38
  const outsideAttachmentY = crossarmY + crossarmHeight / 2 + 0.36
  const centerAttachmentY = height + 0.36
  // A neutral is commonly carried on a lower, smaller crossarm beneath the
  // primary phases. It is intentionally offset toward the street side so it
  // reads as a separate conductor instead of another phase.
  const neutralCrossarmY = crossarmY - 0.68
  const neutralAttachmentY = neutralCrossarmY + 0.36

  return {
    height,
    crossarmLength,
    poleBottomRadius,
    poleTopRadius,
    crossarmY,
    crossarmHeight,
    crossarmDepth,
    outerPinX,
    neutralCrossarmY,
    transformerY: height * 0.66,
    wireAttachments: [
      { id: 'phase-left', kind: 'primary', position: [-outerPinX, outsideAttachmentY, 0] },
      { id: 'phase-center', kind: 'primary', position: [0, centerAttachmentY, 0] },
      { id: 'phase-right', kind: 'primary', position: [outerPinX, outsideAttachmentY, 0] },
      { id: 'neutral', kind: 'neutral', position: [0, neutralAttachmentY, 0.12] },
    ],
  }
}

/** Resolve a conductor anchor into the pole's parent/level coordinate frame. */
export function resolveUtilityPoleAttachmentPoint(
  node: UtilityPoleNode,
  attachmentId: UtilityPoleWireAttachmentId,
  position: readonly [number, number, number] = node.position ?? [0, 0, 0],
  rotationY = node.rotation?.[1] ?? 0,
): readonly [number, number, number] {
  const attachment = resolveUtilityPoleLayout(node).wireAttachments.find(
    (candidate) => candidate.id === attachmentId,
  )
  if (!attachment) return position
  const [localX, localY, localZ] = attachment.position
  const cos = Math.cos(rotationY)
  const sin = Math.sin(rotationY)
  return [
    position[0] + localX * cos + localZ * sin,
    position[1] + localY,
    position[2] - localX * sin + localZ * cos,
  ]
}
