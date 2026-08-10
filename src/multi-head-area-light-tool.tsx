'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import MultiHeadAreaLightPreview from './multi-head-area-light-preview'
import { usePlacement } from './placement'
import { MultiHeadAreaLightNode } from './schema'
import { useStreetscapeStore } from './store'

export default function MultiHeadAreaLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useStreetscapeStore((s) => s.multiHeadAreaHeight)
  const armLength = useStreetscapeStore((s) => s.multiHeadAreaArmLength)
  const headCount = useStreetscapeStore((s) => s.multiHeadAreaHeadCount)
  const lightOn = useStreetscapeStore((s) => s.multiHeadAreaLightOn)

  const previewNode = useMemo(
    () =>
      MultiHeadAreaLightNode.parse({
        height,
        armLength,
        headCount,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [armLength, headCount, height, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useStreetscapeStore.getState()
    const areaLight = MultiHeadAreaLightNode.parse({
      height: brush.multiHeadAreaHeight,
      armLength: brush.multiHeadAreaArmLength,
      headCount: brush.multiHeadAreaHeadCount,
      lightOn: brush.multiHeadAreaLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(areaLight as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [areaLight.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <MultiHeadAreaLightPreview node={previewNode} />
    </group>
  )
}
