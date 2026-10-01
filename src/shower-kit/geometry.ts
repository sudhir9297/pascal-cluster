import { WallNode, type AnyNode, type GeometryContext } from '@pascal-app/core'
import { Group, Vector3 } from 'three'
import { buildShowerArmGeometry } from '../shower-arm/geometry'
import { ShowerArmNode } from '../shower-arm/schema'
import { buildShowerHeadGeometry } from '../shower-head/geometry'
import { ShowerHeadNode } from '../shower-head/schema'
import { showerHeadTarget } from '../shower-arm/attachment'
import { buildShowerMountGeometry } from '../shower-mount/geometry'
import { ShowerMountNode } from '../shower-mount/schema'
import { showerMountSockets } from '../shower-mount/targets'
import { buildHandShowerGeometry } from '../hand-shower/geometry'
import { HandShowerNode } from '../hand-shower/schema'
import { buildShowerHoseGeometry } from '../shower-hose/geometry'
import { ShowerHoseNode } from '../shower-hose/schema'
import { buildShowerControlGeometry } from '../shower-control/geometry'
import { ShowerControlNode } from '../shower-control/schema'
import { createKitChanges, type ShowerKitPreset } from './bundle'

export function buildKitPreview(p: ShowerKitPreset, anchor: ShowerArmNode, ctx?: GeometryContext) {
  const wall = WallNode.parse({ start: [0, 0], end: [10, 0], height: 5 })
  const changes = createKitChanges(
    p,
    {
      ...anchor,
      parentId: wall.id,
      wallId: wall.id,
      position: [5, anchor.mountingHeight, 0.05],
      side: 'front',
    },
    { [wall.id]: wall } as Record<string, AnyNode>,
  )
  const root = new Group()
  if (!changes) return root
  const nodes = {
    [wall.id]: wall,
    ...Object.fromEntries(changes.create.map((c) => [c.node.id, c.node])),
  } as Record<string, AnyNode>
  const context = {
    ...ctx,
    resolve: (id: string) => nodes[id] ?? ctx?.resolve(id as never),
  } as GeometryContext
  const [armRaw, headRaw, mountRaw, handRaw, hoseRaw, controlRaw] = changes.create.map(
    (c) => c.node,
  )
  const arm = anchor,
    mount = ShowerMountNode.parse(mountRaw)
  const armObject = buildShowerArmGeometry(arm, context)
  const headObject = buildShowerHeadGeometry(ShowerHeadNode.parse(headRaw), context)
  const headPose = showerHeadTarget(arm)
  headObject.position.fromArray(headPose.position)
  headObject.rotation.set(...headPose.rotation)
  armObject.add(headObject)
  root.add(armObject)
  const mountObject = buildShowerMountGeometry(mount, context)
  const handObject = buildHandShowerGeometry(HandShowerNode.parse(handRaw), context)
  const handPose = showerMountSockets(mount).find((s) => s.id === 'hand-shower')!
  handObject.position.fromArray(handPose.position)
  handObject.rotation.set(...handPose.rotation)
  mountObject.add(handObject)
  const hose = ShowerHoseNode.parse(hoseRaw),
    hoseObject = buildShowerHoseGeometry(hose, context)
  hoseObject.position.fromArray(hose.position)
  mountObject.add(hoseObject)
  const origin = new Vector3(...ShowerArmNode.parse(armRaw).position)
  mountObject.position.copy(new Vector3(...mount.position).sub(origin))
  root.add(mountObject)
  const control = ShowerControlNode.parse(controlRaw),
    controlObject = buildShowerControlGeometry(control, context)
  controlObject.position.copy(new Vector3(...control.position).sub(origin))
  root.add(controlObject)
  return root
}
