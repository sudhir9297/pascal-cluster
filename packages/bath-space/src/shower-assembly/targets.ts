import { bodyJetFaceCentre } from '../body-jet/targets'
import { spoutWaterOutlet } from '../wall-spout/targets'
import { assemblyJet, assemblyJetHeight, assemblySpout, assemblySurface } from './parts'
import { Group, type Object3D } from 'three'
import { type ShowerAssemblyNode } from './schema'
export const assemblyFront = (n: ShowerAssemblyNode) =>
  n.family === 'panel' ? n.depth : n.projection
export const assemblyHolder = (n: ShowerAssemblyNode): [number, number, number] => [
  (n.holderSide === 'left' ? -1 : 1) *
    (n.family === 'panel' ? n.width / 2 + n.holderOffset : n.holderOffset),
  Math.min(n.height * n.holderSlide, n.height - 0.34),
  assemblySurface(n, Math.min(n.height * n.holderSlide, n.height - 0.34)) + 0.03,
]
export function assemblySockets(n: ShowerAssemblyNode) {
  const slots: {
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
  ]
  if (n.headEnabled)
    slots.push({
      id: 'shower-head',
      type: 'showerhead',
      capacity: 1,
      position: [0, n.height - 0.04, assemblyFront(n) + n.armLength],
      rotation: [0, 0, 0],
    })
  if (n.handEnabled)
    slots.push({
      id: 'hand-shower',
      type: 'hand_shower',
      capacity: 1,
      position: assemblyHolder(n),
      rotation: [(n.holderTilt * Math.PI) / 180, 0, 0],
    })
  if (n.hoseEnabled)
    slots.push({
      id: 'hose',
      type: 'shower_hose',
      capacity: 1,
      position: [
        n.family === 'panel' ? n.width / 2 + 0.015 : 0.045,
        n.family === 'panel' ? n.height * 0.12 : -0.02,
        assemblyFront(n),
      ],
      rotation: [0, 0, 0],
    })
  for (let i = 0; i < n.jets; i++) {
    const face = bodyJetFaceCentre(assemblyJet(n), 0)
    const y = assemblyJetHeight(n, i)
    slots.push({
      id: `body-jet-${i + 1}`,
      type: 'shower_body_spray',
      capacity: 1,
      position: [face[0], y + face[1], assemblySurface(n, y) + face[2]],
      rotation: [(n.jetTilt * Math.PI) / 180, 0, 0],
    })
  }
  if (n.spoutEnabled) {
    const p = spoutWaterOutlet(assemblySpout(n))
    slots.push({
      id: 'bath-spout',
      type: 'shower_water_outlet',
      capacity: 1,
      position: [
        p[0],
        p[1] + (n.family === 'panel' ? n.height * 0.07 : -0.03),
        p[2] + assemblySurface(n, n.family === 'panel' ? n.height * 0.07 : -0.03),
      ],
      rotation: [0, 0, 0],
    })
  }
  if (n.waterfallEnabled)
    slots.push({
      id: 'waterfall',
      type: 'shower_water_outlet',
      capacity: 1,
      position: [0, n.height - 0.04, assemblyFront(n) + n.armLength],
      rotation: [0, 0, 0],
    })
  return slots
}
export function addAssemblyTargets(root: Object3D, n: ShowerAssemblyNode) {
  for (const s of assemblySockets(n)) {
    const target = new Group()
    target.name = `${s.type}_target_${s.id}`
    target.position.fromArray(s.position)
    target.rotation.set(...s.rotation)
    target.userData = { hostId: n.id, slotId: s.id, slotType: s.type, capacity: 1 }
    root.add(target)
  }
}
