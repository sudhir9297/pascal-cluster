import { type GroupMoveSnapResult } from '@pascal-app/core'
import { setSurfaceRaycastLayers } from '@pascal-app/viewer'
import { Matrix4, Mesh, Object3D, Plane, Ray, Raycaster, Vector3 } from 'three'

export type BasinSurfacePlacement = GroupMoveSnapResult & { surface?: Object3D }

type Vec3 = [number, number, number]

export function basinPlacement(ray: Ray, surfaces: Object3D, levelMatrix: Matrix4, rotation: number,
  gridStep = 0, excluded: readonly Object3D[] = [], groundPoint?: Vec3): BasinSurfacePlacement | null {
  surfaces.updateWorldMatrix(true, true)
  const meshes: Object3D[] = []
  surfaces.traverseVisible(object => {
    if (!(object as Mesh).isMesh) return
    for (let parent: Object3D | null = object; parent; parent = parent.parent) {
      if (excluded.includes(parent)) return
    }
    const mesh = object as Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (materials.every(material => !material.visible || material.opacity === 0)) return
    meshes.push(mesh)
  })
  const raycaster = new Raycaster()
  raycaster.ray.copy(ray)
  setSurfaceRaycastLayers(raycaster.layers)
  const hit = raycaster.intersectObjects(meshes, false)[0]
  const inverse = levelMatrix.clone().invert()
  if (hit) {
    const position = hit.point.clone().applyMatrix4(inverse).toArray()
    return { position, rotation, surface: hit.object }
  }
  // The construction grid is a fallback only when no scene surface is under the cursor.
  const plane = new Plane(new Vector3(0, 1, 0), 0).applyMatrix4(levelMatrix)
  const ground = groundPoint ? new Vector3(...groundPoint) : ray.intersectPlane(plane, new Vector3())
  if (!ground) return null
  ground.applyMatrix4(inverse)
  return {
    position: [gridStep > 0 ? Math.round(ground.x / gridStep) * gridStep : ground.x, ground.y,
      gridStep > 0 ? Math.round(ground.z / gridStep) * gridStep : ground.z],
    rotation,
  }
}
