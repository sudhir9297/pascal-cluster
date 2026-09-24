import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import type { StreetLightNode } from './schema'

const BASE_RADIUS = 0.22
const FIXTURE_LENGTH = 0.86
const FIXTURE_WIDTH = 0.36

type PlanPoint = readonly [number, number]

function add(a: PlanPoint, b: PlanPoint, scale = 1): PlanPoint {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale]
}

export function buildStreetLightFloorplan(
  node: StreetLightNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const rotationY = node.rotation?.[1] ?? 0
  const direction: PlanPoint = [Math.cos(rotationY), -Math.sin(rotationY)]
  const perpendicular: PlanPoint = [-direction[1], direction[0]]
  const pole: PlanPoint = [x, z]
  const armEnd = add(pole, direction, node.armLength ?? 1.2)
  const fixtureEnd = add(armEnd, direction, FIXTURE_LENGTH)
  const halfWidth = FIXTURE_WIDTH / 2
  const fixturePoints = [
    add(armEnd, perpendicular, halfWidth),
    add(fixtureEnd, perpendicular, halfWidth),
    add(fixtureEnd, perpendicular, -halfWidth),
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
      : '#30343b'

  const children: FloorplanGeometry[] = [
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
      points: fixturePoints,
      fill: node.lightOn ? (node.lightColor ?? '#ffd9a3') : '#6b7280',
      fillOpacity: node.lightOn ? 0.8 : 0.45,
      stroke,
      strokeWidth: 0.035,
    },
    {
      kind: 'circle',
      cx: pole[0],
      cy: pole[1],
      r: BASE_RADIUS,
      fill: node.poleColor ?? '#30343b',
      stroke,
      strokeWidth: 0.035,
    },
  ]
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
