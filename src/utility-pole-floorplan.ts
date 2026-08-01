import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import type { UtilityPoleNode } from './schema'
import { STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M } from './utility-pole-geometry'

type PlanPoint = readonly [number, number]

function offset(origin: PlanPoint, direction: PlanPoint, amount: number): PlanPoint {
  return [origin[0] + direction[0] * amount, origin[1] + direction[1] * amount]
}

export function buildUtilityPoleFloorplan(
  node: UtilityPoleNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const rotationY = node.rotation?.[1] ?? 0
  const armDirection: PlanPoint = [Math.cos(rotationY), -Math.sin(rotationY)]
  const faceDirection: PlanPoint = [-armDirection[1], armDirection[0]]
  const pole: PlanPoint = [x, z]
  const armHalf = (node.crossarmLength ?? STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M) / 2
  const armStart = offset(pole, armDirection, -armHalf)
  const armEnd = offset(pole, armDirection, armHalf)
  const transformerCenter = offset(pole, faceDirection, 0.48)
  const view = ctx.viewState
  const palette = view?.palette
  const selected = view?.selected ?? false
  const highlighted = selected || (view?.highlighted ?? false)
  const stroke = highlighted
    ? (palette?.selectedStroke ?? '#2563eb')
    : view?.hovered
      ? (palette?.wallHoverStroke ?? '#60a5fa')
      : '#4f3525'

  const children: FloorplanGeometry[] = [
    {
      kind: 'line',
      x1: armStart[0],
      y1: armStart[1],
      x2: armEnd[0],
      y2: armEnd[1],
      stroke,
      strokeWidth: 0.16,
      strokeLinecap: 'round',
    },
    {
      kind: 'circle',
      cx: x,
      cy: z,
      r: 0.26,
      fill: node.woodColor ?? '#765033',
      stroke,
      strokeWidth: 0.035,
    },
  ]
  if (node.transformerMounted !== false) {
    children.push({
      kind: 'circle',
      cx: transformerCenter[0],
      cy: transformerCenter[1],
      r: 0.34,
      fill: node.transformerColor ?? '#66716d',
      stroke,
      strokeWidth: 0.035,
    })
  }
  if (node.assembly === 'junction') {
    const routeStart = offset(pole, faceDirection, -1.15)
    const routeEnd = offset(pole, faceDirection, 1.15)
    const tapEnd = offset(pole, armDirection, armHalf * 0.88)
    children.push(
      {
        kind: 'line',
        x1: routeStart[0],
        y1: routeStart[1],
        x2: routeEnd[0],
        y2: routeEnd[1],
        stroke: '#765033',
        strokeWidth: 0.065,
        strokeLinecap: 'round',
      },
      {
        kind: 'line',
        x1: pole[0],
        y1: pole[1],
        x2: tapEnd[0],
        y2: tapEnd[1],
        stroke: '#765033',
        strokeWidth: 0.095,
        strokeLinecap: 'round',
      },
      {
        kind: 'circle',
        cx: tapEnd[0],
        cy: tapEnd[1],
        r: 0.12,
        fill: '#71675a',
        stroke,
        strokeWidth: 0.03,
      },
    )
  }
  if (node.assembly === 'small-angle' || node.assembly === 'dead-end') {
    const guyLength = node.assembly === 'dead-end' ? 3.2 : 2.05
    const guyEnd = offset(pole, faceDirection, -guyLength)
    children.push({
      kind: 'line',
      x1: pole[0],
      y1: pole[1],
      x2: guyEnd[0],
      y2: guyEnd[1],
      stroke: '#59615d',
      strokeWidth: 0.035,
      strokeLinecap: 'round',
    })
    children.push({
      kind: 'circle',
      cx: guyEnd[0],
      cy: guyEnd[1],
      r: node.assembly === 'dead-end' ? 0.13 : 0.075,
      fill: '#59615d',
      stroke,
      strokeWidth: 0.025,
    })
  }
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
