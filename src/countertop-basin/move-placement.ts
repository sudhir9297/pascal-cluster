import { floorPlacementPose } from '../floor-support/placement'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { Matrix4, Plane, Ray, Vector3, type Object3D } from 'three'
import { VanityNode, isVanityKind } from '../freestanding-vanity/schema'
import { basinLevelPose, basinRemainsOnVanity, vanityLevelToLocal } from './attachment'
import { basinPlacement, type BasinSurfacePlacement } from './placement'
import { basinPlacementCandidate, type BasinPlacementCandidate } from './placement-pose'
import { COUNTERTOP_BASIN, SEMI_RECESSED_BASIN, isInsetBasinKind, type BasinNode } from './schema'

/** A cutout must not make an existing basin fall through its own countertop. */
export function basinMoveSurface(
  ray: Ray,
  surfaces: Object3D,
  levelMatrix: Matrix4,
  node: BasinNode,
  roots: ReadonlyMap<string, Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
  excluded: readonly Object3D[],
  gridStep = 0,
  groundPoint?: [number, number, number],
) {
  const pose = basinLevelPose(node, nodes)
  let hit = basinPlacement(
    ray,
    surfaces,
    levelMatrix,
    pose.rotation,
    gridStep,
    excluded,
    groundPoint,
  )
  let distance = hit?.surface
    ? ray.origin.distanceTo(new Vector3(...hit.position).applyMatrix4(levelMatrix))
    : Infinity
  for (const [id, root] of roots) {
    const raw = nodes[id]
    if (!raw || !isVanityKind(String(raw.type)) || !root.visible || excluded.includes(root))
      continue
    let hidden = false
    for (let p: Object3D | null = root; p; p = p.parent) if (!p.visible) hidden = true
    if (hidden) continue
    const host = VanityNode.parse(getEffectiveNode(raw)),
      top = root.getObjectByName('vanity-countertop')
    if (!host.countertopEnabled || !top?.visible) continue
    // Countertop top in the vanity's local frame; no picking mesh or scene plane is added.
    root.updateWorldMatrix(true, false)
    const localRay = ray.clone().applyMatrix4(root.matrixWorld.clone().invert())
    const local = localRay.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -host.height),
      new Vector3(),
    )
    if (!local) continue
    const world = local.clone().applyMatrix4(root.matrixWorld),
      nextDistance = world.distanceTo(ray.origin)
    if (nextDistance > distance + 1e-5) continue
    const position = world.clone().applyMatrix4(levelMatrix.clone().invert()).toArray() as [
      number,
      number,
      number,
    ]
    const hostPosition = vanityLevelToLocal(host, position, nodes)
    if (
      !basinRemainsOnVanity(
        { ...node, type: COUNTERTOP_BASIN, position: hostPosition } as BasinNode,
        host,
      )
    )
      continue
    distance = nextDistance
    hit = { position, rotation: pose.rotation, surface: top }
  }
  return hit
}

export function basinMoveCandidate(
  node: BasinNode,
  hit: BasinSurfacePlacement,
  levelId: string,
  roots: ReadonlyMap<string, Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
): BasinPlacementCandidate {
  const candidate = basinPlacementCandidate(node, hit, levelId, roots, nodes)
  if (candidate) return candidate
  // A detached inset bowl rests its bottom on the pointed surface.
  const offset = isInsetBasinKind(node.type)
    ? node.type === SEMI_RECESSED_BASIN
      ? node.recessDepth
      : node.height
    : 0
  const preview = {
    parentId: levelId,
    rotation: hit.rotation ?? basinLevelPose(node, nodes).rotation,
    position: [hit.position[0], hit.position[1] + offset, hit.position[2]] as [
      number,
      number,
      number,
    ],
  }
  const supported = floorPlacementPose(
    { ...node, parentId: levelId } as unknown as AnyNode,
    { position: [preview.position[0], offset, preview.position[2]], rotation: preview.rotation },
    levelId,
    nodes as Record<string, AnyNode>,
    { elevation: hit.position[1], supportSlabId: null, sourceNodeId: 'surface' },
  )
  return {
    preview,
    placed: {
      parentId: levelId,
      rotation: preview.rotation,
      position: supported.position,
      supportSlabId: supported.supportSlabId,
    },
  }
}
