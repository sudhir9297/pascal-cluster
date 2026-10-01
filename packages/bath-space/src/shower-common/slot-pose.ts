import { Vector3, Quaternion, type Object3D } from 'three'
export function slotHostLevelPose(root: Object3D, level: Object3D) {
  root.updateWorldMatrix(true, false)
  level.updateWorldMatrix(true, false)
  const matrix = level.matrixWorld.clone().invert().multiply(root.matrixWorld),
    position = new Vector3(),
    quaternion = new Quaternion(),
    scale = new Vector3()
  matrix.decompose(position, quaternion, scale)
  return { position: position.toArray(), quaternion }
}
