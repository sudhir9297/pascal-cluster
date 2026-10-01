import { type AnyNode, type AnyNodeId, type NodeDefinition } from '@pascal-app/core'
import { ShowerAssemblyNode, SHOWER_ASSEMBLY } from './schema'
import { buildShowerAssemblyGeometry, showerAssemblyGeometryKey } from './geometry'
import { showerAssemblyFloorplan, showerAssemblyFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = {
  body: 'Panel body',
  pipe: 'Riser and arm',
  brackets: 'Wall brackets',
  holder: 'Handset holder',
  controls: 'Controls',
  markings: 'Control markings',
  jets: 'Body sprays',
  nozzles: 'Nozzles',
  connector: 'Hose connector',
  spout: 'Bath spout',
  outlet: 'Spout rim',
  diverter: 'Spout diverter',
  shelf: 'Shelf',
  waterfall: 'Waterfall',
  aerator: 'Outlet aerator',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const showerAssemblyDefinition: NodeDefinition<typeof ShowerAssemblyNode> = {
  kind: SHOWER_ASSEMBLY,
  schemaVersion: 1,
  schema: ShowerAssemblyNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = ShowerAssemblyNode.parse({ name: 'Shower column or panel' })
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
    slots: (node) =>
      Object.entries(labels).map(([slotId, label]) => ({
        slotId,
        label,
        default:
          slotId === 'body' && ShowerAssemblyNode.parse(node).family === 'panel'
            ? '#42464d'
            : ['nozzles', 'markings', 'aerator'].includes(slotId)
              ? '#60666e'
              : '#ffffff',
      })),
  },
  geometry: buildShowerAssemblyGeometry,
  geometryKey: showerAssemblyGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  system: { module: () => import('./system'), priority: 2 },
  floorplan: showerAssemblyFloorplan,
  floorplanMoveTarget: showerAssemblyFloorplanMove,
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
    label: 'Shower column or panel',
    description: 'Wall shower columns and panels with replaceable heads, handsets and hoses.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 230,
  },
  toolHints: [
    { key: 'Left click', label: 'Place shower assembly on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  mcp: {
    description:
      'Wall-mounted shower column or panel with stable replaceable head, handset and hose targets.',
  },
}
