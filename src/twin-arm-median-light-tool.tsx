'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import TwinArmMedianLightPreview from './twin-arm-median-light-preview'
import { usePlacement } from './placement'
import { TwinArmMedianLightNode } from './schema'
import { useStreetscapeStore } from './store'

export default function TwinArmMedianLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useStreetscapeStore((s) => s.twinArmMedianHeight)
  const armLength = useStreetscapeStore((s) => s.twinArmMedianArmLength)
  const lightOn = useStreetscapeStore((s) => s.twinArmMedianLightOn)

  const previewNode = useMemo(
    () =>
      TwinArmMedianLightNode.parse({
        height,
        armLength,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [armLength, height, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useStreetscapeStore.getState()
    const twinArm = TwinArmMedianLightNode.parse({
      height: brush.twinArmMedianHeight,
      armLength: brush.twinArmMedianArmLength,
      lightOn: brush.twinArmMedianLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(twinArm as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [twinArm.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <TwinArmMedianLightPreview node={previewNode} />
    </group>
  )
}
