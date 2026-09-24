import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { getRoadSignConfig } from './road-sign-config'
import { resolveRoadSignLayout, resolveRoadSignPostPositions } from './road-sign-geometry'
import type { RoadSignNode } from './schema'

type PlanPoint = readonly [number, number]

function rotate(point: PlanPoint, angle: number): PlanPoint {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos]
}

function add(a: PlanPoint, b: PlanPoint): PlanPoint {
  return [a[0] + b[0], a[1] + b[1]]
}

export function buildRoadSignFloorplan(
  node: RoadSignNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const layout = resolveRoadSignLayout(node)
  const config = getRoadSignConfig(node.signId)
  const rotationY = node.rotation?.[1] ?? 0
  const direction: PlanPoint = [Math.cos(rotationY), Math.sin(rotationY)]
  const perpendicular: PlanPoint = [-direction[1], direction[0]]
  const center: PlanPoint = [x, z]
  const halfWidth = layout.width / 2
  const halfDepth = 0.08
  const plateCorners = [
    add(center, rotate([-halfWidth, -halfDepth], rotationY)),
    add(center, rotate([halfWidth, -halfDepth], rotationY)),
    add(center, rotate([halfWidth, halfDepth], rotationY)),
    add(center, rotate([-halfWidth, halfDepth], rotationY)),
  ]
  const stroke = ctx.viewState?.selected
    ? (ctx.viewState.palette?.selectedStroke ?? '#2563eb')
    : '#4d5960'
  const children: FloorplanGeometry[] = [
    {
      kind: 'line',
      x1: x - perpendicular[0] * 0.09,
      y1: z - perpendicular[1] * 0.09,
      x2: x + perpendicular[0] * 0.09,
      y2: z + perpendicular[1] * 0.09,
      stroke: node.postColor ?? '#687177',
      strokeWidth: layout.postCount === 2 ? 0.05 : 0.08,
      strokeLinecap: 'round',
    },
    {
      kind: 'polygon',
      points: plateCorners,
      fill: config.backgroundColor,
      fillOpacity: 0.92,
      stroke,
      strokeWidth: 0.035,
    },
  ]

  if (layout.postCount === 2) {
    const [leftOffset, rightOffset] = resolveRoadSignPostPositions(layout)
    const left = add(center, [perpendicular[0] * (leftOffset ?? 0), perpendicular[1] * (leftOffset ?? 0)])
    const right = add(center, [perpendicular[0] * (rightOffset ?? 0), perpendicular[1] * (rightOffset ?? 0)])
    children[0] = {
      kind: 'group',
      children: [
        { kind: 'circle', cx: left[0], cy: left[1], r: 0.07, fill: node.postColor ?? '#687177', stroke, strokeWidth: 0.025 },
        { kind: 'circle', cx: right[0], cy: right[1], r: 0.07, fill: node.postColor ?? '#687177', stroke, strokeWidth: 0.025 },
      ],
    }
  }

  if (ctx.viewState?.selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
