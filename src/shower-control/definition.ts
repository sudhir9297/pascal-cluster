import { type AnyNode, type AnyNodeId, type NodeDefinition } from '@pascal-app/core'
import { ShowerControlNode, SHOWER_CONTROL } from './schema'
import { buildShowerControlGeometry, showerControlGeometryKey } from './geometry'
import { showerControlFloorplan, showerControlFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = {
  plate: 'Cover plate',
  body: 'Mixer body',
  handles: 'Handles',
  buttons: 'Buttons',
  markings: 'Control markings',
  connectors: 'Hose and riser connectors',
  spout: 'Bath spout',
  outlet: 'Spout rim',
  aerator: 'Spout aerator',
  diverter: 'Bath diverter',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const showerControlDefinition: NodeDefinition<typeof ShowerControlNode> = {
  kind: SHOWER_CONTROL,
  schemaVersion: 1,
  schema: ShowerControlNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const { id: _id, type: _type, ...rest } = ShowerControlNode.parse({ name: 'Shower control' })
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
        default: ['markings', 'aerator'].includes(slotId) ? '#404040' : '#ffffff',
      })),
  },
  geometry: buildShowerControlGeometry,
  geometryKey: showerControlGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: showerControlFloorplan,
  floorplanMoveTarget: showerControlFloorplanMove,
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
    label: 'Shower control',
    description: 'Concealed and exposed mixers, diverter trims and flow controls.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 230,
  },
  toolHints: [
    { key: 'Left click', label: 'Place shower control on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description:
      'Wall-mounted visible shower controls with stable valve, water outlet and optional hose connections.',
  },
}
