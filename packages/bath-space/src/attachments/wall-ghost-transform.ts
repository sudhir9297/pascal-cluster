import { Matrix4, type Object3D, Quaternion, Vector3 } from 'three'

export function wallGhostMatrix(
  wall: Object3D,
  scene: Object3D,
  position: readonly [number, number, number],
  rotation: number,
  result = new Matrix4(),
) {
  wall.updateWorldMatrix(true, false)
  scene.updateWorldMatrix(true, false)
  const local = new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotation),
    new Vector3(1, 1, 1),
  )
  return result.copy(scene.matrixWorld).invert().multiply(wall.matrixWorld).multiply(local)
}
