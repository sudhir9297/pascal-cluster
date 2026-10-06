/** Coalesce hover input, but retain every sample while recording a stroke. */
export function createFrameInput<T>(consume: (value: T) => void, preserveSamples: () => boolean,
  schedule: (callback: () => void) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame) {
  let frame = 0
  let samples: T[] = []
  const flush = () => {
    if (frame) cancel(frame)
    frame = 0
    const batch = samples
    samples = []
    for (const sample of batch) consume(sample)
  }
  return {
    push(value: T) {
      if (preserveSamples()) samples.push(value)
      else samples = [value]
      if (!frame) frame = schedule(flush)
    },
    flush,
    dispose() { if (frame) cancel(frame); frame = 0; samples = [] },
  }
}
