import { expect, test } from 'bun:test'
import { Group, Vector3 } from 'three'
import { wallGhostMatrix } from './wall-ghost-transform'

test('stable ghost has the same world pose as a committed wall child when switching hosts', () => {
  const scene = new Group(), building = new Group(), level = new Group()
  scene.position.set(3, -1, 2)
  scene.rotation.y = 0.2
  building.position.set(5, 1, -3)
  building.rotation.y = 0.7
  building.scale.set(0.5, 0.8, 0.6)
  level.position.y = 2.8
  scene.add(building)
  building.add(level)
  const walls = [new Group(), new Group()]
  walls[0]!.position.set(2, 0.15, 4)
  walls[1]!.position.set(-1, 0.2, 3)
  walls[1]!.rotation.y = -Math.PI / 2
  level.add(...walls)
  const ghost = new Group()
  ghost.matrixAutoUpdate = false
  scene.add(ghost)
  for (const host of [walls[0]!, walls[1]!, walls[0]!]) {
    for (const rotation of [0, Math.PI]) {
      const position: [number, number, number] = [1.2, 1.4, rotation ? 0.4 : -0.4]
      const placed = new Group()
      placed.position.set(...position)
      placed.rotation.y = rotation
      host.add(placed)
      wallGhostMatrix(host, scene, position, rotation, ghost.matrix)
      ghost.matrixWorldNeedsUpdate = true
      scene.updateMatrixWorld(true)
      ghost.matrixWorld.elements.forEach((value, i) => {
        expect(value).toBeCloseTo(placed.matrixWorld.elements[i]!, 9)
      })
      for (const point of [new Vector3(), new Vector3(0.2, -0.3, 0.4)]) {
        expect(ghost.localToWorld(point.clone()).distanceTo(placed.localToWorld(point.clone())))
          .toBeLessThan(1e-9)
      }
      host.remove(placed)
    }
  }
})
