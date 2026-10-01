import { showerFlangeFloorplan } from './floorplan'
import type { NodeDefinition, AnyNodeId } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { SHOWER_FLANGE, ShowerFlangeNode } from './schema'
import { buildShowerFlangeGeometry } from './geometry'
export const showerFlangeDefinition: NodeDefinition<typeof ShowerFlangeNode> = {
  kind: SHOWER_FLANGE,
  schemaVersion: 1,
  schema: ShowerFlangeNode,
  category: 'furnish',
  defaults: () => {
    const { id, type, ...rest } = ShowerFlangeNode.parse({ name: 'Shower arm wall cover' })
    return rest
  },
  floorplan: showerFlangeFloorplan,
  geometry: buildShowerFlangeGeometry,
  system: { module: () => import('./system'), priority: 1 },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    paint: createSlotPaint((s): s is 'cover' => s === 'cover', 0.22),
    slots: () => [{ slotId: 'cover', label: 'Wall cover', default: '#ffffff' }],
  },
  floorplanDependsOnSiblings: true,
  floorplanDependencies: (n, nodes) => {
    const ids: AnyNodeId[] = []
    let id = n.parentId
    while (id && !ids.includes(id as AnyNodeId)) {
      ids.push(id as AnyNodeId)
      id = nodes[id as AnyNodeId]?.parentId ?? null
    }
    return ids
  },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  presentation: {
    label: 'Shower arm wall cover',
    description: 'Replaceable wall flange around the arm tube.',
    icon: { kind: 'iconify', name: 'lucide:circle' },
  },
  toolHints: [
    { key: 'Left click', label: 'Attach or replace wall cover on arm' },
    { key: 'Esc', label: 'Cancel' },
  ],
}
