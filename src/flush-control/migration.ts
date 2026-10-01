import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import {
  WALL_HUNG_TOILET,
  WallHungToiletNode,
} from '../wall-hung-toilet/schema'
import { defaultToiletControl, toiletFlushControls } from './attachment'
import { WALL_FLUSH_PLATE } from './schema'
import { flushPlatePlacement } from './placement'
export function separateLegacyToiletControls(
  nodes: Readonly<Record<string, AnyNode>>,
) {
  const create: Array<{ node: AnyNode; parentId: AnyNodeId }> = [],
    update: Array<{ id: AnyNodeId; data: Partial<AnyNode> }> = []
  for (const raw of Object.values(nodes)) {
    if (String(raw.type) !== WALL_HUNG_TOILET) continue
    const n = WallHungToiletNode.parse(raw)
    if (n.flushControlsSeparated) continue
    const legacy = raw as unknown as Record<string, unknown>
    let control =
      toiletFlushControls(n.id, nodes).length ||
      (n.tankType === 'concealed' && legacy.flushPlateEnabled === false)
        ? null
        : defaultToiletControl(n, nodes)
    if (control) {
      const slots = n.slots?.hardware
        ? { plate: n.slots.hardware, buttons: n.slots.hardware }
        : undefined
      if (control.type === WALL_FLUSH_PLATE) {
        control = {
          ...control,
          width:
            typeof legacy.flushPlateWidth === 'number'
              ? legacy.flushPlateWidth
              : control.width,
          mountingHeight:
            typeof legacy.flushPlateHeight === 'number'
              ? legacy.flushPlateHeight
              : 1,
          flushMode: legacy.dualFlush === false ? 'single' : 'dual',
          slots,
        }
        const wall = nodes[control.wallId ?? '']
        if (wall?.type === 'wall')
          control = {
            ...control,
            ...flushPlatePlacement(
              control,
              wall,
              control.position[0],
              control.side,
              0,
              true,
            ),
          }
      } else
        control = {
          ...control,
          chainLength:
            typeof legacy.pullChainLength === 'number'
              ? legacy.pullChainLength
              : 0.8,
          flushMode:
            n.tankType === 'high-level'
              ? 'single'
              : legacy.dualFlush === false
                ? 'single'
                : 'dual',
          slots,
        }
      create.push({
        node: control as unknown as AnyNode,
        parentId: control.parentId as AnyNodeId,
      })
    }
    update.push({
      id: raw.id,
      data: {
        flushControlsSeparated: true,
        flushPlateEnabled: undefined,
        flushPlateWidth: undefined,
        flushPlateHeight: undefined,
        dualFlush: undefined,
        pullChainLength: undefined,
      } as unknown as Partial<AnyNode>,
    })
  }
  return { create, update }
}
