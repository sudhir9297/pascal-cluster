import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { BATHTUB, BathtubNode, bathRimWidth } from '../bathtub/schema'
import { bathLevelNode, bathDeckParent, bathDeckLocalY } from '../bath-deck/attachment'
import { bathEndWallMount } from './wall-mount'
import { type BathShowerNode } from './schema'
import { assemblyFront } from '../shower-assembly/targets'
import { bathShowerAssembly } from './schema'
import { SHOWER_HEAD, ShowerHeadNode } from '../shower-head/schema'
export function bathShowerBath(n: BathShowerNode, nodes: Readonly<Record<string, AnyNode>>) {
  const raw = nodes[n.parentId ?? '']
  return raw && String(raw.type) === BATHTUB ? BathtubNode.parse(getEffectiveNode(raw)) : null
}
function bathSupportLift(bath: BathtubNode, nodes: Readonly<Record<string, AnyNode>>) {
  const deck = bathDeckParent(bath, nodes)
  const canonicalY = deck ? deck.position[1] + bathDeckLocalY(deck, bath) : bath.position[1]
  return bathLevelNode(bath, nodes).position[1] - canonicalY
}
export function bathShowerMount(n: BathShowerNode, nodes: Readonly<Record<string, AnyNode>>) {
  const bath = bathShowerBath(n, nodes)
  if (!bath || bath.shape === 'corner') return null
  const world = bathLevelNode(bath, nodes),
    localHeight = n.mountingHeight + bathSupportLift(bath, nodes) - world.position[1]
  if (localHeight < bath.height + 0.12) return null
  const mount = bathEndWallMount(
    bath,
    n.end,
    [((n.end === 'left' ? -1 : 1) * bath.length) / 2, localHeight, 0],
    n.height + 0.15,
    nodes,
    n.wallId,
    0,
  )
  if (!mount) return null
  const half = n.family === 'panel' ? n.width / 2 : Math.max(n.flangeSize, n.tubeSize) / 2
  const wall = nodes[mount.wallId]
  if (!wall || wall.type !== 'wall') return null
  const effectiveWall = getEffectiveNode(wall),
    wallLength = Math.hypot(
      effectiveWall.end[0] - effectiveWall.start[0],
      effectiveWall.end[1] - effectiveWall.start[1],
    ),
    wallExtent = Math.max(half, n.holderOffset + (n.family === 'panel' ? n.width / 2 : 0) + 0.04)
  if (mount.station < wallExtent || mount.station > wallLength - wallExtent) return null
  const rim = bathRimWidth(bath),
    width = bath.width / 2 - rim
  if (
    half > width ||
    Math.abs(n.holderOffset) + (n.family === 'panel' ? n.width / 2 : 0) + 0.04 > width
  )
    return null
  const rawHead = n.children
    .map((id) => nodes[id])
    .find((raw) => raw && String(raw.type) === SHOWER_HEAD)
  const head = rawHead ? ShowerHeadNode.parse(getEffectiveNode(rawHead)) : null
  const reach = assemblyFront(bathShowerAssembly(n)) + n.armLength
  // Conservative footprint also handles swivel/tilt without letting a spray head cross the well.
  const radius = head
    ? Math.hypot(head.width, head.depth) / 2 +
      (head.neckLength + (head.style === 'bell' ? head.bellHeight : head.thickness)) *
        Math.sin((Math.abs(head.tilt) * Math.PI) / 180)
    : 0.18
  if (
    n.headEnabled &&
    (radius > width || reach - radius < rim || reach + radius > bath.length - rim)
  )
    return null
  const oval =
    bath.shape === 'undermount'
      ? bath.builtInShape === 'oval'
      : !['rectangle', 'alcove', 'walk-in'].includes(bath.shape)
  if (
    n.headEnabled &&
    oval &&
    ((Math.abs(bath.length / 2 - reach) + radius) / (bath.length / 2 - rim)) ** 2 +
      (radius / width) ** 2 >
      1
  )
    return null
  return { ...mount, rotation: n.end === 'left' ? Math.PI / 2 : -Math.PI / 2 }
}
export function bathShowerResolvedNodes(
  n: BathShowerNode,
  resolve: (id: string) => AnyNode | null | undefined,
) {
  const nodes: Record<string, AnyNode> = {},
    queue: string[] = [n.id, n.parentId ?? '', n.wallId ?? '']
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!,
      raw = id ? resolve(id) : null
    if (!raw || nodes[id]) continue
    nodes[id] = raw
    if (raw.parentId) queue.push(raw.parentId)
    if ('children' in raw) queue.push(...raw.children)
  }
  return nodes
}
export function bathShowerWorldPose(
  n: BathShowerNode,
  resolve: (id: string) => AnyNode | null | undefined,
) {
  const nodes = bathShowerResolvedNodes(n, resolve),
    bath = bathShowerBath(n, nodes),
    mount = bathShowerMount(n, nodes)
  if (!bath || !mount) return null
  const world = bathLevelNode(bath, nodes),
    c = Math.cos(world.rotation),
    s = Math.sin(world.rotation)
  return {
    x: world.position[0] + mount.position[0] * c + mount.position[2] * s,
    z: world.position[2] - mount.position[0] * s + mount.position[2] * c,
    yaw: world.rotation + mount.rotation,
    height: n.mountingHeight + bathSupportLift(bath, nodes),
    levelId: world.parentId,
  }
}
