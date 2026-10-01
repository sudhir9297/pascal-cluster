import { type AnyNode, type AnyNodeId, type HandleDescriptor, type NodeDefinition } from '@pascal-app/core'
import { wallHungBasinDefinition } from '../wall-hung-basin/definition'
import { HALF_PEDESTAL_BASIN, HalfPedestalBasinNode } from '../countertop-basin/schema'
import { buildHalfPedestalBasinGeometry, halfPedestalBasinGeometryKey } from './geometry'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { wallBasinPlacement } from '../wall-hung-basin/placement'
const labels = { bowl: 'Ceramic basin', pedestal: 'Ceramic shroud', drain: 'Drain cover', overflow: 'Overflow recess', plumbing: 'Overflow trim' }
const isSlot = (value: unknown): value is keyof typeof labels => typeof value === 'string' && Object.hasOwn(labels, value)
function handles(node: HalfPedestalBasinNode): HandleDescriptor<HalfPedestalBasinNode>[] {
  return (['width', 'depth', 'shroudHeight'] as const).map(key => ({
    kind: 'linear-resize', axis: key === 'width' ? 'x' : key === 'depth' ? 'z' : 'y', anchor: key === 'shroudHeight' ? 'max' : 'center', direction: key === 'shroudHeight' ? -1 : 1,
    min: key === 'width' ? 0.45 : key === 'depth' ? 0.42 : 0.12, max: key === 'width' ? 0.8 : key === 'depth' ? 0.55 : 0.38,
    currentValue: basin => basin[key],
    apply: (basin, value, scene) => {
      const next = HalfPedestalBasinNode.parse({ ...basin, [key]: Math.round(value * 1000) / 1000 })
      const wall = scene.nodes()[(basin.wallId ?? basin.parentId) as AnyNodeId]
      return { [key]: next[key], ...(wall?.type === 'wall' ? wallBasinPlacement(next, wall, next.position[0], next.side, 0, true) : null) }
    },
    placement: { position: basin => key === 'width' ? [basin.width / 2 + 0.18, 0.08, 0] : key === 'depth' ? [0, 0.08, -basin.depth / 2 - 0.18] : [-basin.width / 2 - 0.18, -basin.height - basin.shroudHeight - 0.12, 0] },
  }))
}
export const halfPedestalBasinDefinition = {
  ...wallHungBasinDefinition, kind: HALF_PEDESTAL_BASIN, schema: HalfPedestalBasinNode,
  defaults: () => { const { id, type, ...rest } = HalfPedestalBasinNode.parse({ name: 'Half Pedestal Basin' }); return rest },
  geometry: buildHalfPedestalBasinGeometry, geometryKey: halfPedestalBasinGeometryKey,
  capabilities: { ...wallHungBasinDefinition.capabilities, movable: { axes: ['x', 'y'], directDrag: true, gridSnap: true },
    paint: createSlotPaint(isSlot, 0.2), slots: () => Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' })) },
  handles, parametrics: { customPanel: () => import('./inspector') },
  tool: () => import('./tool'), affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  keyboardActions: undefined,
  toolHints: [{ key: 'Left click', label: 'Place half pedestal on wall' }, { key: 'Esc', label: 'Exit placement' }],
  presentation: { ...wallHungBasinDefinition.presentation, label: 'Half Pedestal Basin', description: 'A wall-attached washbasin with a short ceramic shroud suspended above the floor.', paletteOrder: 219 },
  mcp: { description: 'Wall-attached half pedestal basin with curved, square and integrated models, adjustable mounting height and basin-tap-target.' },
} as unknown as NodeDefinition<typeof HalfPedestalBasinNode>
