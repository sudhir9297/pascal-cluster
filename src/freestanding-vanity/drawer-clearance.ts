
import { basinModelRotation } from '../countertop-basin/orientation'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { Brush, Evaluator, SUBTRACTION, ensureRenderableGeometryAttributes, applyWorldScaleBoxUVs } from '@pascal-app/viewer'
import { Box3, BoxGeometry, BufferGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Vector3, type Object3D } from 'three'
import { semiRecessedOutline } from '../countertop-basin/semi-recessed-geometry'
import { basinOutline } from '../countertop-basin/geometry'
import { basinRemainsOnVanity } from '../countertop-basin/attachment'
import { basinDepth, BasinNode, SEMI_RECESSED_BASIN, isInsetBasinKind } from '../countertop-basin/schema'
import type { VanityNode } from './schema'
import { setDrawerClearanceStatus } from './drawer-clearance-status'

const clearance = 0.01
const cutMaterial = new MeshBasicMaterial()
type BoxSpec = { width: number; height: number; depth: number; wall: number; bottomY: number; front: number; rear: number }
type SavedMesh = { mesh: Mesh; geometry: BufferGeometry; front: boolean }
type Entry = { key: string; sources: SavedMesh[]; lining: Group }

export function basinDrawerVolumes(host: VanityNode, children: readonly AnyNode[]): Box3[] {
  return children.flatMap(raw => {
    if (!isInsetBasinKind(String(raw.type)) || !raw.visible) return []
    const basin = BasinNode.parse(getEffectiveNode(raw))
    if (!basin.visible || basin.parentId !== host.id || !basinRemainsOnVanity(basin, host)) return []
    const c = Math.cos(basinModelRotation(basin.rotation)), s = Math.sin(basinModelRotation(basin.rotation))
    const volume = new Box3()
    for (const [x, z] of (basin.type === SEMI_RECESSED_BASIN ? semiRecessedOutline : basinOutline)(basin.shape, basin.width, basinDepth(basin))) {
      volume.expandByPoint(new Vector3(basin.position[0] + x * c + z * s, basin.position[1], basin.position[2] - x * s + z * c))
    }
    volume.min.y = basin.position[1] - (basin.type === SEMI_RECESSED_BASIN ? basin.recessDepth : basin.height)
    return [volume.expandByScalar(clearance)]
  })
}

/** Basin-relative motion sweeps towards the drawer rear as the drawer opens. */
export function drawerSweptVolumes(drawer: Object3D, volumes: readonly Box3[]) {
  const pose = drawer.userData.vanityPose as { closedZ: number; travel: number }
  const origin = new Vector3(drawer.position.x, drawer.position.y, pose.closedZ)
  return volumes.map(volume => {
    const cut = volume.clone().translate(origin.clone().negate())
    cut.max.z += pose.travel
    return cut
  })
}

function localBounds(mesh: Mesh, geometry = mesh.geometry) {
  geometry.computeBoundingBox(); mesh.updateMatrix()
  return geometry.boundingBox!.clone().applyMatrix4(mesh.matrix)
}

export function carveClearance(source: BufferGeometry, matrix: Matrix4, volumes: readonly Box3[]) {
  source.computeBoundingBox()
  const bounds = source.boundingBox!.clone().applyMatrix4(matrix)
  const cuts = volumes.filter(volume => bounds.intersectsBox(volume))
  if (!cuts.length) return source.clone()
  const evaluator = new Evaluator(); evaluator.useGroups = false
  let result = source.clone().applyMatrix4(matrix)
  for (const volume of cuts) {
    const size = volume.getSize(new Vector3()), center = volume.getCenter(new Vector3())
    const cutter = new BoxGeometry(size.x, size.y, size.z).translate(center.x, center.y, center.z)
    const a = new Brush(result, cutMaterial), b = new Brush(cutter, cutMaterial)
    a.updateMatrixWorld(true); b.updateMatrixWorld(true)
    const next = ensureRenderableGeometryAttributes(evaluator.evaluate(a, b, SUBTRACTION).geometry)
    result.dispose(); cutter.dispose(); result = next
  }
  result.applyMatrix4(matrix.clone().invert()); result.clearGroups()
  return result
}

/** A rectangular union grid builds sealed U-shaped box walls around every notch. */
function lineNotches(lining: Group, spec: BoxSpec, volumes: Box3[], material: Mesh['material']) {
  const xMin = -spec.width / 2, xMax = spec.width / 2
  const notches = volumes.filter(v => v.min.y < spec.bottomY + spec.height && v.max.y > spec.bottomY - spec.wall / 2)
    .map(v => ({ x0: Math.max(xMin, v.min.x), x1: Math.min(xMax, v.max.x), z0: Math.max(spec.front, v.min.z), z1: Math.min(spec.rear, v.max.z) }))
    .filter(v => v.x0 < v.x1 && v.z0 < v.z1)
  const xs = [...new Set([xMin, xMax, ...notches.flatMap(v => [v.x0, v.x1])])].sort((a, b) => a - b)
  const zs = [...new Set([spec.front, spec.rear, ...notches.flatMap(v => [v.z0, v.z1])])].sort((a, b) => a - b)
  const occupied = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= zs.length - 1) return false
    const x = (xs[i]! + xs[i + 1]!) / 2, z = (zs[j]! + zs[j + 1]!) / 2
    return notches.some(v => x > v.x0 && x < v.x1 && z > v.z0 && z < v.z1)
  }
  let remainingArea = 0
  const wall = (size: [number, number, number], position: [number, number, number]) => {
    const geometry = new BoxGeometry(...size)
    applyWorldScaleBoxUVs(geometry, ...size)
    const mesh = new Mesh(geometry, material)
    mesh.name = 'vanity-drawer-basin-liner'
    mesh.userData.slotId = 'interior'; mesh.userData.__fromGeometry = true
    mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true
    lining.add(mesh)
  }
  const y = spec.bottomY + spec.height / 2
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const x0 = xs[i]!, x1 = xs[i + 1]!, z0 = zs[j]!, z1 = zs[j + 1]!
    if (!occupied(i, j)) { remainingArea += (x1 - x0) * (z1 - z0); continue }
    if (i > 0 && !occupied(i - 1, j)) wall([spec.wall, spec.height, z1 - z0], [x0 - spec.wall / 2, y, (z0 + z1) / 2])
    if (i < xs.length - 2 && !occupied(i + 1, j)) wall([spec.wall, spec.height, z1 - z0], [x1 + spec.wall / 2, y, (z0 + z1) / 2])
    if (j > 0 && !occupied(i, j - 1)) wall([x1 - x0, spec.height, spec.wall], [(x0 + x1) / 2, y, z0 - spec.wall / 2])
    if (j < zs.length - 2 && !occupied(i, j + 1)) wall([x1 - x0, spec.height, spec.wall], [(x0 + x1) / 2, y, z1 + spec.wall / 2])
  }
  return remainingArea / (spec.width * spec.depth)
}

export class DrawerClearanceCache {
  private entries = new Map<Object3D, Entry>()
  private visited = new Set<Object3D>()
  private hosts = new Set<string>()
  private visitedHosts = new Set<string>()
  beginFrame() { this.visited.clear(); this.visitedHosts.clear() }
  sync(root: Object3D, host: VanityNode, children: readonly AnyNode[]) {
    this.hosts.add(host.id); this.visitedHosts.add(host.id)
    const volumes = basinDrawerVolumes(host, children)
    const semiVolumes = basinDrawerVolumes(host, children.filter(raw => String(raw.type) === SEMI_RECESSED_BASIN))
    const otherVolumes = basinDrawerVolumes(host, children.filter(raw => String(raw.type) !== SEMI_RECESSED_BASIN))
    root.traverse(drawer => {
      const spec = drawer.userData.drawerBox as BoxSpec | undefined
      if (!spec) return
      this.visited.add(drawer)
      let entry = this.entries.get(drawer)
      if (!entry && !volumes.length) return
      if (!entry) {
        const sources = drawer.children.filter((part): part is Mesh => part instanceof Mesh)
          .map(mesh => ({ mesh, geometry: mesh.geometry.clone(), front: !/-(bottom|side-[+-]?\d+|slide-[+-]?\d+|back|inner-front)$/.test(mesh.name) }))
        const lining = new Group(); drawer.add(lining)
        entry = { key: '', sources, lining }; this.entries.set(drawer, entry)
      }
      const swept = drawerSweptVolumes(drawer, volumes)
      const semiSwept = drawerSweptVolumes(drawer, semiVolumes)
      const key = JSON.stringify([swept, semiSwept])
      if (entry.key === key) return
      entry.key = key
      for (const part of [...entry.lining.children]) { (part as Mesh).geometry.dispose(); entry.lining.remove(part) }
      for (const { mesh, geometry: source, front } of entry.sources) {
        mesh.updateMatrix()
        const result = carveClearance(source, mesh.matrix, front ? semiSwept : swept)
        mesh.geometry.dispose(); mesh.geometry = result
      }
      const material = entry.sources.find(source => !source.front)?.mesh.material
      const remaining = material ? lineNotches(entry.lining, spec, swept, material) : 1
      const otherSwept = drawerSweptVolumes(drawer, otherVolumes)
      const frontBlocked = entry.sources.some(source => source.front && otherSwept.some(v => localBounds(source.mesh, source.geometry).intersectsBox(v)))
      drawer.userData.basinBlocked = remaining < 0.2 || frontBlocked
      drawer.userData.basinClearance = volumes.length > 0
    })
    const blocked: string[] = []
    root.traverse(part => { if (part.userData.basinBlocked) blocked.push(part.name) })
    setDrawerClearanceStatus(host.id, blocked)
  }
  endFrame() {
    for (const [drawer, entry] of this.entries) if (!this.visited.has(drawer)) { this.release(entry); this.entries.delete(drawer) }
    for (const id of this.hosts) if (!this.visitedHosts.has(id)) { setDrawerClearanceStatus(id, []); this.hosts.delete(id) }
  }
  private release(entry: Entry, restore = false) {
    for (const source of entry.sources) {
      if (restore) { source.mesh.geometry.dispose(); source.mesh.geometry = source.geometry.clone() }
      source.geometry.dispose()
    }
    entry.lining.traverse(part => { if (part instanceof Mesh) part.geometry.dispose() })
    entry.lining.removeFromParent()
  }
  dispose() {
    for (const [drawer, entry] of this.entries) { this.release(entry, true); delete drawer.userData.basinBlocked; delete drawer.userData.basinClearance }
    this.entries.clear()
    for (const id of this.hosts) setDrawerClearanceStatus(id, [])
    this.hosts.clear()
  }
}
