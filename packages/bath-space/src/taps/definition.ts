import type { AnyNode, AnyNodeId, NodeDefinition } from '@pascal-app/core'
import { tapPresetIds } from './presets'
import { TAP, TapNode } from './schema'
import { buildTapGeometry, tapGeometryKey } from './geometry'
import { tapHandles } from './handles'
import { tapFloorplan, tapFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'

const paintSlots = { body: 'Tap body', trim: 'Trim and fittings', handle: 'Handles' }
const isPaintSlot = (value: unknown): value is keyof typeof paintSlots =>
  typeof value === 'string' && Object.hasOwn(paintSlots, value)

export const tapDefinition: NodeDefinition<typeof TapNode> = {
  kind: TAP,
  schemaVersion: 1,
  schema: TapNode,
  category: 'furnish',
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = TapNode.parse({ name: 'Tap' })
    return defaults
  },
  geometry: buildTapGeometry, geometryKey: tapGeometryKey,
  floorplan: tapFloorplan, floorplanMoveTarget: tapFloorplanMove,
  floorplanDependencies: (node, nodes) => {
    const ids: string[] = []
    for (const start of [node.parentId, node.servesBasinId, node.servesBathId]) {
      let id = start
      while (id && !ids.includes(id)) { ids.push(id); id = nodes[id as AnyNodeId]?.parentId ?? null }
    }
    return ids as AnyNodeId[]
  },
  floorplanDependsOnSiblings: true,
  floorplanSiblingOverrides: ({ nodes, liveOverrides }) => {
    const result = { ...nodes }
    for (const [id, patch] of liveOverrides) if (result[id as AnyNodeId]) result[id as AnyNodeId] = { ...result[id as AnyNodeId], ...patch } as AnyNode
    return result
  },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  handles: tapHandles,
  system: { module: () => import('./system'), priority: 2 },
  toolHints: [{ key: 'Left click', label: 'Attach tap to wall or basin' }, { key: 'Esc', label: 'Exit placement' }],
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    hostRefFields: ['wallId'],
    paint: createSlotPaint(isPaintSlot, 0.22),
    slots: () => Object.entries(paintSlots).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' })),
  },
  parametrics: { customPanel: () => import('./inspector'), groups: [{ label: 'Tap', fields: [
    { key: 'presetId', label: 'Design', kind: 'enum', options: tapPresetIds },
    { key: 'height', label: 'Height', kind: 'number', min: 0.12, max: 0.6, step: 0.01, unit: 'm' },
    { key: 'reach', label: 'Spout reach', kind: 'number', min: 0.10, max: 0.3, step: 0.01, unit: 'm' },
    { key: 'bodyRadius', label: 'Body radius', kind: 'number', min: 0.012, max: 0.04, step: 0.001, unit: 'm' },
    { key: 'handleAngle', label: 'Handle angle', kind: 'number', min: -0.5, max: 0.5, step: 0.05 },
  ] }] },
  presentation: {
    label: 'Tap', description: 'Countertop and wall-mounted tap designs.',
    icon: { kind: 'iconify', name: 'lucide:droplets' },
  },
  mcp: { description: 'A procedural tap attached to a wall face for wall designs, or to a basin tap target for countertop designs.' },
}
