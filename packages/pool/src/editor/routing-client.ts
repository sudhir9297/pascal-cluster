import { routePipe } from '../design/pipe-route'

type Request = {
  id: number
  args: Parameters<typeof routePipe>
  resolve: (value: ReturnType<typeof routePipe>) => void
  reject: (error: Error) => void
}

export function createRoutingClient() {
  let worker: Worker | undefined
  let nextId = 0
  let active: Request | null = null
  let queued: Request | null = null
  let disposed = false
  let ready = false
  let local = false
  let localTimer: ReturnType<typeof setTimeout> | undefined
  let startup: ReturnType<typeof setTimeout> | undefined
  const complete = (id: number, result?: ReturnType<typeof routePipe>, error?: Error) => {
    if (disposed || active?.id !== id) return
    const request = active
    active = null
    if (error) request.reject(error)
    else request.resolve(result ?? null)
    flush()
  }
  const runLocally = () => {
    if (!active || disposed) return
    const request = active
    localTimer = setTimeout(() => {
      if (disposed || active !== request) return
      try { complete(request.id, routePipe(...request.args)) }
      catch (error) { complete(request.id, undefined, error instanceof Error ? error : new Error(String(error))) }
    }, 0)
  }
  const fallback = () => {
    if (disposed || local) return
    local = true
    ready = true
    clearTimeout(startup)
    worker?.terminate()
    if (active) runLocally()
    else flush()
  }
  const flush = () => {
    if (!queued || !ready || active || disposed) return
    active = queued
    queued = null
    if (local) runLocally()
    else {
      try { worker!.postMessage({ id: active.id, args: active.args }) }
      catch { fallback() }
    }
  }
  try {
    // Static syntax allows the host bundler to transpile the worker.
    worker = new Worker(new URL('./routing-worker.ts', import.meta.url), { type: 'module' })
    startup = setTimeout(fallback, 5000)
    worker.onmessage = ({ data }) => {
      if (disposed || local) return
      if (data.ready) { ready = true; clearTimeout(startup); flush(); return }
      complete(data.id, data.result, data.error ? new Error(data.error) : undefined)
    }
    worker.onerror = (event) => { event.preventDefault(); fallback() }
    worker.onmessageerror = fallback
  } catch { fallback() }
  return {
    route(args: Parameters<typeof routePipe>) {
      return new Promise<ReturnType<typeof routePipe>>((resolve, reject) => {
        if (disposed) { reject(new DOMException('Pipe routing cancelled', 'AbortError')); return }
        queued?.reject(new DOMException('Superseded pipe route', 'AbortError'))
        queued = { id: ++nextId, args, resolve, reject }
        flush()
      })
    },
    dispose() {
      disposed = true
      clearTimeout(startup)
      clearTimeout(localTimer)
      worker?.terminate()
      active?.reject(new DOMException('Pipe routing cancelled', 'AbortError'))
      queued?.reject(new DOMException('Pipe routing cancelled', 'AbortError'))
      active = queued = null
    },
  }
}
