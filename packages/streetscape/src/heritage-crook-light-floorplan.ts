import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { resolveHeritageCrookLightLayout } from './heritage-crook-light-geometry'
import type { HeritageCrookLightNode } from './schema'

type PlanPoint = readonly [number, number]

function add(a: PlanPoint, b: PlanPoint, scale = 1): PlanPoint {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale]
}

export function buildHeritageCrookLightFloorplan(
  node: HeritageCrookLightNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const layout = resolveHeritageCrookLightLayout(node)
  const rotationY = node.rotation?.[1] ?? 0
  const direction: PlanPoint = [Math.cos(rotationY), -Math.sin(rotationY)]
  const pole: PlanPoint = [x, z]
  const lamp = add(pole, direction, layout.armReach)
  const view = ctx.viewState
  const palette = view?.palette
  const selected = view?.selected ?? false
  const highlighted = selected || (view?.highlighted ?? false)
  const stroke = highlighted
    ? (palette?.selectedStroke ?? '#2563eb')
    : view?.hovered
      ? (palette?.wallHoverStroke ?? '#60a5fa')
      : '#24272b'
  const children: FloorplanGeometry[] = [
    {
      kind: 'line',
      x1: pole[0],
      y1: pole[1],
      x2: lamp[0],
      y2: lamp[1],
      stroke,
      strokeWidth: 0.055,
      strokeLinecap: 'round',
    },
    {
      kind: 'circle',
      cx: lamp[0],
      cy: lamp[1],
      r: layout.lensRadius,
      fill: node.lightOn ? (node.lightColor ?? '#ffd5a0') : '#6b7280',
      fillOpacity: node.lightOn ? 0.68 : 0.36,
      stroke,
      strokeWidth: 0.035,
    },
    {
      kind: 'circle',
      cx: pole[0],
      cy: pole[1],
      r: layout.baseRadius,
      fill: node.poleColor ?? '#24272b',
      stroke,
      strokeWidth: 0.035,
    },
  ]
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
