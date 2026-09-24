'use client'

import { type AnyNodeId, useLiveNodeOverrides } from '@pascal-app/core'
import { SliderControl } from '@pascal-app/editor'
import type { ParcelBoxNode } from './schema'
import { stopParcelBoxAnimation } from './parcel-box-interaction'

export default function ParcelBoxOpenControl({
  node,
  onUpdate,
}: {
  node: ParcelBoxNode
  onUpdate: (patch: Partial<ParcelBoxNode>) => void
}) {
  const liveOperationState = useLiveNodeOverrides((state) => {
    const value = state.get(node.id as AnyNodeId)?.operationState
    return typeof value === 'number' ? value : undefined
  })
  const operationState = liveOperationState ?? node.operationState

  return (
    <SliderControl
      label="Open"
      max={100}
      min={0}
      onChange={(value) => {
        stopParcelBoxAnimation(node.id as AnyNodeId)
        onUpdate({ operationState: value / 100 })
      }}
      precision={0}
      step={1}
      unit="%"
      value={Math.round(operationState * 100)}
    />
  )
}
