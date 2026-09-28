import { expect, test } from 'bun:test'
import { Matrix4, Vector3, type InstancedMesh } from 'three'
import { GroundAreaNode, type Point } from '../domain/schema'
import { makeGrass2 } from './grass2'

const square: Point[] = [[0, 0], [5, 0], [5, 5], [0, 5]]

function positions(mesh: InstancedMesh) {
  const matrix = new Matrix4(), point = new Vector3()
  return Array.from({ length: mesh.count }, (_, index) => {
    mesh.getMatrixAt(index, matrix)
    point.setFromMatrixPosition(matrix)
    return [point.x, point.z] as const
  })
}

test('Grass 2 keeps tufts and flowers inside the usable ground footprint', () => {
  const usable = (x: number, z: number) => !(x > 2 && x < 3 && z > 2 && z < 3)
  const group = makeGrass2(square, 0, usable, { flowerDensity: 1 })
  const tufts = group.getObjectByName('grass2-tufts') as InstancedMesh
  const stems = group.getObjectByName('grass2-flower-stems') as InstancedMesh
  expect(tufts.count).toBeGreaterThan(0)
  expect(stems.count).toBeGreaterThan(0)
  for (const [x, z] of [...positions(tufts), ...positions(stems)]) {
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x).toBeLessThanOrEqual(5)
    expect(z).toBeGreaterThanOrEqual(0)
    expect(z).toBeLessThanOrEqual(5)
    expect(usable(x, z)).toBe(true)
  }
})

test('Grass 2 placement is stable by seed and flower amount can be zero', () => {
  const first = makeGrass2(square, 0, () => true, { seed: 7, flowerDensity: 0 })
  const second = makeGrass2(square, 0, () => true, { seed: 7, flowerDensity: 0 })
  const changed = makeGrass2(square, 0, () => true, { seed: 8, flowerDensity: 0 })
  const a = positions(first.getObjectByName('grass2-tufts') as InstancedMesh)
  const b = positions(second.getObjectByName('grass2-tufts') as InstancedMesh)
  const c = positions(changed.getObjectByName('grass2-tufts') as InstancedMesh)
  expect(a).toEqual(b)
  expect(c).not.toEqual(a)
  expect(first.getObjectByName('grass2-flower-stems')).toBeUndefined()
})

test('Grass 2 settings are saved on ground areas without changing existing grass', () => {
  const existing = GroundAreaNode.parse({ outline: square, surface: 'grass' })
  const flowering = GroundAreaNode.parse({ outline: square, surface: 'grass2',
    grass2Settings: { density: 1.4, flowerMix: 'clover' } })
  expect(existing.surface).toBe('grass')
  expect(flowering.grass2Settings.density).toBe(1.4)
  expect(flowering.grass2Settings.flowerMix).toBe('clover')
  expect(flowering.grass2Settings.wind).toBe(0.55)
})
