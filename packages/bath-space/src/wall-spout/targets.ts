import { Group, type Object3D } from 'three'
import { type WallSpoutNode, waterfallSpout } from './schema'
export function spoutWaterOutlet(n: WallSpoutNode): [number, number, number] {
  if (waterfallSpout(n)) {
    const a = (n.waterfallSlope * Math.PI) / 180
    return [
      0,
      (-n.waterfallHeight / 2) * Math.cos(a) - n.length * Math.sin(a),
      n.length * Math.cos(a) - (n.waterfallHeight / 2) * Math.sin(a),
    ]
  }
  return [0, n.style === 'round-arched' ? n.rise - n.drop : -n.drop, n.length]
}
export function wallSpoutSockets(n: WallSpoutNode) {
  const result: {
    id: string
    type: string
    capacity: 1
    position: [number, number, number]
    rotation: [number, number, number]
  }[] = [
    {
      id: 'water-inlet',
      type: 'shower_water_inlet',
      capacity: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    {
      id: 'water-outlet',
      type: 'shower_water_outlet',
      capacity: 1,
      position: spoutWaterOutlet(n),
      rotation: [
        waterfallSpout(n)
          ? (n.waterfallSlope * Math.PI) / 180 - Math.PI / 2
          : n.style === 'square-angled'
            ? -Math.atan2(n.length * 0.35, n.drop)
            : 0,
        0,
        0,
      ],
    },
  ]
  if (n.diverterStyle !== 'none')
    result.push({
      id: 'shower-outlet',
      type: 'shower_water',
      capacity: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    })
  if (n.hoseOutletEnabled)
    result.push({
      id: 'hose',
      type: 'shower_hose',
      capacity: 1,
      position: [0, -n.tubeSize / 2 - 0.02, n.length * 0.18],
      rotation: [0, 0, 0],
    })
  return result
}
export function addWallSpoutTargets(root: Object3D, n: WallSpoutNode) {
  for (const s of wallSpoutSockets(n)) {
    const target = new Group()
    target.name = `${s.type}_target_${s.id}`
    target.position.fromArray(s.position)
    target.rotation.set(...s.rotation)
    target.userData = { slotId: s.id, slotType: s.type, hostId: n.id, capacity: s.capacity }
    root.add(target)
  }
}
