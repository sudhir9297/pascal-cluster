import type { FloorplanGeometry, GeometryContext, NodeDefinition } from '@pascal-app/core'
import { poolSpilloverParametrics } from '../editor/parametrics'
import { firstPoolHintVisibility, secondPoolHintVisibility } from '../design/stage'
import { DEFAULT_POOL_SPILLOVER, PoolSpilloverNode } from './schema'
import { poolPlanPoint } from '../../rendering/plan-frame'
import { bakePoolSpilloverAnimation } from '../../core/export-animation'

const poolSpilloverToolHints = [
  { key: 'Click', label: 'Select the first pool', visible: firstPoolHintVisibility },
  { key: 'Click', label: 'Select the second pool', visible: secondPoolHintVisibility },
  { key: 'Move', label: 'Preview the connection', visible: secondPoolHintVisibility },
  { key: 'Esc', label: 'Cancel spillover placement' },
]

export function poolSpilloverFloorplan(
  node: PoolSpilloverNode,
  ctx?: GeometryContext,
): FloorplanGeometry {
  if (node.mergedSurface) return { kind: 'group', children: [] }
  const source = node.connectionPath[0]
    ? node.connectionPath[0]
    : poolPlanPoint(node, [node.sourceSide * node.length / 2, 0], ctx)
  const target = node.connectionPath[1]
    ? node.connectionPath[1]
    : poolPlanPoint(node, [-node.sourceSide * node.length / 2, 0], ctx)
  const width = node.effectiveWidth ?? node.width
  const selected = ctx?.viewState?.selected ?? false
  return {
    kind: 'group',
    children: [
      {
        kind: 'line',
        x1: source[0], y1: source[1], x2: target[0], y2: target[1],
        stroke: node.surfaceColor,
        strokeWidth: node.connectionMode === 'channel' ? width + node.lipThickness * 2 : width,
        opacity: 0.7,
        pointerEvents: 'stroke',
      },
      {
        kind: 'line',
        x1: source[0], y1: source[1], x2: target[0], y2: target[1],
        stroke: selected ? (ctx?.viewState?.palette.selectedStroke ?? '#0284c7') : node.waterColor,
        strokeWidth: Math.max(0.08, width - node.lipThickness * 2),
        opacity: 0.9,
        pointerEvents: 'stroke',
      },
    ],
  }
}

export const poolSpilloverDefinition: NodeDefinition<typeof PoolSpilloverNode> = {
  kind: 'pool:spillover',
  schemaVersion: 1,
  schema: PoolSpilloverNode,
  category: 'furnish',
  distributionRole: 'run',
  snapProfile: 'item',
  extensions: {
    'pascal:editor/floorplan': {
      tool: () => import('../editor/floorplan-tool'),
    },
  },
  defaults: () => ({ object: 'node', parentId: null, visible: true, metadata: {}, ...DEFAULT_POOL_SPILLOVER }),
  capabilities: {
    movable: { axes: ['x', 'y', 'z'], gridSnap: true },
    rotatable: { axes: ['y'] },
    selectable: { hitVolume: 'bbox' },
    duplicable: false,
    deletable: true,
    groupable: true,
    snappable: {},
  },
  renderer: { kind: 'parametric', module: () => import('../editor/preview') },
  exportAnimation: ({ node, object }) => bakePoolSpilloverAnimation(node, object),
  floorplan: poolSpilloverFloorplan,
  tool: () => import('../editor/tool'),
  toolHints: poolSpilloverToolHints,
  parametrics: poolSpilloverParametrics,
  presentation: {
    label: 'Pool spillover',
    description: 'Directional water flow from a higher swimming pool into a lower pool.',
    icon: { kind: 'iconify', name: 'lucide:move-down' },
    paletteSection: 'furnish',
  },
}
