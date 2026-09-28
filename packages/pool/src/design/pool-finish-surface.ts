import { color, float, mix, sin, smoothstep } from 'three/tsl'
import type { PoolFinishSettings } from './pool-finishes'

/** Builds the procedural color node used on the visible pool interior. */
export function createPoolFinishSurface(finish: PoolFinishSettings, sourceU: any, sourceV: any) {
  const base = color(finish.base)
  const accent = color(finish.accent)
  const highlight = color(finish.highlight)
  let surface: any = base

  if (finish.kind === 'mosaic') {
    const tileU = sourceU.mul(finish.scale).add(sin(sourceV.mul(2.8)).mul(0.035))
    const tileV = sourceV.mul(finish.scale).add(sin(sourceU.mul(2.4)).mul(0.035))
    const cellU = tileU.floor()
    const cellV = tileV.floor()
    const withinU = tileU.fract()
    const withinV = tileV.fract()
    const edgeU = withinU.min(float(1).sub(withinU))
    const edgeV = withinV.min(float(1).sub(withinV))
    const tileMask = smoothstep(0.035, 0.07, edgeU.min(edgeV))
    const variation = sin(cellU.mul(12.9898).add(cellV.mul(78.233))).mul(43758.5453).fract()
    surface = mix(color(finish.grout), mix(accent, highlight, variation), tileMask)
  } else if (finish.kind !== 'solid') {
    const grain = sin(sourceU.mul(finish.scale * 1.7))
      .add(sin(sourceV.mul(finish.scale * 2.1)))
      .mul(0.25)
      .add(0.5)
    const speckle = sin(
      sourceU.mul(finish.scale * 17.13).add(sourceV.mul(finish.scale * 23.71)),
    ).mul(43758.5453).fract()
    const threshold = finish.kind === 'pebble' ? 0.68 : 0.78
    const size = finish.kind === 'pebble' ? 0.14 : 0.07
    const aggregate = smoothstep(threshold, threshold + size, speckle)
    const blended = mix(base, accent, aggregate.mul(finish.contrast))
    surface = mix(blended, highlight, grain.mul(0.08))
    if (finish.sparkle > 0) {
      const sparkle = smoothstep(0.93, 0.985, speckle).mul(finish.sparkle)
      surface = surface.add(highlight.mul(sparkle))
    }
  }
  return surface
}
