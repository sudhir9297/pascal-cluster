import { planPoolPipes } from './pool-pipe-layout'
import { pipeVolumes, pipeVolumesOverlap } from './pool-pipe-clearance'

export function searchPoolPipeLayout(
  pool: Parameters<typeof planPoolPipes>[0],
  ports: Parameters<typeof planPoolPipes>[1],
  options: Parameters<typeof planPoolPipes>[2],
  fittingPorts: Parameters<typeof planPoolPipes>[3],
  existing: ReturnType<typeof pipeVolumes>,
) {
  const first = planPoolPipes(pool, ports, options, fittingPorts)
  if (!pipeVolumesOverlap(pipeVolumes(first.pipes, first.fittings, fittingPorts), existing)) return first
  // Search nearby elevations first, then wider corridors to clear vertical drops too.
  for (let distance = 1; distance <= 24; distance++) for (let lateral = 0; lateral <= Math.min(6, distance); lateral++) {
    const adjusted = { ...options, drop: options.drop + (distance - lateral) * 0.2, clearance: options.clearance + lateral * 0.2 }
    try {
      const layout = planPoolPipes(pool, ports, adjusted, fittingPorts, lateral * 0.2)
      if (!pipeVolumesOverlap(pipeVolumes(layout.pipes, layout.fittings, fittingPorts), existing)) return layout
    } catch { continue }
  }
  throw new Error('No clear pipe route was found. Move nearby pipes or fittings, or choose another exit position.')
}
