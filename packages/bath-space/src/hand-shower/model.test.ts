import { expect, test } from 'bun:test'
import { Box3 } from 'three'
import { HandShowerNode } from './schema'
import { buildHandShowerGeometry, handShowerDimensions, handShowerHoseTarget } from './geometry'
import { handShowerSection } from '../section/hand-shower-section'

test('connector edits move the hose endpoint and preserve its identity', () => {
  for (const connectorLength of [.012, .035]) {
    const n = HandShowerNode.parse({ connectorLength, gripInsertion: .055 })
    const root = buildHandShowerGeometry(n)
    const target = root.getObjectByName('shower_hose_target_hose-end')!
    expect(target.position.toArray()).toEqual(handShowerHoseTarget(n).position)
    expect(target.position.y).toBeCloseTo(-n.gripInsertion-connectorLength)
    expect(target.userData.slotId).toBe('hose-end')
  }
})
test('round heads stay circular and wand faces stay aligned when legacy head angle changes', () => {
  const round = HandShowerNode.parse({ headWidth: .08, headHeight: .18 })
  expect(handShowerDimensions(round).height).toBe(.08)
  for (const style of ['round-wand','square-wand'] as const) {
    const a = new Box3().setFromObject(buildHandShowerGeometry(HandShowerNode.parse({style,headAngle:-15})))
    const b = new Box3().setFromObject(buildHandShowerGeometry(HandShowerNode.parse({style,headAngle:40})))
    expect(a.min.toArray()).toEqual(b.min.toArray())
    expect(a.max.toArray()).toEqual(b.max.toArray())
  }
  expect(handShowerSection(round).drawing.plan).not.toContain('NaN')
})
