import { describe, expect, test } from 'bun:test'
import { Color, Vector3 } from 'three/webgpu'
import { vec3 } from 'three/tsl'
import type { SceneAtmosphereSource } from '@pascal-app/viewer'
import { PoolWaterEffect, createImmersiveXRPoolWaterMaterial } from './water-effect'
import { WaterfallWaterEffect } from './waterfall-effect'

function atmosphere(reflectionRadiance: SceneAtmosphereSource['reflectionRadiance'] = () => vec3(0.1, 0.2, 0.3)): SceneAtmosphereSource {
  return {
    reflectionRadiance,
    skyRadiance: () => vec3(0.1, 0.2, 0.3),
    fogRadiance: () => vec3(0.1, 0.2, 0.3),
    environmentNode: vec3(0.1, 0.2, 0.3),
    sunDirection: new Vector3(0, 1, 0),
    sunColor: new Color('#fff4dc'),
    sunIntensity: 2,
    moonDirection: new Vector3(0, 1, 0),
    moonColor: new Color('#b8ccff'),
    moonIntensity: 0,
    skyColor: new Color('#6688aa'),
    groundColor: new Color('#332211'),
    hemisphereIntensity: 0.6,
    ambientIntensity: 0.1,
    exposure: 1,
    fogStart: 100,
    fogEnd: 1000,
  }
}

describe('immersive XR pool water', () => {
  test('uses a transparent color material without viewport render nodes', () => {
    const material = createImmersiveXRPoolWaterMaterial({ waterColor: '#123456' })

    expect(material.color.getHexString()).toBe('123456')
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(material.colorNode).toBeNull()
    expect(material.positionNode).toBeNull()

    material.dispose()
  })

  test('uses atmosphere lighting when the viewer publishes one', () => {
    const material = createImmersiveXRPoolWaterMaterial(
      { waterColor: '#123456' },
      atmosphere(),
    )

    expect(material.colorNode).not.toBeNull()
    expect(material.positionNode).toBeNull()
    material.dispose()
  })
})

test('pool water builds its reflection from the active scene atmosphere', () => {
  let reflectionSamples = 0
  const effect = new PoolWaterEffect({}, 16, atmosphere(() => {
    reflectionSamples++
    return vec3(0.1, 0.2, 0.3)
  }))

  expect(reflectionSamples).toBe(1)
  effect.dispose()
})

test('storm water keeps a planar surface while shading its motion per pixel', () => {
  const effect = new PoolWaterEffect({ waterMode: 'storm' }, 16)
  expect(effect.material.positionNode).toBeNull()
  expect(effect.material.colorNode).not.toBeNull()
  effect.dispose()
})

test('low quality omits environment and local scene reflection nodes', () => {
  let reflectionSamples = 0
  const effect = new PoolWaterEffect({ waterQuality: 'low' }, 16, atmosphere(() => {
    reflectionSamples++
    return vec3(0.1, 0.2, 0.3)
  }))

  expect(reflectionSamples).toBe(1)
  expect(effect.resolution).toBe(16)
  effect.dispose()
})

test('changing quality rebuilds the shader even when simulation resolution stays fixed', () => {
  const effect = new PoolWaterEffect({ waterQuality: 'high' }, 64)
  const highMaterial = effect.material
  effect.setSettings({ waterQuality: 'medium' })
  expect(effect.material).not.toBe(highMaterial)
  expect(effect.resolution).toBe(64)
  effect.dispose()
})

for (const [name, createEffect] of [
  ['pool', () => new PoolWaterEffect({ waterQuality: 'high' }, 16)],
  ['waterfall', () => new WaterfallWaterEffect({})],
] as const) {
  test(`${name} framebuffer copies remain distinct across differently sized render passes`, () => {
    const effect = createEffect()
    try {
      type FramebufferCopy = {
        uuid: string
        referenceNode?: FramebufferCopy
        getTextureForReference(reference: object): object
      }
      const copies = new Map<string, FramebufferCopy>()
      effect.material.colorNode!.traverse((node) => {
        if (node.constructor.name === 'ViewportSharedTextureNode' || node.constructor.name === 'ViewportTextureNode') {
          const copy = node as unknown as FramebufferCopy
          const base = copy.referenceNode ?? copy
          copies.set(base.uuid, base)
        }
      })
      // Reflection and refraction share one copy within each render pass.
      expect(copies.size).toBe(1)
      const scenePass = { width: 1564, height: 963 }
      const previewPass = { width: 512, height: 512 }
      for (const copy of copies.values()) {
        const sceneTexture = copy.getTextureForReference(scenePass)
        const previewTexture = copy.getTextureForReference(previewPass)
        // Reallocating the preview must never destroy a texture encoded by the scene pass.
        expect(previewTexture).not.toBe(sceneTexture)
        expect(copy.getTextureForReference(scenePass)).toBe(sceneTexture)
        expect(copy.getTextureForReference(previewPass)).toBe(previewTexture)
      }
    } finally {
      effect.dispose()
    }
  })
}
