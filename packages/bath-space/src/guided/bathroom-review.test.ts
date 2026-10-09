import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import {
  bathroomIssues,
  levelFixtures,
  matchedAccessories,
} from './bathroom-review'
const node = (id: string, kind: string, parentId = 'level', extra = {}) =>
  ({
    id,
    type: kind === 'level' ? kind : `bath-space:${kind}`,
    parentId,
    metadata: {},
    ...extra,
  }) as unknown as AnyNode
const level = node('level', 'level', '')
test('review checks every wash assembly and ignores other floors', () => {
  const a = node('a', 'wall-hung-basin'),
    b = node('b', 'wall-hung-basin'),
    tap = node('tap', 'tap', 'a'),
    other = node('other', 'wall-hung-basin', 'other-level')
  const nodes: Record<string, AnyNode> = {
    level,
    a,
    b,
    tap,
    other,
    'other-level': node('other-level', 'level', ''),
  }
  expect(
    bathroomIssues('level', nodes, ['toilet', 'bathing']).map((i) => i.hostId),
  ).toEqual(['b'])
  expect(levelFixtures('level', nodes).some((n) => n.id === 'other')).toBe(
    false,
  )
  delete nodes.tap
  expect(bathroomIssues('level', nodes, ['toilet', 'bathing']).length).toBe(2)
})
test('area exclusions never hide incomplete existing fixtures', () => {
  const vanity = node('v', 'freestanding-vanity')
  expect(
    bathroomIssues('level', { level, v: vanity }, [
      'wash-area',
      'toilet',
      'bathing',
    ]).map((i) => i.step),
  ).toEqual(['basin'])
  expect(
    bathroomIssues('level', { level }, ['wash-area', 'toilet', 'bathing']),
  ).toEqual([])
})
test('shared towel category is matched by explicit area', () => {
  const wash = node('wash', 'towel-rail', 'level', {
      metadata: { bathSpaceAccessoryArea: 'wash-area' },
    }),
    bath = node('bath', 'towel-rail', 'level', {
      metadata: { bathSpaceAccessoryArea: 'bathing' },
    }),
    unknown = node('unknown', 'towel-rail')
  expect(
    matchedAccessories('wash-area', 'towel-rail', [wash, bath, unknown]).map(
      (n) => n.id,
    ),
  ).toEqual(['wash'])
  expect(
    matchedAccessories('bathing', 'towel-rail', [wash, bath, unknown]).map(
      (n) => n.id,
    ),
  ).toEqual(['bath'])
})
test('a control belonging to another shower does not complete a custom shower', () => {
  const arm = node('arm', 'shower-arm'),
    head = node('head', 'shower-head', 'arm'),
    control = node('control', 'shower-control', 'level', {
      metadata: { bathSpaceShowerId: 'different' },
    })
  const nodes = { level, arm, head, control }
  expect(
    bathroomIssues('level', nodes, ['wash-area', 'toilet']).map((i) => i.step),
  ).toEqual(['control'])
  control.metadata = { bathSpaceShowerId: 'arm' }
  expect(bathroomIssues('level', nodes, ['wash-area', 'toilet'])).toEqual([])
})
test('bath review requires its own tap unless no tap was selected', () => {
  const bath = node('bath', 'bathtub', 'level', { tapMount: 'wall' }),
    tap = node('tap', 'tap', 'level', { servesBathId: 'different' })
  const nodes = { level, bath, tap }
  expect(
    bathroomIssues('level', nodes, ['wash-area', 'toilet']).map((i) => i.step),
  ).toEqual(['review'])
  const linked = node('tap', 'tap', 'level', { servesBathId: 'bath' })
  expect(
    bathroomIssues('level', { ...nodes, tap: linked }, ['wash-area', 'toilet']),
  ).toEqual([])
  const noTap = node('bath', 'bathtub', 'level', { tapMount: 'none' })
  expect(
    bathroomIssues('level', { level, bath: noTap }, ['wash-area', 'toilet']),
  ).toEqual([])
})
