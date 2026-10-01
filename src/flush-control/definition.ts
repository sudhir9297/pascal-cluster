import type { NodeDefinition } from '@pascal-app/core'
import {
  WallFlushPlateNode,
  CisternFlushControlNode,
  WALL_FLUSH_PLATE,
  CISTERN_FLUSH_CONTROL,
} from './schema'
import { buildFlushControlGeometry, flushControlGeometryKey } from './geometry'
import { flushControlFloorplan, flushPlateFloorplanMove } from './floorplan'
import { createSlotPaint } from '../freestanding-vanity/paint'
const labels = {
  seams: 'Button reveals and backing',
  plate: 'Flush plate / button surround',
  buttons: 'Flush buttons and chain',
  sensor: 'Sensor window',
}
const isSlot = (value: unknown): value is keyof typeof labels =>
  typeof value === 'string' && Object.hasOwn(labels, value)
const common = {
  schemaVersion: 1,
  category: 'furnish',
  snapProfile: 'item',
  geometry: buildFlushControlGeometry,
  geometryKey: flushControlGeometryKey,
  drafting: { surfaceQuery: true },
  parametrics: {
    groups: [] as never[],
    customPanel: () => import('./inspector'),
  },
  floorplan: flushControlFloorplan,
  system: { module: () => import('./system'), priority: 3 },
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    paint: createSlotPaint(isSlot, 0.2),
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({
        slotId,
        label,
        default: slotId === 'seams' || slotId === 'sensor' ? '#252a30' : '#bbc3cb',
      })),
  },
} as const
export const wallFlushPlateDefinition: NodeDefinition<
  typeof WallFlushPlateNode
> = {
  ...common,
  kind: WALL_FLUSH_PLATE,
  schema: WallFlushPlateNode,
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = WallFlushPlateNode.parse({ name: 'Wall flush plate' })
    return rest
  },
  capabilities: {
    ...common.capabilities,
    movable: { axes: ['x', 'y'], gridSnap: true, directDrag: true },
    duplicable: { subtree: 'with-children' },
    wallOpeningPlacement: true,
    hostRefFields: ['wallId'],
  },
  floorplanMoveTarget: flushPlateFloorplanMove,
  tool: () => import('./tool'),
  affordanceTools: { move: () => import('./tool') },
  presentation: {
    label: 'Wall flush plate',
    description:
      'Separate wall-mounted flush control with configurable plate and button shapes.',
    icon: { kind: 'iconify', name: 'lucide:rectangle-horizontal' },
    paletteSection: 'furnish',
    paletteOrder: 221,
  },
  toolHints: [
    { key: 'Left click', label: 'Place flush plate on wall' },
    { key: 'Esc', label: 'Exit placement' },
  ],
}
export const cisternFlushControlDefinition: NodeDefinition<
  typeof CisternFlushControlNode
> = {
  ...common,
  kind: CISTERN_FLUSH_CONTROL,
  schema: CisternFlushControlNode,
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...rest
    } = CisternFlushControlNode.parse({ name: 'Cistern flush control' })
    return rest
  },
  presentation: {
    label: 'Cistern flush control',
    description: 'Separate tank-top, tank-face or pull-chain flushing control.',
    icon: { kind: 'iconify', name: 'lucide:circle-dot' },
    paletteSection: 'furnish',
    paletteOrder: 222,
  },
}
