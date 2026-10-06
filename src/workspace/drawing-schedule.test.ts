import { expect, test } from 'bun:test'
import type { AnyNode } from '@pascal-app/core'
import { bathroomDrawingSchedule } from './drawing-schedule'

const graph = (values: object[]) => Object.fromEntries(values.map(value => [(value as { id: string }).id, value])) as Record<string, AnyNode>
test('drawing fixture schedule respects host scope and inherited visibility', () => {
  const nodes = graph([
    { id: 'level', type: 'level' },
    { id: 'hidden-wall', type: 'wall', parentId: 'level', visible: false },
    { id: 'bath', type: 'bath-space:bathtub', parentId: 'level', name: 'Oval bath', length: 1.7, width: 0.8 },
    { id: 'hidden', type: 'bath-space:bathtub', parentId: 'hidden-wall', length: 1.5 },
    { id: 'other', type: 'bath-space:bathtub', parentId: 'level', length: 2 },
  ])
  const args = { siblings: [nodes.bath!, nodes.hidden!], nodes, levelId: 'level' as never, unit: 'metric' as const }
  const schedule = bathroomDrawingSchedule(args)
  expect(schedule?.rows).toEqual([{ id: 'bath', cells: { item: 'Oval bath', dimensions: 'L 1700 · W 800', quantity: '1' } }])
  expect(schedule?.columns[1]?.label).toContain('mm')
  expect(bathroomDrawingSchedule({ ...args, unit: 'imperial' })?.rows[0]?.cells.dimensions).toBe('L 5.58 · W 2.62')
  expect(bathroomDrawingSchedule({ ...args, siblings: [nodes.hidden!] })).toBeNull()
  expect(bathroomDrawingSchedule({ ...args, siblings: [] })).toBeNull()
})
