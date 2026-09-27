# Pool water browser benchmark

This harness renders one or eight `PoolWaterEffect` surfaces at 1280 × 720 through Three's WebGL fallback or WebGPU backend. It waits for each frame to finish on the GPU. On WebGL it also requests GPU timer data through `EXT_disjoint_timer_query_webgl2`. The harness excludes the Pascal editor, shell geometry, shadows, and other plugins, so its numbers are water workload measurements rather than application FPS.

Build and serve it from the repository root:

```sh
bun build packages/pool/bench/water-frame-bench.ts --target browser --outdir /tmp/pool-water-bench --entry-naming water-frame-bench.js
cp packages/pool/bench/index.html /tmp/pool-water-bench/index.html
mkdir -p /tmp/pool-water-bench/assets/water
cp packages/pool/src/shader/assets/water/*.webp /tmp/pool-water-bench/assets/water/
python3 -m http.server 8765 --directory /tmp/pool-water-bench
```

Open `http://localhost:8765/?webgpu` for WebGPU, or `http://localhost:8765` for the WebGL fallback, and run these calls in the browser console:

```js
await runWaterBenchmark('normal', 8, 1000, 0, 1 / 60, 'high')
await runWaterBenchmark('many-drops', 8, 1000, 4, 1 / 60, 'high')
await runWaterBenchmark('slow-frames', 8, 1000, 0, 1 / 30, 'high')
await runWaterBenchmark('medium', 8, 1000, 0, 1 / 60, 'medium')
```

The arguments are label, pool count, measured frames, extra drops per pool per frame, simulated frame delta, and quality. Run each case several times in the same browser at the same viewport size. Compare `averageFrameMs`, `p50FrameMs`, `gpuP50Ms`, and `framebufferCopiesPerFrame`; ignore `gpuP50Ms` when it is `null`. The simulated frame delta triggers adaptive resolution but does not throttle the benchmark loop. To measure actual editor FPS, profile a running Pascal scene with the same pool count, camera, device, and viewport before and after the change.

## Measured on 2026-09-28

Apple M4 Pro (16 GPU cores), T3 Code Electron Chromium 152, 1280 × 720, 480 measured WebGPU frames per case after 20 warmup frames. The original column uses `water-effect.ts` from `HEAD`; optimized uses the current working copy. Each frame waits for `GPUQueue.onSubmittedWorkDone()`. These are completed-frame times for the isolated water workload, not displayed editor FPS.

| WebGPU workload | Original | Optimized | Time saved | Framebuffer copies/frame |
| --- | ---: | ---: | ---: | ---: |
| Eight high-quality pools, normal rain/breeze | 1.665 ms | 1.341 ms | 19.4% | 17 → 10 |
| Eight high-quality pools, four additional drops/pool/frame | 2.482 ms | 1.338 ms | 46.1% | 17 → 10 |
| One high-quality pool | 0.602 ms | 0.573 ms | 4.8% | 3 → 3 |

On the WebGL fallback, the eight-pool normal case's median GPU timer fell from 0.788 ms to 0.745 ms (5.5%; 240 measured frames). This is a single device and browser measurement, so rerun on the target hardware before treating it as a production FPS estimate. A four-pool Pascal editor scene was rendered for visual inspection; its collaborative preview suspends animation frames while hidden, so a trustworthy full-editor FPS comparison was unavailable there.
