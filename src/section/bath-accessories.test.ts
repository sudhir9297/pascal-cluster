import { expect, test } from 'bun:test'
import type { AnyNode, GeometryContext } from '@pascal-app/core'
import { BathDeckNode } from '../bath-deck/schema'
import { bathDeckSection } from '../bath-deck/section'
import { BathScreenNode } from '../bath-screen/schema'
import { bathScreenSection } from '../bath-screen/section'
import { BathtubNode } from '../bathtub/schema'
import { deckMaximumThickness, deckMinimumDimensions } from '../bath-deck/fit'
import { boundedDimensionValue } from './model'
import { sectionFieldPatch } from './fields'

test('deck section preserves attached-bath fit limits', () => {
  const deck = BathDeckNode.parse({ length: 2.2, width: 1.3 })
  const bath = BathtubNode.parse({ shape: 'drop-in', parentId: deck.id })
  const children = [bath as unknown as AnyNode]
  const section = bathDeckSection(deck, { children } as GeometryContext)
  const minimum = deckMinimumDimensions(deck, children)
  for (const key of ['length', 'width', 'height'] as const) {
    expect(section.dimensions.find((field) => field.key === key)!.min).toBe(minimum[key])
  }
  expect(section.dimensions.find((field) => field.key === 'thickness')!.max).toBe(
    deckMaximumThickness(deck, children),
  )
  expect(JSON.stringify(section.drawing)).not.toMatch(/NaN|Infinity/)
})

test('screen section edits stay within schema limits and follow geometry', () => {
  for (const profile of ['square', 'rounded'] as const) {
    const screen = BathScreenNode.parse({ profile })
    const section = bathScreenSection(screen)
    expect(section.drawing.height).toBeGreaterThan(1)
    expect(JSON.stringify(section.drawing)).not.toMatch(/NaN|Infinity/)
    for (const field of section.dimensions)
      for (const value of [-100, 100]) {
        expect(
          BathScreenNode.safeParse({
            ...screen,
            ...sectionFieldPatch(field, boundedDimensionValue(field, value)),
          }).success,
        ).toBe(true)
      }
    expect(bathScreenSection({ ...screen, height: 1.6 }).drawing.height).toBeGreaterThan(
      section.drawing.height,
    )
    expect(section.dimensions.some((field) => field.key === 'cornerRadius')).toBe(
      profile === 'rounded',
    )
  }
})
