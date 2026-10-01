import { BufferGeometry, Float32BufferAttribute, type CylinderGeometry } from 'three'

export type BasinRing = { points: [number, number][]; y: number }
export type BasinUVSection = { start: number; end: number; mapping: 'curved' | 'planar' }

/** Tiled material UVs use metres, matching the editor's procedural surfaces. */
export function buildBasinShell(rings: BasinRing[], sections: BasinUVSection[]): BufferGeometry {
  const segments = rings[0]!.points.length
  const basePositions = rings.flatMap(ring => ring.points.flatMap(([x, z]) => [x, ring.y, z]))
  const baseIndices: number[] = []
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < segments; i++) {
    const a = r * segments + i, b = (r + 1) * segments + i
    const c = r * segments + (i + 1) % segments, d = (r + 1) * segments + (i + 1) % segments
    baseIndices.push(a, b, c, c, b, d)
  }
  // Calculate shading on the welded shell before duplicating UV island boundaries.
  const base = new BufferGeometry()
  base.setAttribute('position', new Float32BufferAttribute(basePositions, 3))
  base.setIndex(baseIndices)
  base.computeVertexNormals()
  const normals = base.getAttribute('normal')
  const positions: number[] = [], normalValues: number[] = [], uv: number[] = [], indices: number[] = []
  // Put the wrap seam behind the bowl, away from its front presentation.
  const seam = Math.floor(segments / 4), stride = segments + 1
  for (const section of sections) {
    const offset = positions.length / 3
    let meridian = 0
    for (let r = section.start; r <= section.end; r++) {
      const ring = rings[r]!
      if (r > section.start) {
        const previous = rings[r - 1]!
        // One V coordinate per ring prevents folds on oval and squarer bowls.
        meridian += ring.points.reduce((sum, [x, z], i) => {
          const [px, pz] = previous.points[i]!
          return sum + Math.hypot(x - px, ring.y - previous.y, z - pz)
        }, 0) / segments
      }
      let perimeter = 0
      for (let i = 0; i <= segments; i++) {
        const source = (i + seam) % segments, [x, z] = ring.points[source]!
        if (i > 0) {
          const previous = ring.points[(source + segments - 1) % segments]!
          perimeter += Math.hypot(x - previous[0], z - previous[1])
        }
        positions.push(x, ring.y, z)
        const index = r * segments + source
        normalValues.push(normals.getX(index), normals.getY(index), normals.getZ(index))
        uv.push(...(section.mapping === 'planar' ? [x, z] : [perimeter, meridian]))
      }
    }
    for (let r = 0; r < section.end - section.start; r++) for (let i = 0; i < segments; i++) {
      const a = offset + r * stride + i, b = a + stride
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  base.dispose()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normalValues, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  return geometry
}

export function unwrapBasinDrainCover(geometry: CylinderGeometry, radius: number, height: number) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(normal.getY(i)) > 0.5) uv.setXY(i, position.getX(i), position.getZ(i))
    else uv.setXY(i, uv.getX(i) * Math.PI * 2 * radius, uv.getY(i) * height)
  }
  return geometry
}
