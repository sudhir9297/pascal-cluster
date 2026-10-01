import {
  type AnyNode,
  type AnyNodeId,
  type NodeDefinition,
} from '@pascal-app/core'
import { ShowerArmNode, SHOWER_ARM } from './schema'
import { buildShowerArmGeometry, showerArmGeometryKey } from './geometry'
import { showerArmFloorplan, showerArmFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = { arm: 'Shower arm', flange: 'Wall flange', connector: 'Outlet connector' }
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const showerArmDefinition: NodeDefinition<
  typeof ShowerArmNode
> = {
  kind: SHOWER_ARM,
  schemaVersion: 1,
  schema: ShowerArmNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = ShowerArmNode.parse({ name: 'Shower arm' })
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
  geometry: buildShowerArmGeometry,
  geometryKey: showerArmGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: showerArmFloorplan,
  floorplanMoveTarget: showerArmFloorplanMove,
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
    label: 'Shower arm',
    description:
      'Wall shower arms with round or square profiles and a shower-head attachment slot.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 230,
  },
  toolHints: [
    { key: 'Left click', label: 'Place shower arm on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description:
      'Wall-mounted shower arm with adjustable profile, shape, projection, drop and flange.',
  },
}
