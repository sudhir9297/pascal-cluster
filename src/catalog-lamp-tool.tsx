'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import CatalogLampPreview from './catalog-lamp-preview'
import {
  getCatalogLampConfig,
  parseCatalogLamp,
  resolveCatalogLampProjection,
  type CatalogLampKind,
} from './catalog-lamp-config'
import { finishEnvironmentPlacement, usePlacement } from './placement'
import { useEnvironmentStore } from './store'

export default function CatalogLampTool() {
  const activeLevelId = useViewer((s) => s.selection.levelId)
  const kind = useEditor((s) => s.tool as string) as CatalogLampKind
  const config = getCatalogLampConfig(kind)
  const height = useEnvironmentStore((s) => s.catalogLampHeight)
  const armLength = useEnvironmentStore((s) => s.catalogLampArmLength)
  const visualStyle = useEnvironmentStore((s) => s.catalogLampVisualStyle)
  const lightOn = useEnvironmentStore((s) => s.catalogLampLightOn)
  const safeHeight = config ? Math.max(config.height[0], Math.min(config.height[1], height)) : height
  const safeArmLength = config ? Math.max(config.arm[0], Math.min(config.arm[1], armLength)) : armLength
  const style = resolveCatalogLampProjection(kind, visualStyle) ?? 'shoebox'

  const previewNode = useMemo(() => {
    if (!config) return null
    return parseCatalogLamp(kind, { height: safeHeight, armLength: safeArmLength, visualStyle: style, lightOn, position: [0, 0, 0], rotation: [0, 0, 0] })
  }, [config, kind, lightOn, safeArmLength, safeHeight, style])

  const { cursorRef, cursorVisible } = usePlacement(activeLevelId, (position) => {
    if (!activeLevelId || !config) return
    const brush = useEnvironmentStore.getState()
    const lamp = parseCatalogLamp(kind, {
      height: Math.max(config.height[0], Math.min(config.height[1], brush.catalogLampHeight)),
      armLength: Math.max(config.arm[0], Math.min(config.arm[1], brush.catalogLampArmLength)),
      visualStyle: resolveCatalogLampProjection(kind, brush.catalogLampVisualStyle) ?? config.projection,
      lightOn: brush.catalogLampLightOn,
      position,
      rotation: [0, 0, 0],
    })
    useScene.getState().createNode(lamp as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [lamp.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(brush.placementMode)
  })

  if (!activeLevelId || !previewNode) return null
  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <CatalogLampPreview node={previewNode} />
    </group>
  )
}
