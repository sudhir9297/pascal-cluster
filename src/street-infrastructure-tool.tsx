'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import {
  isStreetInfrastructureKind,
  parseStreetInfrastructure,
} from './street-infrastructure-config'
import StreetInfrastructurePreview from './street-infrastructure-preview'
import { useEnvironmentStore } from './store'

export default function StreetInfrastructureTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const activeTool = useEditor((state) => state.tool as string)
  const kind = isStreetInfrastructureKind(activeTool) ? activeTool : null
  const previewNode = useMemo(
    () => kind
      ? parseStreetInfrastructure(kind, {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        })
      : null,
    [kind],
  )

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position) => {
    if (!activeLevelId || !kind) return
    const node = parseStreetInfrastructure(kind, {
      parentId: activeLevelId,
      position,
      rotation: [0, 0, 0],
    })
    useScene.getState().createNode(node as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [node.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(useEnvironmentStore.getState().placementMode)
  })

  if (!activeLevelId || !previewNode) return null
  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <StreetInfrastructurePreview node={previewNode} />
    </group>
  )
}
