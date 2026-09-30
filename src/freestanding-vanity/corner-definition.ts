import { type GeometryContext, type NodeDefinition } from '@pascal-app/core'
import { freestandingVanityDefinition } from './definition'
import { CORNER_VANITY, CornerVanityNode } from './schema'
import { buildCornerVanityGeometry, cornerVanityOutline } from './corner-geometry'
import { cornerVanitySnap } from './corner-snap'

export const cornerVanityDefinition = {
  ...freestandingVanityDefinition,
  kind: CORNER_VANITY,
  schema: CornerVanityNode,
  defaults: () => {
    const { id: _id, type: _type, ...defaults } = CornerVanityNode.parse({ name: 'Corner Vanity' })
    return defaults
  },
  geometry: buildCornerVanityGeometry,
  geometryKey: (node: CornerVanityNode) => JSON.stringify({ version: 1, ...node, id: undefined, parentId: undefined, position: undefined, rotation: undefined, metadata: undefined, doorOpen: undefined, drawerOpen: undefined, partOpenings: undefined }),
  system: undefined,
  capabilities: {
    ...freestandingVanityDefinition.capabilities,
    movable: { axes: ['x', 'z'], gridSnap: true, directDrag: true, groupMoveSnapPose: cornerVanitySnap },
    floorPlaced: {
      collides: true,
      footprint: (node: CornerVanityNode) => {
        const r = node.width / Math.SQRT2, f = r * 0.65, o = node.countertopEnabled ? node.countertopOverhang : 0
        const offset = (f - o) / 2
        return {
          position: [node.position[0] + Math.sin(node.rotation) * offset, node.position[1], node.position[2] + Math.cos(node.rotation) * offset],
          dimensions: [r * 2, node.height, r * 2 - f + o], rotation: [0, node.rotation, 0],
        }
      },
    },
  },
  parametrics: { customPanel: () => import('./corner-inspector') },
  handles: [
    { kind: 'linear-resize', axis: 'x', anchor: 'center', min: 0.55, max: 1.2, gridSnap: true,
      currentValue: (node: CornerVanityNode) => node.width,
      apply: (_node: CornerVanityNode, width: number) => ({ width }),
      placement: { position: (node: CornerVanityNode) => [node.width / Math.SQRT2 + 0.2, node.height + 0.1, 0] } },
    { kind: 'linear-resize', axis: 'y', anchor: 'min', min: 0.55, max: 1.1, gridSnap: true,
      currentValue: (node: CornerVanityNode) => node.height,
      apply: (_node: CornerVanityNode, height: number) => ({ height }),
      placement: { position: (node: CornerVanityNode) => [0, node.height + 0.25, 0] } },
    { kind: 'arc-resize', axis: 'angular', shape: 'rotate',
      apply: (node: CornerVanityNode, delta: number) => ({ rotation: node.rotation - delta }),
      placement: { position: (node: CornerVanityNode) => [node.width / Math.SQRT2 + 0.2, node.height + 0.1, -0.2], rotationY: () => -Math.PI / 4 } },
  ],
  floorplan: (node: CornerVanityNode, ctx: GeometryContext) => {
    const c = Math.cos(node.rotation), s = Math.sin(node.rotation)
    return { kind: 'polygon', fill: '#ffffff', stroke: ctx.viewState?.selected ? ctx.viewState.palette?.selectedStroke ?? '#8b5cf6' : '#737373', strokeWidth: 0.02, cursor: 'move',
      points: cornerVanityOutline(node, node.countertopEnabled ? node.countertopOverhang : 0).map(([x, z]) =>
        [node.position[0] + x * c + z * s, node.position[2] - x * s + z * c]) }
  },
  extensions: { 'pascal:editor/floorplan': { directDrag: true } },
  presentation: { ...freestandingVanityDefinition.presentation, label: 'Corner Vanity', description: 'A procedural vanity with two perpendicular backs and an angled front.', paletteOrder: 212 },
  mcp: { description: 'A floor-standing corner vanity for a right-angle bathroom corner. Basins are separate objects.' },
} as unknown as NodeDefinition<typeof CornerVanityNode>
