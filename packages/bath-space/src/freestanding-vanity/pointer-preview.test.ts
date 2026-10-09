import { expect, test } from 'bun:test'
import { Group, PerspectiveCamera, Vector2, Vector3 } from 'three'
import { vanityPointerPreviewEvent } from './pointer-preview'

test('vanity preview resolves immediately and follows the pointer on an elevated, rotated level', () => {
  const level = new Group()
  level.position.set(12, 3, -7)
  level.rotation.y = Math.PI / 3
  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(12, 10, 0)
  camera.lookAt(12, 3, -7)
  const initial = vanityPointerPreviewEvent(camera, level, new Vector2())!
  expect(initial.position[0]).toBeCloseTo(12)
  expect(initial.position[1]).toBeCloseTo(3)
  expect(initial.position[2]).toBeCloseTo(-7)
  const moved = vanityPointerPreviewEvent(camera, level, new Vector2(0.25, 0.1))!
  expect(moved.position[1]).toBeCloseTo(3)
  expect(moved.position).not.toEqual(initial.position)
  const world = level.localToWorld(new Vector3(...moved.localPosition))
  expect(world.distanceTo(new Vector3(...moved.position))).toBeLessThan(1e-8)
  expect(moved.nativeEvent.ray.distanceToPoint(world)).toBeLessThan(1e-8)
})

test('vanity preview rejects a cursor ray that cannot reach the floor', () => {
  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 2, 0)
  camera.lookAt(0, 3, -1)
  expect(vanityPointerPreviewEvent(camera, undefined, new Vector2())).toBeNull()
})
