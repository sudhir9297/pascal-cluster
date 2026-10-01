import {BATH_SHOWER,BathShowerNode} from '../bath-shower/schema'
import {bathShowerWorldPose} from '../bath-shower/mounting'
import { fitShowerPlacement } from '../shower-assembly/placement'
import {
  getEffectiveNode,
  type AnyNodeId,
  type GeometryContext,
  type FloorplanGeometry,
} from '@pascal-app/core'
import { Vector3, Euler } from 'three'
import { handShowerHost } from './attachment'
import { showerArmPlacement, showerArmPlanPose } from '../shower-arm/placement'
import type { HandShowerNode } from './schema'
export function handShowerFloorplan(
  n: HandShowerNode,
  ctx: GeometryContext,
): FloorplanGeometry | null {
  const raw = ctx.resolve(n.parentId as AnyNodeId),
    host = raw ? handShowerHost(raw) : null
  if (!host) return null
  const isBath=String(host.node.type)===BATH_SHOWER,bathPose=isBath?bathShowerWorldPose(BathShowerNode.parse(host.node),id=>ctx.resolve(id as AnyNodeId)):null;if(isBath&&!bathPose)return null
  const wall = ctx.resolve((host.node.wallId ?? host.node.parentId) as AnyNodeId)
  if (wall?.type !== 'wall') return null
  const rawPlacement = showerArmPlacement(
      host.node,
      getEffectiveNode(wall),
      host.node.position[0],
      host.node.side,
      0,
      true,
    ),
    placement = fitShowerPlacement(host.node, rawPlacement, (id) => ctx.resolve(id)),
    pose = bathPose??showerArmPlanPose({ ...host.node, ...placement }, wall)
  if (!placement) return null
  const c = Math.cos(pose.yaw),
    s = Math.sin(pose.yaw),
    wand = n.style.endsWith('wand'),
    half = (wand ? n.handleDiameter : n.headWidth) / 2
  const points: [number, number][] = [
    [-half, -n.gripInsertion],
    [half, -n.gripInsertion],
    [half, n.handleLength + (wand ? 0 : n.headHeight)],
    [-half, n.handleLength + (wand ? 0 : n.headHeight)],
  ]
  const project = ([x, y]: [number, number]) => {
    const p = new Vector3(x, y, n.headThickness / 2)
      .applyEuler(new Euler(...host.slot.rotation))
      .add(new Vector3(...host.slot.position))
    return [pose.x + p.x * c + p.z * s, pose.z - p.x * s + p.z * c].join(',')
  }
  return {
    kind: 'path',
    d: `M${points.map(project).join('L')}Z`,
    fill: '#ffffff',
    stroke: ctx.viewState?.selected ? '#8b5cf6' : '#737373',
    strokeWidth: 0.008,
    cursor: 'move',
  }
}
