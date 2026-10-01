import type { AnyNodeId, NodeDefinition } from '@pascal-app/core'
import { buildFreestandingVanityGeometry, vanityGeometryKey } from './geometry'
import { vanityParameterGroups } from './parametrics'
import { FreestandingVanityNode, VanityNode, WALL_MOUNTED_VANITY, isVanityKind } from './schema'
import { vanityPaint } from './paint'
import { vanitySlots } from './slots'
import { toggleVanityOpening } from './interaction'
import { vanitySceneAction } from './scene-action'
import { freestandingVanityWallSnap } from './freestanding-wall-snap'

export const freestandingVanityDefinition: NodeDefinition<typeof FreestandingVanityNode> = {
  kind: 'bath-space:freestanding-vanity',
  schemaVersion: 1,
  schema: FreestandingVanityNode,
  category: 'furnish',
  snapProfile: 'item',
  defaults: () => {
    const {
      id: _id,
      type: _type,
      ...defaults
    } = FreestandingVanityNode.parse({ name: 'Freestanding Vanity' })
    return defaults
  },
  capabilities: {
    hostRefFields: ['supportSlabId'],
    paint: vanityPaint,
    slots: vanitySlots,
    sceneAction: vanitySceneAction,
    selectable: { hitVolume: 'bbox' },
    movable: {
      axes: ['x', 'z'],
      gridSnap: true,
      directDrag: true,
      groupMoveSnapPose: freestandingVanityWallSnap,
    },
    rotatable: { axes: ['y'], snapAngles: [Math.PI / 4] },
    floorPlaced: {
      footprint: (node) => {
        const vanity = VanityNode.parse(node)
        const overhang = vanity.countertopEnabled ? vanity.countertopOverhang : 0
        return {
          dimensions: [
            vanity.width + overhang * 2,
            vanity.height + (vanity.countertopEnabled ? vanity.backsplashHeight : 0),
            vanity.depth + Math.max(overhang, 0.035) * 2,
          ],
          rotation: [0, vanity.rotation, 0],
        }
      },
      collides: true,
    },
    duplicable: { subtree: 'with-children' },
    deletable: true,
  },
  parametrics: {
    customPanel: () => import('./inspector'),
    groups: vanityParameterGroups,
  },
  geometry: buildFreestandingVanityGeometry,
  geometryKey: vanityGeometryKey,
  system: { module: () => import('./system'), priority: 2 },
  keyboardActions: {
    e: {
      appliesTo: (node) => isVanityKind(String(node.type)),
      run: (node) => toggleVanityOpening(node.id as AnyNodeId),
    },
  },
  handles: [
    {
      kind: 'linear-resize',
      axis: 'x',
      anchor: 'center',
      min: 0.55,
      max: 1.8,
      gridSnap: true,
      currentValue: (node) => node.width,
      apply: (_node, width) => ({ width }),
      placement: { position: (node) => [node.width / 2 + 0.25, node.height + 0.1, 0] },
    },
    {
      kind: 'linear-resize',
      axis: 'z',
      anchor: 'center',
      min: 0.35,
      max: 0.75,
      gridSnap: true,
      currentValue: (node) => node.depth,
      apply: (_node, depth) => ({ depth }),
      placement: { position: (node) => [0, node.height + 0.1, node.depth / 2 + 0.25] },
    },
    {
      kind: 'linear-resize',
      axis: 'y',
      anchor: 'min',
      min: 0.55,
      max: 1.1,
      gridSnap: true,
      currentValue: (node) => node.height,
      apply: (raw, height) => {
        const node = VanityNode.parse(raw)
        return node.type === WALL_MOUNTED_VANITY
          ? {
              height,
              mountingHeight: Math.min(
                node.mountingHeight,
                height - (node.countertopEnabled ? node.countertopThickness : 0) - 0.2,
              ),
            }
          : { height }
      },
      placement: { position: (node) => [0, node.height + 0.25, 0] },
    },
    {
      kind: 'arc-resize',
      axis: 'angular',
      shape: 'rotate',
      apply: (node, delta) => ({ rotation: node.rotation - delta }),
      placement: {
        position: (node) => [node.width / 2 + 0.3, node.height + 0.1, node.depth / 2 + 0.3],
        rotationY: () => -Math.PI / 4,
      },
    },
  ],
  tool: () => import('./tool'),
  toolHints: [
    { key: 'Left click', label: 'Place vanity' },
    { key: 'Esc', label: 'Exit placement' },
  ],
  presentation: {
    label: 'Freestanding Vanity',
    description: 'Procedural floor-standing vanity cabinet with a countertop.',
    icon: { kind: 'iconify', name: 'lucide:armchair' },
    paletteSection: 'furnish',
    paletteOrder: 210,
  },
  mcp: {
    description:
      'A procedural freestanding bathroom vanity. Basin objects are authored separately.',
  },
}
