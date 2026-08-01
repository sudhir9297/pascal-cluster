import { describe, expect, test } from 'bun:test'
import { dedupeRoadSignChildIds } from './road-sign-scene-normalization'

describe('road sign scene normalization', () => {
  test('removes duplicate road-sign child IDs before level rendering', () => {
    const sign = { type: 'environment:road-sign' }
    const nodes = {
      'road-sign_a': sign,
      'wall_a': { type: 'wall' },
    }

    expect(dedupeRoadSignChildIds(['road-sign_a', 'road-sign_a', 'wall_a'], nodes)).toEqual([
      'road-sign_a',
      'wall_a',
    ])
  })
})
