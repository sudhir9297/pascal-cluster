import {
  findLevelAncestorId,
  getFloorPlacedElevation,
  getWallBaseElevationForNodes,
  type AnyNode,
  type AnyNodeId,
  type WallNode,
} from '@pascal-app/core'

// Floor-supported fixtures keep their wall attachment, but rest on their own footprint's floor.
export function wallFloorPosition(
  node: AnyNode,
  wall: WallNode,
  position: [number, number, number],
  rotation: number,
  nodes: Record<string, AnyNode>,
): [number, number, number] {
  const levelId = findLevelAncestorId(wall.id as AnyNodeId, nodes)
  if (!levelId) return position
  const angle = Math.atan2(wall.end[1] - wall.start[1], wall.end[0] - wall.start[0])
  const c = Math.cos(angle),
    s = Math.sin(angle)
  const levelPosition: [number, number, number] = [
    wall.start[0] + position[0] * c - position[2] * s,
    position[1],
    wall.start[1] + position[0] * s + position[2] * c,
  ]
  const proxy = {
    ...node,
    parentId: levelId,
    position: levelPosition,
    rotation: rotation - angle,
  } as AnyNode
  const elevation = getFloorPlacedElevation({ node: proxy, nodes, position: levelPosition })
  return [
    position[0],
    position[1] + elevation - getWallBaseElevationForNodes(wall, nodes),
    position[2],
  ]
}
