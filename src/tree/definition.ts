import type { NodeDefinition } from '@pascal-app/core'
import { TreeNode, TREE_KIND } from './domain/schema'

export const treeDefinition: NodeDefinition<typeof TreeNode> = {
  kind: TREE_KIND,
  schemaVersion: 1,
  schema: TreeNode,
  category: 'furnish',
  snapProfile: 'item',
  surfaceRole: 'furnishing',
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = TreeNode.parse({})
    return defaults
  },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    movable: { axes: ['x', 'z'], gridSnap: true },
    rotatable: { axes: ['y'] },
    duplicable: true,
    deletable: true,
    groupable: true,
    snappable: {},
  },
  renderer: { kind: 'parametric', module: () => import('./rendering/renderer') },
  preview: () => import('./rendering/preview'),
  tool: () => import('./editor/tool'),
  parametrics: { groups: [] },
  toolHints: [
    { key: 'Left click', label: 'Place tree' },
    { key: 'Esc', label: 'Cancel' },
  ],
  presentation: {
    label: 'SeedThree tree',
    description: 'Procedural SeedThree species with editable growth, material, and LOD controls.',
    icon: { kind: 'iconify', name: 'lucide:tree-deciduous' },
    paletteSection: 'furnish',
    hidden: true,
  },
}
