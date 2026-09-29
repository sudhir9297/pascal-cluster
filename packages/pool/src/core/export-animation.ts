import {
  AnimationClip,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  NumberKeyframeTrack,
  VectorKeyframeTrack,
  type Object3D,
} from 'three'
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js'
import type { PoolNode } from './schema'
import type { PoolSpilloverNode } from '../spillover/core/schema'
import type { PoolWaterfallNode } from '../water-feature/waterfall/core/schema'
import type { PoolSharedJointNode } from '../shared-joint/core/schema'

const DURATION = 3
const FRAMES = 8

function loopTrack(mesh: Mesh, label: string): AnimationClip {
  const times = Array.from({ length: FRAMES + 1 }, (_, frame) => DURATION * frame / FRAMES)
  const weights = times.flatMap((_, frame) =>
    Array.from({ length: FRAMES }, (_, target) => Number(target === frame % FRAMES)))
  return new AnimationClip(label, DURATION, [
    new NumberKeyframeTrack(`${mesh.uuid}.morphTargetInfluences`, times, weights),
  ])
}

function portableWaterMaterial(shallow: string, deep: string, opacity: number) {
  return new MeshPhysicalMaterial({
    color: new Color(shallow).lerp(new Color(deep), 0.35),
    roughness: 0.18,
    metalness: 0,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
  })
}

function setPortableWaterMaterial(mesh: Mesh, shallow: string, deep: string, opacity: number) {
  const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  mesh.material = portableWaterMaterial(shallow, deep, opacity)
  for (const material of old) material.dispose()
}

/** A portable loop for GLB players, sampled from the pool's water setting. */
export function bakePoolWaterAnimation(node: PoolNode, object: Object3D): AnimationClip | null {
  const water = object.getObjectByName('pool-water')
  if (!(water instanceof Mesh)) return null

  const original = water.geometry
  const geometry = new TessellateModifier(0.45, 5).modify(original)
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  if (!positions || !uvs || positions.count === 0) {
    geometry.dispose()
    return null
  }

  const amplitude = node.waterMode === 'storm' ? 0.032 : node.waterMode === 'calm' ? 0.006 : 0.014
  geometry.morphTargetsRelative = true
  geometry.morphAttributes.position = Array.from({ length: FRAMES }, (_, frame) => {
    const phase = 2 * Math.PI * frame / FRAMES
    const offsets = new Float32Array(positions.count * 3)
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index)
      const z = positions.getZ(index)
      const u = uvs.getX(index)
      const v = uvs.getY(index)
      const edge = Math.max(0, Math.min(1, Math.min(u, v, 1 - u, 1 - v) * 14))
      offsets[index * 3 + 1] = edge * amplitude * (
        Math.sin(x * 2.2 + phase) * Math.cos(z * 1.9 + phase) +
        0.45 * Math.sin(x * 4.1 - z * 3.3 - phase * 2)
      )
    }
    return new Float32BufferAttribute(offsets, 3)
  })
  water.geometry = geometry
  original.dispose()
  water.updateMorphTargets()

  return loopTrack(water, `${node.id}: water loop`)
}

function bakeSheetFlow(object: Object3D, name: string, label: string, strength: number): AnimationClip | null {
  const sheet = object.getObjectByName(name)
  if (!(sheet instanceof Mesh)) return null
  const geometry = sheet.geometry.clone()
  const positions = geometry.getAttribute('position')
  const normals = geometry.getAttribute('normal')
  const uvs = geometry.getAttribute('uv')
  if (!positions || !normals || !uvs || positions.count === 0) {
    geometry.dispose()
    return null
  }
  const amplitude = 0.005 + Math.max(0.2, Math.min(2, strength)) * 0.009
  geometry.morphTargetsRelative = true
  geometry.morphAttributes.position = Array.from({ length: FRAMES }, (_, frame) => {
    const phase = 2 * Math.PI * frame / FRAMES
    const offsets = new Float32Array(positions.count * 3)
    for (let index = 0; index < positions.count; index++) {
      const u = uvs.getX(index)
      const v = uvs.getY(index)
      const edge = Math.min(1, Math.max(0, Math.min(u, 1 - u) * 15))
      const arrival = Math.min(1, Math.max(0, v * 12))
      const wave = amplitude * edge * arrival * (
        Math.sin(v * 27 - phase + u * 9) + 0.35 * Math.sin(v * 51 - phase * 2 - u * 13)
      )
      offsets[index * 3] = normals.getX(index) * wave
      offsets[index * 3 + 1] = normals.getY(index) * wave
      offsets[index * 3 + 2] = normals.getZ(index) * wave
    }
    return new Float32BufferAttribute(offsets, 3)
  })
  sheet.geometry = geometry
  sheet.updateMorphTargets()
  return loopTrack(sheet, label)
}

function bakeReceivingWater(node: PoolWaterfallNode, object: Object3D): AnimationClip | null {
  const water = object.getObjectByName('waterfall-receiving-water')
  if (!(water instanceof Mesh)) return null
  const original = water.geometry
  const geometry = new TessellateModifier(0.18, 3).modify(original)
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  if (!positions || !uvs || positions.count === 0) {
    geometry.dispose()
    return null
  }
  geometry.morphTargetsRelative = true
  geometry.morphAttributes.position = Array.from({ length: FRAMES }, (_, frame) => {
    const phase = 2 * Math.PI * frame / FRAMES
    const offsets = new Float32Array(positions.count * 3)
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const radius = Math.min(1, Math.hypot(x, y))
      const edge = Math.min(1, Math.max(0, (1 - radius) * 12))
      offsets[index * 3 + 2] = edge * 0.012 * Math.sin(radius * 17 - phase) * Math.cos(x * 9 + phase)
    }
    return new Float32BufferAttribute(offsets, 3)
  })
  water.geometry = geometry
  original.dispose()
  water.updateMorphTargets()
  setPortableWaterMaterial(water, node.shallowWaterColor, node.deepWaterColor, 0.78)
  return loopTrack(water, `${node.id}: receiving water loop`)
}

function bakeBubbleMotion(node: PoolWaterfallNode, object: Object3D): AnimationClip | null {
  const tracks: VectorKeyframeTrack[] = []
  const times = Array.from({ length: FRAMES + 1 }, (_, frame) => DURATION * frame / FRAMES)
  object.traverse((child) => {
    if (!(child instanceof Mesh) || !/^waterfall-bubble-cloud-(foam|aeration|microstream)_\d+$/.test(child.name)) return
    if (child.scale.lengthSq() < 0.000001) return
    const index = Number(child.name.match(/_(\d+)$/)?.[1] ?? 0)
    const phase = index * 2.39996
    const basePosition = child.position.clone()
    const baseScale = child.scale.clone()
    const positions = times.flatMap((_, frame) => {
      const angle = 2 * Math.PI * frame / FRAMES + phase
      return [
        basePosition.x + Math.sin(angle) * 0.012,
        basePosition.y + Math.cos(angle) * 0.009,
        basePosition.z + Math.sin(angle + phase * 0.3) * 0.025 * node.flowStrength,
      ]
    })
    const scales = times.flatMap((_, frame) => {
      const pulse = 0.82 + 0.18 * Math.cos(2 * Math.PI * frame / FRAMES + phase)
      return [baseScale.x * pulse, baseScale.y * pulse, baseScale.z * pulse]
    })
    tracks.push(new VectorKeyframeTrack(`${child.uuid}.position`, times, positions))
    tracks.push(new VectorKeyframeTrack(`${child.uuid}.scale`, times, scales))
  })
  return tracks.length ? new AnimationClip(`${node.id}: foam loop`, DURATION, tracks) : null
}

export function bakePoolWaterfallAnimations(node: PoolWaterfallNode, object: Object3D): AnimationClip[] {
  const clips: AnimationClip[] = []
  const sheet = object.getObjectByName('waterfall-water-sheet')
  if (sheet instanceof Mesh) {
    setPortableWaterMaterial(sheet, node.shallowWaterColor, node.deepWaterColor, 0.72)
    const flow = bakeSheetFlow(object, sheet.name, `${node.id}: waterfall flow loop`, node.flowStrength)
    if (flow) clips.push(flow)
    const lines = object.getObjectByName('waterfall-flow-lines')
    if (lines instanceof Mesh) {
      lines.parent?.remove(lines)
      lines.geometry.dispose()
      for (const material of Array.isArray(lines.material) ? lines.material : [lines.material]) material.dispose()
    }
    const bubbles = bakeBubbleMotion(node, object)
    if (bubbles) clips.push(bubbles)
  }
  const receiving = bakeReceivingWater(node, object)
  if (receiving) clips.push(receiving)
  return clips
}

export function bakePoolSpilloverAnimation(node: PoolSpilloverNode, object: Object3D): AnimationClip | null {
  const sheet = object.getObjectByName('pool-spillover-water-sheet')
  if (!(sheet instanceof Mesh)) return null
  setPortableWaterMaterial(sheet, node.waterColor, node.waterColor, 0.72)
  const original = sheet.geometry
  const clip = bakeSheetFlow(object, sheet.name, `${node.id}: spillover flow loop`, node.flowStrength)
  if (clip) original.dispose()
  return clip
}

export function bakePoolConnectionAnimations(node: PoolSharedJointNode, object: Object3D): AnimationClip[] {
  const passage = object.getObjectByName('pool-connection-water-passage')
  if (!passage) return []
  const clips: AnimationClip[] = []
  let region = 0
  passage.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const original = child.geometry
    const geometry = new TessellateModifier(0.2, 4).modify(original)
    const positions = geometry.getAttribute('position')
    if (!positions || positions.count === 0) {
      geometry.dispose()
      return
    }
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox!
    const top = bounds.max.y
    geometry.morphTargetsRelative = true
    geometry.morphAttributes.position = Array.from({ length: FRAMES }, (_, frame) => {
      const phase = 2 * Math.PI * frame / FRAMES
      const offsets = new Float32Array(positions.count * 3)
      for (let index = 0; index < positions.count; index++) {
        const x = positions.getX(index)
        const y = positions.getY(index)
        const z = positions.getZ(index)
        if (top - y > 0.001) continue
        const edge = Math.min(1, Math.max(0, Math.min(
          x - bounds.min.x, bounds.max.x - x,
          z - bounds.min.z, bounds.max.z - z,
        ) * 20))
        offsets[index * 3 + 1] = edge * 0.008 * Math.sin(x * 8 + z * 7 + phase)
      }
      return new Float32BufferAttribute(offsets, 3)
    })
    child.geometry = geometry
    original.dispose()
    child.updateMorphTargets()
    clips.push(loopTrack(child, `${node.id}: connection water ${++region} loop`))
  })
  return clips
}
