import { clearBasinServiceLinks } from '../attachments/lifecycle'
import { type AnyNode, type AnyNodeId, type HandleDescriptor, type NodeDefinition, useScene } from '@pascal-app/core'
import { countertopBasinDefinition } from '../countertop-basin/definition'
import { WALL_HUNG_BASIN, WallHungBasinNode } from '../countertop-basin/schema'
import { buildWallHungBasinGeometry, wallHungBasinGeometryKey } from './geometry'
import { wallBasinFloorplan, wallBasinFloorplanMove } from './floorplan'
import { wallBasinPlacement } from './placement'
import { createSlotPaint } from '../freestanding-vanity/paint'

const labels = { bowl: 'Ceramic basin and shroud', drain: 'Drain cover', plumbing: 'Waste pipe and fittings', overflow: 'Overflow recess' }
const isSlot = (value: unknown): value is keyof typeof labels => typeof value === 'string' && Object.hasOwn(labels, value)

function wallBasinHandles(node: WallHungBasinNode): HandleDescriptor<WallHungBasinNode>[] {
  const wall = useScene.getState().nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  const maxWidth = wall?.type === 'wall' ? Math.max(0.45, Math.min(0.8, Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]))) : 0.8
  const resize = (initial: WallHungBasinNode, patch: Partial<WallHungBasinNode>) => {
    const next = WallHungBasinNode.parse({ ...initial, ...patch })
    const placement = wall?.type === 'wall' ? wallBasinPlacement(next, wall, next.position[0], next.side, 0, true) : null
    return { ...patch, ...placement }
  }
  return [
    { kind: 'linear-resize', axis: 'x', anchor: 'center', min: 0.45, max: maxWidth,
      currentValue: basin => basin.width, apply: (basin, value) => resize(basin, { width: Math.round(Math.min(value, maxWidth) * 1000) / 1000 }),
      placement: { position: basin => [basin.width / 2 + 0.18, 0.08, 0] } },
    { kind: 'linear-resize', axis: 'z', anchor: 'max', direction: -1, min: 0.42, max: 0.55,
      currentValue: basin => basin.depth, apply: (basin, value) => resize(basin, { depth: Math.round(value * 1000) / 1000 }),
      placement: { position: basin => [0, 0.08, -basin.depth / 2 - 0.18] } },
    { kind: 'linear-resize', axis: 'y', anchor: 'max', direction: -1, min: 0.08, max: 0.22,
      currentValue: basin => basin.height, apply: (basin, value) => resize(basin, { height: Math.round(value * 1000) / 1000 }),
      placement: { position: basin => [basin.width / 2 + 0.18, -basin.height - 0.12, 0] } },
    { kind: 'tap-action', shape: 'move-cross', plane: 'horizontal', cursor: 'move',
      onActivate: (basin, _scene, editor) => editor.engageMoveDrag(basin as unknown as AnyNode),
      placement: { position: basin => [-basin.width / 2 - 0.2, 0.08, 0] } },
  ]
}

export const wallHungBasinDefinition = {
  ...countertopBasinDefinition,
  kind: WALL_HUNG_BASIN, schema: WallHungBasinNode,
  defaults: () => { const { id: _id, type: _type, ...defaults } = WallHungBasinNode.parse({ name: 'Wall hung Basin' }); return defaults },
  capabilities: { ...countertopBasinDefinition.capabilities, rotatable: undefined,
    paint: createSlotPaint(isSlot, 0.2),
    slots: () => Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: slotId === 'bowl' ? '#ffffff' : slotId === 'overflow' ? '#20252a' : '#bbc3cb' })),
    movable: { axes: ['x', 'y'], gridSnap: true, directDrag: true }, wallOpeningPlacement: true, hostRefFields: ['wallId'] },
  drafting: { surfaceQuery: true },
  geometry: buildWallHungBasinGeometry, geometryKey: wallHungBasinGeometryKey,
  handles: wallBasinHandles,
  parametrics: { onDelete: clearBasinServiceLinks, customPanel: () => import('./inspector') },
  tool: () => import('./tool'), affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: wallBasinFloorplan, floorplanMoveTarget: wallBasinFloorplanMove,
  floorplanDependsOnSiblings: true,
  floorplanSiblingOverrides: ({ nodes, liveOverrides }: { nodes: Record<AnyNodeId, AnyNode>; liveOverrides: Map<string, Record<string, unknown>> }) => {
    const result = { ...nodes }
    for (const [id, patch] of liveOverrides) if (result[id as AnyNodeId]) result[id as AnyNodeId] = { ...result[id as AnyNodeId], ...patch } as AnyNode
    return result
  },
  keyboardActions: { r: {
    appliesTo: (node: AnyNode) => String(node.type) === WALL_HUNG_BASIN,
    run: (raw: AnyNode) => {
      const node = WallHungBasinNode.parse(raw), state = useScene.getState()
      const wall = state.nodes[(node.wallId ?? node.parentId) as AnyNodeId]
      if (wall?.type !== 'wall') return
      const target = wallBasinPlacement(node, wall, node.position[0], node.side === 'front' ? 'back' : 'front')
      if (target) state.updateNode(node.id as AnyNodeId, target as Partial<AnyNode>)
    },
  } },
  toolHints: [{ key: 'Left click', label: 'Place basin on wall' }, { key: 'Esc', label: 'Exit placement' }],
  presentation: { label: 'Wall hung Basin', description: 'A wall hung washbasin with a rear tap deck and wall-connected waste.', icon: { kind: 'iconify', name: 'lucide:bath' }, paletteSection: 'furnish', paletteOrder: 217 },
  mcp: { description: 'A wall hung ceramic basin with sculpted shroud, slim rectangular, classic curved, or deep box designs, adjustable mounting height, and concealed, bottle, curved, or flexible wall-connected waste.' },
} as unknown as NodeDefinition<typeof WallHungBasinNode>
