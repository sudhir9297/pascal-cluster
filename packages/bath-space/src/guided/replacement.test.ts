import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { CountertopBasinNode } from '../countertop-basin/schema'
import { TapNode } from '../taps/schema'
import { BathtubNode } from '../bathtub/schema'
import { MirrorNode } from '../mirror/schema'
import { fixtureReplacementChanges, fixtureReplacementOptions } from './replacement'

const asNode = (node: unknown) => node as AnyNode
const level = (metadata = {}) => asNode({ id: 'level', type: 'level', parentId: null, metadata })
const apply = (nodes: Record<string, AnyNode>, changes: NonNullable<ReturnType<typeof fixtureReplacementChanges>>) => Object.fromEntries(Object.entries(nodes).map(([id, node]) => [id, { ...node, ...changes.update.find((update) => update.id === id)?.data }])) as Record<string, AnyNode>

test('vanity replacement preserves its basin, tap, pose, size, finishes, and completed progress', () => {
  const vanity = asNode(FreestandingVanityNode.parse({ parentId: 'level', position: [1, 0, 2], rotation: 0.5, width: 1.2, slots: { countertop: 'finish' } }))
  const basin = asNode(CountertopBasinNode.parse({ parentId: vanity.id }))
  const tap = asNode(TapNode.parse({ parentId: basin.id }))
  const flow = { step: 'complete', withoutVanity: false, vanityId: vanity.id, basinId: basin.id }
  const nodes = { level: level({ bathSpaceWashArea: flow, bathSpaceReviewed: true }), [vanity.id]: vanity, [basin.id]: basin, [tap.id]: tap }
  const changes = fixtureReplacementChanges('level', vanity.id, 'fluted', nodes)!
  expect(changes.update).toHaveLength(2)
  const after = apply(nodes, changes)
  expect(after[vanity.id]).toMatchObject({ id: vanity.id, parentId: 'level', position: [1, 0, 2], rotation: 0.5, width: 1.2, slots: { countertop: 'finish' }, frontStyle: 'fluted' })
  expect(after[basin.id]).toEqual(basin)
  expect(after[tap.id]).toEqual(tap)
  expect(after.level?.metadata?.bathSpaceWashArea).toEqual(flow)
  expect(after.level?.metadata?.bathSpaceReviewed).toBe(false)
})

test('replacement reopens only missing wash fittings and preserves unrelated progress', () => {
  const vanity = asNode(FreestandingVanityNode.parse({ parentId: 'level' }))
  const basin = asNode(CountertopBasinNode.parse({ parentId: vanity.id }))
  const bathing = { step: 'complete', kind: 'bath', system: 'kit', bathId: 'unrelated-missing-bath', showerId: null, controlId: null, dividerIds: [], dividerSkipped: false }
  const nodes = { level: level({ bathSpaceWashArea: { step: 'complete', withoutVanity: false, vanityId: vanity.id, basinId: basin.id }, bathSpaceBathingArea: bathing }), [vanity.id]: vanity, [basin.id]: basin }
  const after = apply(nodes, fixtureReplacementChanges('level', basin.id, 'rectangle', nodes)!)
  expect(after.level?.metadata?.bathSpaceWashArea).toMatchObject({ step: 'tap', vanityId: vanity.id, basinId: basin.id })
  expect(after.level?.metadata?.bathSpaceBathingArea).toEqual(bathing)
})

test('tap replacements keep the existing mounting layout and wall attachment', () => {
  const wall = asNode(TapNode.parse({ parentId: 'level', servesBasinId: 'basin', wallId: 'wall', presetId: 'tap-003' }))
  expect(fixtureReplacementOptions(wall).map((option) => option.id)).toEqual(['tap-016'])
  const threeHole = asNode(TapNode.parse({ parentId: 'basin', presetId: 'tap-017' }))
  expect(fixtureReplacementOptions(threeHole)).toEqual([])
  const countertop = asNode(TapNode.parse({ parentId: 'basin' }))
  expect(fixtureReplacementOptions(countertop).some((option) => option.id === 'tap-017' || option.id === 'tap-003')).toBe(false)
})

test('replacement rejects missing fixtures, other floors, and incompatible choices', () => {
  const bath = asNode(BathtubNode.parse({ parentId: 'level', shape: 'drop-in', tapMount: 'rim' }))
  const nodes = { level: level(), [bath.id]: bath, other: asNode({ id: 'other', type: 'level', parentId: null }) }
  expect(fixtureReplacementChanges('level', 'missing', 'oval', nodes)).toBeNull()
  expect(fixtureReplacementChanges('other', bath.id, 'oval', nodes)).toBeNull()
  expect(fixtureReplacementChanges('level', bath.id, 'undermount', nodes)).toBeNull()
  expect(fixtureReplacementOptions(bath).every((option) => 'builtInShape' in option.parameters)).toBe(true)
  const mirror = asNode(MirrorNode.parse({ width: 0.6, height: 0.9 }))
  expect(fixtureReplacementOptions(mirror).some((option) => option.id === 'round')).toBe(false)
})
