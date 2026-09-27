import { describe, expect, test } from 'bun:test'
import { Box3 } from 'three'
import { buildPoolGeometry } from '../core/geometry'
import { PoolNode } from '../core/schema'
import { createPoolShapePolygon } from './shapes'
import { alignPoolCopingToSurface, getPoolCopingRise } from './coping-rise'

describe('pool coping surface alignment', () => {
  for (const shape of ['rectangle', 'circle'] as const) {
    for (const copingStyle of ['continuous', 'natural-stone', 'rock'] as const) {
      test(`${shape} ${copingStyle} coping stays at or below the picked surface`, () => {
        const pool = PoolNode.parse({
          shape,
          length: 6,
          width: 6,
          polygon: createPoolShapePolygon(shape, 6, 6),
          copingStyle,
          copingProfile: 'bullnose',
        })
        const rise = getPoolCopingRise(pool)
        const aligned = alignPoolCopingToSurface(pool)
        expect(aligned.finishedDeckElevation).toBeCloseTo(-rise)
        expect(aligned.designWaterElevation - aligned.finishedDeckElevation)
          .toBeCloseTo(pool.designWaterElevation - pool.finishedDeckElevation)
        const geometry = buildPoolGeometry(aligned)
        geometry.updateMatrixWorld(true)
        const coping = geometry.getObjectByName('pool-coping')!
        const top = new Box3().setFromObject(coping).max.y
        expect(top).toBeLessThanOrEqual(0.001)
        expect(top).toBeGreaterThan(-0.015)
      })
    }
  }
})
