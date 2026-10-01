import { bathFinishLabels as labels, bathPaint } from './finishes'
import { bathDimensionLimits, fitBathToDeck } from '../bath-deck/fit'
import { bathDeckParent, bathDeckFrame, bathLevelNode } from '../bath-deck/attachment'
import { useScene, type AnyNodeId } from '@pascal-app/core'
import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import { clearBasinServiceLinks } from '../attachments/lifecycle'
import { bathFloorplanMove } from './floorplan-move'
import { bathWallSnap } from './wall-snap'
import { BATHTUB, BathtubNode } from './schema'
import { buildBathtubGeometry, bathtubGeometryKey, bathtubOutline } from './geometry'

export function bathHandles(): HandleDescriptor<BathtubNode>[] {
  return [
    ...(['length', 'width', 'height'] as const).map(
      (key, index): HandleDescriptor<BathtubNode> => ({
        kind: 'linear-resize',
        axis: index === 0 ? 'x' : index === 1 ? 'z' : 'y',
        anchor: index === 2 ? 'min' : 'center',
        min: (node) =>
          index === 0 ? 1.2 : index === 1 ? 0.65 : node.shape === 'walk-in' ? 0.85 : 0.45,
        max: (node, api) => bathDimensionLimits(node, bathDeckParent(node, api.nodes()))[key],
        currentValue: (node) => node[key],
        apply: (node, value, api) => {
          const deck = bathDeckParent(node, api.nodes()),
            patch = { [key]: Math.round(value * 1000) / 1000 }
          return deck ? (fitBathToDeck({ ...node, ...patch }, deck) ?? {}) : patch
        },
        placement: {
          position: (node) =>
            index === 0
              ? [node.length / 2 + 0.18, node.height + 0.1, 0]
              : index === 1
                ? [0, node.height + 0.1, node.width / 2 + 0.18]
                : [0, node.height + 0.25, 0],
        },
      }),
    ),
    {
      kind: 'arc-resize',
      axis: 'angular',
      shape: 'rotate',
      apply: (node, delta, api) => {
        const candidate = { ...node, rotation: node.rotation - delta },
          deck = bathDeckParent(node, api.nodes())
        return deck ? (fitBathToDeck(candidate, deck) ?? {}) : { rotation: candidate.rotation }
      },
      placement: {
        position: (node) => [node.length / 2 + 0.22, node.height + 0.1, node.width / 2 + 0.22],
        rotationY: () => -Math.PI / 4,
      },
    },
  ]
}
export const bathtubDefinition: NodeDefinition<typeof BathtubNode> = {
  kind: BATHTUB,
  schemaVersion: 1,
  schema: BathtubNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const { id, type, ...rest } = BathtubNode.parse({
      name: 'Freestanding Bath',
    })
    return rest
  },
  geometry: buildBathtubGeometry,
  geometryKey: bathtubGeometryKey,
  handles: bathHandles,
  keyboardActions: {
    e: {
      appliesTo: (node) => BathtubNode.parse(node).shape === 'walk-in',
      run: (node) =>
        useScene
          .getState()
          .updateNode(
            node.id as AnyNodeId,
            { doorOpening: BathtubNode.parse(node).doorOpening > 0 ? 0 : 1 } as never,
          ),
    },
  },
  capabilities: {
    hostRefFields: ['supportSlabId'],
    floorPlaced: {
      footprint: (raw) => {
        const node = BathtubNode.parse(raw)
        return {
          dimensions: [node.length, node.height, node.width],
          rotation: [0, node.rotation, 0],
        }
      },
    },
    selectable: { hitVolume: 'bbox' },
    movable: {
      axes: ['x', 'z'],
      gridSnap: true,
      directDrag: true,
      parentFrame: bathDeckFrame,
      groupMoveSnapPose: bathWallSnap,
    },
    rotatable: {
      axes: ['y'],
      snapAngles: [Math.PI / 4],
      override: ({ node }) =>
        String(node.parentId).startsWith('bath-space-bath-deck_')
          ? null
          : { axes: ['y'], snapAngles: [Math.PI / 4] },
    },
    duplicable: { subtree: 'with-children' },
    deletable: true,
    paint: bathPaint,
    slots: () =>
      Object.entries(labels).map(([slotId, label]) => ({
        slotId,
        label,
        default:
          slotId === 'shell' || slotId === 'interior' || slotId === 'apron' ? '#ffffff' : '#c0c0c0',
      })),
  },
  tool: () => import('./tool'),
  toolHints: [
    { key: 'Left click', label: 'Place bath' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  parametrics: {
    groups: [],
    onDelete: clearBasinServiceLinks,
    customPanel: () => import('./inspector'),
  },
  floorplanMoveTarget: bathFloorplanMove,
  floorplanDependencies: (node) => (node.parentId ? [node.parentId as never] : []),
  floorplan: (node, ctx) => {
    node = bathLevelNode(node, ctx.sceneNodes ?? {})
    const c = Math.cos(node.rotation),
      s = Math.sin(node.rotation)
    return {
      kind: 'polygon',
      fill: '#ffffff',
      stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
      strokeWidth: 0.015,
      cursor: 'move',
      points: bathtubOutline(node).map(
        ([x, z]) =>
          [node.position[0] + x * c + z * s, node.position[2] - x * s + z * c] as [number, number],
      ),
    }
  },
  extensions: { 'pascal:editor/floorplan': { directDrag: true } },
  presentation: {
    label: 'Bathtub',
    description: 'Freestanding and back-to-wall soaking baths.',
    icon: { kind: 'iconify', name: 'lucide:bath' },
    paletteSection: 'furnish',
    paletteOrder: 220,
  },
  mcp: {
    description:
      'A hollow freestanding bathtub with adjustable dimensions, drain, overflow, and rim or wall tap slot targets.',
  },
}
