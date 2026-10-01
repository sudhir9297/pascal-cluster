import { BATH_SHOWER, BathShowerNode } from '../bath-shower/schema'
import { bathShowerWorldPose } from '../bath-shower/mounting'
import { fitShowerPlacement } from '../shower-assembly/placement'
import { showerHeadHost } from './attachment'
import { Euler, Vector3, Matrix4 } from 'three'
import { SHOWER_CONNECTOR } from '../shower-connector/schema'
import {
  getEffectiveNode,
  type AnyNodeId,
  type AnyNode,
  type FloorplanGeometry,
  type GeometryContext,
} from '@pascal-app/core'
import { ShowerArmNode, SHOWER_ARM } from '../shower-arm/schema'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
import { showerHeadTarget } from '../shower-arm/attachment'
import { isCircularHead } from './geometry'
import type { ShowerHeadNode } from './schema'
export function showerHeadFloorplan(
  n: ShowerHeadNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const raw = ctx.resolve(n.parentId as AnyNodeId)
  let host = raw ? showerHeadHost(raw) : null
  if (!host) return null
  const adapterTransform = new Matrix4(),
    seen = new Set<string>()
  while (host.node.type === SHOWER_CONNECTOR) {
    if (seen.has(host.node.id)) return null
    seen.add(host.node.id)
    const slot = host.slot
    const local = new Matrix4().makeRotationFromEuler(new Euler(...slot.rotation))
    local.setPosition(...slot.position)
    adapterTransform.premultiply(local)
    const parent: AnyNode | null | undefined = ctx.resolve(host.node.parentId as AnyNodeId)
    host = parent ? showerHeadHost(parent) : null
    if (!host) return null
  }
  const isBath = String(host.node.type) === BATH_SHOWER,
    bathPose = isBath
      ? bathShowerWorldPose(BathShowerNode.parse(host.node), (id) => ctx.resolve(id as AnyNodeId))
      : null
  if (isBath && !bathPose) return null
  const arm = host.node,
    wall = ctx.resolve((arm.wallId ?? arm.parentId) as AnyNodeId)
  if (wall?.type !== 'wall') return null
  const rawPlacement = showerArmPlacement(
      arm,
      getEffectiveNode(wall),
      arm.position[0],
      arm.side,
      0,
      true,
    ),
    placement = fitShowerPlacement(arm, rawPlacement, (id) => ctx.resolve(id)),
    pose = bathPose ?? showerArmPlanPose({ ...arm, ...placement }, wall),
    target = host.slot
  if (!placement) return null
  const c = Math.cos(pose.yaw),
    s = Math.sin(pose.yaw)
  const faceY = -n.neckLength - (n.style === 'bell' ? n.bellHeight : n.thickness)
  const project = ([x, z]: [number, number]) => {
    const p = new Vector3(x, faceY, z)
      .applyEuler(new Euler((n.tilt * Math.PI) / 180, (n.swivel * Math.PI) / 180, 0))
      .applyMatrix4(adapterTransform)
      .applyEuler(new Euler(...target.rotation))
      .add(new Vector3(...target.position))
    return [pose.x + p.x * c + p.z * s, pose.z - p.x * s + p.z * c].join(',')
  }
  const points: Array<[number, number]> = isCircularHead(n)
    ? Array.from({ length: 48 }, (_, i) => [
        (Math.cos((i / 48) * Math.PI * 2) * n.width) / 2,
        (Math.sin((i / 48) * Math.PI * 2) * n.width) / 2,
      ])
    : [
        [-n.width / 2, -n.depth / 2],
        [n.width / 2, -n.depth / 2],
        [n.width / 2, n.depth / 2],
        [-n.width / 2, n.depth / 2],
      ]
  return {
    kind: 'path',
    d: `M${points.map(project).join('L')}Z`,
    fill: '#ffffff',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.006,
    cursor: 'move',
  }
}
