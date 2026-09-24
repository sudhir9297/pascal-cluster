import type { PedestrianPostLightNode } from './schema'

export type PostTopLightLayout = {
  height: number
  baseRadius: number
  poleBottomRadius: number
  poleTopRadius: number
  poleTopY: number
  neckTopY: number
  headRadius: number
  capHeight: number
  capCenterY: number
  lensRadius: number
  lensThickness: number
  lensY: number
}

/** Shared dimensions for the pedestrian-scale post-top model and floorplan. */
export function resolvePostTopLightLayout(
  node: PedestrianPostLightNode,
): PostTopLightLayout {
  const height = Math.max(2.5, Math.min(6, node.height ?? 4))
  const poleBottomRadius = Math.min(0.13, 0.1 + height * 0.004)
  const poleTopRadius = poleBottomRadius * 0.62
  const headRadius = Math.min(0.44, 0.32 + height * 0.015)
  const capHeight = 0.16
  const lensThickness = 0.045
  return {
    height,
    baseRadius: 0.22,
    poleBottomRadius,
    poleTopRadius,
    poleTopY: height - 0.31,
    neckTopY: height - 0.17,
    headRadius,
    capHeight,
    capCenterY: height - capHeight / 2,
    lensRadius: headRadius * 0.79,
    lensThickness,
    lensY: height - capHeight - lensThickness / 2,
  }
}
