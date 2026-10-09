import { describe, expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { acceptWashAreaPlacement, emptyWashArea, readWashArea, reconcileWashArea } from './wash-area'
import { FreestandingVanityNode } from '../freestanding-vanity/schema'
import { CountertopBasinNode, WallHungBasinNode } from '../countertop-basin/schema'
import { TapNode } from '../taps/schema'
import { guidedBasinHostAllowed, guidedTapHostAllowed, setGuidedPlacementContext } from './placement-context'

const asNode = (node: unknown) => node as AnyNode

describe('guided wash area', () => {
  test('guided placement targets only the current assembly and releases restrictions when browsing', () => {
    setGuidedPlacementContext({ vanityId: 'current-vanity', basinId: 'current-basin' })
    try {
      expect(guidedBasinHostAllowed('current-vanity')).toBe(true)
      expect(guidedBasinHostAllowed('other-vanity')).toBe(false)
      expect(guidedBasinHostAllowed(null)).toBe(false)
      expect(guidedTapHostAllowed('current-basin')).toBe(true)
      expect(guidedTapHostAllowed('other-basin')).toBe(false)
      expect(guidedTapHostAllowed(null)).toBe(false)
    } finally {
      setGuidedPlacementContext(null)
    }
    expect(guidedBasinHostAllowed(null)).toBe(true)
    expect(guidedTapHostAllowed('other-basin')).toBe(true)
  })
  test('waits for a placed vanity and only completes its own basin and tap', () => {
    const vanity = FreestandingVanityNode.parse({})
    const placedVanity = acceptWashAreaPlacement(emptyWashArea, asNode(vanity))!
    expect(placedVanity.step).toBe('vanity')
    expect(placedVanity.vanityId).toBe(vanity.id)
    const basinStep = { ...placedVanity, step: 'basin' as const }
    expect(acceptWashAreaPlacement(basinStep, asNode(CountertopBasinNode.parse({})))).toBeNull()
    const basin = CountertopBasinNode.parse({ parentId: vanity.id })
    const tapStep = acceptWashAreaPlacement(basinStep, asNode(basin))!
    expect(tapStep.step).toBe('tap')
    expect(acceptWashAreaPlacement(tapStep, asNode(TapNode.parse({})))).toBeNull()
    expect(acceptWashAreaPlacement(tapStep, asNode(TapNode.parse({ parentId: basin.id })))?.step).toBe('complete')
    expect(acceptWashAreaPlacement(tapStep, asNode(TapNode.parse({ servesBasinId: basin.id })))?.step).toBe('complete')
  })

  test('basin-only path accepts wall basins without requiring a vanity', () => {
    const flow = { ...emptyWashArea, step: 'basin' as const, withoutVanity: true }
    expect(acceptWashAreaPlacement(flow, asNode(CountertopBasinNode.parse({})))).toBeNull()
    expect(acceptWashAreaPlacement(flow, asNode(WallHungBasinNode.parse({})))?.step).toBe('tap')
  })

  test('saved progress recovers when a fixture is deleted or undone', () => {
    const vanity = asNode(FreestandingVanityNode.parse({}))
    const basin = asNode(CountertopBasinNode.parse({ parentId: vanity.id }))
    const flow = { ...emptyWashArea, vanityId: vanity.id, basinId: basin.id, step: 'complete' as const }
    expect(reconcileWashArea(flow, { [vanity.id]: vanity, [basin.id]: basin }).step).toBe('tap')
    expect(reconcileWashArea(flow, { [vanity.id]: vanity }).step).toBe('basin')
    expect(reconcileWashArea(flow, {}).step).toBe('vanity')
    expect(readWashArea(JSON.parse(JSON.stringify(flow)))).toEqual(flow)
    expect(readWashArea({ step: 'unknown' })).toEqual(emptyWashArea)
  })
})
