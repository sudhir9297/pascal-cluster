import { Group } from 'three'
import { hasHolder, hasSupply, isRail, type ShowerMountNode } from './schema'
export type ShowerSocket = {
  id: string
  type: string
  capacity: 1
  position: [number, number, number]
  rotation: [number, number, number]
}
export function showerMountSockets(n: ShowerMountNode): ShowerSocket[] {
  const result: ShowerSocket[] = [],
    height = isRail(n) ? (n.sliderPosition - 0.5) * n.railLength : 0
  if (hasHolder(n))
    result.push({
      id: 'hand-shower',
      type: 'hand_shower',
      capacity: 1,
      position: [0, height, n.projection + n.holderDiameter * 0.5],
      rotation: [(n.holderTilt * Math.PI) / 180, 0, 0],
    })
  if (hasSupply(n))
    result.push({
      id: 'hose',
      type: 'shower_hose',
      capacity: 1,
      position: [
        0,
        (isRail(n) ? -n.railLength / 2 + Math.min(n.railBracketInset, n.railLength / 4) : 0) -
          n.tubeSize / 2 -
          n.outletLength,
        n.projection * 0.55,
      ],
      rotation: [0, 0, 0],
    })
  return result
}
export function addShowerMountTargets(root: Group, n: ShowerMountNode) {
  for (const slot of showerMountSockets(n)) {
    const target = new Group()
    target.name = `${slot.type}_target_${slot.id}`
    target.position.fromArray(slot.position)
    target.rotation.set(...slot.rotation)
    target.userData = { attachmentTarget: slot.type, hostId: n.id, slotId: slot.id, capacity: 1 }
    root.add(target)
  }
}
