import { type NodeDefinition, type AnyNodeId } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { ShowerHoseNode, SHOWER_HOSE } from './schema'
import { buildShowerHoseGeometry, showerHoseGeometryKey, hoseCurve } from './geometry'
import { resolveHose } from './connection'
const labels = { hose: 'Hose surface', connectors: 'End connectors' }
export const showerHoseDefinition: NodeDefinition<typeof ShowerHoseNode> = {
  kind: SHOWER_HOSE,
  schemaVersion: 1,
  schema: ShowerHoseNode,
  category: 'furnish',
  defaults: () => {
    const { id, type, ...rest } = ShowerHoseNode.parse({ name: 'Shower hose' })
    return rest
  },
  geometry: buildShowerHoseGeometry,
  geometryKey: showerHoseGeometryKey,
  system: { module: () => import('./system'), priority: 3 },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  capabilities: {
    selectable: { hitVolume: 'mesh' },
    deletable: true,
    hostRefFields: ['targetId'],
    paint: createSlotPaint(
      (v): v is keyof typeof labels => typeof v === 'string' && Object.hasOwn(labels, v),
      0.28,
    ),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' })),
  },
  floorplan: (n, ctx) => {
    const pose = resolveHose(n, ctx)
    if (!pose) return null
    const curve = hoseCurve(n, pose.end, pose.endDirection)
    if (!curve) return null
    return {
      kind: 'path',
      d:
        'M' +
        curve
          .getPoints(64)
          .map((p) => {
            p.applyMatrix4(pose.sourceMatrix)
            return `${p.x},${p.z}`
          })
          .join('L'),
      stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
      strokeWidth: n.diameter,
      fill: 'none',
    }
  },
  floorplanDependsOnSiblings: true,
  floorplanDependencies: (n, nodes) => {
    const result = new Set<AnyNodeId>()
    for (let id of [n.parentId, n.targetId]) {
      while (id && !result.has(id as AnyNodeId)) {
        result.add(id as AnyNodeId)
        id = nodes[id as AnyNodeId]?.parentId ?? null
      }
    }
    return [...result]
  },
  presentation: {
    label: 'Shower hose',
    description: 'Flexible two-ended hose between a supply outlet and mounted hand shower.',
    icon: { kind: 'iconify', name: 'lucide:cable' },
  },
  toolHints: [
    { key: 'Left click', label: 'Choose supply outlet, then hand shower' },
    { key: 'Esc', label: 'Cancel' },
  ],
}
