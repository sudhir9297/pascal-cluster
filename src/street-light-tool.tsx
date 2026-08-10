'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import { usePlacement } from './placement'
import { StreetLightNode } from './schema'
import StreetLightPreview from './street-light-preview'
import { useStreetscapeStore } from './store'

export default function StreetLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useStreetscapeStore((s) => s.streetLightHeight)
  const armLength = useStreetscapeStore((s) => s.streetLightArmLength)
  const lightOn = useStreetscapeStore((s) => s.streetLightOn)

  const previewNode = useMemo(
    () =>
      StreetLightNode.parse({
        height,
        armLength,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [height, armLength, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useStreetscapeStore.getState()
    const streetLight = StreetLightNode.parse({
      height: brush.streetLightHeight,
      armLength: brush.streetLightArmLength,
      lightOn: brush.streetLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(streetLight as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [streetLight.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <StreetLightPreview node={previewNode} />
    </group>
  )
}
