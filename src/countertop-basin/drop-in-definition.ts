import type { NodeDefinition } from '@pascal-app/core'
import { countertopBasinDefinition } from './definition'
import { DropInBasinNode, DROP_IN_BASIN } from './schema'

export const dropInBasinDefinition = {
  ...countertopBasinDefinition,
  kind: DROP_IN_BASIN, schema: DropInBasinNode,
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = DropInBasinNode.parse({ name: 'Drop-in Basin' })
    return defaults
  },
  tool: () => import('./drop-in-tool'),
  toolHints: [{ key: 'Left click', label: 'Inset into countertop' }, { key: 'Esc', label: 'Exit placement' }],
  presentation: { ...countertopBasinDefinition.presentation, label: 'Drop-in Basin',
    description: 'An inset bowl supported by a raised rim, with an automatic countertop opening.', paletteOrder: 215 },
  mcp: { description: 'A drop-in basin with an above-counter rim, below-counter bowl, CSG cutout, and drawer clearance.' },
} as unknown as NodeDefinition<typeof DropInBasinNode>
