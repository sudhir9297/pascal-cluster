import { type AnyNode, type AnyNodeId, type NodeDefinition } from '@pascal-app/core'
import { WallSpoutNode, WALL_SPOUT } from './schema'
import { buildWallSpoutGeometry, wallSpoutGeometryKey } from './geometry'
import { wallSpoutFloorplan, wallSpoutFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = {
  body: 'Spout body',
  flange: 'Wall flange',
  outlet: 'Outlet rim',
  aerator: 'Aerator',
  diverter: 'Diverter',
  handle: 'Tap handle',
  connector: 'Hose connector',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const wallSpoutDefinition: NodeDefinition<typeof WallSpoutNode> = {
  kind: WALL_SPOUT,
  schemaVersion: 1,
  schema: WallSpoutNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const { id: _id, type: _type, ...rest } = WallSpoutNode.parse({ name: 'Wall spout or bib tap' })
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
        default: slotId === 'aerator' ? '#666666' : '#c0c0c0',
      })),
  },
  geometry: buildWallSpoutGeometry,
  geometryKey: wallSpoutGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: wallSpoutFloorplan,
  floorplanMoveTarget: wallSpoutFloorplanMove,
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
    label: 'Wall spout or bib tap',
    description: 'Wall bath spouts, diverter spouts and bib taps.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 230,
  },
  toolHints: [
    { key: 'Left click', label: 'Place spout or bib tap on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description:
      'Wall-mounted spouts and bib taps with stable water outlet and optional hose connection.',
  },
}
