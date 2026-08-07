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
import {
  finishEnvironmentPlacement,
  useCeilingPlacement,
  usePlacement,
  useWallPlacement,
} from './placement'
import { useEnvironmentStore } from './store'
import { WALL_CURSOR_POINT_BOUNDS } from './wall-arm-light-placement'

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
  const isWallPack = kind === 'environment:wall-pack-light'
  const isWallHosted = kind === 'environment:wall-arm-light' || isWallPack
  const isCeilingHosted = kind === 'environment:tunnel-luminaire'
    || kind === 'environment:canopy-soffit-light'

  const previewNode = useMemo(() => {
    if (!config) return null
    return parseCatalogLamp(kind, {
      height: safeHeight,
      armLength: safeArmLength,
      visualStyle: style,
      lightOn,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      ...(isWallHosted ? { wallId: 'wall-placement-preview' } : {}),
    })
  }, [config, isWallHosted, kind, lightOn, safeArmLength, safeHeight, style])

  const floorPlacement = usePlacement(isWallHosted || isCeilingHosted ? null : activeLevelId, (position, rotationY) => {
    if (!activeLevelId || !config) return
    const brush = useEnvironmentStore.getState()
    const lamp = parseCatalogLamp(kind, {
      height: Math.max(config.height[0], Math.min(config.height[1], brush.catalogLampHeight)),
      armLength: Math.max(config.arm[0], Math.min(config.arm[1], brush.catalogLampArmLength)),
      visualStyle: resolveCatalogLampProjection(kind, brush.catalogLampVisualStyle) ?? config.projection,
      lightOn: brush.catalogLampLightOn,
      position,
      rotation: [0, rotationY, 0],
    })
    useScene.getState().createNode(lamp as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [lamp.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
    finishEnvironmentPlacement(brush.placementMode)
  }, { preserveY: style === 'wall-pack' })

  const wallPlacement = useWallPlacement(
    isWallHosted ? activeLevelId : null,
    safeHeight,
    (attachment) => {
      if (!config) return
      const brush = useEnvironmentStore.getState()
      const position: [number, number, number] = isWallPack
        ? [attachment.position[0], attachment.mountHeight, attachment.position[2]]
        : attachment.position
      const lamp = parseCatalogLamp(kind, {
        // Wall packs keep elevation in their wall-local position because the
        // model origin is the backplate centre. `height` remains legacy data.
        height: isWallPack ? safeHeight : attachment.mountHeight,
        armLength: Math.max(config.arm[0], Math.min(config.arm[1], brush.catalogLampArmLength)),
        visualStyle: resolveCatalogLampProjection(kind, brush.catalogLampVisualStyle) ?? config.projection,
        lightOn: brush.catalogLampLightOn,
        position,
        rotation: attachment.rotation,
        side: attachment.side,
        wallId: attachment.wallId,
        wallT: attachment.wallT,
      })
      useScene.getState().createNode(
        lamp as unknown as AnyNode,
        attachment.wallId as AnyNodeId,
      )
      useViewer.getState().setSelection({ selectedIds: [lamp.id as AnyNodeId] })
      triggerSFX('sfx:item-place')
      finishEnvironmentPlacement(brush.placementMode)
    },
    isWallPack
      ? {
          modelOriginAtMount: true,
          mountBounds: WALL_CURSOR_POINT_BOUNDS,
          snapAlongWall: false,
        }
      : undefined,
  )

  const ceilingPlacement = useCeilingPlacement(
    isCeilingHosted ? activeLevelId : null,
    ({ ceilingId, position, rotationY }) => {
      if (!config) return
      const brush = useEnvironmentStore.getState()
      const lamp = parseCatalogLamp(kind, {
        attachTo: 'ceiling',
        ceilingId,
        height: Math.max(config.height[0], Math.min(config.height[1], brush.catalogLampHeight)),
        armLength: Math.max(config.arm[0], Math.min(config.arm[1], brush.catalogLampArmLength)),
        visualStyle: resolveCatalogLampProjection(kind, brush.catalogLampVisualStyle) ?? config.projection,
        lightOn: brush.catalogLampLightOn,
        position,
        rotation: [0, rotationY, 0],
      })
      useScene.getState().createNode(lamp as unknown as AnyNode, ceilingId)
      useViewer.getState().setSelection({ selectedIds: [lamp.id as AnyNodeId] })
      triggerSFX('sfx:item-place')
      finishEnvironmentPlacement(brush.placementMode)
    },
  )
  const placement = isWallHosted
    ? wallPlacement
    : isCeilingHosted
      ? ceilingPlacement
      : floorPlacement
  const { cursorRef, cursorVisible } = placement

  if (!activeLevelId || !previewNode) return null
  const preview = isCeilingHosted && ceilingPlacement.ceilingId
    ? { ...previewNode, attachTo: 'ceiling' as const, ceilingId: ceilingPlacement.ceilingId }
    : previewNode
  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <CatalogLampPreview node={preview} />
    </group>
  )
}
