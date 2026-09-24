import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
  resolveCobraHeadLightLayout,
  type CobraHeadLightLayout,
} from './cobra-head-light-geometry'
import type { MultiHeadAreaLightNode } from './schema'

/** Multi-head poles share the proven cobra-head housing dimensions. */
export function resolveMultiHeadAreaLightLayout(
  node: MultiHeadAreaLightNode,
): CobraHeadLightLayout {
  return resolveCobraHeadLightLayout(node)
}

export { buildCobraHeadHousingGeometry, buildCobraHeadLensGeometry }

export function areaHeadAngles(headCount: 3 | 4): number[] {
  return Array.from({ length: headCount }, (_, index) => (index * Math.PI * 2) / headCount)
}
