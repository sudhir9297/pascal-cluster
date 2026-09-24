import { type AnyNode, type AnyNodeId, sceneRegistry } from '@pascal-app/core'

export type CeilingPlacementTarget = {
  id: AnyNodeId
  height: number
}

type CeilingLike = AnyNode & {
  type: 'ceiling'
  polygon: Array<[number, number]>
  holes?: Array<Array<[number, number]>>
}

function pointInPolygon(x: number, z: number, polygon: Array<[number, number]>): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const currentPoint = polygon[index]
    const previousPoint = polygon[previous]
    if (!currentPoint || !previousPoint) continue
    const intersects =
      currentPoint[1] > z !== previousPoint[1] > z &&
      x <
        ((previousPoint[0] - currentPoint[0]) * (z - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0]
    if (intersects) inside = !inside
  }
  return inside
}

/** Resolve the lowest rendered ceiling covering a level-local plan point. */
export function findCeilingPlacementTarget(
  levelId: string,
  nodes: Record<AnyNodeId, AnyNode>,
  x: number,
  z: number,
): CeilingPlacementTarget | null {
  const level = nodes[levelId as AnyNodeId] as (AnyNode & { children?: AnyNodeId[] }) | undefined
  if (!level?.children) return null

  let best: CeilingPlacementTarget | null = null
  for (const childId of level.children) {
    const candidate = nodes[childId] as CeilingLike | undefined
    if (candidate?.type !== 'ceiling' || candidate.polygon.length < 3) continue
    if (!pointInPolygon(x, z, candidate.polygon)) continue
    if (candidate.holes?.some((hole) => hole.length >= 3 && pointInPolygon(x, z, hole))) continue

    const height = sceneRegistry.nodes.get(candidate.id)?.position.y
    if (height === undefined || !Number.isFinite(height)) continue
    if (!best || height < best.height) best = { id: candidate.id as AnyNodeId, height }
  }
  return best
}
