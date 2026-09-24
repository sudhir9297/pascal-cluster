import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { buildRoadSignFloorplan } from './road-sign-floorplan'
import { resolveRoadSignLayout } from './road-sign-geometry'
import { roadSignParametrics } from './road-sign-parametrics'
import { RoadSignNode } from './schema'

type RoadSignDefinition = NodeDefinition<typeof RoadSignNode> & Record<string, unknown>

const roadSignFloorPlacement = {
  footprint: (node: unknown) => {
    const sign = node as RoadSignNode
    const layout = resolveRoadSignLayout(sign)
    return {
      dimensions: [layout.width, layout.postTopY, layout.plateThickness] as [number, number, number],
      rotation: sign.rotation,
    }
  },
  collides: false,
}

const rotateHandle: HandleDescriptor<RoadSignNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: { position: () => [0.55, 0.65, 0.55], rotationY: () => -Math.PI / 4 },
  decoration: { kind: 'ring', radius: () => 0.5, y: () => 0.65 },
}

const postHeightHandle: HandleDescriptor<RoadSignNode> = {
  kind: 'linear-resize',
  axis: 'y',
  anchor: 'min',
  min: 1.2,
  currentValue: (node) => node.postHeight,
  apply: (_initial, postHeight) => ({ postHeight: Math.max(1.2, Math.min(4.5, postHeight)) }),
  placement: {
    position: (node) => {
      const layout = resolveRoadSignLayout(node)
      return [0, layout.postTopY + 0.2, 0]
    },
  },
}

const scaleHandle: HandleDescriptor<RoadSignNode> = {
  kind: 'linear-resize',
  axis: 'x',
  anchor: 'center',
  min: 0.5,
  currentValue: (node) => node.scale,
  apply: (_initial, scale) => ({ scale: Math.max(0.5, Math.min(2.5, scale)) }),
  placement: {
    position: (node) => {
      const layout = resolveRoadSignLayout(node)
      return [layout.width / 2 + 0.2, layout.signCenterY, 0]
    },
  },
}

export const roadSignDefinition: RoadSignDefinition = {
  kind: 'streetscape:road-sign',
  schemaVersion: 1,
  schema: RoadSignNode,
  category: 'furnish',
  snapProfile: 'item',

  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    signId: 'stop',
    postHeight: 2.1,
    scale: 1,
    mounting: 'single-post',
    text: '',
    postColor: '#687177',
    backColor: '#747d83',
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
    floorPlaced: roadSignFloorPlacement,
  },

  parametrics: roadSignParametrics,
  floorplan: buildRoadSignFloorplan,
  handles: [postHeightHandle, scaleHandle, rotateHandle],
  renderer: { kind: 'parametric', module: () => import('./road-sign-renderer') },
  preview: () => import('./road-sign-preview'),
  tool: () => import('./road-sign-tool'),
  toolHints: [
    { key: 'Left click', label: 'Place road sign' },
    { key: 'R', label: 'Rotate 45°' },
    { key: 'Esc', label: 'Stop' },
  ],

  presentation: {
    label: 'Road sign',
    description: 'A reusable catalog-driven roadside sign with a procedural post and vector face graphic.',
    icon: { kind: 'iconify', name: 'lucide:signpost' },
    paletteSection: 'furnish',
    hidden: true,
  },

  mcp: {
    description:
      'A catalog-driven road sign with selectable sign type, scale, post height, single or double mounting, editable display text, colors, orientation, preview, and floorplan support.',
  },
}
