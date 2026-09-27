import type { PoolWaterEffect } from './water-effect'

const poolWaterEffects = new Map<string, PoolWaterEffect>()

export function registerPoolWaterEffect(poolId: string, effect: PoolWaterEffect) {
  poolWaterEffects.set(poolId, effect)
  return () => {
    if (poolWaterEffects.get(poolId) === effect) poolWaterEffects.delete(poolId)
  }
}

export function getPoolWaterEffect(poolId: string) {
  return poolWaterEffects.get(poolId)
}
