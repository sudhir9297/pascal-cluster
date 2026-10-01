import type { NodeDefinition } from '@pascal-app/core'
import { countertopBasinDefinition } from './definition'
import { UndermountBasinNode, UNDERMOUNT_BASIN } from './schema'

export const undermountBasinDefinition = {
  ...countertopBasinDefinition,
  kind: UNDERMOUNT_BASIN, schema: UndermountBasinNode,
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = UndermountBasinNode.parse({ name: 'Undermount Basin' })
    return defaults
  },
  system: { module: () => import('./tap-target-system'), priority: 2 },
  tool: () => import('./undermount-tool'),
  toolHints: [{ key: 'Left click', label: 'Place beneath countertop' }, { key: 'Esc', label: 'Exit placement' }],
  presentation: { ...countertopBasinDefinition.presentation, label: 'Undermount Basin',
    description: 'A bowl attached beneath a vanity countertop with an automatic opening.', paletteOrder: 214 },
  mcp: { description: 'An undermount basin with a mounting flange and a derived CSG opening through its vanity countertop.' },
} as unknown as NodeDefinition<typeof UndermountBasinNode>
