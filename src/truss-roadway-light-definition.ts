import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildTrussRoadwayLightFloorplan } from './truss-roadway-light-floorplan'
import { resolveTrussRoadwayLightLayout } from './truss-roadway-light-geometry'
import { trussRoadwayLightParametrics } from './truss-roadway-light-parametrics'
import { TrussRoadwayLightNode } from './schema'

type TrussRoadwayLightDefinition = NodeDefinition<typeof TrussRoadwayLightNode> &
  Record<string, unknown>

const trussRoadwayLightFloorPlacement = {
  footprint: (node: unknown) => {
    const trussLight = node as TrussRoadwayLightNode
    const layout = resolveTrussRoadwayLightLayout(trussLight)
    return {
      dimensions: [
        layout.fixtureStartX + layout.fixtureLength,
        layout.height,
        layout.fixtureWidth,
      ] as [number, number, number],
      rotation: trussLight.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<TrussRoadwayLightNode> = {
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
  decoration: { kind: 'ring', radius: () => 0.62, y: () => 0.25 },
}

const heightHandle: HandleDescriptor<TrussRoadwayLightNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 0.5,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(0.5, Math.min(30, height)) }),
  placement: { position: (node) => [0, node.height + 0.25, 0] },
}

const armLengthHandle: HandleDescriptor<TrussRoadwayLightNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'min',
  min: 0.8,
  currentValue: (node) => node.armLength,
  apply: (_initial, armLength) => ({
    armLength: Math.max(0.8, Math.min(3.5, armLength)),
  }),
  placement: { position: (node) => [node.armLength + 0.7, node.height - 0.42, 0] },
}

export const trussRoadwayLightDefinition: TrussRoadwayLightDefinition = {
  kind: 'environment:truss-roadway-light',
  schemaVersion: 1,
  schema: TrussRoadwayLightNode,
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
    armLength: 2,
    braceDepth: 0.75,
    poleColor: '#596166',
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
    floorPlaced: trussRoadwayLightFloorPlacement,
  },

  parametrics: trussRoadwayLightParametrics,
  floorplan: buildTrussRoadwayLightFloorplan,
  handles: [heightHandle, armLengthHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./truss-roadway-light-renderer') },
  preview: () => import('./truss-roadway-light-preview'),
  tool: () => import('./truss-roadway-light-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place truss roadway light' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Truss Roadway Light',
    description: 'A fitted pipe-truss roadway pole with a full-cutoff LED luminaire.',
    icon: { kind: 'iconify', name: 'lucide:construction' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A fitted pipe-truss roadway light with separate pole brackets, rising upper arm, diagonal lower chord, vertical web, full-cutoff LED optics, and adjustable dimensions, finish, intensity, orientation, and on/off state.',
  },
}
