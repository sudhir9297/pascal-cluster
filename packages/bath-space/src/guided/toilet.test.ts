import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { FloorStandingToiletNode } from '../floor-standing-toilet/schema'
import { WallHungToiletNode } from '../wall-hung-toilet/schema'
import {
  CisternFlushControlNode,
  WallFlushPlateNode,
} from '../flush-control/schema'
import { ToiletPaperHolderNode } from '../toilet-paper-holder/schema'
import { toiletFlushControls } from '../flush-control/attachment'
import {
  acceptToiletPlacement,
  emptyToilet,
  readToilet,
  reconcileToilet,
} from './toilet'
const node = (value: unknown) => value as AnyNode

test('guided toilet accepts chosen mounting and waits for Next', () => {
  const floor = node(FloorStandingToiletNode.parse({})),
    wall = node(WallHungToiletNode.parse({}))
  expect(acceptToiletPlacement(emptyToilet, floor)).toBeNull()
  expect(
    acceptToiletPlacement({ ...emptyToilet, mounting: 'wall' }, floor),
  ).toBeNull()
  const flow = acceptToiletPlacement(
    { ...emptyToilet, mounting: 'wall' },
    wall,
  )!
  expect(flow.toiletId).toBe(wall.id)
  expect(flow.step).toBe('toilet')
  expect(
    acceptToiletPlacement({ ...emptyToilet, mounting: 'floor' }, floor)
      ?.toiletId,
  ).toBe(floor.id)
})
test('guided toilet requires its own flush control and recovers from deletion', () => {
  const toilet = node(FloorStandingToiletNode.parse({}))
  const control = node(CisternFlushControlNode.parse({ parentId: toilet.id }))
  const other = node(WallFlushPlateNode.parse({ servesToiletId: 'other' }))
  const nodes = {
    [toilet.id]: toilet,
    [control.id]: control,
    [other.id]: other,
  }
  const flow = {
    ...emptyToilet,
    toiletId: toilet.id,
    step: 'complete' as const,
    holderSkipped: true,
  }
  expect(toiletFlushControls(toilet.id, nodes)).toEqual([control])
  expect(reconcileToilet(flow, nodes)).toEqual(flow)
  expect(
    reconcileToilet(flow, { [toilet.id]: toilet, [other.id]: other }).step,
  ).toBe('flush')
  expect(reconcileToilet(flow, {}).step).toBe('toilet')
})
test('guided holder placement completes and deletion reopens the optional step', () => {
  const toilet = node(WallHungToiletNode.parse({}))
  const control = node(WallFlushPlateNode.parse({ servesToiletId: toilet.id }))
  const holder = node(ToiletPaperHolderNode.parse({}))
  const flow = acceptToiletPlacement(
    { ...emptyToilet, toiletId: toilet.id, step: 'holder' },
    holder,
  )!
  expect(flow.step).toBe('complete')
  expect(flow.holderSkipped).toBe(false)
  expect(
    reconcileToilet(flow, { [toilet.id]: toilet, [control.id]: control }).step,
  ).toBe('holder')
  expect(readToilet(JSON.parse(JSON.stringify(flow)))).toEqual(flow)
  expect(readToilet({ step: 'unknown' })).toEqual(emptyToilet)
})
