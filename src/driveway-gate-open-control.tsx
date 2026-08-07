'use client'

import { type AnyNodeId, useLiveNodeOverrides } from '@pascal-app/core'
import { SliderControl } from '@pascal-app/editor'
import type { ResidentialGateNode } from './schema'
import { stopDrivewayGateAnimation } from './driveway-gate-interaction'

export default function DrivewayGateOpenControl({
  node,
  onUpdate,
}: {
  node: ResidentialGateNode
  onUpdate: (patch: Partial<ResidentialGateNode>) => void
}) {
  const liveOperationState = useLiveNodeOverrides((state) => {
    const value = state.get(node.id as AnyNodeId)?.operationState
    return typeof value === 'number' ? value : undefined
  })
  const operationState = liveOperationState ?? node.operationState ?? 0

  return (
    <SliderControl
      label="Open"
      max={100}
      min={0}
      onChange={(value) => {
        stopDrivewayGateAnimation(node.id as AnyNodeId)
        onUpdate({ operationState: value / 100 })
      }}
      precision={0}
      step={1}
      unit="%"
      value={Math.round(operationState * 100)}
    />
  )
}
