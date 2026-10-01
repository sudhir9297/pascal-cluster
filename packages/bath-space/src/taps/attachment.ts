import { bathFromNode, bathTapTarget, bathTapLocalToLevel } from '../bathtub/targets'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { BasinNode, isBasinKind } from '../countertop-basin/schema'
import { basinTapLocalToLevel, basinTapTarget } from '../countertop-basin/tap-attachment'
import { wallTapPlanPose } from './wall-placement'
import { followingWallTapPlacement } from './binding'
import { getTapPreset } from './presets'
import type { TapNode } from './schema'

export function attachedTapPose(node: TapNode, nodes: Readonly<Record<string, AnyNode>>) {
  const parent = node.parentId ? nodes[node.parentId] : undefined
  const wall = parent?.type === 'wall' && node.wallId === parent.id ? getEffectiveNode(parent) : null
  const mounted = wall ? followingWallTapPlacement(node, nodes) : null
  const basin = getTapPreset(node.presetId).mount !== 'wall' && parent && isBasinKind(String(parent.type)) ? BasinNode.parse(getEffectiveNode(parent)) : null
  const bath = getTapPreset(node.presetId).mount !== 'wall' ? bathFromNode(parent ? getEffectiveNode(parent) : undefined) : null
  return { basin, bath, wall, local: mounted ?? (bath ? bathTapTarget(bath) : basin ? basinTapTarget(basin, nodes, node.slotId) : { position: node.position, rotation: node.rotation }) }
}
export function tapLevelPose(node: TapNode, nodes: Readonly<Record<string, AnyNode>>) {
  const { basin, bath, wall, local } = attachedTapPose(node, nodes)
  if (wall) {
    const pose = wallTapPlanPose({ ...node, ...local }, wall)
    return { position: [pose.x, local.position[1], pose.z] as [number, number, number], rotation: pose.yaw }
  }
  return bath ? bathTapLocalToLevel(bath, local, nodes) : basin ? basinTapLocalToLevel(basin, local, nodes) : local
}
