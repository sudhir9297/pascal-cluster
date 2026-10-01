import type { NodeDefinition, AnyNodeId } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { HandShowerNode, HAND_SHOWER } from './schema'
import { buildHandShowerGeometry, handShowerGeometryKey } from './geometry'
import { handShowerFloorplan } from './floorplan'
const labels = {
  body: 'Head body',
  handle: 'Handle',
  face: 'Spray face',
  nozzles: 'Nozzles',
  connector: 'Hose connector',
  controls: 'Spray selector',
}
const isSlot = (v: unknown): v is keyof typeof labels =>
  typeof v === 'string' && Object.hasOwn(labels, v)
export const handShowerDefinition: NodeDefinition<typeof HandShowerNode> = {
  kind: HAND_SHOWER,
  schemaVersion: 1,
  schema: HandShowerNode,
  category: 'furnish',
  defaults: () => {
    const { id, type, ...rest } = HandShowerNode.parse({ name: 'Hand shower' })
    return rest
  },
  geometry: buildHandShowerGeometry,
  geometryKey: handShowerGeometryKey,
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  floorplan: handShowerFloorplan,
  floorplanDependencies: (n, nodes) => {
    const ids: AnyNodeId[] = []
    let id = n.parentId
    while (id && !ids.includes(id as AnyNodeId)) {
      ids.push(id as AnyNodeId)
      id = nodes[id as AnyNodeId]?.parentId ?? null
    }
    return ids
  },
  floorplanDependsOnSiblings: true,
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    paint: createSlotPaint(isSlot, 0.22),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' })),
  },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  presentation: {
    label: 'Hand shower',
    description: 'Round, square, oval and wand hand showers attached to a holder or slide rail.',
    icon: { kind: 'iconify', name: 'lucide:shower-head' },
  },
  toolHints: [
    { key: 'Left click', label: 'Attach or replace hand shower on holder' },
    { key: 'Esc', label: 'Cancel' },
  ],
}
