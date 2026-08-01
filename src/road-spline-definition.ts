import type { NodeDefinition } from '@pascal-app/core'
import { RoadSplineNode } from './schema'
import { buildRoadSplineFloorplan } from './road-spline-floorplan'
import { roadSplineParametrics } from './road-spline-parametrics'

type RoadSplineDefinition = NodeDefinition<typeof RoadSplineNode> & Record<string, unknown>

const roadSplineFloorPlacement = {
  footprint: (node: unknown) => {
    const road = node as RoadSplineNode
    const xs = road.points.map(([x]) => x)
    const zs = road.points.map(([, z]) => z)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minZ = Math.min(...zs)
    const maxZ = Math.max(...zs)
    return {
      dimensions: [maxX - minX + road.width, road.thickness, maxZ - minZ + road.width] as [
        number,
        number,
        number,
      ],
      rotation: road.rotation,
    }
  },
  collides: false,
}

export const roadSplineDefinition: RoadSplineDefinition = {
  kind: 'environment:road-spline',
  schemaVersion: 4,
  schema: RoadSplineNode,
  category: 'furnish',
  snapProfile: 'item',

  migrate: {
    1: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      return {
        ...previous,
        laneCount: previous.laneCount ?? 2,
        centerLineStyle: previous.centerLineStyle ?? 'double',
        edgeLines: previous.edgeLines ?? true,
        centerLineColor: previous.centerLineColor ?? '#e6c84f',
        laneLineColor: previous.laneLineColor ?? '#e8e5d7',
        textureScale: previous.textureScale ?? 4,
        pathMode: previous.pathMode ?? 'spline',
        junctions: previous.junctions ?? [],
      }
    },
    2: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      return { ...previous, pathMode: previous.pathMode ?? 'spline' }
    },
    3: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      return { ...previous, junctions: previous.junctions ?? [] }
    },
  },

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    pathMode: 'spline',
    junctions: [],
    points: [
      [0, 0],
      [12, 0],
    ],
    width: 7,
    laneCount: 2,
    centerLineStyle: 'double',
    edgeLines: true,
    thickness: 0.12,
    surfaceColor: '#35383d',
    centerLineColor: '#e6c84f',
    laneLineColor: '#e8e5d7',
    textureScale: 4,
  }),

  capabilities: {
    movable: { axes: ['x', 'z'], gridSnap: true },
    rotatable: {
      axes: ['y'],
      snapAngles: Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4),
    },
    selectable: { hitVolume: 'bbox' },
    duplicable: true,
    deletable: true,
    groupable: true,
    snappable: {},
    floorPlaced: roadSplineFloorPlacement,
  },

  parametrics: roadSplineParametrics,
  floorplan: buildRoadSplineFloorplan,
  renderer: { kind: 'parametric', module: () => import('./road-spline-renderer') },
  preview: () => import('./road-spline-preview'),
  tool: () => import('./road-spline-tool'),
  toolHints: [
    { key: 'Left click', label: 'Add road point' },
    { key: 'Double click', label: 'Finish road' },
    { key: 'Enter', label: 'Finish road' },
    { key: 'Backspace', label: 'Remove last point' },
    { key: 'Esc', label: 'Cancel' },
  ],

  presentation: {
    label: 'Road Spline',
    description: 'A procedural road strip drawn as a smooth spline or connected orthogonal segments.',
    icon: { kind: 'iconify', name: 'lucide:route' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A planar road generated from local X/Z control points, supporting smooth splines and straight orthogonal segments with automatic mitered joins.',
  },
}
