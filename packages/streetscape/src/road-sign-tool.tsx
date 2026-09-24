'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import RoadSignPreview from './road-sign-preview'
import { usePlacement } from './placement'
import { createRoadSignNode, createRoadSignPreviewNode } from './schema'
import { useStreetscapeStore } from './store'

export default function RoadSignTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const signId = useStreetscapeStore((state) => state.roadSignId)
  const postHeight = useStreetscapeStore((state) => state.roadSignPostHeight)
  const scale = useStreetscapeStore((state) => state.roadSignScale)
  const mounting = useStreetscapeStore((state) => state.roadSignMounting)

  const previewNode = useMemo(
    () =>
      createRoadSignPreviewNode({
        signId,
        postHeight,
        scale,
        mounting,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [mounting, postHeight, scale, signId],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useStreetscapeStore.getState()
    const sign = createRoadSignNode({
      signId: brush.roadSignId,
      postHeight: brush.roadSignPostHeight,
      scale: brush.roadSignScale,
      mounting: brush.roadSignMounting,
      position,
      rotation: [0, rotationY, 0],
    }, Object.keys(useScene.getState().nodes))
    useScene.getState().createNode(sign as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [sign.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <RoadSignPreview node={previewNode} />
    </group>
  )
}
