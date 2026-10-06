import { expect, test } from 'bun:test'
import type { AnyNode, SceneMaterial } from '@pascal-app/core'
import { fixtureCsv, fixtureInventory } from './inventory'

const graph = (values: object[]) => Object.fromEntries(values.map(value => [(value as { id: string }).id, value])) as Record<string, AnyNode>

test('schedule includes nested fittings and inherits level and hidden state', () => {
  const rows = fixtureInventory(graph([
    { id: 'level', type: 'level', name: 'Ground floor' },
    { id: 'wall', type: 'wall', parentId: 'level', visible: false },
    { id: 'vanity', type: 'bath-space:wall-mounted-vanity', parentId: 'wall', width: 1.2, depth: 0.5 },
    { id: 'basin', type: 'bath-space:countertop-basin', parentId: 'vanity' },
    { id: 'tap', type: 'bath-space:tap', parentId: 'basin' },
  ]))
  expect(rows).toHaveLength(3)
  expect(rows.every(row => row.hidden && row.levelId === 'level')).toBe(true)
  expect(rows.find(row => row.id === 'vanity')?.dimensions).toBe('W 1200 · D 500')
})

test('malformed ancestry terminates and unknown sizes are not invented', () => {
  const rows = fixtureInventory(graph([
    { id: 'a', type: 'bath-space:tap', parentId: 'b', width: NaN },
    { id: 'b', type: 'bath-space:tap', parentId: 'a', height: -1 },
  ]))
  expect(rows.every(row => row.levelId === null && row.dimensions === '')).toBe(true)
})

test('CSV preserves multiline labels, escapes quotes and neutralizes formulas', () => {
  const rows = fixtureInventory(graph([{ id: 'tap', type: 'bath-space:tap', name: ' =HYPERLINK("x")\nTap' }]))
  const csv = fixtureCsv(rows)
  expect(csv).toContain('"\' =HYPERLINK(""x"")\nTap"')
  expect(csv).toContain('Authored dimensions (mm)')
})

test('inventory retains building context and visibility above a level', () => {
  const rows = fixtureInventory(graph([
    { id: 'building', type: 'building', visible: false },
    { id: 'level', type: 'level', level: 1, parentId: 'building' },
    { id: 'fixture', type: 'bath-space:tap', parentId: 'level' },
  ]))
  expect(rows[0]).toMatchObject({ levelId: 'level', buildingId: 'building', level: 'Floor 1', hidden: true })
})

test('schedule resolves assigned material names and reports broken references honestly', () => {
  const rows = fixtureInventory(graph([
    { id: 'fixture', type: 'bath-space:tap', slots: { body: 'scene:mat_brass', handle: 'scene:mat_missing' } },
  ]), { mat_brass: { id: 'mat_brass', name: 'Brushed brass', material: {} } as SceneMaterial })
  expect(rows[0]?.finishes).toBe('body: Brushed brass; handle: Unresolved (scene:mat_missing)')
  expect(fixtureCsv(rows)).toContain('Brushed brass')
})
