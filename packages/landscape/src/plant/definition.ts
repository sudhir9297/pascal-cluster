import type { NodeDefinition } from '@pascal-app/core'
import { PLANT_KIND, PlantNode } from './domain/schema'

export const plantDefinition: NodeDefinition<typeof PlantNode> = {
  kind: PLANT_KIND,
  schemaVersion: 1,
  schema: PlantNode,
  category: 'furnish',
  snapProfile: 'item',
  surfaceRole: 'furnishing',
  defaults: () => { const { id: _id, type: _type, ...defaults } = PlantNode.parse({}); return defaults },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    movable: { axes: ['x', 'z'], gridSnap: true },
    rotatable: { axes: ['y'] },
    duplicable: true, deletable: true, groupable: true, snappable: {},
  },
  renderer: { kind: 'parametric', module: () => import('./rendering/renderer') },
  preview: () => import('./rendering/preview'),
  tool: () => import('./editor/tool'),
  parametrics: { groups: [] },
  toolHints: [{ key: 'Left click', label: 'Place plant' }, { key: 'Esc', label: 'Cancel' }],
  presentation: {
    label: 'Plant', description: 'Plant presets from the landscape reference catalog.',
    icon: { kind: 'iconify', name: 'lucide:sprout' }, paletteSection: 'furnish', hidden: true,
  },
}
