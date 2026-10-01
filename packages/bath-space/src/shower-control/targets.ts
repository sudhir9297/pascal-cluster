import { bathSpoutOutlet } from './bath-spout'
import { Group, type Object3D } from 'three'
import { exposedControl, type ShowerControlNode } from './schema'
export function showerControlSockets(n: ShowerControlNode) {
  const result: {
    id: string
    type: string
    capacity: 1
    position: [number, number, number]
    rotation: [number, number, number]
  }[] = []
  if (!exposedControl(n))
    result.push({
      id: 'valve-body',
      type: 'shower_valve',
      capacity: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    })
  for (let i = 1; i <= n.outletCount; i++)
    result.push({
      id: `outlet-${i}`,
      type: 'shower_water',
      capacity: 1,
      position: [(i - (n.outletCount + 1) / 2) * 0.025, 0, 0],
      rotation: [0, 0, 0],
    })
  if (n.hoseOutletEnabled)
    result.push({
      id: 'hose',
      type: 'shower_hose',
      capacity: 1,
      position: [
        n.spoutEnabled ? n.bodyWidth * 0.25 : 0,
        exposedControl(n)
          ? -n.tubeSize / 2
          : -(n.plateShape === 'round' || n.plateShape === 'square'
              ? n.plateWidth
              : n.plateHeight) / 2,
        n.projection,
      ],
      rotation: [0, 0, 0],
    })
  if (exposedControl(n) && n.riserEnabled)
    result.push({
      id: 'riser',
      type: 'shower_riser',
      capacity: 1,
      position: [0, n.tubeSize / 2 + (n.spoutEnabled ? n.riserHeight : 0), n.projection],
      rotation: [0, 0, 0],
    })
  if (exposedControl(n) && n.spoutEnabled) result.push(bathSpoutOutlet(n))
  return result
}
export function addShowerControlTargets(root: Object3D, n: ShowerControlNode) {
  for (const slot of showerControlSockets(n)) {
    const target = new Group()
    target.name = `${slot.type}_target_${slot.id}`
    target.position.fromArray(slot.position)
    target.rotation.set(...slot.rotation)
    target.userData = {
      slotId: slot.id,
      slotType: slot.type,
      hostId: n.id,
      capacity: 1,
    }
    root.add(target)
  }
}
