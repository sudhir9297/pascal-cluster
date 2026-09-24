import type { TraditionalPostTopLanternNode } from './schema'

export const TRADITIONAL_LANTERN_DIMENSIONS = {
  baseWidth: 0.5,
  roofWidth: 0.76,
  glassBottomWidth: 0.56,
  glassTopWidth: 0.46,
  chamberHeight: 0.58,
  headHeight: 1.43,
  poleBottomRadius: 0.14,
  poleTopRadius: 0.085,
} as const

export const TRADITIONAL_LANTERN_INTERIOR = {
  holderCenterOffset: 0.1,
  holderHeight: 0.16,
  holderRimCenterOffset: 0.18,
  holderRimHeight: 0.03,
  bulbConnectorCenterOffset: 0.2,
  bulbConnectorHeight: 0.08,
  bulbGlassBaseOffset: 0.225,
} as const

/** Negative means the bulb is physically seated inside the top of the holder. */
export function getTraditionalLanternBulbSocketClearance(): number {
  const holderTop = TRADITIONAL_LANTERN_INTERIOR.holderCenterOffset
    + TRADITIONAL_LANTERN_INTERIOR.holderHeight / 2
  const connectorBottom = TRADITIONAL_LANTERN_INTERIOR.bulbConnectorCenterOffset
    - TRADITIONAL_LANTERN_INTERIOR.bulbConnectorHeight / 2
  return connectorBottom - holderTop
}

export type TraditionalPostTopLanternLayout = {
  supportHeight: number
  shaftStartY: number
  shaftHeight: number
  collarCenterY: number
  chamberBottomY: number
  chamberTopY: number
  chamberCenterY: number
  roofEaveY: number
  roofCenterY: number
  finialTipY: number
  lightY: number
  totalHeight: number
}

/** Shared vertical layout used by the 3D assembly and its editor footprint. */
export function resolveTraditionalPostTopLanternLayout(
  node: Pick<TraditionalPostTopLanternNode, 'height'>,
): TraditionalPostTopLanternLayout {
  const supportHeight = Math.max(2.5, Math.min(12, node.height ?? 4))
  const shaftStartY = 0.46
  const chamberBottomY = supportHeight + 0.2
  const chamberTopY = chamberBottomY + TRADITIONAL_LANTERN_DIMENSIONS.chamberHeight
  const roofEaveY = chamberTopY + 0.045
  const roofCenterY = roofEaveY + 0.15
  const finialTipY = supportHeight + TRADITIONAL_LANTERN_DIMENSIONS.headHeight

  return {
    supportHeight,
    shaftStartY,
    shaftHeight: supportHeight - shaftStartY,
    collarCenterY: supportHeight + 0.08,
    chamberBottomY,
    chamberTopY,
    chamberCenterY: (chamberBottomY + chamberTopY) / 2,
    roofEaveY,
    roofCenterY,
    finialTipY,
    lightY: chamberBottomY + TRADITIONAL_LANTERN_INTERIOR.bulbGlassBaseOffset + 0.13,
    totalHeight: finialTipY,
  }
}
