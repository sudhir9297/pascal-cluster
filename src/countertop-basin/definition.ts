import { clearBasinServiceLinks } from '../attachments/lifecycle'
import type { AnyNode, AnyNodeId, NodeDefinition, ParamField, ParamGroup } from '@pascal-app/core'
import { CountertopBasinNode, type BasinNode, COUNTERTOP_BASIN } from './schema'
import { basinGeometryKey, buildCountertopBasinGeometry } from './geometry'
import { basinParentFrame } from './attachment'
import { basinFloorplan, basinFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
import { basinHandles } from './handles'

const labels = { bowl: 'Basin bowl', drain: 'Drain cover' }
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
export const basinParameterGroups: { label: string; fields: ParamField<BasinNode>[] }[] = [
  {
    label: 'Bowl',
    fields: [
      { key: 'shape', label: 'Shape', kind: 'enum', options: ['round', 'oval', 'rectangle'] },
      {
        key: 'width',
        label: 'Width / diameter',
        kind: 'number',
        min: 0.3,
        max: 0.8,
        step: 0.01,
        unit: 'm',
      },
      {
        key: 'depth',
        label: 'Depth',
        kind: 'number',
        min: 0.3,
        max: 0.55,
        step: 0.01,
        unit: 'm',
        visibleIf: (node) => node.shape !== 'round',
      },
      {
        key: 'height',
        label: 'Bowl height',
        kind: 'number',
        min: 0.08,
        max: 0.22,
        step: 0.005,
        unit: 'm',
      },
      {
        key: 'wallThickness',
        label: 'Wall thickness',
        kind: 'number',
        min: 0.006,
        max: 0.025,
        step: 0.001,
        unit: 'm',
      },
      { key: 'taper', label: 'Base taper', kind: 'number', min: 0, max: 0.4, step: 0.02 },
    ],
  },
  {
    label: 'Drain',
    fields: [
      {
        key: 'drainDiameter',
        label: 'Drain diameter',
        kind: 'number',
        min: 0.035,
        max: 0.05,
        step: 0.001,
        unit: 'm',
      },
      { key: 'drainCover', label: 'Drain cover', kind: 'boolean' },
    ],
  },
]
export const countertopBasinDefinition: NodeDefinition<typeof CountertopBasinNode> = {
  kind: COUNTERTOP_BASIN,
  schemaVersion: 1,
  schema: CountertopBasinNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = CountertopBasinNode.parse({ name: 'Countertop Basin' })
    return rest
  },
  capabilities: {
    hostRefFields: ['supportSlabId'],
    floorPlaced: {
      footprint: (raw) => {
        const node = raw as unknown as BasinNode
        return {
          dimensions: [node.width, node.height, node.shape === 'round' ? node.width : node.depth],
          rotation: [0, node.rotation, 0],
        }
      },
    },
    selectable: { hitVolume: 'bbox' },
    movable: {
      axes: ['x', 'y', 'z'],
      gridSnap: true,
      directDrag: true,
      parentFrame: basinParentFrame,
    },
    rotatable: { axes: ['y'], snapAngles: [Math.PI / 4] },
    duplicable: { subtree: 'with-children' },
    deletable: true,
    paint: createSlotPaint(isSlot, 0.25),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' })),
  },
  geometry: buildCountertopBasinGeometry,
  geometryKey: basinGeometryKey,
  handles: basinHandles,
  parametrics: {
    onDelete: clearBasinServiceLinks,
    groups: basinParameterGroups as unknown as ParamGroup<CountertopBasinNode>[],
    customPanel: () => import('./inspector'),
  },
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./move-tool') },
  toolHints: [
    { key: 'Left click', label: 'Place basin' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  floorplan: basinFloorplan,
  floorplanMoveTarget: basinFloorplanMove,
  floorplanDependencies: (node, nodes) => {
    const parent = node.parentId ? nodes[node.parentId as AnyNodeId] : undefined
    return [node.parentId, parent?.parentId].filter((id): id is AnyNodeId => Boolean(id))
  },
  floorplanSiblingOverrides: ({ nodeId, nodes, liveTransforms }) => {
    const result: Record<string, AnyNode> = { ...nodes }
    let id = result[nodeId]?.parentId
    const visited = new Set<string>()
    while (id && result[id] && !visited.has(id)) {
      visited.add(id)
      const current = result[id]!
      const live = liveTransforms.get(id)
      if (live && 'position' in current)
        result[id] = { ...current, position: live.position, rotation: live.rotation } as AnyNode
      id = current.parentId
    }
    return result
  },
  extensions: { 'pascal:editor/floorplan': { directDrag: true } },
  presentation: {
    label: 'Countertop Basin',
    description: 'A hollow vessel basin placed above a countertop.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 213,
  },
  mcp: {
    description:
      'A separate countertop vessel basin with round, oval, or rounded rectangular bowl, adjustable size, thickness, taper, and drain.',
  },
}
