import { getEffectiveNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { type ShowerArmPlacement, type WallMountNode } from '../shower-arm/placement'
import { ShowerAssemblyNode, SHOWER_ASSEMBLY } from './schema'

export function fitAssemblyPlacement(
  n: ShowerAssemblyNode,
  pose: ShowerArmPlacement,
  nodes: Readonly<Record<string, AnyNode>>,
): ShowerArmPlacement | null {
  const raw = nodes[pose.wallId]
  if (raw?.type !== 'wall') return null
  const wall = getEffectiveNode(raw),
    level = nodes[wall.parentId as AnyNodeId]
  const wallHeight =
    wall.height ?? (level?.type === 'level' ? (getEffectiveNode(level).height ?? 2.5) : 2.5)
  const half = n.family === 'panel' ? n.width / 2 : Math.max(n.flangeSize, n.tubeSize) / 2
  const wallLength = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])
  const maxBase = Math.min(2, wallHeight - n.height)
  if (maxBase < 0.3 || wallLength < half * 2) return null
  const height = Math.max(0.3, Math.min(maxBase, pose.mountingHeight))
  return {
    ...pose,
    mountingHeight: height,
    position: [
      Math.max(half, Math.min(wallLength - half, pose.position[0])),
      height,
      pose.position[2],
    ],
  }
}

export function fitShowerPlacement(
  n: WallMountNode & { type: string },
  pose: ShowerArmPlacement | null,
  resolve: (id: AnyNodeId) => AnyNode | null | undefined,
) {
  if (!pose || String(n.type) !== SHOWER_ASSEMBLY) return pose
  const wall = resolve(pose.wallId as AnyNodeId)
  if (!wall) return null
  const level = wall.parentId ? resolve(wall.parentId as AnyNodeId) : null
  return fitAssemblyPlacement(ShowerAssemblyNode.parse(n), pose, {
    [wall.id]: wall,
    ...(level ? { [level.id]: level } : {}),
  })
}
