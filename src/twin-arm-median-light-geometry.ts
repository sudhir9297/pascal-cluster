import { resolveCobraHeadLightLayout, type CobraHeadLightLayout } from './cobra-head-light-geometry'
import type { TwinArmMedianLightNode } from './schema'

/** The two opposing heads share the cobra-head's dimensions and housing. */
export function resolveTwinArmMedianLightLayout(
  node: TwinArmMedianLightNode,
): CobraHeadLightLayout {
  return resolveCobraHeadLightLayout(node)
}
