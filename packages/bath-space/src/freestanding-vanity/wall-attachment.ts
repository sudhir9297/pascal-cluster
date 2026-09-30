import { type AnyNodeId, getEffectiveNode, useScene } from '@pascal-app/core'
import type { Object3D } from 'three'
import type { WallMountedVanityNode } from './schema'
import { wallVanityPlacement } from './wall-placement'

export function poseVanityWallAttachment(node: WallMountedVanityNode, root: Object3D) {
  if (!node.wallId || node.parentId !== node.wallId) return
  const rawWall = useScene.getState().nodes[node.wallId as AnyNodeId]
  if (rawWall?.type !== 'wall') return
  const target = wallVanityPlacement(node, getEffectiveNode(rawWall), node.position[0], node.side, 0, true)
  if (!target) return
  // Host-dependent offsets are derived during rendering, so undo never records a corrective edit.
  root.position.set(...target.position)
  root.rotation.y = target.rotation
}
