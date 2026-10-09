import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { reconcileBathingArea, type BathingFlow } from './bathing-area'
import { bathroomReviewFix, bathroomReviewState } from './review-state'
const node = (id: string, kind: string, parentId = 'level', extra = {}) => ({ id, type: kind === 'level' ? kind : `bath-space:${kind}`, parentId, metadata: {}, ...extra }) as unknown as AnyNode

test('review groups essentials and keeps optional and skipped accessories nonblocking', () => {
  const nodes = {
    level: node('level', 'level', '', { metadata: { bathSpaceExcludedAreas: ['toilet', 'bathing'], bathSpaceAccessories: { skipped: ['wash-area:mirror'] } } }),
    basin: node('basin', 'wall-hung-basin'),
    tap: node('tap', 'tap', 'level', { servesBasinId: 'basin' }),
    rail: node('rail', 'towel-rail', 'level', { metadata: { bathSpaceAccessoryArea: 'wash-area' } }),
  }
  const review = bathroomReviewState('level', nodes)
  expect(review.canFinish).toBe(true)
  expect(review.groups[0]?.fixtures.map((node) => node.id)).toEqual(['basin', 'tap', 'rail'])
  expect(review.groups[0]?.optional.map((choice) => choice.status)).toEqual(['Skipped', 'Optional', 'Added'])
  expect(review.groups[1]?.optional).toEqual([])
  expect(review.areaCount).toBe(1)
  expect(review.optionalCount).toBe(1)
})

test('finished summary checks placed fixtures instead of a stale layout confirmation flag', () => {
  const level = node('level', 'level', '', { metadata: { bathSpaceSetupComplete: true, bathSpaceLayoutComplete: false, bathSpaceReviewed: true, bathSpaceExcludedAreas: ['toilet', 'bathing'] } })
  const basin = node('basin', 'wall-hung-basin'), tap = node('tap', 'tap', 'basin')
  const nodes = { level, basin, tap }
  expect(bathroomReviewState('level', nodes).finished).toBe(true)
  level.metadata = { ...level.metadata, bathSpaceLayoutComplete: true }
  expect(bathroomReviewState('level', nodes).finished).toBe(true)
  expect(bathroomReviewState('level', { level, basin }).finished).toBe(false)
})

test('fixing a shower head preserves the selected bath, control, and divider', () => {
  const flow = { step: 'complete', kind: 'both', system: 'custom', bathId: 'bath', showerId: 'arm', controlId: 'control', dividerIds: ['divider'], dividerSkipped: false }
  const nodes = {
    level: node('level', 'level', '', { metadata: { bathSpaceBathingArea: flow, bathSpaceExcludedAreas: ['wash-area', 'toilet'] } }),
    bath: node('bath', 'bathtub', 'level', { tapMount: 'none' }), arm: node('arm', 'shower-arm'),
    control: node('control', 'shower-control', 'level', { metadata: { bathSpaceShowerId: 'arm' } }), divider: node('divider', 'shower-divider'),
  }
  const repair = bathroomReviewFix('level', 'arm:head', nodes)!
  expect(repair.focusId).toBe('arm')
  expect(repair.metadata.bathSpaceBathingArea).toEqual({ ...flow, step: 'head' })
  expect(repair.metadata.bathSpaceReviewed).toBe(false)
})

test('review catches a missing selected shower and targets it without dropping the bath', () => {
  const nodes = {
    level: node('level', 'level', '', { metadata: { bathSpaceBathingArea: { step: 'complete', kind: 'both', system: 'kit', bathId: 'bath' }, bathSpaceExcludedAreas: ['wash-area', 'toilet'] } }),
    bath: node('bath', 'bathtub', 'level', { tapMount: 'none' }),
  }
  const review = bathroomReviewState('level', nodes)
  expect(review.issues.map((issue) => issue.id)).toEqual(['bathing:required-shower'])
  expect(review.canFinish).toBe(false)
  expect(bathroomReviewFix('level', 'bathing:required-shower', nodes)?.metadata.bathSpaceBathingArea).toMatchObject({ kind: 'both', step: 'shower', bathId: 'bath', showerId: null })
})

test('flush repair keeps optional progress and stale fixes cannot change the scene', () => {
  const nodes = {
    level: node('level', 'level', '', { metadata: { bathSpaceToilet: { step: 'complete', mounting: 'floor', toiletId: 'toilet', holderId: 'holder', holderSkipped: false }, bathSpaceExcludedAreas: ['wash-area', 'bathing'] } }),
    toilet: node('toilet', 'floor-standing-toilet'), holder: node('holder', 'toilet-paper-holder'),
  }
  expect(bathroomReviewFix('level', 'toilet:flush', nodes)?.metadata.bathSpaceToilet).toMatchObject({ step: 'flush', holderId: 'holder', toiletId: 'toilet' })
  expect(bathroomReviewFix('level', 'missing:tap', nodes)).toBeNull()
})


test('targeted bath tap and shower repairs remain reachable when the other fixture is incomplete', () => {
  const flow: BathingFlow = { step: 'review', kind: 'both', system: 'custom', bathId: 'bath', showerId: 'arm', controlId: null, dividerIds: [], dividerSkipped: false }
  const nodes = { bath: node('bath', 'bathtub'), arm: node('arm', 'shower-arm') }
  expect(reconcileBathingArea(flow, nodes).step).toBe('review')
  expect(reconcileBathingArea({ ...flow, bathId: null, step: 'head' }, nodes).step).toBe('head')
  expect(reconcileBathingArea({ ...flow, step: 'complete' }, nodes).step).toBe('head')
})
