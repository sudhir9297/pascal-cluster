import { Box3, Mesh, Vector3, type Object3D } from 'three'
import type { SectionDimension } from './model'
import type { SectionModel } from './fields'

type Point = [number, number]
const precision = (n: number) => Number(n.toFixed(6))
const pointKey = (p: Point) => p.map(precision).join(',')
const polygon = (points: Point[]) =>
  points.length < 3 ? '' : `M${points.map((p) => p.map(precision).join(',')).join('L')}Z`
function hull(points: Point[]) {
  const sorted = [...new Map(points.map((p) => [pointKey(p), p])).values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  )
  const cross = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const half = (list: Point[]) => {
    const result: Point[] = []
    for (const p of list) {
      while (
        result.length > 1 &&
        cross(result[result.length - 2]!, result[result.length - 1]!, p) <= 0
      )
        result.pop()
      result.push(p)
    }
    return result.slice(0, -1)
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

// Join triangle/plane intersections into closed cut contours. Per-mesh paths
// retain holes, so the section uses the shared even-odd hatch fill.
function contours(segments: [Point, Point][]) {
  const edges = new Map<string, { a: Point; b: Point }>()
  const adjacent = new Map<string, Set<string>>()
  for (const [a, b] of segments) {
    const ka = pointKey(a),
      kb = pointKey(b)
    if (ka === kb) continue
    const key = [ka, kb].sort().join('|')
    edges.set(key, { a, b })
    for (const vertex of [ka, kb]) {
      const list = adjacent.get(vertex) ?? new Set<string>()
      list.add(key)
      adjacent.set(vertex, list)
    }
  }
  let path = ''
  while (edges.size) {
    const [firstKey, first] = edges.entries().next().value!
    edges.delete(firstKey)
    const points = [first.a, first.b]
    let current = pointKey(first.b)
    const start = pointKey(first.a)
    while (current !== start) {
      const key = [...(adjacent.get(current) ?? [])].find((key) => edges.has(key))
      if (!key) break
      const edge = edges.get(key)!
      edges.delete(key)
      const next = pointKey(edge.a) === current ? edge.b : edge.a
      points.push(next)
      current = pointKey(next)
    }
    if (current === start) path += polygon(points)
  }
  return path
}

// Use the fixture's local geometry, not its scene transform. Plan is X/Z;
// A-A cuts at X=0 and displays Z/Y. Attachment targets contain no meshes.
export function geometrySection(
  root: Object3D,
  dimensions: SectionDimension[],
  options: { mountingHeight?: number } = {},
): SectionModel {
  root.updateMatrixWorld(true)
  const meshes: Mesh[] = []
  root.traverse((object) => {
    if (object instanceof Mesh && object.geometry.getAttribute('position')) meshes.push(object)
  })
  const bounds = new Box3().setFromObject(root)
  if (bounds.isEmpty())
    return {
      drawing: { width: 0.01, depth: 0.01, height: 0.01, plan: '', section: '', cutAxis: 'x' },
      dimensions,
    }
  const width = Math.max(0.001, bounds.max.x - bounds.min.x)
  const depth = Math.max(0.001, bounds.max.z - bounds.min.z)
  const height = Math.max(0.001, bounds.max.y - bounds.min.y)
  let plan = '',
    section = '',
    detail = ''
  const planParts: string[] = [],
    sectionParts: string[] = []
  try {
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute('position')
      const vertices: Vector3[] = []
      for (let i = 0; i < position.count; i++)
        vertices.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
      const planPart = polygon(hull(vertices.map((p) => [p.x - bounds.min.x, p.z - bounds.min.z])))
      plan += planPart
      planParts.push(planPart)
      detail += polygon(hull(vertices.map((p) => [p.z - bounds.min.z, bounds.max.y - p.y])))
      const index = mesh.geometry.index
      const count = index?.count ?? vertices.length
      const segments: [Point, Point][] = []
      for (let i = 0; i < count; i += 3) {
        const triangle = [0, 1, 2].map(
          (offset) => vertices[index ? index.getX(i + offset) : i + offset]!,
        )
        const hits = new Map<string, Point>()
        for (let j = 0; j < 3; j++) {
          const a = triangle[j]!,
            b = triangle[(j + 1) % 3]!
          if (Math.abs(a.x) < 1e-8) {
            const hit: Point = [a.z - bounds.min.z, bounds.max.y - a.y]
            hits.set(pointKey(hit), hit)
          }
          if (a.x * b.x < 0) {
            const t = a.x / (a.x - b.x)
            const hit: Point = [
              a.z + t * (b.z - a.z) - bounds.min.z,
              bounds.max.y - (a.y + t * (b.y - a.y)),
            ]
            hits.set(pointKey(hit), hit)
          }
        }
        if (hits.size === 2) segments.push([...hits.values()] as [Point, Point])
      }
      const sectionPart = contours(segments)
      section += sectionPart
      sectionParts.push(sectionPart)
    }
    const floorHeight =
      options.mountingHeight === undefined ? undefined : options.mountingHeight + bounds.max.y
    return {
      drawing: {
        width,
        depth,
        height: floorHeight === undefined ? height : Math.max(height, floorHeight),
        ...(floorHeight === undefined
          ? {}
          : { fixtureHeight: height, datum: { y: bounds.max.y, label: 'Mount axis' } }),
        sectionWidth: depth,
        plan,
        section,
        planParts,
        sectionParts,
        detail,
        cutAxis: 'x',
        cutPosition: -bounds.min.x / width,
        floor: floorHeight !== undefined,
      },
      dimensions,
    }
  } finally {
    // Builders allocate geometry for this drawing. Materials belong to the
    // viewer cache and must stay alive for the scene renderer.
    for (const geometry of new Set(meshes.map((mesh) => mesh.geometry))) geometry.dispose()
    const materials = new Set(
      meshes.flatMap((mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material])),
    )
    for (const material of materials)
      if (!material.userData.__pascalCachedMaterial) material.dispose()
  }
}
