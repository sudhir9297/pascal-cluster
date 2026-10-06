import { PoolNode } from '../src/core/schema'
import { buildPoolGeometry, buildPoolPlacementPreviewGeometry } from '../src/core/geometry'
import { createPoolShapePolygon } from '../src/design/shapes'
import { getPoolFittingSummary, planPoolFittings } from '../src/design/pool-fitting-layout'
import { disposeObject3D } from '../src/editor/dispose-object'

function measure<T>(label: string, operation: (iteration: number) => T, cleanup?: (value: T) => void) {
  const samples: number[] = []
  for (let i = 0; i < 55; i++) {
    const start = performance.now(), value = operation(i), elapsed = performance.now() - start
    if (i >= 5) samples.push(elapsed)
    cleanup?.(value)
  }
  samples.sort((a, b) => a - b)
  return { label, medianMs: +samples[25]!.toFixed(3), p95Ms: +samples[47]!.toFixed(3) }
}
const results = []
for (const shape of ['rectangle', 'kidney', 'lagoon'] as const) {
  const pool = PoolNode.parse({ shape, polygon: createPoolShapePolygon(shape, 8, 4), copingStyle: 'rock', benchEnabled: true })
  results.push(measure(`${shape}: detailed rock + bench`, () => buildPoolGeometry(pool), disposeObject3D))
  results.push(measure(`${shape}: edit preview`, () => buildPoolPlacementPreviewGeometry(pool), disposeObject3D))
  results.push(measure(`${shape}: cached summary`, () => getPoolFittingSummary(pool)))
  results.push(measure(`${shape}: uncached placement`, i => planPoolFittings({ ...pool,
    polygon: pool.polygon.map(([x, z]) => [x + i * 0.00001, z]),
  })))
}
console.log(JSON.stringify({ runtime: Bun.version, warmups: 5, samples: 50, scope: 'CPU only; cleanup, React, GPU and host synchronization excluded', results }, null, 2))
