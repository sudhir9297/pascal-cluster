import type { HandleDescriptor, NodeDefinition } from '@pascal-app/core'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import {
  STREET_INFRASTRUCTURE_VARIANTS,
  type StreetInfrastructureVariant,
} from './street-infrastructure-config'
import { buildStreetInfrastructureFloorplan } from './street-infrastructure-floorplan'
import {
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
  resolveTrafficSignalLayout,
} from './street-infrastructure-geometry'
import { getStreetInfrastructureParametrics } from './street-infrastructure-parametrics'

type GenericDefinition = NodeDefinition<any> & Record<string, unknown>

const rotateHandle: HandleDescriptor<any> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => {
    const rotation = initial.rotation ?? [0, 0, 0]
    return { rotation: [rotation[0], rotation[1] - delta, rotation[2]] }
  },
  placement: { position: () => [0.4, 0.15, 0.4], rotationY: () => -Math.PI / 4 },
  decoration: { kind: 'ring', radius: () => 0.48, y: () => 0.15 },
}

function footprint(input: unknown) {
  const node = input as StreetInfrastructureNode
  const kind = node.type as string
  if (kind === 'environment:traffic-signal') {
    const layout = resolveTrafficSignalLayout(node as any)
    return {
      dimensions: [layout.footprintWidth, layout.supportHeight, layout.footprintDepth] as [number, number, number],
      rotation: node.rotation,
    }
  }
  if (kind === 'environment:drainage-inlet') {
    const layout = resolveDrainageInletLayout(node as any)
    const surfaceHalfLength = (layout.length + 0.16) / 2
    const surfaceHalfWidth = (layout.width + 0.16) / 2
    const curbHalfLength = layout.hasCurbOpening
      ? Math.abs(layout.curbOpeningOffsetX) + layout.curbOpeningLength / 2 + layout.curbDepth / 2
      : 0
    const curbHalfWidth = layout.hasCurbOpening ? layout.curbCenterZ + layout.curbDepth / 2 : 0
    return {
      dimensions: [
        2 * Math.max(surfaceHalfLength, curbHalfLength),
        Math.max(0.3, (node as any).curbHeight ?? 0),
        2 * Math.max(surfaceHalfWidth, curbHalfWidth),
      ] as [number, number, number],
      rotation: node.rotation,
    }
  }
  if (kind === 'environment:manhole-cover') {
    const layout = resolveManholeCoverLayout(node as any)
    return {
      dimensions: [layout.frameRadius * 2, 0.1, layout.frameRadius * 2] as [number, number, number],
      rotation: node.rotation,
    }
  }
  const layout = resolveFireHydrantLayout(node as any)
  return {
    dimensions: [layout.flangeRadius * 2, layout.height, layout.flangeRadius * 2] as [number, number, number],
    rotation: node.rotation,
  }
}

function makeStreetInfrastructureDefinition(
  variant: StreetInfrastructureVariant,
): GenericDefinition {
  return {
    kind: variant.kind,
    schemaVersion: 1,
    schema: variant.schema,
    category: 'furnish',
    snapProfile: 'item',
    defaults: () => {
      const parsed = variant.schema.parse({}) as Record<string, unknown>
      const { id: _id, ...defaults } = parsed
      return defaults
    },
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
      floorPlaced: { footprint, collides: false },
    },
    parametrics: getStreetInfrastructureParametrics(variant.kind),
    floorplan: buildStreetInfrastructureFloorplan,
    handles: [rotateHandle],
    renderer: { kind: 'parametric', module: () => import('./street-infrastructure-renderer') },
    preview: () => import('./street-infrastructure-preview'),
    tool: () => import('./street-infrastructure-tool'),
    toolHints: [
      { key: 'Left click', label: `Place ${variant.label.toLowerCase()}` },
      { key: 'Esc', label: 'Stop' },
    ],
    presentation: {
      label: variant.label,
      description: variant.description,
      icon: { kind: 'iconify', name: variant.icon },
      paletteSection: 'furnish',
      hidden: true,
    },
    mcp: { description: variant.description },
  }
}

const DEFINITIONS = new Map(
  STREET_INFRASTRUCTURE_VARIANTS.map((variant) => [
    variant.kind,
    makeStreetInfrastructureDefinition(variant),
  ]),
)

export const trafficSignalDefinition = DEFINITIONS.get('environment:traffic-signal')!
export const drainageInletDefinition = DEFINITIONS.get('environment:drainage-inlet')!
export const manholeCoverDefinition = DEFINITIONS.get('environment:manhole-cover')!
export const fireHydrantDefinition = DEFINITIONS.get('environment:fire-hydrant')!
