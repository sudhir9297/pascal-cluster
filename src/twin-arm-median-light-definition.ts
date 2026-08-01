import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildTwinArmMedianLightFloorplan } from './twin-arm-median-light-floorplan'
import { resolveTwinArmMedianLightLayout } from './twin-arm-median-light-geometry'
import { twinArmMedianLightParametrics } from './twin-arm-median-light-parametrics'
import { TwinArmMedianLightNode } from './schema'

type TwinArmMedianLightDefinition = NodeDefinition<typeof TwinArmMedianLightNode> &
  Record<string, unknown>

const twinArmMedianLightFloorPlacement = {
  footprint: (node: unknown) => {
    const twinArm = node as TwinArmMedianLightNode
    const layout = resolveTwinArmMedianLightLayout(twinArm)
    return {
      dimensions: [
        (layout.fixtureStartX + layout.fixtureLength) * 2,
        layout.height,
        layout.fixtureWidth,
      ] as [number, number, number],
      rotation: twinArm.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<TwinArmMedianLightNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: {
    position: () => [0.45, 0.25, 0.45],
    rotationY: () => -Math.PI / 4,
  },
  decoration: { kind: 'ring', radius: () => 0.66, y: () => 0.25 },
}

const heightHandle: HandleDescriptor<TwinArmMedianLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.3, 0] },
}

const armLengthHandle: HandleDescriptor<TwinArmMedianLightNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.armLength,
  apply: (_initial, armLength) => ({
    armLength: Math.max(0.5, Math.min(3, armLength)),
  }),
  placement: { position: (node) => [node.armLength + 0.7, node.height - 0.42, 0] },
}

export const twinArmMedianLightDefinition: TwinArmMedianLightDefinition = {
  kind: 'environment:twin-arm-median-light',
  schemaVersion: 1,
  schema: TwinArmMedianLightNode,
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
    armLength: 1.35,
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
    floorPlaced: twinArmMedianLightFloorPlacement,
  },

  parametrics: twinArmMedianLightParametrics,
  floorplan: buildTwinArmMedianLightFloorplan,
  handles: [heightHandle, armLengthHandle, rotateHandle],
  renderer: {
    kind: 'parametric',
    module: () => import('./twin-arm-median-light-renderer'),
  },
  preview: () => import('./twin-arm-median-light-preview'),
  tool: () => import('./twin-arm-median-light-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place twin-arm median light' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Twin-arm median',
    description: 'Opposing cobra-head fixtures for divided roads and medians.',
    icon: { kind: 'iconify', name: 'lucide:git-branch' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A twin-arm median roadway light with opposing cobra-head fixtures and adjustable height, arm length, colors, intensity, orientation, and on/off state.',
  },
}
