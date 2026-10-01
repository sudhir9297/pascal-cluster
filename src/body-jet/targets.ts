import { Euler, Group, Vector3, type Object3D } from 'three'
import { type BodyJetNode } from './schema'
export const roundBodyJet = (n: BodyJetNode) =>
  n.style.startsWith('round') || n.style === 'massage-dome'

export function bodyJetPivot(n: BodyJetNode) {
  const pitch = (n.pitch * Math.PI) / 180,
    yaw = (n.yaw * Math.PI) / 180,
    height = roundBodyJet(n) ? n.width : n.height,
    extent =
      (n.width / 2) * Math.abs(Math.cos(pitch) * Math.sin(yaw)) +
      (height / 2) * Math.abs(Math.sin(pitch)) +
      (n.faceDepth / 2) * Math.abs(Math.cos(pitch) * Math.cos(yaw))
  return Math.max(
    n.projection,
    (n.flangeEnabled ? n.flangeThickness : 0) +
      Math.max(extent, n.style === 'massage-dome' ? n.width * 0.46 : 0) +
      0.002,
  )
}
export function bodyJetProjectedSize(n: BodyJetNode): [number, number] {
  const pitch = (n.pitch * Math.PI) / 180,
    yaw = (n.yaw * Math.PI) / 180,
    height = roundBodyJet(n) ? n.width : n.height
  return [
    n.width * Math.abs(Math.cos(yaw)) + n.faceDepth * Math.abs(Math.sin(yaw)),
    n.width * Math.abs(Math.sin(pitch) * Math.sin(yaw)) +
      height * Math.abs(Math.cos(pitch)) +
      n.faceDepth * Math.abs(Math.sin(pitch) * Math.cos(yaw)),
  ]
}
export function bodyJetCentre(n: BodyJetNode, index: number): [number, number, number] {
  const offset =
    (index - (n.jetCount - 1) / 2) *
    Math.max(
      n.groupSpacing,
      Math.max(
        n.groupDirection === 'horizontal'
          ? Math.max(n.width, bodyJetProjectedSize(n)[0])
          : Math.max(roundBodyJet(n) ? n.width : n.height, bodyJetProjectedSize(n)[1]),
        n.flangeEnabled ? n.flangeSize : 0,
      ) + 0.022,
    )
  return [
    n.groupDirection === 'horizontal' ? offset : 0,
    n.groupDirection === 'vertical' ? offset : 0,
    0,
  ]
}
export function bodyJetFaceCentre(n: BodyJetNode, index: number) {
  const centre = new Vector3(...bodyJetCentre(n, index)),
    p = new Vector3(
      0,
      0,
      n.style === 'massage-dome' ? n.width * 0.35 + n.faceDepth / 2 : n.faceDepth / 2,
    )
  p.applyEuler(new Euler((n.pitch * Math.PI) / 180, (n.yaw * Math.PI) / 180, 0))
  return p.add(new Vector3(centre.x, centre.y, bodyJetPivot(n))).toArray()
}
export function bodyJetSockets(n: BodyJetNode) {
  const result: {
    id: string
    type: string
    capacity: 1
    position: [number, number, number]
    rotation: [number, number, number]
  }[] = []
  for (let i = 0; i < n.jetCount; i++) {
    result.push({
      id: `water-inlet-${i + 1}`,
      type: 'shower_water_inlet',
      capacity: 1,
      position: bodyJetCentre(n, i),
      rotation: [0, 0, 0],
    })
    result.push({
      id: `spray-${i + 1}`,
      type: 'shower_body_spray',
      capacity: 1,
      position: bodyJetFaceCentre(n, i),
      rotation: [(n.pitch * Math.PI) / 180, (n.yaw * Math.PI) / 180, 0],
    })
  }
  return result
}
export function addBodyJetTargets(root: Object3D, n: BodyJetNode) {
  for (const s of bodyJetSockets(n)) {
    const target = new Group()
    target.name = `${s.type}_target_${s.id}`
    target.position.fromArray(s.position)
    target.rotation.set(...s.rotation)
    target.userData = { slotId: s.id, slotType: s.type, hostId: n.id, capacity: 1 }
    root.add(target)
  }
}
