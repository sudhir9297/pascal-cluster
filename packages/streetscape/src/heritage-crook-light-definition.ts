import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildHeritageCrookLightFloorplan } from './heritage-crook-light-floorplan'
import { resolveHeritageCrookLightLayout } from './heritage-crook-light-geometry'
import { heritageCrookLightParametrics } from './heritage-crook-light-parametrics'
import { HeritageCrookLightNode } from './schema'

type HeritageCrookLightDefinition = NodeDefinition<typeof HeritageCrookLightNode> &
  Record<string, unknown>

const heritageCrookLightFloorPlacement = {
  footprint: (node: unknown) => {
    const crookLight = node as HeritageCrookLightNode
    const layout = resolveHeritageCrookLightLayout(crookLight)
    return {
      dimensions: [
        layout.armReach + layout.lensRadius * 2,
        layout.height,
        layout.baseRadius * 2,
      ] as [number, number, number],
      rotation: crookLight.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<HeritageCrookLightNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: {
    position: () => [0.43, 0.25, 0.43],
    rotationY: () => -Math.PI / 4,
  },
  decoration: { kind: 'ring', radius: () => 0.62, y: () => 0.25 },
}

const heightHandle: HandleDescriptor<HeritageCrookLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.25, 0] },
}

const armReachHandle: HandleDescriptor<HeritageCrookLightNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.armReach,
  apply: (_initial, armReach) => ({
    armReach: Math.max(0.5, Math.min(1.5, armReach)),
  }),
  placement: {
    position: (node) => [node.armReach + 0.22, node.height - 0.48, 0],
  },
}

export const heritageCrookLightDefinition: HeritageCrookLightDefinition = {
  kind: 'streetscape:heritage-crook-light',
  schemaVersion: 1,
  schema: HeritageCrookLightNode,
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
    armReach: 0.9,
    poleColor: '#24272b',
    lightOn: false,
    lightColor: '#ffd5a0',
    intensity: 750,
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
    floorPlaced: heritageCrookLightFloorPlacement,
  },

  parametrics: heritageCrookLightParametrics,
  floorplan: buildHeritageCrookLightFloorplan,
  handles: [heightHandle, armReachHandle, rotateHandle],
  renderer: {
    kind: 'parametric',
    module: () => import('./heritage-crook-light-renderer'),
  },
  preview: () => import('./heritage-crook-light-preview'),
  tool: () => import('./heritage-crook-light-tool'),
  toolHints: [
    { key: 'Left click', label: "Place Bishop's Crook light" },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: "Bishop's Crook",
    description: 'A heritage curved pole with a pendant teardrop lamp.',
    icon: { kind: 'iconify', name: 'lucide:lamp-wall-up' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      "A heritage Bishop's Crook street lamp with adjustable height, arm reach, pole color, lamp color, intensity, orientation, and on/off state.",
  },
}
