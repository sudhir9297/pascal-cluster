import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import type { UtilityPoleNode, UtilityWireSpanNode as UtilityWireSpan } from './schema'
import { UtilityWireSpanNode } from './schema'

export const STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M = 45.72
/** Maximum lateral offset for treating a new pole as an inline support. */
export const STANDARD_UTILITY_POLE_INLINE_INSERT_DISTANCE_M = 3

const INLINE_ENDPOINT_MARGIN = 0.12

export type UtilityPoleInlineInsertion = {
  span: UtilityWireSpan
  fromPole: UtilityPoleNode
  toPole: UtilityPoleNode
  distance: number
  positionT: number
}

export type UtilityPoleAutoConnectResult =
  | { kind: 'branch'; span: UtilityWireSpan }
  | { kind: 'inline'; spans: readonly [UtilityWireSpan, UtilityWireSpan] }

function asUtilityPole(node: AnyNode | undefined): UtilityPoleNode | null {
  return node && (node.type as string) === 'environment:utility-pole'
    ? (node as unknown as UtilityPoleNode)
    : null
}

function asUtilityWireSpan(node: AnyNode): UtilityWireSpan | null {
  return (node.type as string) === 'environment:utility-wire-span'
    ? (node as unknown as UtilityWireSpan)
    : null
}

export function utilityPoleDistance(a: UtilityPoleNode, b: UtilityPoleNode): number {
  const [ax, , az] = a.position ?? [0, 0, 0]
  const [bx, , bz] = b.position ?? [0, 0, 0]
  return Math.hypot(bx - ax, bz - az)
}

function projectOntoUtilitySpan(
  point: UtilityPoleNode,
  from: UtilityPoleNode,
  to: UtilityPoleNode,
): { distance: number; positionT: number } {
  const [px, , pz] = point.position ?? [0, 0, 0]
  const [ax, , az] = from.position ?? [0, 0, 0]
  const [bx, , bz] = to.position ?? [0, 0, 0]
  const dx = bx - ax
  const dz = bz - az
  const lengthSquared = dx * dx + dz * dz
  if (lengthSquared < Number.EPSILON) {
    return { distance: Math.hypot(px - ax, pz - az), positionT: 0 }
  }
  const positionT = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSquared),
  )
  const closestX = ax + dx * positionT
  const closestZ = az + dz * positionT
  return {
    distance: Math.hypot(px - closestX, pz - closestZ),
    positionT,
  }
}

export function findNearestUtilityPoleForConnection(
  placedPole: UtilityPoleNode,
  nodes: Readonly<Record<string, AnyNode>>,
  maxDistance = STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M,
): UtilityPoleNode | null {
  const spans = Object.values(nodes)
    .map(asUtilityWireSpan)
    .filter((span): span is UtilityWireSpan => span !== null)
  let nearest: UtilityPoleNode | null = null
  let nearestDistance = maxDistance

  for (const sceneNode of Object.values(nodes)) {
    const node = asUtilityPole(sceneNode)
    if (!node || node.id === placedPole.id) continue
    if (node.parentId !== placedPole.parentId) continue
    const alreadyConnected = spans.some(
      (span) =>
        (span.fromPoleId === placedPole.id && span.toPoleId === node.id) ||
        (span.fromPoleId === node.id && span.toPoleId === placedPole.id),
    )
    if (alreadyConnected) continue
    const distance = utilityPoleDistance(placedPole, node)
    if (distance <= nearestDistance) {
      nearest = node
      nearestDistance = distance
    }
  }
  return nearest
}

/**
 * Finds an existing through-span that the placed pole is positioned on top of.
 * Inserting a pole in the middle of a span should split that span instead of
 * leaving two overlapping conductors behind. Near an endpoint, the normal
 * nearest-pole branch rule wins so a third span can form a T-junction.
 */
export function findUtilityPoleInlineInsertion(
  placedPole: UtilityPoleNode,
  nodes: Readonly<Record<string, AnyNode>>,
  maxDistance = STANDARD_UTILITY_POLE_INLINE_INSERT_DISTANCE_M,
): UtilityPoleInlineInsertion | null {
  const poles = new Map<string, UtilityPoleNode>(
    Object.values(nodes)
      .map(asUtilityPole)
      .filter((pole): pole is UtilityPoleNode => pole !== null)
      .map((pole) => [pole.id as string, pole] as [string, UtilityPoleNode]),
  )
  let nearest: UtilityPoleInlineInsertion | null = null

  for (const sceneNode of Object.values(nodes)) {
    const span = asUtilityWireSpan(sceneNode)
    if (!span) continue
    const from = poles.get(span.fromPoleId)
    const to = poles.get(span.toPoleId)
    if (!(from && to)) continue
    if (from.parentId !== placedPole.parentId || to.parentId !== placedPole.parentId) continue
    if (from.id === placedPole.id || to.id === placedPole.id) continue

    const projection = projectOntoUtilitySpan(placedPole, from, to)
    if (
      projection.positionT <= INLINE_ENDPOINT_MARGIN ||
      projection.positionT >= 1 - INLINE_ENDPOINT_MARGIN
    ) {
      continue
    }
    if (projection.distance > maxDistance) continue
    if (!nearest || projection.distance < nearest.distance) {
      nearest = { span, fromPole: from, toPole: to, ...projection }
    }
  }

  return nearest
}

/** Resolve the topology rule before mutating the scene. */
export function resolveUtilityPoleAutoConnect(
  placedPole: UtilityPoleNode,
  nodes: Readonly<Record<string, AnyNode>>,
  maxDistance = STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M,
):
  | { kind: 'branch'; pole: UtilityPoleNode }
  | { kind: 'inline'; insertion: UtilityPoleInlineInsertion }
  | null {
  const insertion = findUtilityPoleInlineInsertion(placedPole, nodes)
  if (insertion) return { kind: 'inline', insertion }
  const nearest = findNearestUtilityPoleForConnection(placedPole, nodes, maxDistance)
  return nearest ? { kind: 'branch', pole: nearest } : null
}

function lineHeading(from: UtilityPoleNode, to: UtilityPoleNode): number | null {
  const [fromX, , fromZ] = from.position ?? [0, 0, 0]
  const [toX, , toZ] = to.position ?? [0, 0, 0]
  const dx = toX - fromX
  const dz = toZ - fromZ
  if (Math.hypot(dx, dz) < Number.EPSILON) return null
  return Math.atan2(dz, dx)
}

/** Convert a line heading to the pole rotation where the crossarm is perpendicular to it. */
export function utilityPoleCrossarmRotationY(lineHeadingRadians: number): number {
  const armHeading = lineHeadingRadians + Math.PI / 2
  let rotationY = -armHeading
  rotationY %= Math.PI
  if (rotationY >= Math.PI / 2) rotationY -= Math.PI
  if (rotationY < -Math.PI / 2) rotationY += Math.PI
  return rotationY
}

/** Choose a tangent orientation from the main span that the new pole will join. */
export function resolveUtilityPolePlacementRotation(
  placedPole: UtilityPoleNode,
  nodes: Readonly<Record<string, AnyNode>>,
): number {
  const connection = resolveUtilityPoleAutoConnect(placedPole, nodes)
  if (!connection) return placedPole.rotation?.[1] ?? 0

  const from = connection.kind === 'inline' ? connection.insertion.fromPole : placedPole
  const to = connection.kind === 'inline' ? connection.insertion.toPole : connection.pole
  const heading = lineHeading(from, to)
  return heading === null
    ? placedPole.rotation?.[1] ?? 0
    : utilityPoleCrossarmRotationY(heading)
}

function createReplacementSpan(
  fromPoleId: string,
  toPoleId: string,
  template: UtilityWireSpan,
  parentId: AnyNodeId,
): UtilityWireSpan {
  return UtilityWireSpanNode.parse({
    parentId: template.parentId ?? parentId,
    visible: template.visible,
    metadata: template.metadata,
    fromPoleId,
    toPoleId,
    conductorColor: template.conductorColor,
    sagRatio: template.sagRatio,
  })
}

/**
 * Connect a newly placed pole with a small distribution-topology heuristic:
 * split a nearby through-span when placed inline, otherwise attach one new
 * span to the nearest same-level pole. Because a pole may own many spans,
 * repeated branch placements naturally produce a T or multi-way junction.
 */
export function autoConnectUtilityPole(
  placedPoleId: UtilityPoleNode['id'],
  parentId: AnyNodeId,
): UtilityPoleAutoConnectResult | null {
  const scene = useScene.getState()
  const placedPole = asUtilityPole(scene.nodes[placedPoleId as AnyNodeId])
  if (!placedPole) return null
  const connection = resolveUtilityPoleAutoConnect(placedPole, scene.nodes)
  if (!connection) return null

  if (connection.kind === 'branch') {
    const span = UtilityWireSpanNode.parse({
      fromPoleId: connection.pole.id,
      toPoleId: placedPole.id,
    })
    scene.createNode(span as unknown as AnyNode, parentId)
    return { kind: 'branch', span }
  }

  const { span: existingSpan } = connection.insertion
  const firstSpan = createReplacementSpan(
    existingSpan.fromPoleId,
    placedPole.id,
    existingSpan,
    parentId,
  )
  const secondSpan = createReplacementSpan(
    placedPole.id,
    existingSpan.toPoleId,
    existingSpan,
    parentId,
  )
  scene.applyNodeChanges({
    delete: [existingSpan.id as AnyNodeId],
    create: [firstSpan, secondSpan].map((span) => ({
      node: span as unknown as AnyNode,
      parentId,
    })),
  })
  return { kind: 'inline', spans: [firstSpan, secondSpan] }
}
