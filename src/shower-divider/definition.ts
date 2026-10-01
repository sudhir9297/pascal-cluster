import type { NodeDefinition } from '@pascal-app/core'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { buildShowerDividerGeometry } from './geometry'
import { SHOWER_DIVIDER, ShowerDividerNode } from './schema'

export const showerDividerDefinition: NodeDefinition<typeof ShowerDividerNode> = {
  kind: SHOWER_DIVIDER,
  schemaVersion: 1,
  schema: ShowerDividerNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const { id, type, ...rest } = ShowerDividerNode.parse({
      name: 'Shower divider',
    })
    return rest
  },
  geometry: buildShowerDividerGeometry,
  geometryKey: (n) =>
    JSON.stringify([
      n.width,
      n.height,
      n.columns,
      n.rows,
      n.frameWidth,
      n.frameDepth,
      n.barWidth,
      n.glassThickness,
      n.slots,
    ]),
  capabilities: {
    hostRefFields: ['supportSlabId'],
    floorPlaced: {
      footprint: (raw) => {
        const node = ShowerDividerNode.parse(raw)
        return {
          dimensions: [node.width, node.height, Math.max(node.frameDepth, node.glassThickness)],
          rotation: [0, node.rotation, 0],
        }
      },
    },
    selectable: { hitVolume: 'bbox' },
    movable: { axes: ['x', 'z'], gridSnap: true, directDrag: true },
    rotatable: { axes: ['y'], snapAngles: [Math.PI / 4] },
    duplicable: true,
    deletable: true,
    paint: createSlotPaint((slot): slot is string => slot === 'frame' || slot === 'glass', 0.25),
    slots: () => [
      { slotId: 'frame', label: 'Divider frame', default: '#ffffff' },
      { slotId: 'glass', label: 'Divider glass', default: '#d9f3fa' },
    ],
  },
  handles: () => [
    {
      kind: 'linear-resize',
      axis: 'x',
      anchor: 'center',
      min: () => 0.2,
      max: () => 8,
      currentValue: (n) => n.width,
      apply: (_n, value) => ({ width: Math.round(value * 1000) / 1000 }),
      placement: { position: (n) => [n.width / 2 + 0.18, n.height / 2, 0] },
    },
    {
      kind: 'linear-resize',
      axis: 'y',
      anchor: 'min',
      min: () => 0.5,
      max: () => 3,
      currentValue: (n) => n.height,
      apply: (_n, value) => ({ height: Math.round(value * 1000) / 1000 }),
      placement: { position: (n) => [0, n.height + 0.2, 0] },
    },
  ],
  tool: () => import('./tool'),
  extensions: {
    'pascal:editor/floorplan': { tool: () => import('./floorplan-tool') },
  },
  parametrics: { groups: [], customPanel: () => import('./inspector') },
  floorplan: (n, ctx) => {
    const c = Math.cos(n.rotation),
      s = Math.sin(n.rotation),
      d = Math.max(n.frameDepth, n.glassThickness) / 2
    return {
      kind: 'polygon',
      fill: '#d9f3fa',
      stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
      strokeWidth: 0.012,
      cursor: 'move',
      points: [
        [-n.width / 2, -d],
        [n.width / 2, -d],
        [n.width / 2, d],
        [-n.width / 2, d],
      ].map(
        ([x, z]) =>
          [n.position[0] + x! * c + z! * s, n.position[2] - x! * s + z! * c] as [number, number],
      ),
    }
  },
  presentation: {
    label: 'Shower divider',
    description: 'Draw framed glass shower partitions with adjustable rows and columns.',
    icon: { kind: 'iconify', name: 'lucide:panels-top-left' },
    paletteSection: 'furnish',
  },
  toolHints: [
    { key: 'Left click', label: 'Start / add divider segment' },
    { key: 'R', label: 'Line / rectangle' },
    { key: 'Enter', label: 'Finish chain' },
    { key: 'Alt', label: 'Bypass snapping' },
    { key: 'Esc', label: 'Cancel draft / exit' },
  ],
}
