import type { AnyNodeId, FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { PoolNode, type PoolPoint } from '../core/schema'
import { resolvePoolAttachment } from '../design/pool-attachments'
import { findSharedPoolJoint } from '../design/shared-joint'
import type { PoolSkimmerNode } from '../skimmer/core/schema'
import type { PoolInletNode } from '../inlet/core/schema'
import type { PoolDrainNode } from '../drain/core/schema'
import type { PoolStairNode } from '../stair/core/schema'
import { resolvePoolStairMounting } from '../stair/design/mounting'
import type { PoolPumpNode } from '../pump/core/schema'
import type { PoolFilterNode } from '../filter/core/schema'
import type { PoolHeaterNode } from '../heater/core/schema'
import type { PoolValveNode } from '../valve/core/schema'
import type { PoolWaterfallNode } from '../water-feature/waterfall/core/schema'
import type { PoolSharedJointNode } from '../shared-joint/core/schema'
import { planPath, planRectangle, poolPlanPoint } from './plan-frame'

type Component = PoolSkimmerNode | PoolInletNode | PoolDrainNode | PoolStairNode
  | PoolPumpNode | PoolFilterNode | PoolHeaterNode | PoolValveNode | PoolWaterfallNode | PoolSharedJointNode

function circle(radius: number, centerZ = 0): PoolPoint[] {
  return Array.from({ length: 32 }, (_, index) => {
    const angle = index * Math.PI / 16
    return [Math.cos(angle) * radius, centerZ + Math.sin(angle) * radius]
  })
}

export function poolComponentFloorplan(input: Component, ctx?: GeometryContext): FloorplanGeometry {
  const poolId = 'poolId' in input ? input.poolId : null
  const poolResult = PoolNode.safeParse(poolId ? ctx?.resolve?.(poolId as AnyNodeId) : null)
  const pool = poolResult.success ? poolResult.data : undefined
  const node = (pool && resolvePoolAttachment(input, pool) || input) as Component
  const stroke = ctx?.viewState?.selected ? (ctx.viewState.palette.selectedStroke ?? '#0284c7') : '#334155'
  const children: FloorplanGeometry[] = []
  const point = (p: readonly [number, number], y = 0) => poolPlanPoint(node, p, ctx, y)
  const polygon = (points: PoolPoint[], fill = '#e2e8f0', y = 0) => {
    children.push({ kind: 'path', d: planPath(points.map(p => point(p, y))), fill, stroke,
      strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke' })
  }
  const line = (a: PoolPoint, b: PoolPoint, y = 0) => {
    const [x1, y1] = point(a, y), [x2, y2] = point(b, y)
    children.push({ kind: 'line', x1, y1, x2, y2, stroke, strokeWidth: 1.25,
      vectorEffect: 'non-scaling-stroke', pointerEvents: 'none' })
  }
  switch (node.type) {
    case 'pool:skimmer':
      polygon(planRectangle(node.bodyWidth, node.bodyDepth, -node.bodyDepth / 2))
      polygon(planRectangle(node.mouthWidth, 0.08, 0.04), '#bae6fd')
      break
    case 'pool:inlet':
      polygon(planRectangle(node.flangeRadius * 2, Math.max(0.12, node.bodyDepth)), '#bae6fd', node.verticalOffset)
      line([0, 0], [0, node.flowLength], node.verticalOffset)
      line([-0.06, node.flowLength - 0.08], [0, node.flowLength], node.verticalOffset)
      line([0.06, node.flowLength - 0.08], [0, node.flowLength], node.verticalOffset)
      break
    case 'pool:drain': {
      const size = node.grateDiameter
      polygon(node.style === 'square' ? planRectangle(size, size) : circle(size / 2))
      for (const offset of [-0.25, 0, 0.25]) {
        const x = size * offset
        const reach = node.style === 'square' ? size / 2 : Math.sqrt((size / 2) ** 2 - x ** 2)
        line([x, -reach], [x, reach])
      }
      break
    }
    case 'pool:stair': {
      const mounting = resolvePoolStairMounting(node, pool)
      const front = mounting.innerOffset + node.treadDepth / 2
      polygon(planRectangle(node.width, front + mounting.deckReach, (front - mounting.deckReach) / 2), '#f1f5f9')
      for (const x of [-node.width / 2, node.width / 2]) line([x, -mounting.deckReach], [x, front])
      line([-node.width / 2, mounting.innerOffset], [node.width / 2, mounting.innerOffset])
      break
    }
    case 'pool:pump':
      polygon(planRectangle(node.bodyWidth, node.bodyDepth), '#cbd5e1')
      polygon(circle(node.bodyWidth * 0.3, node.bodyDepth * 0.25), '#bae6fd')
      break
    case 'pool:filter':
      polygon(circle(node.diameter / 2), '#cbd5e1')
      line([-node.diameter / 2, 0], [node.diameter / 2, 0])
      break
    case 'pool:heater':
      polygon(planRectangle(node.bodyWidth, node.bodyDepth), '#cbd5e1')
      line([-node.bodyWidth * 0.35, -node.bodyDepth * 0.35], [node.bodyWidth * 0.35, node.bodyDepth * 0.35])
      line([node.bodyWidth * 0.35, -node.bodyDepth * 0.35], [-node.bodyWidth * 0.35, node.bodyDepth * 0.35])
      break
    case 'pool:valve':
      polygon(circle(node.bodyRadius), '#cbd5e1')
      line([-node.bodyRadius * 1.5, 0], [node.bodyRadius * 1.5, 0])
      if (node.variant === 'three-way') line([0, 0], [0, node.bodyRadius * 1.5])
      line([0, 0], [Math.cos(node.handleAngle) * node.bodyRadius, Math.sin(node.handleAngle) * node.bodyRadius], node.bodyRadius)
      break
    case 'pool:waterfall':
      if (node.receivingPoolEnabled) {
        polygon(circle(1).map(([x, z]) => [x * node.receivingPoolWidth / 2,
          z * node.receivingPoolDepth / 2 + node.receivingPoolDepth * 0.36]), node.waterColor)
      }
      polygon(planRectangle(node.width, node.depth), node.structureColor)
      children.push({ kind: 'polyline', points: node.edgeCurve.map(p => point(p)), stroke: '#0284c7',
        strokeWidth: 2, vectorEffect: 'non-scaling-stroke', pointerEvents: 'none' })
      break
    case 'pool:shared-joint': {
      const pools = node.poolIds.map(id => PoolNode.safeParse(ctx?.resolve?.(id as AnyNodeId)))
      const joint = pools[0]?.success && pools[1]?.success ? findSharedPoolJoint(pools[0].data, pools[1].data) : null
      const regions = joint?.intersection ?? node.intersection
      for (const region of regions) children.push({ kind: 'path', d: planPath(region),
        fill: node.connectionMode === 'open' ? 'none' : node.transitionColor,
        fillOpacity: 0.25, stroke, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' })
      if (!regions.length) polygon(planRectangle(node.length, node.width), node.transitionColor)
      break
    }
  }
  return { kind: 'group', children }
}
