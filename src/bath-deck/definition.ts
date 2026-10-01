import { clearBasinServiceLinks } from '../attachments/lifecycle'
import type { NodeDefinition } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { BATH_DECK, BathDeckNode } from './schema'
import { buildBathDeckGeometry } from './geometry'
import { bathDeckWallSnap } from './wall-snap'
const labels = { deck: 'Deck surface', enclosure: 'Deck enclosure' }
export const bathDeckDefinition: NodeDefinition<typeof BathDeckNode> = {
  kind: BATH_DECK,
  schemaVersion: 1,
  schema: BathDeckNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const { id, type, ...rest } = BathDeckNode.parse({ name: 'Bath Deck' })
    return rest
  },
  geometry: buildBathDeckGeometry,
  geometryKey: (node) => JSON.stringify(node),
  system: { module: () => import('./system'), priority: 2 },
  capabilities: {
    hostRefFields: ['supportSlabId'],
    floorPlaced: {
      footprint: (raw) => {
        const node = BathDeckNode.parse(raw)
        return {
          dimensions: [node.length, node.height, node.width],
          rotation: [0, node.rotation, 0],
        }
      },
    },
    selectable: { hitVolume: 'bbox' },
    movable: {
      axes: ['x', 'z'],
      gridSnap: true,
      directDrag: true,
      groupMoveSnapPose: bathDeckWallSnap,
    },
    rotatable: { axes: ['y'], snapAngles: [Math.PI / 4] },
    duplicable: { subtree: 'with-children' },
    deletable: true,
    paint: createSlotPaint(
      (slot): slot is keyof typeof labels =>
        typeof slot === 'string' && Object.hasOwn(labels, slot),
      0.35,
    ),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: '#e8e3d9' })),
  },
  parametrics: {
    onDelete: (node, nodes) => node.children.flatMap((id) => clearBasinServiceLinks({ id }, nodes)),
    groups: [],
    customPanel: () => import('./inspector'),
  },
  floorplan: (node, ctx) => ({
    kind: 'polygon',
    fill: '#e8e3d9',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.015,
    points: [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([sx, sz]) => {
      const x = (sx! * node.length) / 2,
        z = (sz! * node.width) / 2,
        c = Math.cos(node.rotation),
        s = Math.sin(node.rotation)
      return [node.position[0] + x * c + z * s, node.position[2] - x * s + z * c] as [
        number,
        number,
      ]
    }),
  }),
  presentation: {
    label: 'Bath Deck',
    description: 'Separate bath surround with derived opening and enclosure.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 221,
  },
}
