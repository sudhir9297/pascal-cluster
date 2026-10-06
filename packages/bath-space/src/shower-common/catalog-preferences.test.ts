import { expect, test } from 'bun:test'
import { parseCatalogPreferences } from './catalog-preferences'

test('catalog preferences tolerate corrupt or unsupported persisted data', () => {
  for (const value of [null, '{invalid', 'null', '42', '"string"']) {
    expect(parseCatalogPreferences(value)).toEqual({ recent: [] })
  }
  expect(parseCatalogPreferences('{"favorites":["head","head",null,42,""]}'))
    .toEqual({ recent: [] })
})
test('recent catalog families are deduplicated and bounded', () => {
  const ids = Array.from({ length: 30 }, (_, i) => `family:${i}`)
  const result = parseCatalogPreferences(JSON.stringify({ favorites: ids, recent: [ids[0], ...ids] }))
  expect(result.recent).toEqual(ids.slice(0, 20))
})
