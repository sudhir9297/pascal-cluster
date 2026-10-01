import { test, expect } from 'bun:test'
import { WallNode, type GeometryContext, type AnyNode } from '@pascal-app/core'
import { Box3, Mesh } from 'three'
import { BodyJetNode, bodyJetPresets, bodyJetPresetNode, bodyJetPresetParameters } from './schema'
import { buildBodyJetGeometry } from './geometry'
import { bodyJetSockets, bodyJetCentre } from './targets'
import { bodyJetFloorplan } from './floorplan'
test('all body-jet variants produce finite geometry and numbered targets at size and angle limits', () => {
  for (const p of bodyJetPresets)
    for (const edge of ['min', 'max']) {
      const base = bodyJetPresetNode(p),
        n = BodyJetNode.parse({
          ...base,
          width: edge === 'min' ? 0.04 : 0.18,
          height: edge === 'min' ? 0.2 : 0.04,
          projection: 0.008,
          pitch: edge === 'min' ? -30 : 30,
          yaw: 30,
          jetCount: 4,
          groupSpacing: 0.1,
        }),
        root = buildBodyJetGeometry(n)
      for (const s of bodyJetSockets(n)) {
        const target = root.getObjectByName(`${s.type}_target_${s.id}`)!
        expect(target.position.toArray()).toEqual(s.position)
        expect(target.rotation.y).toBe(s.rotation[1])
      }
      root.updateMatrixWorld(true)
      for (let i = 1; i <= 4; i++)
        expect(
          new Box3().setFromObject(root.getObjectByName(`body-jet-face-${i}`)!, true).min.z,
        ).toBeGreaterThanOrEqual(0)
      root.traverse((o) => {
        if (o instanceof Mesh) {
          for (const value of o.geometry.getAttribute('position').array)
            expect(Number.isFinite(value)).toBe(true)
          o.geometry.dispose()
        }
      })
      expect(BodyJetNode.parse({ ...n, ...bodyJetPresetParameters(p) }).id).toBe(n.id)
      expect(BodyJetNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
    }
})
test('group spacing clears flanges and aim edits retain spray slot identities', () => {
  const n = BodyJetNode.parse({
      style: 'square-flush',
      width: 0.18,
      height: 0.2,
      jetCount: 3,
      groupSpacing: 0.1,
      flangeSize: 0.22,
    }),
    before = bodyJetSockets(n),
    after = bodyJetSockets({ ...n, pitch: 30, yaw: 30 })
  expect(before.map((s) => s.id)).toEqual(after.map((s) => s.id))
  expect(before.find((s) => s.id === 'spray-1')!.position).not.toEqual(
    after.find((s) => s.id === 'spray-1')!.position,
  )
  expect(bodyJetCentre(n, 1)[1] - bodyJetCentre(n, 0)[1]).toBeGreaterThan(0.22)
  const wall = WallNode.parse({ start: [0, 0], end: [3, 0] }),
    placed = { ...n, parentId: wall.id, wallId: wall.id },
    nodes = { [wall.id]: wall } as Record<string, AnyNode>
  expect(
    bodyJetFloorplan(placed, { resolve: (id: string) => nodes[id] } as GeometryContext),
  ).toBeDefined()
})
