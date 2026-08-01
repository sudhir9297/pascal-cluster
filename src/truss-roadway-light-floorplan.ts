import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { resolveTrussRoadwayLightLayout } from './truss-roadway-light-geometry'
import type { TrussRoadwayLightNode } from './schema'

type PlanPoint = readonly [number, number]

function add(a: PlanPoint, b: PlanPoint, scale = 1): PlanPoint {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale]
}

export function buildTrussRoadwayLightFloorplan(
  node: TrussRoadwayLightNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const layout = resolveTrussRoadwayLightLayout(node)
  const rotationY = node.rotation?.[1] ?? 0
  const direction: PlanPoint = [Math.cos(rotationY), -Math.sin(rotationY)]
  const perpendicular: PlanPoint = [-direction[1], direction[0]]
  const pole: PlanPoint = [x, z]
  const armEnd = add(pole, direction, layout.fixtureStartX)
  const fixtureEnd = add(armEnd, direction, layout.fixtureLength)
  const halfWidth = layout.fixtureWidth / 2
  const points = [
    add(armEnd, perpendicular, halfWidth),
    add(fixtureEnd, perpendicular, halfWidth * 0.68),
    add(fixtureEnd, perpendicular, -halfWidth * 0.68),
    add(armEnd, perpendicular, -halfWidth),
  ]
  const view = ctx.viewState
  const palette = view?.palette
  const selected = view?.selected ?? false
  const highlighted = selected || (view?.highlighted ?? false)
  const stroke = highlighted
    ? (palette?.selectedStroke ?? '#2563eb')
    : view?.hovered
      ? (palette?.wallHoverStroke ?? '#60a5fa')
      : '#363b40'
  const children: FloorplanGeometry[] = [
    {
      kind: 'line',
      x1: pole[0],
      y1: pole[1],
      x2: armEnd[0],
      y2: armEnd[1],
      stroke,
      strokeWidth: 0.08,
      strokeLinecap: 'round',
    },
    {
      kind: 'polygon',
      points,
      fill: node.lightOn ? (node.lightColor ?? '#ffd39a') : '#6b7280',
      fillOpacity: node.lightOn ? 0.78 : 0.42,
      stroke,
      strokeWidth: 0.035,
    },
    {
      kind: 'circle',
      cx: pole[0],
      cy: pole[1],
      r: 0.22,
      fill: node.poleColor ?? '#363b40',
      stroke,
      strokeWidth: 0.035,
    },
  ]
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
