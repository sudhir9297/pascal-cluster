import { wallFixtureFloorplanMove } from '../shower-common/wall-floorplan'
import {
  getEffectiveNode,
  type AnyNodeId,
  type GeometryContext,
  type FloorplanGeometry,
} from '@pascal-app/core'
import { Vector3, Euler } from 'three'
import { type BodyJetNode } from './schema'
import { bodyJetCentre, roundBodyJet, bodyJetPivot } from './targets'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
export function bodyJetFloorplan(n: BodyJetNode, ctx: GeometryContext): FloorplanGeometry | null {
  const raw = ctx.resolve((n.wallId ?? n.parentId) as AnyNodeId)
  if (raw?.type !== 'wall') return null
  const wall = getEffectiveNode(raw),
    attachment = showerArmPlacement(n, wall, n.position[0], n.side, 0, true),
    pose = showerArmPlanPose(attachment ? { ...n, ...attachment } : n, wall),
    c = Math.cos(pose.yaw),
    s = Math.sin(pose.yaw),
    children: FloorplanGeometry[] = []
  for (let i = 0; i < n.jetCount; i++) {
    const centre = bodyJetCentre(n, i),
      round = roundBodyJet(n),
      height = round ? n.width : n.height,
      points: Vector3[] = []
    for (const x of [-n.width / 2, n.width / 2])
      for (const y of [-height / 2, height / 2])
        for (const z of [-n.faceDepth / 2, n.faceDepth / 2])
          points.push(
            new Vector3(x, y, z + (n.style === 'massage-dome' ? n.width * 0.35 : 0))
              .applyEuler(new Euler((n.pitch * Math.PI) / 180, (n.yaw * Math.PI) / 180, 0))
              .add(new Vector3(centre[0], centre[1], bodyJetPivot(n))),
          )
    const half = Math.max(n.width, n.flangeEnabled ? n.flangeSize : 0) / 2,
      minX = Math.min(centre[0] - half, ...points.map((p) => p.x)),
      maxX = Math.max(centre[0] + half, ...points.map((p) => p.x)),
      maxZ = Math.max(bodyJetPivot(n), ...points.map((p) => p.z)),
      d =
        'M' +
        [
          [minX, 0],
          [maxX, 0],
          [maxX, maxZ],
          [minX, maxZ],
        ]
          .map(([x, z]) => `${pose.x + x! * c + z! * s},${pose.z - x! * s + z! * c}`)
          .join('L') +
        'Z'
    children.push({
      kind: 'path',
      d,
      fill: '#ffffff',
      stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
      strokeWidth: 0.008,
      cursor: 'move',
    })
  }
  return { kind: 'group', children }
}

export const bodyJetFloorplanMove = wallFixtureFloorplanMove<BodyJetNode>
