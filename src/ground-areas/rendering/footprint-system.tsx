'use client'

import { useScene, type AnyNodeId } from '@pascal-app/core'
import { useEffect } from 'react'
import { PATHWAY_KIND } from '../../pathways/domain/schema'
import { GROUND_AREA_KIND } from '../domain/schema'

const footprintKinds = new Set([PATHWAY_KIND, GROUND_AREA_KIND, 'slab'])

export default function GrassFootprintSystem() {
  useEffect(() => useScene.subscribe((current, previous) => {
    if (current.nodes === previous.nodes) return
    const ids = new Set([...Object.keys(current.nodes), ...Object.keys(previous.nodes)])
    const changed = [...ids].some((id) => {
      const before = previous.nodes[id as AnyNodeId]
      const after = current.nodes[id as AnyNodeId]
      return before !== after && (footprintKinds.has(before?.type ?? '') || footprintKinds.has(after?.type ?? ''))
    })
    if (!changed) return
    for (const node of Object.values(current.nodes)) {
      if ((node.type as string) === GROUND_AREA_KIND && (node as { surface?: string }).surface === 'grass')
        current.markDirty(node.id)
    }
  }), [])
  return null
}
