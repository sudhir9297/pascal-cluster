import { Brush, Evaluator, SUBTRACTION, ensureRenderableGeometryAttributes } from '@pascal-app/viewer'
import { CylinderGeometry, MeshBasicMaterial, type BufferGeometry } from 'three'
import { basinTapMountingPoints } from './tap-layout'
import type { BasinNode } from './schema'

/** Drill the ceramic deck; surface-mounted basins drill their supporting counter instead. */
export function drillBasinTapHoles(source: BufferGeometry, node: BasinNode, centerY: number, height: number) {
  const material = new MeshBasicMaterial(), evaluator = new Evaluator(); evaluator.useGroups = false
  let geometry = source
  for (const point of basinTapMountingPoints(node)) {
    const cutter = new CylinderGeometry(.0175, .0175, height, 32).translate(point.position[0], centerY, point.position[2])
    const a = new Brush(geometry, material), b = new Brush(cutter, material)
    a.updateMatrixWorld(true); b.updateMatrixWorld(true)
    const result = ensureRenderableGeometryAttributes(evaluator.evaluate(a, b, SUBTRACTION).geometry)
    geometry.dispose(); cutter.dispose(); geometry = result
  }
  geometry.clearGroups(); material.dispose()
  return geometry
}
