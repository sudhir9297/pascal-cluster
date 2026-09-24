import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { resolveTwinArmMedianLightLayout } from './twin-arm-median-light-geometry'
import type { TwinArmMedianLightNode } from './schema'

type PlanPoint = readonly [number, number]

function add(a: PlanPoint, b: PlanPoint, scale = 1): PlanPoint {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale]
}

function fixturePolygon(
  pole: PlanPoint,
  direction: PlanPoint,
  perpendicular: PlanPoint,
  start: number,
  length: number,
  halfWidth: number,
): PlanPoint[] {
  const armEnd = add(pole, direction, start)
  const fixtureEnd = add(armEnd, direction, length)
  return [
    add(armEnd, perpendicular, halfWidth),
    add(fixtureEnd, perpendicular, halfWidth * 0.68),
    add(fixtureEnd, perpendicular, -halfWidth * 0.68),
    add(armEnd, perpendicular, -halfWidth),
  ]
}

export function buildTwinArmMedianLightFloorplan(
  node: TwinArmMedianLightNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const layout = resolveTwinArmMedianLightLayout(node)
  const rotationY = node.rotation?.[1] ?? 0
  const direction: PlanPoint = [Math.cos(rotationY), -Math.sin(rotationY)]
  const opposite: PlanPoint = [-direction[0], -direction[1]]
  const perpendicular: PlanPoint = [-direction[1], direction[0]]
  const pole: PlanPoint = [x, z]
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
      x2: add(pole, direction, layout.fixtureStartX)[0],
      y2: add(pole, direction, layout.fixtureStartX)[1],
      stroke,
      strokeWidth: 0.06,
      strokeLinecap: 'round',
    },
    {
      kind: 'line',
      x1: pole[0],
      y1: pole[1],
      x2: add(pole, opposite, layout.fixtureStartX)[0],
      y2: add(pole, opposite, layout.fixtureStartX)[1],
      stroke,
      strokeWidth: 0.06,
      strokeLinecap: 'round',
    },
    {
      kind: 'polygon',
      points: fixturePolygon(
        pole,
        direction,
        perpendicular,
        layout.fixtureStartX,
        layout.fixtureLength,
        layout.fixtureWidth / 2,
      ),
      fill: node.lightOn ? (node.lightColor ?? '#ffd39a') : '#6b7280',
      fillOpacity: node.lightOn ? 0.78 : 0.42,
      stroke,
      strokeWidth: 0.035,
    },
    {
      kind: 'polygon',
      points: fixturePolygon(
        pole,
        opposite,
        [-perpendicular[0], -perpendicular[1]],
        layout.fixtureStartX,
        layout.fixtureLength,
        layout.fixtureWidth / 2,
      ),
      fill: node.lightOn ? (node.lightColor ?? '#ffd39a') : '#6b7280',
      fillOpacity: node.lightOn ? 0.78 : 0.42,
      stroke,
      strokeWidth: 0.035,
    },
    {
      kind: 'circle',
      cx: pole[0],
      cy: pole[1],
      r: 0.24,
      fill: node.poleColor ?? '#363b40',
      stroke,
      strokeWidth: 0.035,
    },
  ]
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
