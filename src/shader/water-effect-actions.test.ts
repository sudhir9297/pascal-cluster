import { expect, test } from 'bun:test'
import type { WebGPURenderer } from 'three/webgpu'
import { PoolWaterEffect } from './water-effect'
import { PoolNode } from '../core/schema'

test('saved water mode survives a move and effect recreation', () => {
  for (const waterMode of ['calm', 'storm'] as const) {
    const pool = PoolNode.parse({ waterMode })
    const moved = PoolNode.parse(JSON.parse(JSON.stringify({ ...pool, position: [4, 0, 2] })))
    const effect = new PoolWaterEffect(moved, 16)
    expect(effect.waterMode).toBe(waterMode)
    effect.setSettings({ ...moved, waterColor: '#ffffff' })
    expect(effect.waterMode).toBe(waterMode)
    effect.setSettings({ ...moved, waterMode: 'base' })
    expect(effect.waterMode).toBe('base')
    effect.dispose()
  }
  expect(PoolNode.parse({}).waterMode).toBe('base')
})

function rendererStub() {
  let passes = 0
  return {
    renderer: {
      autoClear: false,
      getRenderTarget: () => null,
      setRenderTarget() {},
      render() { passes++ },
    } as unknown as WebGPURenderer,
    passes: () => passes,
  }
}

test('queued disturbances are combined into one render pass', () => {
  const effect = new PoolWaterEffect({}, 16)
  const { renderer, passes } = rendererStub()
  for (let i = 0; i < 100; i++) effect.addDrop(0.5, 0.5)
  effect.storm()
  effect.update(renderer, 120)
  expect(passes()).toBe(5)
  expect(renderer.autoClear).toBe(false)
  effect.dispose()
})

test('distant water uses fewer simulation render passes', () => {
  const near = new PoolWaterEffect({}, 16)
  const far = new PoolWaterEffect({}, 16)
  const nearRenderer = rendererStub()
  const farRenderer = rendererStub()
  for (let frame = 0; frame < 60; frame++) {
    near.update(nearRenderer.renderer, 1 / 60, 30)
    far.update(farRenderer.renderer, 1 / 60, 10)
  }
  expect(farRenderer.passes()).toBeLessThan(nearRenderer.passes() / 2)
  near.dispose()
  far.dispose()
})

test('sustained slow frames lower simulation resolution and recovery restores it', () => {
  const effect = new PoolWaterEffect({}, 128)
  const { renderer } = rendererStub()
  for (let i = 0; i < 50; i++) effect.update(renderer, 0.05)
  expect(effect.resolution).toBe(64)
  for (let i = 0; i < 970; i++) effect.update(renderer, 1 / 120)
  expect(effect.resolution).toBe(128)
  effect.dispose()
})
