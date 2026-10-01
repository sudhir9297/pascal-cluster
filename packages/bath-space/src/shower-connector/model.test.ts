import { expect, test } from 'bun:test'
import { Mesh, Vector3 } from 'three'
import { ShowerConnectorNode, showerConnectorPresets, connectorPresetNode } from './schema'
import { buildShowerConnectorGeometry, connectorOutlet } from './geometry'
test('connector presets persist and expose finite outlet poses at angle and dimension limits', () => {
  for (const preset of showerConnectorPresets)
    for (const angle of [-90, 0, 45, 90])
      for (const max of [false, true]) {
        const n = ShowerConnectorNode.parse({
          ...connectorPresetNode(preset),
          angle,
          length: max ? 0.5 : 0.025,
          diameter: max ? 0.06 : 0.025,
          collarLength: max ? 0.025 : 0.005,
          azimuth: max ? 180 : -180,
        })
        expect(ShowerConnectorNode.parse(JSON.parse(JSON.stringify(n)))).toEqual(n)
        const pose = connectorOutlet(n),
          root = buildShowerConnectorGeometry(n),
          target = root.getObjectByName(
            n.outletType === 'hose'
              ? 'shower_connector_target_hose'
              : 'shower_connector_target_shower-head',
          )!
        expect(target.position.toArray()).toEqual(pose.position)
        expect(target.quaternion.toArray()).toEqual(pose.quaternion)
        expect(
          new Vector3(0, -1, 0)
            .applyQuaternion(target.quaternion)
            .distanceTo(new Vector3(...pose.direction)),
        ).toBeLessThan(1e-8)
        expect(target.userData.hostId).toBe(n.id)
        for (const v of [...pose.position, ...pose.direction, ...pose.quaternion])
          expect(Number.isFinite(v)).toBe(true)
        root.traverse((o) => {
          if (o instanceof Mesh) {
            for (const attribute of ['position', 'normal'])
              for (const value of o.geometry.getAttribute(attribute).array)
                expect(Number.isFinite(value)).toBe(true)
            o.geometry.dispose()
          }
        })
      }
})
test('elbow outlets follow arc length and articulated extensions keep the downstream outlet parallel', () => {
  const n = ShowerConnectorNode.parse({ style: 'elbow', length: 0.1, angle: 90 }),
    pose = connectorOutlet(n)
  expect(pose.position[1]).toBeCloseTo(-0.1 / (Math.PI / 2))
  expect(pose.position[2]).toBeCloseTo(0.1 / (Math.PI / 2))
  const articulated = connectorOutlet(
    ShowerConnectorNode.parse({ style: 'articulated', angle: 60 }),
  )
  expect(articulated.direction).toEqual([0, -1, 0])
})
