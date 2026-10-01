import { expect, test } from 'bun:test'
import { Box3, Mesh, type Material } from 'three'
import {
  dividerLayout,
  dividerRectangle,
  dividerSegment,
  ShowerDividerNode,
} from './schema'
import { buildShowerDividerGeometry } from './geometry'

test('drawn segments preserve both endpoints and reject zero or unsupported lengths', () => {
  const a: [number, number] = [2, -3],
    b: [number, number] = [-1, 1]
  const n = dividerSegment(a, b)!
  const dx = (Math.cos(n.rotation) * n.width) / 2,
    dz = (-Math.sin(n.rotation) * n.width) / 2
  expect(n.position[0] - dx).toBeCloseTo(a[0])
  expect(n.position[2] - dz).toBeCloseTo(a[1])
  expect(n.position[0] + dx).toBeCloseTo(b[0])
  expect(n.position[2] + dz).toBeCloseTo(b[1])
  expect(dividerSegment(a, a)).toBeNull()
  expect(dividerSegment([0, 0], [9, 0])).toBeNull()
  expect(dividerSegment(a, b)!.id).not.toBe(n.id)
})
test('rectangle is four connected segments regardless of drawing direction', () => {
  for (const b of [
    [2, 3],
    [-2, -3],
  ] as [number, number][]) {
    const segments = dividerRectangle([0, 0], b)
    expect(segments).toHaveLength(4)
    segments.forEach(([, end], i) =>
      expect(end).toEqual(segments[(i + 1) % 4]![0]),
    )
  }
})
test('custom layouts and extreme grids have finite geometry, positive openings and exact outside bounds', () => {
  for (const p of [
    { columns: 1, rows: 1 },
    { columns: 3, rows: 1 },
    { columns: 3, rows: 4 },
    { columns: 4, rows: 3 },
    { columns: 12, rows: 12 },
  ])
    for (const width of [0.2, 8]) {
      const n = ShowerDividerNode.parse({
        columns: p.columns,
        rows: p.rows,
        width,
        height: 0.5,
        frameWidth: 0.06,
        barWidth: 0.04,
      })
      const layout = dividerLayout(n)
      expect(layout.innerWidth / n.columns - layout.bar).toBeGreaterThan(0)
      expect(layout.innerHeight / n.rows - layout.bar).toBeGreaterThan(0)
      const root = buildShowerDividerGeometry(n),
        bounds = new Box3().setFromObject(root)
      expect(bounds.min.x).toBeCloseTo(-width / 2)
      expect(bounds.max.x).toBeCloseTo(width / 2)
      expect(bounds.min.y).toBeCloseTo(0)
      expect(bounds.max.y).toBeCloseTo(0.5)
      let glass = 0,
        frames = 0
      const materials = new Set<Material>()
      root.traverse((o) => {
        if (!(o instanceof Mesh)) return
        if (o.name === 'divider-glass') glass++
        if (o.name === 'divider-frame') {
          frames++
          expect(o.geometry.getAttribute('position').count).toBe(
            (n.columns + n.rows + 2) * 24,
          )
        }
        expect(['glass', 'frame']).toContain(o.userData.slotId)
        for (const name of ['position', 'uv'])
          for (const value of o.geometry.getAttribute(name).array)
            expect(Number.isFinite(value)).toBe(true)
        o.geometry.dispose()
        materials.add(o.material as Material)
      })
      expect(glass).toBe(1)
      expect(frames).toBe(1)
      expect(root.children).toHaveLength(2)
      for (const material of materials)
        if (!material.userData.__pascalCachedMaterial) material.dispose()
      expect(ShowerDividerNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
    }
})
