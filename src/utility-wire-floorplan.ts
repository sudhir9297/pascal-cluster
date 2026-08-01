import { type AnyNodeId, type FloorplanGeometry, type GeometryContext } from '@pascal-app/core'
import type { UtilityPoleNode, UtilityWireSpanNode } from './schema'
import { buildUtilityConductorCurves } from './utility-wire-geometry'

export function buildUtilityWireFloorplan(
  node: UtilityWireSpanNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const fromPole = ctx.resolve<UtilityPoleNode>(node.fromPoleId as AnyNodeId)
  const toPole = ctx.resolve<UtilityPoleNode>(node.toPoleId as AnyNodeId)
  if (!(fromPole && toPole)) return null
  const palette = ctx.viewState?.palette
  const highlighted = ctx.viewState?.selected || ctx.viewState?.highlighted
  const stroke = highlighted ? (palette?.selectedStroke ?? '#2563eb') : node.conductorColor
  const children: FloorplanGeometry[] = buildUtilityConductorCurves(
    node,
    { node: fromPole },
    { node: toPole },
  ).map(({ curve }) => ({
    kind: 'line',
    x1: curve.v0.x,
    y1: curve.v0.z,
    x2: curve.v2.x,
    y2: curve.v2.z,
    stroke,
    strokeWidth: 0.025,
    strokeLinecap: 'round',
  }))
  return { kind: 'group', children }
}
