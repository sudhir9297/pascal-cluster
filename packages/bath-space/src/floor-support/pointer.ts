import { useScene, type GridEvent } from '@pascal-app/core'
import { resolvePointerSupportSurface } from '@pascal-app/editor'
import type { Camera } from 'three'

export function floorPointerEvent(camera: Camera, event: GridEvent) {
  let surface = resolvePointerSupportSurface(camera, event.position, {
    includeNodeTopSurfaces: true,
    pointerRay: event.nativeEvent?.ray,
  })
  const source = surface?.sourceNodeId && useScene.getState().nodes[surface.sourceNodeId]
  // Room shells are not furniture supports; retain the editor's floor election there.
  if (source && ['wall', 'ceiling', 'roof', 'roof-segment'].includes(source.type)) {
    surface = resolvePointerSupportSurface(camera, event.position, {
      pointerRay: event.nativeEvent?.ray,
    })
  }
  return {
    surface,
    event:
      surface?.worldPoint && surface.localPoint
        ? { ...event, position: surface.worldPoint, localPosition: surface.localPoint }
        : event,
  }
}
