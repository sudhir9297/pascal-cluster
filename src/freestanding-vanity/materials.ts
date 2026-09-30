import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import type { Material } from 'three'
import type { VanityNode } from './schema'
import { vanitySlotLabels, type VanitySlotId } from './slots'

export function vanityMaterials(node: VanityNode, ctx?: GeometryContext): Record<VanitySlotId, Material> {
  return Object.fromEntries(Object.keys(vanitySlotLabels).map((slot) => {
    const ref = node.slots?.[slot]
    const painted = ref ? resolveMaterialRef(ref, ctx?.materials, 'rendered') : null
    return [slot, painted ?? createDefaultMaterial('#ffffff', 0.6, 'rendered')]
  })) as Record<VanitySlotId, Material>
}
