import type { FloorplanGeometry, GeometryContext } from '@pascal-app/core'
import { resolvePostTopLightLayout } from './post-top-light-geometry'
import type { PedestrianPostLightNode } from './schema'

export function buildPostTopLightFloorplan(
  node: PedestrianPostLightNode,
  ctx: GeometryContext,
): FloorplanGeometry {
  const [x, , z] = node.position ?? [0, 0, 0]
  const layout = resolvePostTopLightLayout(node)
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
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.headRadius,
      fill: node.lightOn ? (node.lightColor ?? '#ffd9a3') : '#6b7280',
      fillOpacity: node.lightOn ? 0.38 : 0.22,
      stroke,
      strokeWidth: 0.035,
    },
    {
      kind: 'circle',
      cx: x,
      cy: z,
      r: layout.poleBottomRadius,
      fill: node.poleColor ?? '#30343b',
      stroke,
      strokeWidth: 0.035,
    },
  ]
  if (selected) children.push({ kind: 'move-handle', point: [x, z] })
  return { kind: 'group', children }
}
