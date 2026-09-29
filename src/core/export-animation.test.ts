import { expect, test } from 'bun:test'
import { AnimationClip, AnimationMixer, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { buildPoolGeometry } from './geometry'
import { bakePoolConnectionAnimations, bakePoolSpilloverAnimation, bakePoolWaterAnimation, bakePoolWaterfallAnimations } from './export-animation'
import { PoolNode } from './schema'
import { buildPoolSpilloverGeometry } from '../spillover/core/geometry'
import { PoolSpilloverNode } from '../spillover/core/schema'
import { buildWaterfallGeometry } from '../water-feature/waterfall/core/geometry'
import { PoolWaterfallNode } from '../water-feature/waterfall/core/schema'
import { buildSharedJointGeometry } from '../shared-joint/core/geometry'
import { PoolSharedJointNode } from '../shared-joint/core/schema'

async function glbJson(root: Group, clips: AnimationClip[]) {
  const previousReader = globalThis.FileReader
  class ExportFileReader {
    result: ArrayBuffer | null = null
    onloadend: (() => void) | null = null
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buffer) => {
        this.result = buffer
        this.onloadend?.()
      })
    }
  }
  globalThis.FileReader = ExportFileReader as unknown as typeof FileReader
  try {
    const binary = await new GLTFExporter().parseAsync(root, {
      binary: true,
      animations: clips,
    }) as ArrayBuffer
    const view = new DataView(binary)
    const jsonLength = view.getUint32(12, true)
    return JSON.parse(new TextDecoder().decode(new Uint8Array(binary, 20, jsonLength)))
  } finally {
    globalThis.FileReader = previousReader
  }
}

test('GLB pool export bakes a looping water morph animation', () => {
  const node = PoolNode.parse({ id: 'pool_export', length: 9, width: 5.5, waterMode: 'storm' })
  const pool = buildPoolGeometry(node)
  const water = pool.getObjectByName('pool-water') as Mesh
  const originalVertexCount = water.geometry.getAttribute('position').count
  const clip = bakePoolWaterAnimation(node, pool)

  expect(clip).not.toBeNull()
  expect(clip!.duration).toBe(3)
  expect(clip!.tracks[0]?.name).toBe(`${water.uuid}.morphTargetInfluences`)
  expect(water.geometry.getAttribute('position').count).toBeGreaterThan(originalVertexCount)
  expect(water.geometry.morphAttributes.position).toHaveLength(8)
  expect(water.morphTargetInfluences).toHaveLength(8)

  const mixer = new AnimationMixer(pool)
  mixer.clipAction(clip!).play()
  mixer.setTime(clip!.duration / 8)
  expect(water.morphTargetInfluences![1]).toBeCloseTo(1)
  mixer.stopAllAction()
  pool.userData.waterEffect.dispose()
  pool.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})

test('GLTFExporter writes the pool water morph targets and clip into a GLB', async () => {
  const node = PoolNode.parse({ id: 'pool_glb', waterMode: 'storm' })
  const pool = buildPoolGeometry(node)
  const water = pool.getObjectByName('pool-water') as Mesh
  const clip = bakePoolWaterAnimation(node, pool)!
  const oldMaterial = water.material
  water.material = new MeshBasicMaterial({ color: node.waterColor })
  const root = new Group()
  root.add(water)
  try {
    const json = await glbJson(root, [clip])
    expect(json.animations).toHaveLength(1)
    expect(json.animations[0].channels[0].target.path).toBe('weights')
    expect(json.meshes[0].primitives[0].targets).toHaveLength(8)
  } finally {
    water.material.dispose()
    water.material = oldMaterial
    pool.add(water)
    pool.userData.waterEffect.dispose()
    pool.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
    })
  }
})

test('portable waterfall export animates its sheet, receiving water, and foam', async () => {
  const node = PoolWaterfallNode.parse({ id: 'pool-waterfall_export', waterfallType: 'modern' })
  const waterfall = buildWaterfallGeometry(node)
  const sheet = waterfall.getObjectByName('waterfall-water-sheet') as Mesh
  const receiving = waterfall.getObjectByName('waterfall-receiving-water') as Mesh
  const foam = new Mesh(new SphereGeometry(0.05), new MeshBasicMaterial())
  foam.name = 'waterfall-bubble-cloud-foam_1'
  foam.scale.setScalar(0.05)
  waterfall.add(foam)
  const clips = bakePoolWaterfallAnimations(node, waterfall)

  expect(clips.map((clip) => clip.name)).toEqual([
    `${node.id}: waterfall flow loop`,
    `${node.id}: foam loop`,
    `${node.id}: receiving water loop`,
  ])
  expect(sheet.geometry.morphAttributes.position).toHaveLength(8)
  expect(receiving.geometry.morphAttributes.position).toHaveLength(8)
  expect(waterfall.getObjectByName('waterfall-flow-lines')).toBeUndefined()
  expect(clips[1]!.tracks.some((track) => track.name === `${foam.uuid}.position`)).toBe(true)

  const mixer = new AnimationMixer(waterfall)
  for (const clip of clips) mixer.clipAction(clip).play()
  mixer.setTime(3 / 8)
  expect(sheet.morphTargetInfluences![1]).toBeCloseTo(1)
  expect(receiving.morphTargetInfluences![1]).toBeCloseTo(1)
  mixer.stopAllAction()
  const exportRoot = new Group()
  sheet.userData = {}
  receiving.userData = {}
  exportRoot.add(sheet, receiving, foam)
  const json = await glbJson(exportRoot, clips)
  expect(json.animations).toHaveLength(3)
  expect(json.animations.flatMap((animation: { channels: { target: { path: string } }[] }) =>
    animation.channels.map((channel) => channel.target.path))).toContain('translation')
  expect(json.meshes.filter((mesh: { primitives: { targets?: unknown[] }[] }) =>
    mesh.primitives.some((primitive) => primitive.targets?.length === 8))).toHaveLength(2)
  waterfall.add(sheet, receiving, foam)
  waterfall.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})

test('portable spillover export includes flowing sheet morph targets', () => {
  const node = PoolSpilloverNode.parse({ id: 'pool-spillover_export', sourcePoolId: 'a', targetPoolId: 'b' })
  const spillover = buildPoolSpilloverGeometry(node)
  const sheet = spillover.getObjectByName('pool-spillover-water-sheet') as Mesh
  const clip = bakePoolSpilloverAnimation(node, spillover)
  expect(clip?.name).toBe(`${node.id}: spillover flow loop`)
  expect(sheet.geometry.morphAttributes.position).toHaveLength(8)
  expect(clip?.tracks[0]?.name).toBe(`${sheet.uuid}.morphTargetInfluences`)
  spillover.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})

test('portable pool connection exports its own water loop', () => {
  const node = PoolSharedJointNode.parse({ id: 'pool-shared-joint_export', poolIds: ['pool_a', 'pool_b'] })
  const connection = buildSharedJointGeometry(node)
  const clips = bakePoolConnectionAnimations(node, connection)
  const water = connection.getObjectByName('pool-connection-water-passage')!.children[0] as Mesh
  expect(clips).toHaveLength(1)
  expect(water.geometry.morphAttributes.position).toHaveLength(8)
  expect(clips[0]!.tracks[0]?.name).toBe(`${water.uuid}.morphTargetInfluences`)
  connection.userData.waterEffect.dispose()
  connection.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})
