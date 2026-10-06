import type { PoolPipeLayout } from '../design/pool-pipe-layout'
import { searchSerializedPoolPipes } from '../design/pool-pipe-worker-search'
import { collectPoolPipeInput, serializePoolPipeInput } from './pool-pipe-plan'

/** Workers keep searches off the UI thread; restricted hosts use the same planner locally. */
export function preparePoolPipesAsync(...args: Parameters<typeof collectPoolPipeInput>) {
  const input = collectPoolPipeInput(...args)
  const serialized = serializePoolPipeInput(input)
  let cancel = () => {}
  let worker: Worker | undefined
  let settled = false
  const promise = new Promise<PoolPipeLayout & Pick<typeof input, 'levelId' | 'poolId' | 'circuit' | 'snapshot'>>((resolve, reject) => {
    let fallback: ReturnType<typeof setTimeout> | undefined
    let startup: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      settled = true
      clearTimeout(timeout)
      clearTimeout(startup)
      clearTimeout(fallback)
      worker?.terminate()
    }
    const complete = (result: PoolPipeLayout) => {
      if (settled) return
      finish()
      resolve({ ...result, levelId: input.levelId, poolId: input.poolId, circuit: input.circuit, snapshot: input.snapshot })
    }
    const fail = (error: unknown) => {
      if (settled) return
      finish()
      reject(error instanceof Error ? error : new Error(String(error)))
    }
    const runLocally = () => {
      if (settled || fallback !== undefined) return
      clearTimeout(startup)
      worker?.terminate()
      // Yield once so the pending state can render and cancellation can win.
      fallback = setTimeout(() => {
        if (settled) return
        try { complete(searchSerializedPoolPipes(serialized)) }
        catch (error) { fail(error) }
      }, 0)
    }
    const timeout = setTimeout(() => fail(new Error('Pool pipe planning timed out. Try another exit position.')), 30000)
    cancel = () => fail(new DOMException('Pool pipe planning cancelled', 'AbortError'))
    try {
      worker = new Worker(new URL('./pool-pipe-worker.ts', import.meta.url), { type: 'module' })
      startup = setTimeout(runLocally, 5000)
      worker.onmessage = ({ data }) => {
        if (settled || fallback !== undefined) return
        if (data.ready) {
          clearTimeout(startup)
          try { worker!.postMessage(serialized) }
          catch { runLocally() }
          return
        }
        if (data.error) fail(new Error(data.error))
        else complete(data.result)
      }
      worker.onerror = (event) => { event.preventDefault(); runLocally() }
      worker.onmessageerror = runLocally
    } catch { runLocally() }
  })
  return { promise, cancel: () => cancel() }
}
