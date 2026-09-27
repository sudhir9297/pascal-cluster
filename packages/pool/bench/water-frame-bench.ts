import {
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGPURenderer,
} from 'three/webgpu'
import { PoolWaterEffect } from '../src/shader/water-effect'

type BenchmarkResult = {
  label: string
  quality: 'low' | 'medium' | 'high' | 'ultra'
  backend: 'webgl2' | 'webgpu'
  poolCount: number
  dropsPerPoolPerFrame: number
  simulationDelta: number
  finalSimulationResolution: number
  frames: number
  elapsedMs: number
  averageFrameMs: number
  p50FrameMs: number
  p95FrameMs: number
  gpuP50Ms: number | null
  gpuP95Ms: number | null
  framebufferCopiesPerFrame: number
}

declare global {
  interface Window {
    runWaterBenchmark: (label: string, poolCount: number, sampleFrames?: number, dropsPerPoolPerFrame?: number, simulationDelta?: number, quality?: BenchmarkResult['quality']) => Promise<BenchmarkResult>
  }
}

const canvas = document.querySelector('canvas')!
const status = document.querySelector('#status')!
const useWebGPU = new URLSearchParams(location.search).has('webgpu')
const renderer = new WebGPURenderer({ canvas, antialias: false, forceWebGL: !useWebGPU })
renderer.setPixelRatio(1)
renderer.setSize(1280, 720)
renderer.setClearColor(new Color('#6e9bb2'))
await renderer.init()
status.textContent = 'ready'

window.runWaterBenchmark = async (label, poolCount, sampleFrames = 90, dropsPerPoolPerFrame = 0, simulationDelta = 1 / 60, quality = 'high') => {
  const scene = new Scene()
  const camera = new PerspectiveCamera(55, 1280 / 720, 0.1, 100)
  camera.position.set(0, 12, 19)
  camera.lookAt(0, 0, 0)
  const effects: PoolWaterEffect[] = []
  const columns = Math.ceil(Math.sqrt(poolCount))
  const rows = Math.ceil(poolCount / columns)
  const spacing = 6.5
  const waterGeometry = new PlaneGeometry(5.5, 4.5, 24, 20)
  waterGeometry.rotateX(-Math.PI / 2)
  const floorGeometry = new BoxGeometry(5.5, 0.15, 4.5)
  const floorMaterial = new MeshBasicMaterial({ color: '#d6d1b4' })

  for (let i = 0; i < poolCount; i++) {
    const x = (i % columns - (columns - 1) / 2) * spacing
    const z = (Math.floor(i / columns) - (rows - 1) / 2) * spacing
    const resolution = Math.min({ low: 64, medium: 128, high: 256, ultra: 384 }[quality], poolCount <= 2 ? 384 : 128)
    const effect = new PoolWaterEffect({ waterQuality: quality, rain: 1, breeze: 1 }, resolution)
    effect.setBoundary([[-2.75, -2.25], [2.75, -2.25], [2.75, 2.25], [-2.75, 2.25]])
    effects.push(effect)
    const floor = new Mesh(floorGeometry, floorMaterial)
    floor.position.set(x, -0.5, z)
    scene.add(floor)
    const water = new Mesh(waterGeometry, effect.material)
    water.position.set(x, 0, z)
    water.renderOrder = 1
    scene.add(water)
  }

  const gl = useWebGPU ? null : canvas.getContext('webgl2')
  const queue = useWebGPU
    ? (renderer.backend as unknown as { device?: { queue: { onSubmittedWorkDone: () => Promise<void> } } }).device?.queue
    : null
  if (!gl && !queue) throw new Error('GPU completion API unavailable')
  const timer = gl?.getExtension('EXT_disjoint_timer_query_webgl2')
  const originalCopy = renderer.copyFramebufferToTexture.bind(renderer)
  let framebufferCopies = 0
  renderer.copyFramebufferToTexture = ((...args: Parameters<typeof originalCopy>) => {
    framebufferCopies++
    return originalCopy(...args)
  }) as typeof renderer.copyFramebufferToTexture
  const frameTimes: number[] = []
  const gpuTimes: number[] = []
  const queries: WebGLQuery[] = []
  let start = 0
  for (let frame = 0; frame < sampleFrames + 20; frame++) {
    const frameStart = performance.now()
    const query = timer && gl && frame >= 20 ? gl.createQuery() : null
    if (query && timer && gl) gl.beginQuery(timer.TIME_ELAPSED_EXT, query)
    for (const effect of effects) {
      for (let drop = 0; drop < dropsPerPoolPerFrame; drop++) {
        effect.addDrop((drop * 0.29 + frame * 0.013) % 1, (drop * 0.37 + frame * 0.017) % 1)
      }
      effect.update(renderer, simulationDelta)
    }
    renderer.render(scene, camera)
    if (query && timer && gl) gl.endQuery(timer.TIME_ELAPSED_EXT)
    if (gl) gl.finish()
    else await queue!.onSubmittedWorkDone()
    if (frame === 19) start = performance.now()
    if (frame === 19) framebufferCopies = 0
    if (frame >= 20) {
      frameTimes.push(performance.now() - frameStart)
      if (query) queries.push(query)
    }
  }
  const elapsedMs = performance.now() - start
  renderer.copyFramebufferToTexture = originalCopy
  await new Promise<void>((resolve) => setTimeout(resolve, 100))
  for (const query of queries) {
    if (timer && gl && gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)
      && !gl.getParameter(timer.GPU_DISJOINT_EXT)) {
      gpuTimes.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6)
    }
    gl?.deleteQuery(query)
  }

  const finalSimulationResolution = effects[0]?.resolution ?? 0
  for (const effect of effects) effect.dispose()
  waterGeometry.dispose()
  floorGeometry.dispose()
  floorMaterial.dispose()
  scene.clear()
  frameTimes.sort((a, b) => a - b)
  gpuTimes.sort((a, b) => a - b)
  const result = {
    label, quality, backend: useWebGPU ? 'webgpu' : 'webgl2', poolCount, dropsPerPoolPerFrame, simulationDelta,
    finalSimulationResolution, frames: sampleFrames, elapsedMs,
    averageFrameMs: elapsedMs / sampleFrames,
    p50FrameMs: frameTimes[Math.floor(frameTimes.length * 0.5)] ?? 0,
    p95FrameMs: frameTimes[Math.floor(frameTimes.length * 0.95)] ?? 0,
    gpuP50Ms: gpuTimes[Math.floor(gpuTimes.length * 0.5)] ?? null,
    gpuP95Ms: gpuTimes[Math.floor(gpuTimes.length * 0.95)] ?? null,
    framebufferCopiesPerFrame: framebufferCopies / sampleFrames,
  }
  status.textContent = JSON.stringify(result)
  return result
}
