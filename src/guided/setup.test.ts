import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { adjacentBathroomStage, bathroomSetupPatch, includedBathroomAreas } from './setup'
import { bathroomWorkflow, nextBathroomStage } from './workflow'
const node = (id: string, type: string, parentId: string | null = 'level', metadata = {}) => ({ id, type, parentId, metadata }) as unknown as AnyNode

test('setup saves exclusions and initializes shower, bath, and combined paths', () => {
  const nodes = { level: node('level', 'level', null) }
  for (const kind of ['shower', 'bath', 'both'] as const) {
    const patch = bathroomSetupPatch('level', nodes, ['bathing'], kind)
    expect(patch.bathSpaceStage).toBe('layout')
    expect(patch.bathSpaceExcludedAreas).toEqual(['wash-area', 'toilet'])
    expect(patch.bathSpaceBathingArea?.kind).toBe(kind)
    expect(patch.bathSpaceBathingArea?.step).toBe(kind === 'shower' ? 'shower' : 'bath')
    nodes.level = node('level', 'level', null, patch)
    expect(includedBathroomAreas('level', nodes)).toEqual(['bathing'])
    expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('layout')
  }
})

test('navigation bypasses excluded areas in both directions', () => {
  expect(adjacentBathroomStage('wash-area', 'next', ['wash-area', 'bathing'])).toBe('bathing')
  expect(adjacentBathroomStage('wash-area', 'next', ['wash-area'])).toBe('accessories')
  expect(adjacentBathroomStage('bathing', 'back', ['wash-area', 'bathing'])).toBe('wash-area')
  expect(adjacentBathroomStage('toilet', 'next', ['toilet'])).toBe('accessories')
})

test('setup preserves existing bathing assemblies and cannot exclude placed fixtures', () => {
  const flow = { step: 'complete', kind: 'both', bathId: 'bath', showerId: 'shower' }
  const nodes = {
    level: node('level', 'level', null, { bathSpaceBathingArea: flow, bathSpaceExcludedAreas: ['bathing'] }),
    bath: node('bath', 'bath-space:bathtub'),
    other: node('other', 'level', null),
    toilet: node('toilet', 'bath-space:wall-hung-toilet', 'other'),
  }
  expect(includedBathroomAreas('level', nodes)).toContain('bathing')
  const patch = bathroomSetupPatch('level', nodes, ['wash-area'], 'shower')
  expect(patch.bathSpaceExcludedAreas).toEqual(['toilet'])
  expect(patch.bathSpaceBathingArea).toBeUndefined()
  expect(nodes.level.metadata?.bathSpaceBathingArea).toBe(flow)
  expect(patch.bathSpaceReviewed).toBe(false)
})
