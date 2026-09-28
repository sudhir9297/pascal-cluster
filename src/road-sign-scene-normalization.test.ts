import { describe, expect, test } from 'bun:test'
import {
  dedupeRoadSignChildIds,
  planRoadSignNormalization,
} from './road-sign-scene-normalization'

describe('road sign scene normalization', () => {
  test('removes duplicate road-sign child IDs before level rendering', () => {
    expect(dedupeRoadSignChildIds(
      ['road-sign_a', 'road-sign_a', 'wall_a'],
      new Set(['road-sign_a']),
    )).toEqual([
      'road-sign_a',
      'wall_a',
    ])
  })

  test('skips scene-store updates that do not replace the nodes map', () => {
    const nodes = { parent: { type: 'level', children: ['sign'] } }
    expect(planRoadSignNormalization(nodes, nodes)).toBeNull()
  })

  test('limits ordinary edits to parents whose child list changed', () => {
    const previous = {
      parent: { type: 'level', children: ['sign'] },
      unrelated: { type: 'wall', name: 'Before' },
      sign: { type: 'streetscape:road-sign' },
    }
    const current = {
      parent: { ...previous.parent, children: ['sign', 'sign'] },
      unrelated: { type: 'wall', name: 'After' },
      sign: previous.sign,
    }

    expect(planRoadSignNormalization(current, previous)).toEqual({
      kind: 'changed',
      nodeIds: ['parent'],
    })
  })

  test('requests a full pass when a road sign is added or removed', () => {
    const previous = { parent: { type: 'level', children: ['sign', 'sign'] } }
    const added = {
      ...previous,
      sign: { type: 'streetscape:road-sign' },
    }
    const removed = { ...added, sign: { type: 'wall' } }

    expect(planRoadSignNormalization(added, previous)).toEqual({ kind: 'all' })
    expect(planRoadSignNormalization(removed, added)).toEqual({ kind: 'all' })
  })
})
