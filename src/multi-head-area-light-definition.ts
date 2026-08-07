import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildMultiHeadAreaLightFloorplan } from './multi-head-area-light-floorplan'
import { resolveMultiHeadAreaLightLayout } from './multi-head-area-light-geometry'
import { multiHeadAreaLightParametrics } from './multi-head-area-light-parametrics'
import { MultiHeadAreaLightNode } from './schema'

type MultiHeadAreaLightDefinition = NodeDefinition<typeof MultiHeadAreaLightNode> &
  Record<string, unknown>

const multiHeadAreaLightFloorPlacement = {
  footprint: (node: unknown) => {
    const areaLight = node as MultiHeadAreaLightNode
    const layout = resolveMultiHeadAreaLightLayout(areaLight)
    return {
      dimensions: [
        (layout.fixtureStartX + layout.fixtureLength) * 2,
        layout.height,
        (layout.fixtureStartX + layout.fixtureLength) * 2,
      ] as [number, number, number],
      rotation: areaLight.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<MultiHeadAreaLightNode> = {
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

const heightHandle: HandleDescriptor<MultiHeadAreaLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.3, 0] },
}

const armLengthHandle: HandleDescriptor<MultiHeadAreaLightNode> = {
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

export const multiHeadAreaLightDefinition: MultiHeadAreaLightDefinition = {
  kind: 'environment:multi-head-area-light',
  schemaVersion: 1,
  schema: MultiHeadAreaLightNode,
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
    headCount: 4,
    poleColor: '#363b40',
    lightOn: false,
    lightColor: '#ffd39a',
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
    floorPlaced: multiHeadAreaLightFloorPlacement,
  },

  parametrics: multiHeadAreaLightParametrics,
  floorplan: buildMultiHeadAreaLightFloorplan,
  handles: [heightHandle, armLengthHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./multi-head-area-light-renderer') },
  preview: () => import('./multi-head-area-light-preview'),
  tool: () => import('./multi-head-area-light-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place multi-head area pole' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Triple/four-way area pole',
    description: 'A radial three- or four-head pole for junctions and parking areas.',
    icon: { kind: 'iconify', name: 'lucide:lamp-ceiling' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A three- or four-head radial roadway area pole with adjustable height, arm length, head count, colors, intensity, orientation, and on/off state.',
  },
}
