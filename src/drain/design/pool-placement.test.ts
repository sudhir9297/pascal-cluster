import { describe, expect, test } from 'bun:test'
import { Euler, Vector3 } from 'three'
import { PoolNode } from '../../core/schema'
import { getPoolDrainPlacement } from './pool-placement'

describe('pool drain placement', () => {
  test('snaps an inside click to the flat pool floor', () => {
    const pool = PoolNode.parse({ id: 'pool_drain_flat', position: [2, 0.4, -1], length: 8, width: 4, depth: 1.6 })
    const placement = getPoolDrainPlacement(pool, [2.5, 0, -1.25])

    expect(placement?.poolId).toBe(pool.id)
    expect(placement?.position[0]).toBeCloseTo(2.5)
    expect(placement?.position[1]).toBeCloseTo(-1.2)
    expect(placement?.position[2]).toBeCloseTo(-1.25)
  })

  test('rejects a click outside the pool outline', () => {
    const pool = PoolNode.parse({ id: 'pool_drain_outside', length: 8, width: 4 })

    expect(getPoolDrainPlacement(pool, [5, 0, 0])).toBeNull()
  })

  test('places a drain on the raised floor of a rotated custom pool', () => {
    const pool = PoolNode.parse({ id: 'pool_drain_custom', shape: 'custom',
      polygon: [[-3, -2], [3, -2], [3, 1], [0, 1], [0, 2], [-3, 2]],
      position: [5, 1, -2], rotation: [0, Math.PI / 3, 0],
      finishedDeckElevation: 0.25, depth: 2 })
    const world = new Vector3(-1, 0, 0).applyEuler(new Euler(...pool.rotation)).add(new Vector3(...pool.position))
    const placement = getPoolDrainPlacement(pool, world.toArray())
    expect(placement?.position[1]).toBeCloseTo(-0.75)
  })
})
