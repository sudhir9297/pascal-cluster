import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { StreetLightNode } from './schema'
import { buildStreetLightFloorplan } from './street-light-floorplan'
import { streetLightParametrics } from './street-light-parametrics'

type StreetLightDefinition = NodeDefinition<typeof StreetLightNode> & Record<string, unknown>

const BASE_RADIUS = 0.25

const streetLightFloorPlacement = {
  footprint: (node: unknown) => {
    const streetLight = node as StreetLightNode
    return {
      dimensions: [BASE_RADIUS * 2, streetLight.height, BASE_RADIUS * 2] as [
        number,
        number,
        number,
      ],
      rotation: streetLight.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<StreetLightNode> = {
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

const heightHandle: HandleDescriptor<StreetLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.25, 0] },
}

const armHandle: HandleDescriptor<StreetLightNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: 0.3,
  currentValue: (node) => node.armLength,
  apply: (_initial, armLength) => ({ armLength: Math.max(0.3, Math.min(3, armLength)) }),
  placement: { position: (node) => [node.armLength + 0.25, node.height, 0] },
}

export const streetLightDefinition: StreetLightDefinition = {
  kind: 'environment:street-light',
  schemaVersion: 1,
  schema: StreetLightNode,
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
    armLength: 1.2,
    poleColor: '#48535b',
    lightOn: false,
    lightColor: '#ffd9a3',
    intensity: 1200,
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
    floorPlaced: streetLightFloorPlacement,
  },

  parametrics: streetLightParametrics,
  floorplan: buildStreetLightFloorplan,
  handles: [heightHandle, armHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./street-light-renderer') },
  preview: () => import('./street-light-preview'),
  tool: () => import('./street-light-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place roadway light' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Roadway Light',
    description: 'A swept-arm roadway pole with a low-profile full-cutoff LED luminaire.',
    icon: { kind: 'iconify', name: 'lucide:lightbulb' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A swept-arm roadway light with an integrated spigot, die-cast service housing, multi-cell full-cutoff optic, adjustable finish, intensity, orientation, and on/off state.',
  },
}
