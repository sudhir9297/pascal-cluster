import { type AnyNode, type AnyNodeId, type NodeDefinition } from '@pascal-app/core'
import { ShowerMountNode, SHOWER_MOUNT } from './schema'
import { buildShowerMountGeometry, showerMountGeometryKey } from './geometry'
import { showerMountFloorplan, showerMountFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = {
  body: 'Body and rail',
  flange: 'Wall flange',
  holder: 'Holder',
  connector: 'Outlet connector',
  shelf: 'Shelf',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const showerMountDefinition: NodeDefinition<typeof ShowerMountNode> = {
  kind: SHOWER_MOUNT,
  schemaVersion: 1,
  schema: ShowerMountNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = ShowerMountNode.parse({ name: 'Shower mounting fitting' })
    return rest
  },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    movable: { axes: ['x', 'y'], gridSnap: true, directDrag: true },
    duplicable: { subtree: 'with-children' },
    deletable: true,
    wallOpeningPlacement: true,
    hostRefFields: ['wallId'],
    paint: createSlotPaint(isSlot, 0.22),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({
        slotId,
        label,
        default: '#ffffff',
      })),
  },
  geometry: buildShowerMountGeometry,
  geometryKey: showerMountGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: showerMountFloorplan,
  floorplanMoveTarget: showerMountFloorplanMove,
  floorplanDependsOnSiblings: true,
  floorplanSiblingOverrides: ({ nodes, liveOverrides }) => {
    const result = { ...nodes }
    for (const [id, patch] of liveOverrides)
      if (result[id as AnyNodeId])
        result[id as AnyNodeId] = {
          ...result[id as AnyNodeId],
          ...patch,
        } as AnyNode
    return result
  },
  presentation: {
    label: 'Shower mounting fitting',
    description:
      'Wall shower mounting fittings with round or square profiles and a shower-head attachment slot.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 230,
  },
  toolHints: [
    { key: 'Left click', label: 'Place shower mounting fitting on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description:
      'Wall-mounted hand shower holder, supply elbow or slide rail with stable handset and hose slots.',
  },
}
