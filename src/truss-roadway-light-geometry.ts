import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
  resolveCobraHeadLightLayout,
  type CobraHeadLightLayout,
} from './cobra-head-light-geometry'
import type { TrussRoadwayLightNode } from './schema'

export type TrussRoadwayLightLayout = CobraHeadLightLayout & { braceDepth: number }

export function resolveTrussRoadwayLightLayout(
  node: TrussRoadwayLightNode,
): TrussRoadwayLightLayout {
  return {
    ...resolveCobraHeadLightLayout(node),
    braceDepth: Math.max(0.35, Math.min(1.2, node.braceDepth ?? 0.7)),
  }
}

export { buildCobraHeadHousingGeometry, buildCobraHeadLensGeometry }
