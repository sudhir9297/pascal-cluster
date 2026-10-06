'use client'

import { useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PoolNode } from '../core/schema'
import { createPoolEditSession } from './edit-session'

export function usePoolSettingsEdit(pool: PoolNode | null) {
  const [patch, setPatch] = useState<Partial<PoolNode>>({})
  const previewing = useRef(false)
  const session = useMemo(() => {
    let wasDragging = false
    let ownsDragging = false
    let frame = 0
    let pending: Partial<PoolNode> | null = null
    const id = pool?.id
    return createPoolEditSession({
      current: () => id ? useScene.getState().nodes[id as never] as unknown as PoolNode ?? null : null,
      readOnly: () => useScene.getState().readOnly,
      preview: next => {
        if (!id) return
        if (!ownsDragging) {
          wasDragging = useViewer.getState().inputDragging
          ownsDragging = true
          useViewer.getState().setInputDragging(true)
        }
        setPatch(next)
        pending = next
        if (!frame) frame = requestAnimationFrame(() => {
          frame = 0
          if (pending) useLiveNodeOverrides.getState().set(id, { ...pending, __poolEditPreview: true })
        })
      },
      clear: fields => {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        pending = null
        if (id) useLiveNodeOverrides.getState().clearFields(id, [...fields, '__poolEditPreview'])
        if (ownsDragging) useViewer.getState().setInputDragging(wasDragging)
        ownsDragging = false
        setPatch({})
      },
      commit: next => { if (id) useScene.getState().updateNode(id as never, next as never) },
    })
  }, [pool?.id])
  useEffect(() => () => session.cancel(), [session])
  return { patch, session, previewing,
    runPreview: (change: () => void) => {
      previewing.current = true
      try { change() } finally { previewing.current = false }
    },
  }
}
