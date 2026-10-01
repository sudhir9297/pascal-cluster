import type { NodeDefinition } from '@pascal-app/core'
import { countertopBasinDefinition } from './definition'
import { SemiRecessedBasinNode, SEMI_RECESSED_BASIN } from './schema'

export const semiRecessedBasinDefinition = {
  ...countertopBasinDefinition,
  kind: SEMI_RECESSED_BASIN, schema: SemiRecessedBasinNode,
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = SemiRecessedBasinNode.parse({ name: 'Semi-recessed Basin' })
    return defaults
  },
  tool: () => import('./semi-recessed-tool'),
  toolHints: [{ key: 'Left click', label: 'Place at vanity front' }, { key: 'Esc', label: 'Exit placement' }],
  presentation: { ...countertopBasinDefinition.presentation, label: 'Semi-recessed Basin',
    description: 'A partly inset bowl projecting beyond the vanity front.', paletteOrder: 216 },
  mcp: { description: 'A semi-recessed basin with adjustable front projection and recess depth, derived countertop notch, and storage clearance.' },
} as unknown as NodeDefinition<typeof SemiRecessedBasinNode>
