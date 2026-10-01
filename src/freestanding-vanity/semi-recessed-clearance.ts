import type { AnyNode } from '@pascal-app/core'
import { BufferGeometry, Matrix4, Mesh, type Object3D } from 'three'
import { SEMI_RECESSED_BASIN } from '../countertop-basin/schema'
import { basinDrawerVolumes, carveClearance } from './drawer-clearance'
import type { VanityNode } from './schema'

type Entry = { source: BufferGeometry; output: BufferGeometry; key: string }
/** Fixed cabinet fronts need an open notch; affected hinged doors stay closed. */
export class SemiRecessedClearanceCache {
  private entries = new Map<Mesh, Entry>()
  private visited = new Set<Mesh>()
  beginFrame() { this.visited.clear() }
  sync(root: Object3D, host: VanityNode, children: readonly AnyNode[]) {
    const volumes = basinDrawerVolumes(host, children.filter(child => String(child.type) === SEMI_RECESSED_BASIN))
    root.traverse(part => {
      if (part.userData.vanityPose?.kind === 'door') { part.rotation.y = 0; part.userData.basinBlocked = false }
    })
    root.updateWorldMatrix(true, true)
    const inverse = root.matrixWorld.clone().invert()
    root.traverse(part => {
      if (!(part instanceof Mesh) || !['front', 'carcass', 'interior', 'hardware'].includes(part.userData.slotId)) return
      let ancestor = part.parent, door: Object3D | undefined
      while (ancestor && ancestor !== root) {
        if (ancestor.userData.vanityPose?.kind === 'drawer' || ancestor.userData.nodeId) return
        if (ancestor.userData.vanityPose?.kind === 'door') door = ancestor
        ancestor = ancestor.parent
      }
      this.visited.add(part)
      let entry = this.entries.get(part)
      if (entry && part.geometry !== entry.output) { entry.source.dispose(); entry.output.dispose(); this.entries.delete(part); entry = undefined }
      if (!entry && !volumes.length) return
      if (!entry) { entry = { source: part.geometry.clone(), output: part.geometry, key: '' }; this.entries.set(part, entry) }
      const matrix = new Matrix4().multiplyMatrices(inverse, part.matrixWorld)
      entry.source.computeBoundingBox()
      if (door && volumes.some(volume => entry!.source.boundingBox!.clone().applyMatrix4(matrix).intersectsBox(volume))) door.userData.basinBlocked = true
      const key = JSON.stringify([volumes, matrix.elements])
      if (entry.key === key) return
      entry.key = key
      const geometry = carveClearance(entry.source, matrix, volumes)
      entry.output.dispose()
      part.geometry = geometry; entry.output = geometry
    })
  }
  endFrame() {
    for (const [mesh, entry] of this.entries) if (!this.visited.has(mesh)) { entry.source.dispose(); entry.output.dispose(); this.entries.delete(mesh) }
  }
  dispose() {
    for (const [mesh, entry] of this.entries) { mesh.geometry = entry.source.clone(); entry.source.dispose(); entry.output.dispose() }
    this.entries.clear()
  }
}
