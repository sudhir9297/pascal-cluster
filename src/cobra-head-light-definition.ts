import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildCobraHeadLightFloorplan } from './cobra-head-light-floorplan'
import { resolveCobraHeadLightLayout } from './cobra-head-light-geometry'
import { cobraHeadLightParametrics } from './cobra-head-light-parametrics'
import { CobraHeadLightNode } from './schema'

type CobraHeadLightDefinition = NodeDefinition<typeof CobraHeadLightNode> &
  Record<string, unknown>

const cobraHeadLightFloorPlacement = {
  footprint: (node: unknown) => {
    const cobraHead = node as CobraHeadLightNode
    const layout = resolveCobraHeadLightLayout(cobraHead)
    return {
      dimensions: [
        layout.fixtureStartX + layout.fixtureLength,
        layout.height,
        layout.fixtureWidth,
      ] as [number, number, number],
      rotation: cobraHead.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<CobraHeadLightNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: {
    position: () => [0.42, 0.25, 0.42],
    rotationY: () => -Math.PI / 4,
  },
  decoration: { kind: 'ring', radius: () => 0.6, y: () => 0.25 },
}

const heightHandle: HandleDescriptor<CobraHeadLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.25, 0] },
}

const armLengthHandle: HandleDescriptor<CobraHeadLightNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.armLength,
  apply: (_initial, armLength) => ({
    armLength: Math.max(0.5, Math.min(3, armLength)),
  }),
  placement: { position: (node) => [node.armLength + 0.6, node.height - 0.42, 0] },
}

export const cobraHeadLightDefinition: CobraHeadLightDefinition = {
  kind: 'streetscape:cobra-head-light',
  schemaVersion: 1,
  schema: CobraHeadLightNode,
  category: 'furnish',
  snapProfile: 'item',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    height: 6,
    armLength: 1.25,
    poleColor: '#363b40',
    lightOn: false,
    lightColor: '#ffd39a',
    intensity: 1400,
  }),

  capabilities: {
    movable: { axes: ['x', 'z'], gridSnap: true },
    rotatable: {
      axes: ['y'],
      snapAngles: Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4),
    },
    selectable: { hitVolume: 'bbox' },
    duplicable: true,
    deletable: true,
    groupable: true,
    snappable: {},
    floorPlaced: cobraHeadLightFloorPlacement,
  },

  parametrics: cobraHeadLightParametrics,
  floorplan: buildCobraHeadLightFloorplan,
  handles: [heightHandle, armLengthHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./cobra-head-light-renderer') },
  preview: () => import('./cobra-head-light-preview'),
  tool: () => import('./cobra-head-light-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place cobra-head roadway light' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Cobra-head',
    description: 'A classic roadway light with a swept mast arm and prismatic cobra-head optic.',
    icon: { kind: 'iconify', name: 'lucide:lightbulb' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A classic swept-arm cobra-head roadway light with a die-cast housing, prismatic optic, and adjustable height, arm length, finish, lamp color, intensity, orientation, and on/off state.',
  },
}
