import { wallFloorPosition } from '../floor-support/wall-position'
import {
  getFloorStackedPosition,
  getWallBaseElevationForNodes,
  getEffectiveNode,
  type AnyNode,
  type AnyNodeId,
  type MovableParentFrame,
} from '@pascal-app/core'
import type { Object3D } from 'three'
import { cornerVanityOutline } from '../freestanding-vanity/corner-geometry'
import {
  VanityNode,
  isVanityKind,
  CORNER_VANITY,
  WALL_MOUNTED_VANITY,
} from '../freestanding-vanity/schema'
import {
  vanityLevelId,
  wallVanityPlanPose,
  wallVanityPlacement,
} from '../freestanding-vanity/wall-placement'
import { wallBasinPlacement, wallBasinPlanPose } from '../wall-hung-basin/placement'
import {
  BasinNode,
  basinDepth,
  UNDERMOUNT_BASIN,
  SEMI_RECESSED_BASIN,
  HALF_PEDESTAL_BASIN,
  FULL_PEDESTAL_BASIN,
  WALL_HUNG_BASIN,
  isInsetBasinKind,
} from './schema'

type Nodes = Readonly<Record<string, AnyNode>>
type Vec3 = [number, number, number]
export type BasinPose = {
  position: Vec3
  rotation: number
  parentId: string
  supportSlabId?: string
}

export function basinVanityParent(node: { parentId: string | null }, nodes: Nodes) {
  const parent = nodes[node.parentId ?? '']
  return parent && isVanityKind(String(parent.type))
    ? VanityNode.parse(getEffectiveNode(parent))
    : null
}

export function vanityFrame(raw: AnyNode | VanityNode, nodes: Nodes) {
  let node = VanityNode.parse(getEffectiveNode(raw as AnyNode))
  let x = node.position[0],
    z = node.position[2],
    rotation = node.rotation
  let y = getFloorStackedPosition({
    node: node as unknown as AnyNode,
    nodes: nodes as Record<string, AnyNode>,
    position: node.position,
  })[1]
  if (node.type === WALL_MOUNTED_VANITY) {
    const wall = nodes[node.parentId ?? '']
    if (wall?.type === 'wall') {
      const effectiveWall = getEffectiveNode(wall)
      const placed = wallVanityPlacement(node, effectiveWall, node.position[0], node.side, 0, true)
      if (placed) node = { ...node, ...placed }
      const pose = wallVanityPlanPose(node, effectiveWall)
      x = pose.x
      z = pose.z
      rotation = pose.yaw
      y =
        node.position[1] +
        getWallBaseElevationForNodes(effectiveWall, nodes as Record<string, AnyNode>)
    }
  }
  return { position: [x, y, z] as Vec3, rotation }
}

export function vanityLocalToLevel(
  parent: AnyNode | VanityNode,
  local: readonly number[],
  nodes: Nodes,
): Vec3 {
  const frame = vanityFrame(parent, nodes),
    c = Math.cos(frame.rotation),
    s = Math.sin(frame.rotation)
  return [
    frame.position[0] + local[0]! * c + local[2]! * s,
    frame.position[1] + local[1]!,
    frame.position[2] - local[0]! * s + local[2]! * c,
  ]
}

export function vanityLevelToLocal(
  parent: AnyNode | VanityNode,
  position: readonly number[],
  nodes: Nodes,
): Vec3 {
  const frame = vanityFrame(parent, nodes),
    c = Math.cos(frame.rotation),
    s = Math.sin(frame.rotation)
  const x = position[0]! - frame.position[0],
    z = position[2]! - frame.position[2]
  return [x * c - z * s, position[1]! - frame.position[1], x * s + z * c]
}

export function basinLevelPose(node: BasinNode, nodes: Nodes) {
  if (
    node.type === WALL_HUNG_BASIN ||
    node.type === FULL_PEDESTAL_BASIN ||
    node.type === HALF_PEDESTAL_BASIN
  ) {
    const wall = nodes[node.wallId ?? node.parentId ?? '']
    if (wall?.type === 'wall') {
      const effective = getEffectiveNode(wall)
      const target = wallBasinPlacement(node, effective, node.position[0], node.side, 0, true)
      const pose = wallBasinPlanPose(target ? { ...node, ...target } : node, effective)
      const local = target?.position ?? node.position
      const supported =
        node.type === FULL_PEDESTAL_BASIN
          ? wallFloorPosition(
              node as unknown as AnyNode,
              effective,
              local,
              target?.rotation ?? node.rotation,
              nodes as Record<string, AnyNode>,
            )
          : local
      return {
        position: [
          pose.x,
          supported[1] + getWallBaseElevationForNodes(effective, nodes as Record<string, AnyNode>),
          pose.z,
        ] as Vec3,
        rotation: pose.yaw,
      }
    }
  }
  const parent = basinVanityParent(node, nodes)
  return parent
    ? {
        position: vanityLocalToLevel(parent, node.position, nodes),
        rotation: node.rotation + vanityFrame(parent, nodes).rotation,
      }
    : {
        position: getFloorStackedPosition({
          node: node as unknown as AnyNode,
          nodes: nodes as Record<string, AnyNode>,
          position: node.position,
        }),
        rotation: node.rotation,
      }
}

export function basinAttachPose(
  position: Vec3,
  rotation: number,
  parent: AnyNode,
  nodes: Nodes,
): BasinPose {
  return {
    parentId: parent.id,
    position: vanityLevelToLocal(parent, position, nodes),
    rotation: rotation - vanityFrame(parent, nodes).rotation,
  }
}

export function vanityOwnsSurface(
  surface: Object3D | undefined,
  roots: ReadonlyMap<string, Object3D>,
  nodes: Nodes,
): AnyNode | null {
  for (let object = surface; object; object = object.parent ?? undefined) {
    for (const [id, root] of roots) {
      if (root !== object) continue
      const node = nodes[id]
      if (node && isVanityKind(String(node.type))) return node
      // A basin sitting on another basin is not a direct vanity surface hit.
      if (node && node.type !== 'level' && node.type !== 'building') return null
    }
  }
  return null
}

export function basinRemainsOnVanity(node: BasinNode, parent: VanityNode) {
  const undermount = node.type === UNDERMOUNT_BASIN
  const mountHeight = parent.height - (undermount ? parent.countertopThickness : 0)
  if (
    !parent.countertopEnabled ||
    Math.abs(node.position[1] - mountHeight) > (isInsetBasinKind(node.type) ? 0.005 : 0.06)
  )
    return false
  const o = parent.countertopOverhang
  const outline: [number, number][] =
    parent.type === CORNER_VANITY
      ? cornerVanityOutline(parent, o)
      : [
          [-parent.width / 2 - o, -parent.depth / 2 - o],
          [parent.width / 2 + o, -parent.depth / 2 - o],
          [parent.width / 2 + o, parent.depth / 2],
          [-parent.width / 2 - o, parent.depth / 2],
        ]
  const contained = (x: number, z: number) => {
    let positive = false,
      negative = false
    for (let i = 0; i < outline.length; i++) {
      const [ax, az] = outline[i]!,
        [bx, bz] = outline[(i + 1) % outline.length]!
      const cross = (bx - ax) * (z - az) - (bz - az) * (x - ax)
      positive ||= cross > 1e-6
      negative ||= cross < -1e-6
    }
    return !(positive && negative)
  }
  if (!isInsetBasinKind(node.type)) return contained(node.position[0], node.position[2])
  // The mounting flange needs support around the entire opening.
  const c = Math.cos(node.rotation),
    s = Math.sin(node.rotation)
  const w = node.width / 2 + node.flangeWidth,
    d = basinDepth(node) / 2 + node.flangeWidth
  if (node.type === SEMI_RECESSED_BASIN) {
    // Rear support stays on the top; only the front may project past the edge.
    const rear = [
      [-w, d],
      [w, d],
    ].map(([x, z]) => [node.position[0] + x! * c + z! * s, node.position[2] - x! * s + z! * c])
    const projection =
      vanityFrontZ(parent) -
      (node.position[2] - (Math.abs(s) * node.width) / 2 - (Math.abs(c) * basinDepth(node)) / 2)
    return (
      rear.every(([x, z]) => contained(x!, z!)) &&
      projection >= 0.025 &&
      projection <= 0.2 &&
      node.position[2] + (Math.abs(c) * basinDepth(node)) / 2 > vanityFrontZ(parent) + 0.1
    )
  }
  return [
    [-w, -d],
    [w, -d],
    [w, d],
    [-w, d],
  ].every(([x, z]) =>
    contained(node.position[0] + x! * c + z! * s, node.position[2] - x! * s + z! * c),
  )
}

export function vanityFrontZ(parent: VanityNode) {
  return parent.type === CORNER_VANITY
    ? cornerVanityOutline(parent, parent.countertopOverhang)[2]![1]
    : -parent.depth / 2 - parent.countertopOverhang
}

export function basinEditSupportPatch(node: BasinNode, next: BasinNode, nodes: Nodes) {
  const parent = basinVanityParent(node, nodes)
  if (node.type !== SEMI_RECESSED_BASIN || next.type !== SEMI_RECESSED_BASIN || !parent) return {}
  return {
    position: [
      next.position[0],
      next.position[1],
      next.position[2] +
        (basinDepth(next) - basinDepth(node)) / 2 -
        (next.frontProjection - node.frontProjection),
    ] as Vec3,
  }
}

export function basinDetachPatch(node: BasinNode, nodes: Nodes): BasinPose | null {
  const parent = basinVanityParent(node, nodes)
  if (!parent || basinRemainsOnVanity(node, parent)) return null
  const levelId = vanityLevelId(parent.parentId, nodes)
  if (!levelId) return null
  return { ...basinLevelPose(node, nodes), parentId: levelId }
}

export const basinParentFrame: MovableParentFrame = {
  independent: true,
  resolveParent: (node, nodes) => basinVanityParent(node, nodes) as unknown as AnyNode | null,
  parentRotationY: (parent, nodes = {}) => vanityFrame(parent, nodes).rotation,
  localToPlan: (parent, local, nodes = {}) => vanityLocalToLevel(parent, local, nodes),
  planToLocal: (parent, x, localY, z, nodes = {}) => {
    const local = vanityLevelToLocal(parent, [x, 0, z], nodes)
    return [local[0], localY, local[2]]
  },
  floorplanLiveTransform: ({ node, live }) =>
    ({ ...node, position: live.position, rotation: live.rotation }) as AnyNode,
  onCommit: (raw, _parent, sceneApi) => {
    const node = BasinNode.parse(raw)
    const patch = basinDetachPatch(node, sceneApi.nodes())
    if (patch) sceneApi.update(node.id as AnyNodeId, patch as Partial<AnyNode>)
  },
}
