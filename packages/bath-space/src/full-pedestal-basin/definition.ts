import { clearBasinServiceLinks } from '../attachments/lifecycle'
import {
  type AnyNode,
  type AnyNodeId,
  type HandleDescriptor,
  type NodeDefinition,
} from '@pascal-app/core'
import { wallHungBasinDefinition } from '../wall-hung-basin/definition'
import { FULL_PEDESTAL_BASIN, FullPedestalBasinNode } from '../countertop-basin/schema'
import { buildFullPedestalBasinGeometry, fullPedestalBasinGeometryKey } from './geometry'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { wallBasinPlacement } from '../wall-hung-basin/placement'
const labels = {
  bowl: 'Ceramic basin',
  pedestal: 'Ceramic pedestal',
  drain: 'Drain cover',
  overflow: 'Overflow recess',
  plumbing: 'Overflow trim',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
function handles(node: FullPedestalBasinNode): HandleDescriptor<FullPedestalBasinNode>[] {
  return (['width', 'depth', 'totalHeight'] as const).map((key) => ({
    kind: 'linear-resize',
    axis: key === 'width' ? 'x' : key === 'depth' ? 'z' : 'y',
    anchor: 'center',
    min: key === 'width' ? 0.45 : key === 'depth' ? 0.42 : 0.7,
    max: key === 'width' ? 0.8 : key === 'depth' ? 0.55 : 0.95,
    currentValue: (basin) => basin[key],
    apply: (basin, value, scene) => {
      const next = FullPedestalBasinNode.parse({ ...basin, [key]: Math.round(value * 1000) / 1000 })
      const wall = scene.nodes()[(basin.wallId ?? basin.parentId) as AnyNodeId]
      return {
        [key]: next[key],
        ...(wall?.type === 'wall'
          ? wallBasinPlacement(next, wall, next.position[0], next.side, 0, true)
          : null),
      }
    },
    placement: {
      position: (basin) =>
        key === 'width'
          ? [basin.width / 2 + 0.18, 0.08, 0]
          : key === 'depth'
            ? [0, 0.08, -basin.depth / 2 - 0.18]
            : [-basin.width / 2 - 0.18, -basin.totalHeight / 2, 0],
    },
  }))
}
export const fullPedestalBasinDefinition = {
  ...wallHungBasinDefinition,
  kind: FULL_PEDESTAL_BASIN,
  schema: FullPedestalBasinNode,
  defaults: () => {
    const { id, type, ...rest } = FullPedestalBasinNode.parse({ name: 'Full Pedestal Basin' })
    return rest
  },
  geometry: buildFullPedestalBasinGeometry,
  geometryKey: fullPedestalBasinGeometryKey,
  capabilities: {
    ...wallHungBasinDefinition.capabilities,
    floorPlaced: {
      footprint: (node: FullPedestalBasinNode) => ({
        dimensions: [node.width, node.totalHeight, node.depth],
        rotation: [0, node.rotation, 0],
      }),
    },
    movable: { axes: ['x'], directDrag: true, gridSnap: true },
    paint: createSlotPaint(isSlot, 0.2),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' })),
  },
  handles,
  parametrics: { onDelete: clearBasinServiceLinks, customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  keyboardActions: undefined,
  toolHints: [
    { key: 'Left click', label: 'Place against wall on floor' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  presentation: {
    ...wallHungBasinDefinition.presentation,
    label: 'Full Pedestal Basin',
    description: 'A wall-attached washbasin with a full ceramic pedestal touching the floor.',
    paletteOrder: 218,
  },
  mcp: {
    description:
      'Wall-attached full pedestal basin with classic, square and monobloc models, floor-anchored placement and basin-tap-target.',
  },
} as unknown as NodeDefinition<typeof FullPedestalBasinNode>
