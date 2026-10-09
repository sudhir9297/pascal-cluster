import { getEffectiveNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { ShowerArmNode, showerArmPresets } from '../shower-arm/schema'
import {
  showerArmPlacement,
  type ShowerArmPlacement,
  type WallMountNode,
} from '../shower-arm/placement'
import { showerHeadTarget } from '../shower-arm/attachment'
import { ShowerHeadNode, showerHeadPresets } from '../shower-head/schema'
import { ShowerMountNode } from '../shower-mount/schema'
import { showerMountSockets } from '../shower-mount/targets'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHoseNode } from '../shower-hose/schema'
import { ShowerControlNode } from '../shower-control/schema'

export const showerKitPresets = [
  {
    id: 'round-rail-kit',
    label: 'Round rain with rail',
    square: false,
    rail: true,
    bath: false,
  },
  {
    id: 'square-rail-kit',
    label: 'Square rain with rail',
    square: true,
    rail: true,
    bath: false,
  },
  {
    id: 'compact-kit',
    label: 'Compact with holder',
    square: false,
    rail: false,
    bath: false,
  },
  {
    id: 'bath-shower-kit',
    label: 'Classic bath shower',
    square: false,
    rail: true,
    bath: true,
  },
] as const
export type ShowerKitPreset = (typeof showerKitPresets)[number]
export function kitAnchor(p: ShowerKitPreset) {
  const style = p.square ? 'square-elbow' : 'round-elbow'
  return ShowerArmNode.parse({
    ...showerArmPresets.find((n) => n.style === style),
    name: `${p.label} — arm`,
    mountingHeight: 2.1,
  })
}

// The anchor is a real arm, not an invisible group. Other wall fixtures retain
// wall parents; attached heads and handsets retain their compatible slot hosts.
export function fitKitPlacement(
  p: ShowerKitPreset,
  anchor: ShowerArmNode,
  pose: ShowerArmPlacement,
  nodes: Readonly<Record<string, AnyNode>>,
): ShowerArmPlacement | null {
  const raw = nodes[pose.wallId]
  if (raw?.type !== 'wall') return null
  const wall = getEffectiveNode(raw),
    level = nodes[wall.parentId ?? '']
  const length = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])
  const wallHeight =
    wall.height ?? (level?.type === 'level' ? getEffectiveNode(level).height : null) ?? 2.5
  const armHalf = Math.max(anchor.tubeSize, anchor.flangeEnabled ? anchor.flangeSize : 0) / 2
  const controlHalf = p.bath ? 0.19 : 0.09
  const low = Math.max(armHalf, controlHalf, p.bath ? 0.09 : p.rail ? 0.125 : 0.05),
    high = 0.45 + 0.09
  const [minX, maxX] = pose.side === 'front' ? [low, length - high] : [high, length - low]
  const maxY = wallHeight - 0.12
  if (maxX < minX || maxY < 1.85) return null
  const height = Math.max(1.85, Math.min(maxY, pose.mountingHeight))
  return {
    ...pose,
    mountingHeight: height,
    position: [Math.max(minX, Math.min(maxX, pose.position[0])), height, pose.position[2]],
  }
}

export function createKitChanges(
  p: ShowerKitPreset,
  anchor: ShowerArmNode,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const wall = nodes[anchor.wallId ?? '']
  if (wall?.type !== 'wall' || anchor.parentId !== wall.id) return null
  const rawPose = showerArmPlacement(
    anchor,
    getEffectiveNode(wall),
    anchor.position[0],
    anchor.side,
  )
  const pose = rawPose && fitKitPlacement(p, anchor, rawPose, nodes)
  if (!pose) return null
  const arm = ShowerArmNode.parse({ ...anchor, ...pose })
  const rootPose = (n: WallMountNode, dx: number, dy: number) => {
    const at = showerArmPlacement(
      { ...n, mountingHeight: pose.mountingHeight + dy },
      getEffectiveNode(wall),
      pose.position[0] + dx * (pose.side === 'front' ? 1 : -1),
      pose.side,
    )
    if (!at) throw new Error('Kit fitting must have a valid wall')
    return at
  }
  const mountDefaults = ShowerMountNode.parse({
    style: p.rail ? (p.square ? 'square-rail' : 'round-rail') : 'round-combined',
    railSupply: p.rail,
    railLength: 0.7,
    sliderPosition: 0.65,
    name: p.rail ? 'Kit slide rail and outlet' : 'Kit holder and outlet',
  })
  const mount = ShowerMountNode.parse({ ...mountDefaults, ...rootPose(mountDefaults, 0.45, -0.7) })
  const controlDefaults = ShowerControlNode.parse({
    name: p.bath ? 'Kit bath and shower mixer' : 'Kit mixer and diverter trim',
    layout: p.bath ? 'bridge' : 'dual',
    plateShape: p.square ? 'rectangle' : 'round',
    handleShape: p.square ? 'square' : 'round',
    handleStyle: p.bath ? 'cross' : 'lever',
    outletCount: 2,
    spoutEnabled: p.bath,
    spoutStyle: 'round-curved',
  })
  const control = ShowerControlNode.parse({
    ...controlDefaults,
    ...rootPose(controlDefaults, 0, -1.05),
  })
  const headStyle = p.bath ? 'bell' : p.square ? 'square-rain' : p.rail ? 'round-rain' : 'compact'
  const head = ShowerHeadNode.parse({
    ...showerHeadPresets.find((n) => n.style === headStyle),
    parentId: arm.id,
    position: showerHeadTarget(arm).position,
    name: 'Kit overhead shower',
  })
  const handSlot = showerMountSockets(mount).find((s) => s.id === 'hand-shower')!
  const hoseSlot = showerMountSockets(mount).find((s) => s.id === 'hose')!
  const hand = HandShowerNode.parse({
    style: p.bath ? 'round-wand' : p.square ? 'square' : 'round',
    parentId: mount.id,
    position: handSlot.position,
    name: 'Kit hand shower',
  })
  const hose = ShowerHoseNode.parse({
    parentId: mount.id,
    targetId: hand.id,
    position: hoseSlot.position,
    style: p.bath ? 'metal' : 'smooth',
    length: 1.6,
    name: 'Kit shower hose',
  })
  const parts = [
    { ...arm, children: [head.id] },
    head,
    { ...mount, children: [hand.id, hose.id] },
    hand,
    hose,
    control,
  ]
  // Refer to real nodes by ID; their kinds already live on the nodes themselves.
  const included = parts.map((n) => ({ id: n.id, name: n.name }))
  return {
    create: parts.map((n) => ({
      node: {
        ...n,
        metadata: { ...n.metadata, showerKit: { anchorId: arm.id, presetId: p.id, included } },
      } as unknown as AnyNode,
      parentId: n.parentId as AnyNodeId,
    })),
  }
}
