'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import TrussRoadwayLightPreview from './truss-roadway-light-preview'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import { TrussRoadwayLightNode } from './schema'
import { useEnvironmentStore } from './store'

export default function TrussRoadwayLightTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const height = useEnvironmentStore((s) => s.trussRoadwayHeight)
  const armLength = useEnvironmentStore((s) => s.trussRoadwayArmLength)
  const braceDepth = useEnvironmentStore((s) => s.trussRoadwayBraceDepth)
  const lightOn = useEnvironmentStore((s) => s.trussRoadwayLightOn)

  const previewNode = useMemo(
    () =>
      TrussRoadwayLightNode.parse({
        height,
        armLength,
        braceDepth,
        lightOn,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
      }),
    [armLength, braceDepth, height, lightOn],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position, rotationY) => {
    if (!activeLevelId) return
    const brush = useEnvironmentStore.getState()
    const trussLight = TrussRoadwayLightNode.parse({
      height: brush.trussRoadwayHeight,
      armLength: brush.trussRoadwayArmLength,
      braceDepth: brush.trussRoadwayBraceDepth,
      lightOn: brush.trussRoadwayLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene
      .getState()
      .createNode(trussLight as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [trussLight.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(brush.placementMode)
  })

  if (!activeLevelId) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <TrussRoadwayLightPreview node={previewNode} />
    </group>
  )
}
