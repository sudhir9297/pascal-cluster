import { tapHost, fixtureTapSlots, fixtureTapLocalToLevel } from './fixture-host'
import { useScene, useLiveNodeOverrides } from '@pascal-app/core'
import { isGridSnapActive, useEditor } from '@pascal-app/editor'
import { attachmentChanges } from '../attachments/slots'
import { BasinNode, isBasinKind } from '../countertop-basin/schema'
import { basinTapSlots, basinTapLocalToLevel, tapOccupancySlot } from '../countertop-basin/tap-attachment'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { resolveWallTapTarget } from './binding'
import { wallTapPlacementInPlan } from './wall-placement'
import { getTapPreset } from './presets'
import { TapNode } from './schema'
import type { AnyNode, AnyNodeId, FloorplanMoveTarget, GeometryContext } from '@pascal-app/core'
import { tapLevelPose } from './attachment'
import { tapPlacementChanges } from './placement'
import { basinTapHoleSpacing } from '../countertop-basin/tap-layout'
import { tapDimensions } from './geometry'

export function tapFloorplan(node: TapNode, ctx: GeometryContext) {
  const nodes: Record<string, AnyNode> = {}
  for (const start of [node.parentId, node.servesBasinId, node.servesBathId]) {
    let parentId = start
    while (parentId && !nodes[parentId]) {
      const parent = ctx.resolve(parentId as AnyNodeId)
      if (!parent) break
      nodes[parentId] = parent
      parentId = parent.parentId
    }
  }
  const pose = tapLevelPose(node, nodes), p = tapDimensions(node)
  const c = Math.cos(pose.rotation), s = Math.sin(pose.rotation), radius = p.mount === 'wall' ? p.design === 'mixer' ? p.wallSpacing/2+.035 : p.bodyRadius*(.052/.024) : Math.max(p.baseWidth/2,p.bodyRadius,p.mountingLayout === 'three-hole' ? (nodes[node.parentId ?? ''] && isBasinKind(String(nodes[node.parentId!]?.type)) ? basinTapHoleSpacing(BasinNode.parse(nodes[node.parentId!])) : p.holeSpacing) / 2 + .027 : 0)
  return { kind: 'polygon' as const, fill: '#adb5bd', stroke: ctx.viewState?.selected ? '#8b5cf6' : '#4b5563', strokeWidth: .008,
    points: [[-radius,radius],[radius,radius],[radius,-p.reach],[-radius,-p.reach]].map(([x,z]) =>
      [pose.position[0]+x!*c+z!*s, pose.position[2]-x!*s+z!*c] as [number,number]) }
}

export const tapFloorplanMove: FloorplanMoveTarget<TapNode> = ({ node }) => {
  const initialNodes = useScene.getState().nodes
  const start = tapLevelPose(node, initialNodes)
  const levelId = vanityLevelId(node.parentId, initialNodes)
  let anchor: readonly [number, number] | null = null
  let latest: TapNode | null = null
  return {
    affectedIds: [node.id as AnyNodeId],
    apply({ planPoint }) {
      anchor ??= planPoint
      const point: [number, number] = [start.position[0] + planPoint[0] - anchor[0], start.position[2] + planPoint[1] - anchor[1]]
      const nodes = useScene.getState().nodes
      latest = null
      if (getTapPreset(node.presetId).mount === 'wall') {
        const target = wallTapPlacementInPlan(node, point, nodes, levelId, isGridSnapActive() ? useEditor.getState().gridSnapStep : 0)
        if (target) latest = resolveWallTapTarget(node, target, nodes)
      } else {
        let distance = .4
        for (const raw of Object.values(nodes)) {
          if (!tapHost(raw) || raw.visible === false || vanityLevelId(raw.parentId, nodes) !== levelId) continue
          const basin = tapHost(raw)!
          if ('tapMount' in basin && tapDimensions(node).mountingLayout !== 'single-hole') continue
          for (const slot of fixtureTapSlots(basin, nodes)) {
            const pose = fixtureTapLocalToLevel(basin, slot, nodes)
            const delta = Math.hypot(pose.position[0] - point[0], pose.position[2] - point[1])
            if (delta >= distance) continue
            distance = delta
            latest = TapNode.parse({ ...node, parentId: basin.id, wallId: null, servesBasinId: null, servesBathId: null, slotId: slot.id, position: slot.position, rotation: slot.rotation })
          }
        }
      }
      if (latest) useLiveNodeOverrides.getState().set(node.id, latest)
      else useLiveNodeOverrides.getState().clear(node.id)
    },
    canCommit: () => latest !== null,
    commit() {
      if (!latest) return
      const nodes = useScene.getState().nodes
      const slot = tapOccupancySlot(latest as unknown as AnyNode)!
      useLiveNodeOverrides.getState().clear(node.id)
      if (getTapPreset(latest.presetId).mount === 'wall') useScene.getState().applyNodeChanges(attachmentChanges(latest as unknown as AnyNode, { ...slot, type: 'tap', capacity: 1 }, 'tap', nodes, tapOccupancySlot, node.id))
      else {
        const basin = tapHost(nodes[latest.parentId! as AnyNodeId])!, pose = fixtureTapLocalToLevel(basin, latest, nodes)
        const { changes } = tapPlacementChanges(latest, { parentId: basin.id, slotId: latest.slotId, position: latest.position, rotation: latest.rotation, levelPose: pose }, nodes, node.id)
        useScene.getState().applyNodeChanges(changes)
      }
    },
  }
}
