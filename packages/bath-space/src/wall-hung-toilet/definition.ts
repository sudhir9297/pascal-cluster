import { clearToiletControlLinks } from '../flush-control/attachment'
import {
  type AnyNode,
  type AnyNodeId,
  type NodeDefinition,
} from '@pascal-app/core'
import { WallHungToiletNode, WALL_HUNG_TOILET } from './schema'
import { buildWallHungToiletGeometry, toiletGeometryKey } from './geometry'
import { toiletFloorplan, toiletFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = {
  ceramic: 'Ceramic bowl',
  seat: 'Seat and lid',
  tank: 'External cistern',
  hardware: 'Flush pipe',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const wallHungToiletDefinition: NodeDefinition<
  typeof WallHungToiletNode
> = {
  kind: WALL_HUNG_TOILET,
  schemaVersion: 1,
  schema: WallHungToiletNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = WallHungToiletNode.parse({ name: 'Wall hung toilet' })
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
        default: slotId === 'hardware' ? '#bbc3cb' : '#ffffff',
      })),
  },
  geometry: buildWallHungToiletGeometry,
  geometryKey: toiletGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: {
    groups: [],
    onDelete: clearToiletControlLinks,
    customPanel: () => import('./inspector'),
  },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: toiletFloorplan,
  floorplanMoveTarget: toiletFloorplanMove,
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
    label: 'Wall hung toilet',
    description:
      'Floating WC with adjustable bowl, seat and concealed or external cistern.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 220,
  },
  toolHints: [
    { key: 'Left click', label: 'Place toilet on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description:
      'Wall hung toilet in rounded, D-shaped, square, compact and elongated styles with concealed, attached external, low-level or high-level cistern.',
  },
}
