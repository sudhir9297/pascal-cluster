import { resolvePoolPolygon, type PoolNode } from '../core/schema'
import { layoutNaturalCopingStones } from './coping-layout'

/** Highest point of the coping above the pool shell's deck datum. */
export function getPoolCopingRise(pool: PoolNode): number {
  const thickness = pool.copingThickness
  if (pool.copingStyle === 'continuous') {
    const bevel = pool.copingProfile === 'square'
      ? 0
      : Math.min(thickness * 0.45, pool.copingProfile === 'bullnose' ? 0.04 : 0.025)
    return thickness + bevel
  }

  const smoothBoundary = ['spline', 'circle', 'kidney', 'lagoon', 'roman'].includes(pool.shape)
  const rockLike = pool.copingStyle === 'rock'
  const layout = layoutNaturalCopingStones(resolvePoolPolygon(pool), {
    width: Math.max(pool.copingWidth, pool.shellThickness + 0.03),
    thickness,
    stoneLength: pool.copingStoneLength,
    jointWidth: rockLike ? Math.min(pool.copingJointWidth, 0.008) : pool.copingJointWidth,
    irregularity: rockLike ? Math.max(pool.copingIrregularity, 0.75) : pool.copingIrregularity,
    seed: pool.copingSeed,
    rockLike,
    smoothBoundary,
  })
  return Math.max(thickness, ...layout.map((stone) => {
    const bevel = smoothBoundary
      ? Math.min(0.045, Math.max(0.012, stone.height * 0.35))
      : rockLike
        ? stone.cornerPoint ? 0 : Math.min(0.035, Math.max(0.01, stone.height * 0.3))
        : stone.cornerPoint ? Math.min(0.03, Math.max(0.01, stone.height * 0.3)) : 0
    return stone.height + bevel + (rockLike || smoothBoundary ? 0.01 : 0)
  }))
}

/** Keep the pool rim on the picked surface while preserving its water depth. */
export function alignPoolCopingToSurface(pool: PoolNode): PoolNode {
  const inset = getPoolCopingRise(pool)
  return {
    ...pool,
    finishedDeckElevation: pool.finishedDeckElevation - inset,
    designWaterElevation: pool.designWaterElevation - inset,
  }
}
