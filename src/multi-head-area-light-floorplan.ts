import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { areaHeadAngles, resolveMultiHeadAreaLightLayout } from './multi-head-area-light-geometry'
import type { MultiHeadAreaLightNode } from './schema'

type PlanPoint = readonly [number, number]

function add(a: PlanPoint, angle: number, distance: number): PlanPoint {
  return [a[0] + Math.cos(angle) * distance, a[1] - Math.sin(angle) * distance]
}

function polygonAt(
  pole: PlanPoint,
  angle: number,
  start: number,
  length: number,
  width: number,
): PlanPoint[] {
  const armEnd = add(pole, angle, start)
  const end = add(pole, angle, start + length)
  const perpendicular = angle + Math.PI / 2
  return [
    add(armEnd, perpendicular, width),
    add(end, perpendicular, width * 0.68),
    add(end, perpendicular, -width * 0.68),
    add(armEnd, perpendicular, -width),
  ]
}

export function buildMultiHeadAreaLightFloorplan(
  node: MultiHeadAreaLightNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const layout = resolveMultiHeadAreaLightLayout(node)
  const baseRotation = node.rotation?.[1] ?? 0
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
  const children: FloorplanGeometry[] = []
  for (const angle of areaHeadAngles(node.headCount)) {
    const direction = baseRotation + angle
    const armEnd = add(pole, direction, layout.fixtureStartX)
    children.push(
      {
        kind: 'line',
        x1: pole[0],
        y1: pole[1],
        x2: armEnd[0],
        y2: armEnd[1],
        stroke,
        strokeWidth: 0.06,
        strokeLinecap: 'round',
      },
      {
        kind: 'polygon',
        points: polygonAt(
          pole,
          direction,
          layout.fixtureStartX,
          layout.fixtureLength,
          layout.fixtureWidth / 2,
        ),
        fill: node.lightOn ? (node.lightColor ?? '#ffd39a') : '#6b7280',
        fillOpacity: node.lightOn ? 0.78 : 0.42,
        stroke,
        strokeWidth: 0.035,
      },
    )
  }
  children.push({
    kind: 'circle',
    cx: pole[0],
    cy: pole[1],
    r: 0.24,
    fill: node.poleColor ?? '#363b40',
    stroke,
    strokeWidth: 0.035,
  })
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
