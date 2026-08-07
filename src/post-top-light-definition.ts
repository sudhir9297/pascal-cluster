import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildPostTopLightFloorplan } from './post-top-light-floorplan'
import { resolvePostTopLightLayout } from './post-top-light-geometry'
import { postTopLightParametrics } from './post-top-light-parametrics'
import { PedestrianPostLightNode } from './schema'

type PostTopLightDefinition = NodeDefinition<typeof PedestrianPostLightNode> &
  Record<string, unknown>

const postTopLightFloorPlacement = {
  footprint: (node: unknown) => {
    const postTopLight = node as PedestrianPostLightNode
    const layout = resolvePostTopLightLayout(postTopLight)
    return {
      dimensions: [layout.headRadius * 2, layout.height, layout.headRadius * 2] as [
        number,
        number,
        number,
      ],
      rotation: postTopLight.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<PedestrianPostLightNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: {
    position: () => [0.4, 0.24, 0.4],
    rotationY: () => -Math.PI / 4,
  },
  decoration: { kind: 'ring', radius: () => 0.56, y: () => 0.24 },
}

const heightHandle: HandleDescriptor<PedestrianPostLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.24, 0] },
}

export const postTopLightDefinition: PostTopLightDefinition = {
  kind: 'environment:pedestrian-post-light',
  schemaVersion: 1,
  schema: PedestrianPostLightNode,
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
    poleColor: '#30343b',
    lightOn: false,
    lightColor: '#ffd9a3',
    intensity: 650,
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
    floorPlaced: postTopLightFloorPlacement,
  },

  parametrics: postTopLightParametrics,
  floorplan: buildPostTopLightFloorplan,
  handles: [heightHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./post-top-light-renderer') },
  preview: () => import('./post-top-light-preview'),
  tool: () => import('./post-top-light-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place pedestrian post-top light' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Pedestrian Post-top',
    description: 'A modern pedestrian-scale post-top lamp with symmetric downward light.',
    icon: { kind: 'iconify', name: 'lucide:lamp-ceiling' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A modern pedestrian-scale post-top lamp with adjustable height, pole color, lamp color, intensity, position, and on/off state.',
  },
}
