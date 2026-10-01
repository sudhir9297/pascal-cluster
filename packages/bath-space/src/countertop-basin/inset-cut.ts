import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { Brush, Evaluator, SUBTRACTION, ensureRenderableGeometryAttributes } from '@pascal-app/viewer'
import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Mesh, MeshBasicMaterial, Shape, type Object3D } from 'three'
import { VanityNode } from '../freestanding-vanity/schema'
import { basinRemainsOnVanity } from './attachment'
import { basinOutline } from './geometry'
import { basinDepth, BasinNode, DROP_IN_BASIN, SEMI_RECESSED_BASIN, UNDERMOUNT_BASIN, isInsetBasinKind } from './schema'
import { basinTapMountingPoints } from './tap-layout'
import { isBasinKind } from './schema'
import { semiRecessedOutline } from './semi-recessed-geometry'
const cutMaterial = new MeshBasicMaterial()

export function basinCountertopCutGeometry(basin: BasinNode, host: VanityNode) {
  const offset = basin.type === UNDERMOUNT_BASIN ? -basin.wallThickness * 2 : 0.004
  const outline = basin.type === SEMI_RECESSED_BASIN ? semiRecessedOutline : basinOutline
  const points = outline(basin.shape, basin.width + offset, basinDepth(basin) + offset)
  const shape = new Shape()
  points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z))
  shape.closePath()
  const cut = new ExtrudeGeometry(shape, { depth: host.countertopThickness + 0.04, bevelEnabled: false, steps: 1 })
  cut.rotateX(-Math.PI / 2)
  cut.translate(0, basin.type === UNDERMOUNT_BASIN ? -0.02 : -host.countertopThickness - 0.02, 0)
  cut.rotateY(basin.rotation)
  cut.translate(...basin.position)
  return cut
}

/** Cuts are derived from current children; scene history contains only basin nodes. */
export function cutVanityCountertop(source: BufferGeometry, host: VanityNode, children: readonly AnyNode[]) {
  const evaluator = new Evaluator()
  evaluator.useGroups = false
  let geometry = source.clone()
  for (const raw of children) {
    if (!isBasinKind(String(raw.type)) || raw.parentId !== host.id || raw.visible === false) continue
    const basin = BasinNode.parse(getEffectiveNode(raw))
    if (basin.parentId !== host.id || !basinRemainsOnVanity(basin, host)) continue
    const cuts: BufferGeometry[] = isInsetBasinKind(basin.type) ? [basinCountertopCutGeometry(basin, host)] : []
    for (const point of basinTapMountingPoints(basin)) {
      const cut = new CylinderGeometry(.0175, .0175, host.countertopThickness + .04, 32)
      cut.translate(point.position[0], host.height - host.countertopThickness / 2 - basin.position[1], point.position[2])
      cut.rotateY(basin.rotation); cut.translate(...basin.position); cuts.push(cut)
    }
    for (const cut of cuts) {
    const left = new Brush(geometry, cutMaterial), right = new Brush(cut, cutMaterial)
    left.updateMatrixWorld(true); right.updateMatrixWorld(true)
    const result = evaluator.evaluate(left, right, SUBTRACTION)
    const next = ensureRenderableGeometryAttributes(result.geometry)
    geometry.dispose(); cut.dispose()
    geometry = next
    }
  }
  geometry.clearGroups()
  return geometry
}

type CachedCut = { source: BufferGeometry; output: BufferGeometry; key: string }
export class InsetBasinCutCache {
  private entries = new Map<Mesh, CachedCut>()
  private visited = new Set<Mesh>()
  beginFrame() { this.visited.clear() }
  sync(root: Object3D, host: VanityNode, children: readonly AnyNode[]) {
    const mesh = root.getObjectByName('vanity-countertop')
    if (!(mesh instanceof Mesh)) return
    this.visited.add(mesh)
    const basins = children.filter(child => isBasinKind(String(child.type)))
    let cached = this.entries.get(mesh)
    if (!cached && !basins.length) return
    if (!cached || cached.output !== mesh.geometry) {
      cached?.source.dispose()
      mesh.updateMatrix()
      cached = { source: mesh.geometry.clone().applyMatrix4(mesh.matrix), output: mesh.geometry, key: '' }
      this.entries.set(mesh, cached)
    }
    const key = JSON.stringify({ height: host.height, thickness: host.countertopThickness, width: host.width,
      depth: host.depth, overhang: host.countertopOverhang, enabled: host.countertopEnabled,
      basins: basins.map(child => getEffectiveNode(child)) })
    if (cached.key === key) return
    const cut = cutVanityCountertop(cached.source, host, basins)
    mesh.updateMatrix()
    cut.applyMatrix4(mesh.matrix.clone().invert())
    mesh.geometry.dispose()
    mesh.geometry = cut
    cached.output = cut; cached.key = key
  }
  endFrame() {
    for (const [mesh, cached] of this.entries) if (!this.visited.has(mesh)) {
      cached.source.dispose(); this.entries.delete(mesh)
    }
  }
  dispose() { for (const cached of this.entries.values()) cached.source.dispose(); this.entries.clear() }
}
