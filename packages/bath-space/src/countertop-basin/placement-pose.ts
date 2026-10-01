import { floorPlacementPose } from '../floor-support/placement'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import type { Object3D } from 'three'
import { VanityNode } from '../freestanding-vanity/schema'
import {
  basinAttachPose,
  basinLevelPose,
  basinRemainsOnVanity,
  vanityFrame,
  vanityOwnsSurface,
  vanityFrontZ,
  type BasinPose,
} from './attachment'
import type { BasinSurfacePlacement } from './placement'
import {
  UNDERMOUNT_BASIN,
  SEMI_RECESSED_BASIN,
  basinDepth,
  isInsetBasinKind,
  type BasinNode,
} from './schema'

export type BasinPlacementCandidate = { preview: BasinPose; placed: BasinPose }

/** Hover stays in the level frame. Only a committed node uses the host frame. */
export function basinPlacementCandidate(
  node: BasinNode,
  hit: BasinSurfacePlacement,
  levelId: string,
  roots: ReadonlyMap<string, Object3D>,
  nodes: Readonly<Record<string, AnyNode>>,
): BasinPlacementCandidate | null {
  const preview: BasinPose = {
    position: [...hit.position],
    rotation: hit.rotation ?? node.rotation,
    parentId: levelId,
  }
  const host = vanityOwnsSurface(hit.surface, roots, nodes)
  if (isInsetBasinKind(node.type)) {
    if (!host || hit.surface?.name !== 'vanity-countertop') return null
    const vanity = VanityNode.parse(getEffectiveNode(host))
    const placed = basinAttachPose(preview.position, vanityFrame(host, nodes).rotation, host, nodes)
    placed.position[1] =
      vanity.height - (node.type === UNDERMOUNT_BASIN ? vanity.countertopThickness : 0)
    if (node.type === SEMI_RECESSED_BASIN)
      placed.position[2] = vanityFrontZ(vanity) + basinDepth(node) / 2 - node.frontProjection
    if (!basinRemainsOnVanity({ ...node, ...placed }, vanity)) return null
    return {
      placed,
      preview: { ...basinLevelPose({ ...node, ...placed }, nodes), parentId: levelId },
    }
  }
  if (host)
    return { preview, placed: basinAttachPose(preview.position, preview.rotation, host, nodes) }
  const placed = floorPlacementPose(
    { ...node, parentId: levelId } as unknown as AnyNode,
    { position: [preview.position[0], 0, preview.position[2]], rotation: preview.rotation },
    levelId,
    nodes as Record<string, AnyNode>,
    { elevation: preview.position[1], supportSlabId: null, sourceNodeId: 'surface' },
  )
  return {
    preview,
    placed: {
      parentId: levelId,
      position: placed.position,
      rotation: preview.rotation,
      supportSlabId: placed.supportSlabId,
    },
  }
}
