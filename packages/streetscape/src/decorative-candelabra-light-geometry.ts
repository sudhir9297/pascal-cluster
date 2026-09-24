import type { DecorativeCandelabraLightNode } from './schema'

export const CANDELABRA_LANTERN_WIDTH = 0.42
export const CANDELABRA_LANTERN_DEPTH = 0.42
export const CANDELABRA_LANTERN_HEIGHT = 0.82
export const CANDELABRA_LANTERN_MOUNT_OFFSET = 0.34

export type DecorativeCandelabraLayout = {
  height: number
  armSpan: number
  baseRadius: number
  shaftBottomRadius: number
  shaftTopRadius: number
  shaftTopY: number
  armHubY: number
  sideMountY: number
  sideLanternY: number
  centerLanternY: number
}

/**
 * Resolve the shared elevation and plan proportions for the historic
 * three-light candelabra. `armLength` is the distance from the post centreline
 * to either side lantern; `height` remains the nominal bracket height so old
 * scenes retain their scale.
 */
export function resolveDecorativeCandelabraLayout(
  node: Pick<DecorativeCandelabraLightNode, 'armLength' | 'height'>,
): DecorativeCandelabraLayout {
  const height = Math.max(2.2, node.height ?? 4)
  const armSpan = Math.max(0.5, node.armLength ?? 1.15)
  const sideLanternY = height - 0.16
  return {
    height,
    armSpan,
    baseRadius: 0.34,
    shaftBottomRadius: 0.18,
    shaftTopRadius: 0.095,
    shaftTopY: height - 0.72,
    armHubY: height - 0.86,
    // Keep the fitter embedded in the lantern base so the arm cannot expose a
    // seam when viewed from below or at a grazing angle.
    sideMountY: sideLanternY - CANDELABRA_LANTERN_MOUNT_OFFSET - 0.11,
    sideLanternY,
    centerLanternY: height + 0.24,
  }
}
