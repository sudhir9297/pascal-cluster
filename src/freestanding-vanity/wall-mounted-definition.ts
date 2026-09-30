import { type AnyNode, type AnyNodeId, type HandleDescriptor, type NodeDefinition, useScene } from '@pascal-app/core'
import { freestandingVanityDefinition } from './definition'
import { WALL_MOUNTED_VANITY, WallMountedVanityNode } from './schema'
import { wallVanityFloorplan, wallVanityFloorplanMove } from './wall-floorplan'
import { wallVanityPlacement } from './wall-placement'

function wallVanityHandles(node: WallMountedVanityNode): HandleDescriptor<WallMountedVanityNode>[] {
  const shared = freestandingVanityDefinition.handles
  const list = Array.isArray(shared) ? shared.filter((handle) => handle.kind !== 'arc-resize') : []
  const handles = list as unknown as HandleDescriptor<WallMountedVanityNode>[]
  const wall = useScene.getState().nodes[(node.wallId ?? node.parentId) as AnyNodeId]
  const maximumWidth = wall?.type === 'wall' ? Math.min(1.8, Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]) - (node.countertopEnabled ? node.countertopOverhang * 2 : 0)) : 1.8
  const constrained = handles.map((handle) => {
    if (handle.kind !== 'linear-resize') return handle
    return {
      ...handle,
      ...(handle.axis === 'x' ? { max: Math.max(0.55, maximumWidth) } : {}),
      apply: ((initial, value, scene) => {
        const patch = handle.apply(initial, handle.axis === 'x' ? Math.min(value, Math.max(0.55, maximumWidth)) : value, scene)
        const next = WallMountedVanityNode.parse({ ...initial, ...patch })
        const target = wall?.type === 'wall' ? wallVanityPlacement(next, wall, next.position[0], next.side, 0, true) : null
        return target ? { ...patch, ...target } : patch
      }) as typeof handle.apply,
    }
  })
  return [...constrained, {
    kind: 'tap-action', shape: 'move-cross', plane: 'horizontal', cursor: 'move',
    onActivate: (node, _scene, editor) => editor.engageMoveDrag(node as unknown as AnyNode),
    placement: { position: (node) => [-node.width / 2 - 0.25, node.height + 0.1, 0] },
  }]
}

// Shared controls, paint targets, handles, and geometry; the builder omits the floor base.
export const wallMountedVanityDefinition = {
  ...freestandingVanityDefinition,
  kind: WALL_MOUNTED_VANITY,
  schema: WallMountedVanityNode,
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = WallMountedVanityNode.parse({ name: 'Wall-mounted Vanity' })
    return defaults
  },
  // The shared system registered by the freestanding definition animates both kinds.
  system: undefined,
  snapProfile: 'item',
  drafting: { surfaceQuery: true },
  capabilities: {
    ...freestandingVanityDefinition.capabilities,
    floorPlaced: undefined,
    rotatable: undefined,
    movable: { axes: ['x', 'y'], gridSnap: true, directDrag: true },
    wallOpeningPlacement: true,
    hostRefFields: ['wallId'],
  },
  handles: wallVanityHandles,
  affordanceTools: { move: () => import('./wall-tool') },
  floorplan: wallVanityFloorplan,
  floorplanMoveTarget: wallVanityFloorplanMove,
  floorplanDependsOnSiblings: true,
  floorplanSiblingOverrides: ({ nodes, liveOverrides }: { nodes: Record<AnyNodeId, AnyNode>; liveOverrides: Map<string, Record<string, unknown>> }) => {
    if (!liveOverrides.size) return nodes
    const result = { ...nodes }
    for (const [id, patch] of liveOverrides) if (result[id as AnyNodeId]) result[id as AnyNodeId] = { ...result[id as AnyNodeId], ...patch } as AnyNode
    return result
  },
  extensions: { 'pascal:editor/floorplan': { directDrag: true } },
  keyboardActions: {
    ...freestandingVanityDefinition.keyboardActions,
    r: {
      appliesTo: (node: AnyNode) => String(node.type) === WALL_MOUNTED_VANITY,
      run: (raw: AnyNode) => {
        const node = WallMountedVanityNode.parse(raw)
        const wall = useScene.getState().nodes[(node.wallId ?? node.parentId) as AnyNodeId]
        if (wall?.type !== 'wall') return
        const placement = wallVanityPlacement(node, wall, node.position[0], node.side === 'front' ? 'back' : 'front')
        if (placement) useScene.getState().updateNode(node.id as AnyNodeId, placement as Partial<AnyNode>)
      },
    },
  },
  toolHints: [{ key: 'Left click', label: 'Place vanity on wall' }, { key: 'Esc', label: 'Cancel' }],
  presentation: {
    ...freestandingVanityDefinition.presentation,
    label: 'Wall-mounted Vanity',
    description: 'Floating procedural bathroom vanity with adjustable floor clearance.',
    paletteOrder: 211,
  },
  mcp: { description: 'A procedural wall-mounted bathroom vanity. Basin objects are authored separately.' },
} as unknown as NodeDefinition<typeof WallMountedVanityNode>
