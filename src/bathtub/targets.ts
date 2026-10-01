import {createBathScreenTarget} from '../bath-screen/attachment'
import { bathLevelNode } from '../bath-deck/attachment'
import { Group } from 'three'
import type { AnyNode } from '@pascal-app/core'
import { BATHTUB, BathtubNode, bathHasRimTarget } from './schema'

export const BATH_TAP_TARGET_NAME = 'bath-tap-target'
export const BATH_WALL_TAP_TARGET_NAME = 'bath-wall-tap-target'
export function bathTapTarget(node: BathtubNode) {
  return (
    node.tapTarget ?? {
      position: [0, node.height, node.width / 2 - 0.045] as [
        number,
        number,
        number,
      ],
      rotation: 0,
    }
  )
}
export function bathWallTapTarget(node: BathtubNode) {
  return (
    node.wallTapTarget ?? {
      position: [0, node.height + 0.15, node.width / 2] as [
        number,
        number,
        number,
      ],
      rotation: 0,
    }
  )
}
export function bathTapLocalToLevel(
  node: BathtubNode,
  pose: { position: [number, number, number]; rotation: number },
  nodes: Readonly<Record<string, AnyNode>> = {},
) {
  node = bathLevelNode(node,nodes)
  const c = Math.cos(node.rotation),
    s = Math.sin(node.rotation),
    [x, y, z] = pose.position
  return {
    position: [
      node.position[0] + x * c + z * s,
      node.position[1] + y,
      node.position[2] - x * s + z * c,
    ] as [number, number, number],
    rotation: node.rotation + pose.rotation,
  }
}
export function createBathTargets(node: BathtubNode,nodes:Readonly<Record<string,AnyNode>>={}) {
  const targets = (node.tapMount === 'none' || (node.tapMount === 'rim' && !bathHasRimTarget(node)) ? [] : [node.tapMount]).map((mount) => {
    const target = new Group(),
      pose = mount === 'rim' ? bathTapTarget(node) : bathWallTapTarget(node)
    target.name =
      mount === 'rim' ? BATH_TAP_TARGET_NAME : BATH_WALL_TAP_TARGET_NAME
    target.position.fromArray(pose.position)
    target.rotation.y = pose.rotation
    target.userData = {
      attachmentTarget: 'tap',
      hostId: node.id,
      bathId: node.id,
      slotId: 'tap',
      capacity: 1,
      mount: mount === 'rim' ? 'countertop' : 'wall',
      serviceTarget: mount === 'wall',
    }
    return target
  })
  if(node.shape!=='corner')targets.push(createBathScreenTarget(node,nodes))
  return targets
}
export function bathFromNode(raw: AnyNode | undefined) {
  return raw && String(raw.type) === BATHTUB ? BathtubNode.parse(raw) : null
}
