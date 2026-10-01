import { expect, test } from 'bun:test'
import {
  dividerChainEnds,
  dividerDraftError,
  dividerDraftSegments,
} from './drawing'

test('pointer draft poses preserve elevation and endpoints without creating scene nodes', () => {
  const segments = dividerDraftSegments([1, 2], [4, 6], false, 1.25)
  expect(segments).toHaveLength(1)
  expect(segments[0]!.width).toBe(5)
  expect(segments[0]!.position).toEqual([2.5, 1.25, 4])
  expect('id' in segments[0]!).toBe(false)
  expect(dividerDraftSegments(null, [4, 6], false, 0)).toEqual([])
  expect(
    dividerDraftError(dividerDraftSegments([0, 0], [0, 0], false, 0)),
  ).toBe('')
})

test('degenerate and excessive rectangles cannot partially commit', () => {
  expect(
    dividerDraftError(dividerDraftSegments([0, 0], [0, 2], true, 0)),
  ).not.toBe('')
  expect(
    dividerDraftError(dividerDraftSegments([0, 0], [9, 2], true, 0)),
  ).not.toBe('')
  expect(dividerDraftError(dividerDraftSegments([0, 0], [2, 3], true, 0))).toBe(
    '',
  )
})

test('continuation follows wall single mode, closure and joining existing geometry', () => {
  const args = {
    rectangle: false,
    continuation: 'room',
    first: [0, 0] as [number, number],
    end: [2, 0] as [number, number],
    joinedExisting: false,
  }
  expect(dividerChainEnds(args)).toBe(false)
  expect(dividerChainEnds({ ...args, continuation: 'single' })).toBe(true)
  expect(dividerChainEnds({ ...args, end: [0, 0] })).toBe(true)
  expect(dividerChainEnds({ ...args, joinedExisting: true })).toBe(true)
  expect(dividerChainEnds({ ...args, rectangle: true })).toBe(true)
})
