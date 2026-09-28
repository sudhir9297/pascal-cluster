import { expect, test } from 'bun:test'
import { poolParametrics } from './parametrics'

test('pool inspector starts with pool settings before circulation controls', () => {
  expect(poolParametrics.groups.map(({ label }) => label)).toEqual([
    'Pool shape and depth',
    'Entry and bench',
    'Coping and finish',
    'Water appearance',
    'Advanced water controls',
    'Automatic fittings',
    'Return pipes',
    'Drain pipes',
    'Skimmer pipes',
    'Position',
  ])
})
