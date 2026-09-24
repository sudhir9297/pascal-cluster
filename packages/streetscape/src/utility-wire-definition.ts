import type { NodeDefinition } from '@pascal-app/core'
import { UtilityWireSpanNode } from './schema'
import { buildUtilityWireFloorplan } from './utility-wire-floorplan'

type UtilityWireDefinition = NodeDefinition<typeof UtilityWireSpanNode> & Record<string, unknown>

export const utilityWireDefinition: UtilityWireDefinition = {
  kind: 'streetscape:utility-wire-span',
  schemaVersion: 1,
  schema: UtilityWireSpanNode,
  category: 'furnish',
  snapProfile: 'item',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    fromPoleId: 'utility-pole_unset-from',
    toPoleId: 'utility-pole_unset-to',
    conductorColor: '#25292b',
    sagRatio: 0.035,
  }),

  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    duplicable: false,
    groupable: false,
  },

  floorplan: buildUtilityWireFloorplan,
  renderer: { kind: 'parametric', module: () => import('./utility-wire-renderer') },

  presentation: {
    label: 'Utility Wire Span',
    description: 'Three sagging primary conductors plus a lower neutral linked between two poles.',
    icon: { kind: 'iconify', name: 'lucide:unplug' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'An automatically generated three-phase primary span with a lower neutral between two utility poles.',
  },
}
