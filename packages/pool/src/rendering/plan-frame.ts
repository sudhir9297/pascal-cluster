import type { AnyNode, AnyNodeId, GeometryContext, MovableConfig } from '@pascal-app/core'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { PoolPoint } from '../core/schema'

export type PlanNode = {
  id: string
  parentId?: string | null
  position: [number, number, number]
  rotation: [number, number, number]
}

export const poolPlanMovableFrame: NonNullable<MovableConfig['parentFrame']> & { independent: boolean } = {
  independent: true,
  resolveParent: (node, nodes) => {
    const parent = node.parentId ? nodes[node.parentId] : null
    return parent && parent.type !== 'level' && 'position' in parent && 'rotation' in parent ? parent : null
  },
  parentRotationY: (parent) => (parent as unknown as PlanNode).rotation[1],
  localToPlan: (parent, local, nodes) => new Vector3(...local).applyMatrix4(parentPlanMatrix(parent, nodes)).toArray(),
  planToLocal: (parent, x, y, z, nodes) => {
    const matrix = parentPlanMatrix(parent, nodes).elements
    const dx = x - matrix[12]! - matrix[4]! * y
    const dz = z - matrix[14]! - matrix[6]! * y
    const determinant = matrix[0]! * matrix[10]! - matrix[8]! * matrix[2]!
    if (Math.abs(determinant) < 1e-8) return [0, y, 0]
    return [(dx * matrix[10]! - dz * matrix[8]!) / determinant, y,
      (dz * matrix[0]! - dx * matrix[2]!) / determinant]
  },
  floorplanLiveTransform: ({ node, live }) => {
    const pose = node as unknown as PlanNode
    return { ...node, position: live.position, rotation: [pose.rotation[0], live.rotation, pose.rotation[2]] } as typeof node
  },
}

function parentPlanMatrix(parent: AnyNode, nodes?: Readonly<Record<string, AnyNode>>) {
  let current: AnyNode | undefined = parent
  const matrix = new Matrix4()
  const visited = new Set<string>()
  while (current && current.type !== 'level' && current.type !== 'building' && current.type !== 'site' && !visited.has(current.id)) {
    visited.add(current.id)
    const pose = current as unknown as PlanNode
    if (!pose.position || !pose.rotation) break
    matrix.premultiply(new Matrix4().compose(new Vector3(...pose.position),
      new Quaternion().setFromEuler(new Euler(...pose.rotation)), new Vector3(1, 1, 1)))
    current = current.parentId ? nodes?.[current.parentId] : undefined
  }
  return matrix
}

export function poolPlanPoint(node: PlanNode, point: readonly [number, number], ctx?: GeometryContext, y = 0): PoolPoint {
  const position = new Vector3(point[0], y, point[1])
  let current: PlanNode | null = node
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    position.applyEuler(new Euler(...current.rotation)).add(new Vector3(...current.position))
    const parent: AnyNode | null | undefined = current.parentId ? ctx?.resolve?.(current.parentId as AnyNodeId) : null
    if (!parent || parent.type === 'level' || parent.type === 'building' || parent.type === 'site') break
    current = 'position' in parent && 'rotation' in parent ? parent as unknown as PlanNode : null
  }
  return [position.x, position.z]
}

export function poolPlanDependencies(node: { parentId?: string | null; poolId?: string | null }, nodes: Record<string, { parentId?: string | null }>) {
  const ids = new Set<string>()
  if (node.poolId) ids.add(node.poolId)
  let parentId = node.parentId
  const visited = new Set<string>()
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    ids.add(parentId)
    parentId = nodes[parentId]?.parentId
  }
  return [...ids] as AnyNodeId[]
}

export function planPath(points: readonly (readonly [number, number])[]) {
  return points.map(([x, z], index) => `${index ? 'L' : 'M'} ${x} ${z}`).join(' ') + ' Z'
}

export function planRectangle(width: number, depth: number, centerZ = 0): PoolPoint[] {
  return [[-width / 2, centerZ - depth / 2], [width / 2, centerZ - depth / 2],
    [width / 2, centerZ + depth / 2], [-width / 2, centerZ + depth / 2]]
}
