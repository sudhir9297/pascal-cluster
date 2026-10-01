import { Euler, Vector3, Quaternion } from 'three'
import { WallSpoutNode } from '../wall-spout/schema'
import { wallSpoutSockets } from '../wall-spout/targets'
import { type ShowerControlNode } from './schema'

export function bathMixerSpout(n: ShowerControlNode) {
  return WallSpoutNode.parse({
    style: n.spoutStyle,
    length: n.spoutLength,
    drop: n.spoutDrop,
    rise: n.spoutRise,
    tubeSize: n.tubeSize,
    waterfallWidth: n.spoutWidth,
    waterfallHeight: n.spoutHeight,
    waterfallSlope: n.spoutSlope,
    aeratorEnabled: n.spoutAerator,
    flangeEnabled: false,
    diverterStyle: n.bathDiverterStyle,
    diverterRaised: n.bathDiverterRaised,
    slots: Object.fromEntries(
      Object.entries(n.slots ?? {}).map(([k, v]) => [k === 'spout' ? 'body' : k, v]),
    ),
  })
}
export const bathSpoutOrigin = (n: ShowerControlNode): [number, number, number] => [
  0,
  0,
  n.projection + n.tubeSize / 2,
]

export function bathSpoutOutlet(n: ShowerControlNode) {
  const outlet = wallSpoutSockets(bathMixerSpout(n)).find((s) => s.id === 'water-outlet')!
  const yaw = (n.spoutSwivel * Math.PI) / 180
  const rotation = new Euler().setFromQuaternion(
    new Quaternion()
      .setFromEuler(new Euler(0, yaw, 0))
      .multiply(new Quaternion().setFromEuler(new Euler(...outlet.rotation))),
  )
  return {
    id: 'bath-spout',
    type: 'shower_water_outlet',
    capacity: 1 as const,
    position: new Vector3(...outlet.position)
      .applyEuler(new Euler(0, yaw, 0))
      .add(new Vector3(...bathSpoutOrigin(n)))
      .toArray(),
    rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
  }
}
