import { type AnyNode, type AnyNodeId, type NodeDefinition } from '@pascal-app/core'
import { BodyJetNode, BODY_JET } from './schema'
import { buildBodyJetGeometry, bodyJetGeometryKey } from './geometry'
import { bodyJetFloorplan, bodyJetFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = { body: 'Jet body', flange: 'Wall flange', face: 'Spray face', nozzles: 'Nozzles' }
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const bodyJetDefinition: NodeDefinition<typeof BodyJetNode> = {
  kind: BODY_JET,
  schemaVersion: 1,
  schema: BodyJetNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const { id: _id, type: _type, ...rest } = BodyJetNode.parse({ name: 'Body shower jet' })
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
        default: slotId === 'nozzles' ? '#666666' : '#ffffff',
      })),
  },
  geometry: buildBodyJetGeometry,
  geometryKey: bodyJetGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: bodyJetFloorplan,
  floorplanMoveTarget: bodyJetFloorplanMove,
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
    label: 'Body shower jet',
    description: 'Round, square and rectangular adjustable body sprays and grouped jets.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 230,
  },
  toolHints: [
    { key: 'Left click', label: 'Place body jet on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description: 'Wall-mounted body spray with stable inlet and spray targets.',
  },
}
