'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import { usePlacement } from './placement'
import PostTopLightPreview from './post-top-light-preview'
import { PedestrianPostLightNode } from './schema'
import { useStreetscapeStore } from './store'

export default function PostTopLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useStreetscapeStore((s) => s.postTopLightHeight)
  const lightOn = useStreetscapeStore((s) => s.postTopLightOn)

  const previewNode = useMemo(
    () =>
      PedestrianPostLightNode.parse({
        height,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [height, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useStreetscapeStore.getState()
    const postTopLight = PedestrianPostLightNode.parse({
      height: brush.postTopLightHeight,
      lightOn: brush.postTopLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(postTopLight as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [postTopLight.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <PostTopLightPreview node={previewNode} />
    </group>
  )
}
