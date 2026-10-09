import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { bathroomLayout, bathroomLayoutPatch, bathroomWashAreaFlow } from './layout'
import { bathroomWorkflow, nextBathroomStage } from './workflow'
const node = (id: string, type: string, parentId: string | null = 'level', metadata = {}) => ({ id, type, parentId, metadata }) as unknown as AnyNode

test('layout requires both bath and shower when selected and ignores other floors', () => {
  const nodes: Record<string, AnyNode> = {
    level: node('level', 'level', null, { bathSpaceSetupComplete: true, bathSpaceExcludedAreas: ['wash-area', 'toilet'], bathSpaceBathingArea: { step: 'bath', kind: 'both' } }),
    bath: node('bath', 'bath-space:bathtub'),
    other: node('other', 'level', null),
    shower: node('shower', 'bath-space:shower-arm', 'other'),
  }
  expect(bathroomLayout('level', nodes).map((fixture) => Boolean(fixture.node))).toEqual([true, false])
  expect(bathroomLayoutPatch('level', nodes)).toBeNull()
  nodes.shower = node('shower', 'bath-space:shower-arm')
  const patch = bathroomLayoutPatch('level', nodes)!
  expect(patch.bathSpaceLayoutComplete).toBe(true)
  expect(patch.bathSpaceBathingArea).toMatchObject({ bathId: 'bath', showerId: 'shower', kind: 'both', system: 'custom', step: 'head' })
  nodes.level = node('level', 'level', null, { ...nodes.level.metadata, ...patch })
  expect(bathroomWorkflow('level', nodes)[0]?.status).toBe('Complete')
  delete nodes.bath
  expect(nextBathroomStage(bathroomWorkflow('level', nodes))).toBe('layout')
})

test('layout hands off catalog fixtures to the fitting steps without creating duplicates', () => {
  const nodes = {
    level: node('level', 'level', null, { bathSpaceExcludedAreas: ['bathing'] }),
    vanity: node('vanity', 'bath-space:freestanding-vanity'),
    toilet: node('toilet', 'bath-space:floor-standing-toilet'),
  }
  expect(bathroomLayoutPatch('level', nodes)).toMatchObject({
    bathSpaceWashArea: { vanityId: 'vanity', basinId: null, step: 'basin', withoutVanity: false },
    bathSpaceToilet: { toiletId: 'toilet', mounting: 'floor', step: 'flush' },
    bathSpaceStage: 'wash-area',
  })
})

test('standalone basins proceed to taps and completed assemblies retain their progress', () => {
  const flow = { step: 'complete', withoutVanity: true, vanityId: null, basinId: 'basin' }
  const nodes = {
    level: node('level', 'level', null, { bathSpaceExcludedAreas: ['toilet', 'bathing'] }),
    basin: node('basin', 'bath-space:wall-hung-basin'),
  }
  expect(bathroomLayoutPatch('level', nodes)?.bathSpaceWashArea).toMatchObject({ step: 'tap', basinId: 'basin', withoutVanity: true })
  nodes.level = node('level', 'level', null, { ...nodes.level.metadata, bathSpaceWashArea: flow })
  expect(bathroomLayoutPatch('level', nodes)?.bathSpaceWashArea).toEqual(flow)
})

test('wash fittings can start before the rest of the layout is placed', () => {
  const nodes = {
    level: node('level', 'level', null),
    vanity: node('vanity', 'bath-space:freestanding-vanity'),
  }
  expect(bathroomLayoutPatch('level', nodes)).toBeNull()
  expect(bathroomWashAreaFlow('level', nodes)).toMatchObject({ vanityId: 'vanity', step: 'basin', basinId: null })
})
