import { showerValveFloorplan } from './floorplan'
import type { NodeDefinition } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { SHOWER_VALVE, ShowerValveNode } from './schema'
import { buildShowerValveGeometry, showerValveGeometryKey } from './geometry'
const labels = {
  body: 'Brass body',
  cartridge: 'Cartridge',
  ports: 'Pipe connections',
  stops: 'Service stops',
  housing: 'Installation housing',
}
const isSlot = (s: unknown): s is keyof typeof labels =>
  typeof s === 'string' && Object.hasOwn(labels, s)
export const showerValveDefinition: NodeDefinition<typeof ShowerValveNode> = {
  kind: SHOWER_VALVE,
  schemaVersion: 1,
  schema: ShowerValveNode,
  category: 'furnish',
  defaults: () => {
    const { id, type, ...rest } = ShowerValveNode.parse({ name: 'Concealed valve body' })
    return rest
  },
  floorplan: showerValveFloorplan,
  floorplanDependsOnSiblings: true,
  floorplanDependencies: (n, nodes) => {
    const ids: import('@pascal-app/core').AnyNodeId[] = []
    let id = n.parentId
    while (id && !ids.includes(id as import('@pascal-app/core').AnyNodeId)) {
      ids.push(id as import('@pascal-app/core').AnyNodeId)
      id = nodes[id as import('@pascal-app/core').AnyNodeId]?.parentId ?? null
    }
    return ids
  },
  geometry: buildShowerValveGeometry,
  geometryKey: showerValveGeometryKey,
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    paint: createSlotPaint(isSlot, 0.35),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({
        slotId,
        label,
        default:
          slotId === 'housing'
            ? '#3b756c'
            : slotId === 'body' || slotId === 'ports'
              ? '#b79b62'
              : '#686b70',
      })),
  },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  presentation: {
    label: 'Concealed valve body',
    description: 'Rough-in valve mounted behind compatible concealed shower trim.',
    icon: { kind: 'iconify', name: 'lucide:settings-2' },
  },
  toolHints: [
    { key: 'Left click', label: 'Attach or replace valve behind compatible trim' },
    { key: 'Esc', label: 'Cancel' },
  ],
}
