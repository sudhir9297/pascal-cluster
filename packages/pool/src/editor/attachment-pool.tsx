'use client'

import { createContext, useContext, useMemo } from 'react'
import { useLiveNodeOverrides, useScene } from '@pascal-app/core'
import type { PoolNode } from '../core/schema'
import { getPoolNode } from './scene-nodes'

export const AttachmentPoolContext = createContext<PoolNode | null>(null)

export function useAttachmentPool(poolId: string | null, followLiveResize = false) {
  const parent = useContext(AttachmentPoolContext)
  const stored = useScene((state) => getPoolNode(state.nodes, poolId))
  const override = useLiveNodeOverrides((state) => (
    followLiveResize && poolId ? state.get(poolId) : undefined
  ))
  const pool = parent?.id === poolId ? parent : stored
  return useMemo(() => pool && override ? { ...pool, ...override } as PoolNode : pool, [pool, override])
}
