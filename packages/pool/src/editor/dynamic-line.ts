import { BufferAttribute, BufferGeometry, DynamicDrawUsage, type Vector3 } from 'three'

/** Grow geometrically; cursor movement only updates the existing position buffer. */
export function updateDynamicLine(geometry: BufferGeometry, points: readonly Vector3[]) {
  let positions = geometry.getAttribute('position') as BufferAttribute | undefined
  if (!positions || positions.count < points.length) {
    const capacity = Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, points.length))))
    positions = new BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage)
    geometry.setAttribute('position', positions)
  }
  points.forEach((point, index) => positions!.setXYZ(index, point.x, point.y, point.z))
  positions.clearUpdateRanges()
  positions.addUpdateRange(0, points.length * 3)
  positions.needsUpdate = true
  geometry.setDrawRange(0, points.length)
}
