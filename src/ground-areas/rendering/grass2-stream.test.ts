import { expect, test } from 'bun:test'
import { Box3, InstancedMesh, Matrix4, OrthographicCamera, Vector3, type Object3D } from 'three'
import type { Point } from '../domain/schema'
import { GroundAreaNode } from '../domain/schema'
import { buildGroundAreaLiveGeometry } from './geometry'
import { makeGrass2, makeStreamedGrass2, updateGrass2Wind } from './grass2'
import { Grass2Stream } from './grass2-stream'

function cameraAt(x: number, z: number, halfSpan = 5) {
  const camera = new OrthographicCamera(-halfSpan, halfSpan, halfSpan, -halfSpan, 0.1, 500)
  camera.position.set(x, 30, z)
  camera.up.set(0, 0, -1)
  camera.lookAt(x, 0, z)
  camera.updateMatrixWorld(true)
  return camera
}

function drain(stream: Grass2Stream, camera: OrthographicCamera) {
  stream.updateMatrixWorld(true)
  stream.update(camera)
  let steps = 0
  while (stream.pendingPatchCount && steps++ < 1000) stream.update(camera)
  expect(stream.pendingPatchCount).toBe(0)
}

function placements(group: Object3D, name: string) {
  const matrix = new Matrix4()
  const result: string[] = []
  group.traverse((object) => {
    if (!(object instanceof InstancedMesh) || object.name !== name) return
    // Compare the entire buffer, independent of the currently selected LOD.
    for (let i = 0; i < object.instanceMatrix.count; i++) {
      object.getMatrixAt(i, matrix)
      result.push([matrix.elements[12], matrix.elements[13], matrix.elements[14]].join(','))
    }
  })
  return result.sort()
}

test('streamed grass preserves eager placements across tile edges, holes, and styles', () => {
  const outline: Point[] = [[-8, -8], [16, -8], [16, 8], [-8, 8]]
  const bounds = new Box3(new Vector3(-8, 0, -8), new Vector3(16, 1, 8))
  const contains = (x: number, z: number) => !(x > -1 && x < 2 && z > -2 && z < 2)
  const heightAt = (x: number, z: number) => Math.sin(x) * 0.2 + z * 0.02
  for (const mode of ['blades', 'billboards'] as const) {
    const settings = { mode, seed: 9, flowerDensity: 1, flowerMix: 'clover' as const }
    const eager = makeGrass2(outline, 0, contains, settings, heightAt)
    const stream = makeStreamedGrass2(outline, contains, settings, heightAt, bounds)
    expect(stream.children).toHaveLength(0)
    drain(stream, cameraAt(4, 0, 16))
    for (const name of [`grass2-${mode}`, 'grass2-clover']) {
      const actual = placements(stream, name)
      expect(actual).toEqual(placements(eager, name))
      expect(new Set(actual).size).toBe(actual.length)
    }
  }
})

test('large areas generate visible patches gradually and reuse cached meshes on return', () => {
  const outline: Point[] = [[0, 0], [400, 0], [400, 400], [0, 400]]
  let samples = 0
  const stream = makeStreamedGrass2(outline, () => true, { flowerDensity: 0 },
    () => { samples++; return 0 }, new Box3(new Vector3(), new Vector3(400, 0, 400)))
  expect(samples).toBe(0)
  stream.updateMatrixWorld(true)
  const camera = cameraAt(12, 12, 2)
  stream.update(camera)
  expect(stream.children.length).toBeLessThanOrEqual(1)
  drain(stream, camera)
  const first = stream.children[0]!
  expect(first).toBeDefined()
  const original = placements(first, 'grass2-blades')
  expect(samples).toBeLessThan(10000)
  const sampleCount = samples
  drain(stream, camera)
  expect(samples).toBe(sampleCount)
  drain(stream, cameraAt(36, 12, 2))
  expect(first.visible).toBe(false)
  drain(stream, camera)
  expect(stream.children).toContain(first)
  expect(first.visible).toBe(true)
  expect(placements(first, 'grass2-blades')).toEqual(original)

  let geometryDisposed = 0, meshDisposed = 0
  const mesh = first.getObjectByName('grass2-blades') as InstancedMesh
  mesh.geometry.addEventListener('dispose', () => geometryDisposed++)
  mesh.addEventListener('dispose', () => meshDisposed++)
  for (let x = 60; x < 390; x += 24) drain(stream, cameraAt(x, 12, 2))
  expect(stream.residentPatchCount).toBeLessThanOrEqual(13)
  expect(stream.children).not.toContain(first)
  expect(geometryDisposed).toBe(1)
  expect(meshDisposed).toBe(1)
  drain(stream, camera)
  const regenerated = stream.getObjectByName(first.name)!
  expect(regenerated).toBeDefined()
  expect(regenerated).not.toBe(first)
  expect(placements(regenerated, 'grass2-blades')).toEqual(original)
})

test('streaming respects transformed areas and avoids generating fully zoomed-out grass', () => {
  const outline: Point[] = [[0, 0], [8, 0], [8, 8], [0, 8]]
  const stream = makeStreamedGrass2(outline, () => true, {}, () => 0,
    new Box3(new Vector3(), new Vector3(8, 0, 8)))
  stream.position.set(100, 0, 100)
  stream.rotation.y = Math.PI / 2
  drain(stream, cameraAt(4, 4))
  expect(stream.children).toHaveLength(0)
  drain(stream, cameraAt(104, 96, 2000))
  expect(stream.children).toHaveLength(0)
  drain(stream, cameraAt(104, 96))
  expect(stream.children).toHaveLength(1)
})

test('live ground geometry defers grass buffers but keeps the ground surface available', () => {
  const node = GroundAreaNode.parse({ surface: 'grass2', outline: [[0, 0], [100, 0], [100, 100], [0, 100]] })
  const group = buildGroundAreaLiveGeometry(node)
  const stream = group.getObjectByName('ground-area-grass2-stream') as Grass2Stream
  expect(stream).toBeInstanceOf(Grass2Stream)
  expect(stream.children).toHaveLength(0)
  expect(group.getObjectByName('ground-area-grass2')).toBeDefined()
  group.updateMatrixWorld(true)
  drain(stream, cameraAt(12, 12, 2))
  expect(stream.children.length).toBeGreaterThan(0)
})

test('moving the camera cancels unfinished placement for a patch that left the view', () => {
  let cancelled = 0
  const stream = new Grass2Stream(new Box3(new Vector3(), new Vector3(16, 0, 8)), 8,
    function* (x) {
      if (x === 0) {
        try { while (true) yield }
        finally { cancelled++ }
      }
      return null
    })
  stream.updateMatrixWorld(true)
  stream.update(cameraAt(4, 4, 2))
  expect(stream.pendingPatchCount).toBe(1)
  stream.update(cameraAt(12, 4, 2))
  expect(cancelled).toBe(1)
  expect(stream.pendingPatchCount).toBe(0)
  expect(stream.children).toHaveLength(0)
})

test('wind, terrain and footprint edits preserve buffers in unaffected patches', () => {
  const outline: Point[] = [[0, 0], [24, 0], [24, 8], [0, 8]]
  const bounds = new Box3(new Vector3(), new Vector3(24, 0, 8))
  const settings = { flowerDensity: 1, flowerMix: 'clover' as const }
  const stream = makeStreamedGrass2(outline, () => true, settings, () => 0, bounds,
    { tileSignature: (x) => `tile-${x}` })
  const camera = cameraAt(12, 4, 16)
  drain(stream, camera)
  const first = stream.getObjectByName('grass2-patch-0-0')!
  const second = stream.getObjectByName('grass2-patch-1-0')!
  const a = first.getObjectByName('grass2-blades') as InstancedMesh
  const b = second.getObjectByName('grass2-blades') as InstancedMesh
  const buffer = a.instanceMatrix, versionA = buffer.version, versionB = b.instanceMatrix.version
  const restored = makeStreamedGrass2(outline, () => true, { ...settings, wind: 0 },
    (x) => x < 8 ? 0.5 : 0, new Box3(new Vector3(), new Vector3(24, 0.5, 8)),
    { previous: stream, tileSignature: (x) => `tile-${x}` })
  expect(restored).toBe(stream)
  expect(restored.getObjectByName(first.name)).toBe(first)
  expect(a.instanceMatrix).toBe(buffer)
  expect(buffer.version).toBeGreaterThan(versionA)
  expect(b.instanceMatrix.version).toBe(versionB)
  expect(buffer.updateRanges.length).toBeGreaterThan(0)
  expect(buffer.array[13]).toBeCloseTo(0.524, 5)
  expect((a.material as import('three').Material).userData.grass2Wind.value).toBe(0)
  updateGrass2Wind(stream, 1)
  expect((a.material as import('three').Material).userData.grass2Wind.value).toBe(1)
  expect(stream.userData.grass2Wind.value).toBe(1)
  let disposed = false
  a.geometry.addEventListener('dispose', () => { disposed = true })
  makeStreamedGrass2(outline, (x) => x >= 4, settings, () => 0, bounds,
    { previous: stream, tileSignature: (x) => x === 0 ? 'cut' : `tile-${x}` })
  drain(stream, camera)
  expect(disposed).toBe(true)
  expect(stream.getObjectByName(first.name)).not.toBe(first)
  expect(stream.getObjectByName(second.name)).toBe(second)
  expect(placements(stream.getObjectByName(first.name)!, 'grass2-blades')
    .every((position) => Number(position.split(',')[0]) >= 4)).toBe(true)
})
