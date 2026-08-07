import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { UtilityPoleNode } from './schema'
import { buildUtilityPoleFloorplan } from './utility-pole-floorplan'
import { utilityPoleParametrics } from './utility-pole-parametrics'
import {
  STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
} from './utility-pole-geometry'

type UtilityPoleDefinition = NodeDefinition<typeof UtilityPoleNode> & {
  migrate: Record<number, (old: unknown) => unknown>
} &
  Record<string, unknown>

const utilityPoleFloorPlacement = {
  footprint: (node: unknown) => {
    const utilityPole = node as UtilityPoleNode
    return {
      dimensions: [utilityPole.crossarmLength, utilityPole.height, 1.2] as [
        number,
        number,
        number,
      ],
      rotation: utilityPole.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<UtilityPoleNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: {
    position: () => [0.48, 0.3, 0.48],
    rotationY: () => -Math.PI / 4,
  },
  decoration: { kind: 'ring', radius: () => 0.68, y: () => 0.3 },
}

const heightHandle: HandleDescriptor<UtilityPoleNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 7.62,
  currentValue: (node) => node.height,
  apply: (_initial, height) => ({ height: Math.max(7.62, Math.min(15.85, height)) }),
  placement: { position: (node) => [0, node.height + 0.6, 0] },
}

const crossarmHandle: HandleDescriptor<UtilityPoleNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'center',
  min: STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  currentValue: (node) => node.crossarmLength,
  apply: (_initial, crossarmLength) => ({
    crossarmLength: Math.max(
      STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
      Math.min(3.66, crossarmLength),
    ),
  }),
  placement: {
    position: (node) => [node.crossarmLength / 2 + 0.25, node.height - 0.48, 0],
  },
}

export const utilityPoleDefinition: UtilityPoleDefinition = {
  kind: 'environment:utility-pole',
  schemaVersion: 3,
  schema: UtilityPoleNode,
  category: 'furnish',
  snapProfile: 'item',

  migrate: {
    1: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      const previousHeight = previous.height
      // Migrate only untouched v1 defaults (40 ft nominal / 34 ft exposed).
      // Explicitly resized poles keep the user's chosen height.
      return typeof previousHeight === 'number' && Math.abs(previousHeight - 10.3632) < 0.01
        ? { ...previous, height: STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M }
        : old
    },
    2: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      return 'assembly' in old ? old : { ...old, assembly: 'tangent' }
    },
  },

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    height: STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
    crossarmLength: STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
    assembly: 'tangent',
    woodColor: '#765033',
    transformerMounted: true,
    transformerColor: '#66716d',
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
    floorPlaced: utilityPoleFloorPlacement,
  },

  parametrics: utilityPoleParametrics,
  floorplan: buildUtilityPoleFloorplan,
  handles: [heightHandle, crossarmHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./utility-pole-renderer') },
  preview: () => import('./utility-pole-preview'),
  tool: () => import('./utility-pole-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place utility pole' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Utility Pole',
    description: 'A configurable wood three-phase distribution pole with tangent, angle, junction, and dead-end assemblies.',
    icon: { kind: 'iconify', name: 'lucide:utility-pole' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A configurable wood three-phase distribution pole with tangent, small-angle, junction, or dead-end assembly roles, primary and neutral crossarms, pin insulators, braces, optional guying, and optional pole-mounted transformer.',
  },
}
