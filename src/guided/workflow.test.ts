import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { bathroomWorkflow, nextBathroomStage } from './workflow'

const node = (id: string, type: string, parentId: string | null = 'level', metadata = {}) => ({ id, type, parentId, metadata }) as unknown as AnyNode

test('overview resumes missing essentials and reflects catalog additions and deletion', () => {
  const nodes: Record<string, AnyNode> = { level: node('level', 'level', null) }
  expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('wash-area')
  nodes.basin = node('basin', 'bath-space:wall-hung-basin')
  expect(bathroomWorkflow('level', nodes)[0]?.status).toBe('In progress')
  nodes.tap = node('tap', 'bath-space:tap', 'basin')
  expect(bathroomWorkflow('level', nodes)[0]?.status).toBe('Complete')
  expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('toilet')
  delete nodes.tap
  expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('wash-area')
})

test('excluded empty areas are skipped but existing incomplete fixtures still need attention', () => {
  const nodes: Record<string, AnyNode> = { level: node('level', 'level', null, { bathSpaceExcludedAreas: ['wash-area', 'toilet', 'bathing'] }) }
  expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('review')
  nodes.basin = node('basin', 'bath-space:wall-hung-basin')
  expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('wash-area')
})

test('review completion is revoked by missing essentials and respects level isolation', () => {
  const nodes: Record<string, AnyNode> = {
    level: node('level', 'level', null, { bathSpaceReviewed: true, bathSpaceExcludedAreas: ['wash-area', 'toilet', 'bathing'] }),
    other: node('other', 'level', null),
    basin: node('basin', 'bath-space:wall-hung-basin', 'other'),
  }
  expect(bathroomWorkflow('level', nodes).at(-1)?.status).toBe('Complete')
  nodes.basin = node('basin', 'bath-space:wall-hung-basin')
  expect(bathroomWorkflow('level', nodes).at(-1)?.status).toBe('In progress')
})


test('finished review resumes the summary even when optional accessories were not added', () => {
  const nodes = {
    level: node('level', 'level', null, { bathSpaceReviewed: true, bathSpaceExcludedAreas: ['toilet', 'bathing'] }),
    basin: node('basin', 'bath-space:wall-hung-basin'),
    tap: node('tap', 'bath-space:tap', 'basin'),
  }
  const workflow = bathroomWorkflow('level', nodes)
  expect(workflow.find((area) => area.id === 'accessories')?.status).toBe('Not started')
  expect(nextBathroomStage(workflow)).toBe('review')
})
