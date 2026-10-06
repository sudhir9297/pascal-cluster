import { expect, test } from 'bun:test'
import { catalogFamilies } from './catalog-families'

test('variant searches show one family and do not change the chosen placement variant', () => {
  const items = [
    { id: 'round', label: 'Round holder' },
    { id: 'square', label: 'Square holder' },
    { id: 'rail', label: 'Slide rail' },
  ]
  const families = [
    { id: 'mount', label: 'Hand shower mount', itemIds: items.map((item) => item.id) },
  ]
  expect(catalogFamilies(items, families, 'round', 'square')).toEqual([
    { ...families[0]!, selectedId: 'round', active: true },
  ])
  expect(catalogFamilies(items, families, 'square', '').length).toBe(1)
  expect(catalogFamilies(items, families, 'square', 'unrelated')).toEqual([])
})
test('a family uses its own default when a different family is selected', () => {
  const items = [
    { id: 'head', label: 'Head coupling' },
    { id: 'hose', label: 'Hose coupling' },
  ]
  const families = [
    { id: 'head-family', label: 'Head adapter', itemIds: ['head'] },
    { id: 'hose-family', label: 'Hose adapter', itemIds: ['hose'] },
  ]
  const result = catalogFamilies(items, families, 'hose', '')
  expect(result.map((f) => [f.selectedId, f.active])).toEqual([
    ['head', false],
    ['hose', true],
  ])
})

test('multiword searches combine family and one variant without merging incompatible variants', () => {
  const items = [{ id: 'round', label: 'Round rain' }, { id: 'square', label: 'Square rain' }]
  const families = [{ id: 'head', label: 'Overhead shower head', itemIds: ['round', 'square'] }]
  expect(catalogFamilies(items, families, 'round', ' square   SHOWER ').map(f => f.id)).toEqual(['head'])
  expect(catalogFamilies(items, families, 'round', 'round square')).toEqual([])
  expect(catalogFamilies(items, families, 'round', 'square shower')[0]?.selectedId).toBe('round')
})
