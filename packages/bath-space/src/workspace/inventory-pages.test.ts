import { expect, test } from 'bun:test'
import { fixtureInventoryPages } from './inventory-pages'
import type { FixtureRow } from './inventory'
const row = (id: string): FixtureRow => ({ id, label: `Mirror ${id}`, kind: 'mirror', levelId: null,
  buildingId: null, level: 'Ground floor', hidden: false, dimensions: 'W 800 · H 900', finishes: 'Frame: chrome' })

test('empty inventory does not generate blank PDF pages', () => {
  expect(fixtureInventoryPages([])).toEqual([])
})

test('inventory spans numbered pages without losing fixtures', () => {
  const rows = Array.from({ length: 100 }, (_, index) => row(String(index)))
  const pages = fixtureInventoryPages(rows)
  expect(pages.length).toBeGreaterThan(1)
  const names = pages.flatMap(page => page.overlay.filter(shape => shape.kind === 'text').map(shape => shape.text))
  for (const fixture of rows) expect(names).toContain(fixture.label)
  pages.forEach((page, index) => {
    expect(page.number).toBe(`BF-${index + 1}`)
    for (const shape of page.overlay) if (shape.kind === 'text') expect(shape.y).toBeLessThan(page.heightIn)
  })
})

test('hidden fixtures are marked and long finishes wrap', () => {
  const pages = fixtureInventoryPages([{ ...row('one'), hidden: true, finishes: 'Brushed stainless steel with a satin finish and a polished trim edge' }])
  const text = pages[0]!.overlay.filter(shape => shape.kind === 'text').map(shape => shape.text)
  expect(text).toContain('Mirror one [hidden]')
  expect(text.some(line => line.includes('Brushed stainless'))).toBe(true)
  expect(text.join(' ')).toContain('polished trim edge')
})


test('very long descriptions continue on another page', () => {
  const pages = fixtureInventoryPages([{ ...row('long'), finishes: 'Chrome '.repeat(400) }])
  expect(pages.length).toBeGreaterThan(1)
  for (const page of pages) for (const shape of page.overlay) {
    if (shape.kind === 'text') expect(shape.y).toBeLessThan(page.heightIn)
  }
})
