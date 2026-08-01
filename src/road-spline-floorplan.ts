import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import type { RoadSplineNode } from './schema'
import { sampleRoadPath } from './road-spline-geometry'

export function buildRoadSplineFloorplan(
  node: RoadSplineNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [originX, , originZ] = node.position ?? [0, 0, 0]
  const points = sampleRoadPath(node.points, node.pathMode ?? 'spline').map(([x, z]) => [originX + x, originZ + z] as const)
  const view = ctx.viewState
  const palette = view?.palette
  const selected = view?.selected ?? false
  const strokeLinejoin = node.pathMode === 'orthogonal' ? 'miter' : 'round'
  const roadStroke = selected ? (palette?.selectedStroke ?? '#2563eb') : node.surfaceColor

  const children: FloorplanGeometry[] = []
  if (selected) {
    children.push({
      kind: 'polyline',
      points,
      stroke: palette?.selectedStroke ?? '#2563eb',
      strokeWidth: node.width + 0.12,
      strokeLinecap: 'round',
      strokeLinejoin,
    })
  }
  children.push({
    kind: 'polyline',
    points,
    stroke: roadStroke,
    strokeWidth: node.width,
    strokeLinecap: 'round',
    strokeLinejoin,
  })

  if (selected) {
    const first = points[0]
    const last = points[points.length - 1]
    if (first && last) {
      children.push(
        { kind: 'circle', cx: first[0], cy: first[1], r: 0.14, fill: palette?.endpointHandleFill ?? '#f59e0b' },
        { kind: 'circle', cx: last[0], cy: last[1], r: 0.14, fill: palette?.endpointHandleFill ?? '#f59e0b' },
      )
    }
  }

  return { kind: 'group', children }
}
