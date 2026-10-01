import { Group } from 'three'
import type { ShowerArmNode } from './schema'
import type { AttachmentSlot } from '../attachments/slots'
import { armPath } from './path'
export const SHOWER_HEAD_SLOT = 'shower-head'
export const SHOWER_HEAD_TARGET_NAME = 'showerhead_target_shower-head'
/** Local +Y points into the arm. A head modeled with its inlet at the origin sprays along -Y. */
export function showerHeadTarget(node: ShowerArmNode) {
  const { end, direction } = armPath(node)
  const angle = Math.atan2(-direction.y, direction.z)
  return {
    position: end.clone().addScaledVector(direction, node.connectorLength).toArray() as [
      number,
      number,
      number,
    ],
    rotation: [angle - Math.PI / 2, 0, 0] as [number, number, number],
  }
}
export function showerHeadSlot(node: ShowerArmNode): AttachmentSlot {
  return { hostId: node.id, slotId: SHOWER_HEAD_SLOT, type: 'showerhead', capacity: 1 }
}
export function createShowerHeadTarget(node: ShowerArmNode) {
  const target = new Group(),
    pose = showerHeadTarget(node)
  target.name = SHOWER_HEAD_TARGET_NAME
  target.position.fromArray(pose.position)
  target.rotation.set(...pose.rotation)
  target.userData = {
    attachmentTarget: 'showerhead',
    hostId: node.id,
    slotId: SHOWER_HEAD_SLOT,
    capacity: 1,
  }
  return target
}

export function createShowerFlangeTarget(node: ShowerArmNode) {
  const target = new Group()
  target.name = 'shower_flange_target_wall-cover'
  target.userData = {
    attachmentTarget: 'shower_flange',
    hostId: node.id,
    slotId: 'wall-cover',
    capacity: 1,
  }
  return target
}
