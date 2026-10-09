import type { GridEvent } from '@pascal-app/core'
import { Plane, Raycaster, Vector3, type Camera, type Object3D, type Vector2 } from 'three'

/** Resolve a cursor pose immediately, without waiting for a grid movement event. */
export function vanityPointerPreviewEvent(camera: Camera, level: Object3D | undefined, pointer: Vector2): GridEvent | null {
  camera.updateWorldMatrix(true, false)
  level?.updateWorldMatrix(true, false)
  const elevation = level?.getWorldPosition(new Vector3()).y ?? 0
  const raycaster = new Raycaster()
  raycaster.setFromCamera(pointer, camera)
  const point = raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -elevation), new Vector3())
  if (!point) return null
  const local = level ? level.worldToLocal(point.clone()) : point
  return {
    position: point.toArray(),
    localPosition: local.toArray(),
    nativeEvent: { ray: raycaster.ray } as GridEvent['nativeEvent'],
  }
}
