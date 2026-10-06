import { expect, test } from 'bun:test'
import { createRoutingClient } from './routing-client'
import { routePipe } from '../design/pipe-route'

const args: Parameters<typeof routePipe> = [[0, 0.5, 0], [3, 0.5, 0], [1, 0, 0], [-1, 0, 0], [], 0.3, 0.07, -2]

test('equipment insertion still routes when a host blocks workers', async () => {
  const previous = globalThis.Worker
  globalThis.Worker = class { constructor() { throw new Error('Worker blocked') } } as unknown as typeof Worker
  try {
    const client = createRoutingClient()
    try { expect(await client.route(args)).toEqual(routePipe(...args)) }
    finally { client.dispose() }
  } finally { globalThis.Worker = previous }
})

test('worker loading failure recovers queued equipment routes', async () => {
  const previous = globalThis.Worker
  globalThis.Worker = class {
    onerror?: (event: { preventDefault(): void }) => void
    constructor() { queueMicrotask(() => this.onerror?.({ preventDefault() {} })) }
    terminate() {}
  } as unknown as typeof Worker
  try {
    const client = createRoutingClient()
    try { expect(await client.route(args)).toEqual(routePipe(...args)) }
    finally { client.dispose() }
  } finally { globalThis.Worker = previous }
})

test('disposing cancels an equipment route before the local search runs', async () => {
  const previous = globalThis.Worker
  globalThis.Worker = class { constructor() { throw new Error('Worker blocked') } } as unknown as typeof Worker
  try {
    const client = createRoutingClient()
    const pending = client.route(args)
    client.dispose()
    await expect(pending).rejects.toThrow('cancelled')
    await expect(client.route(args)).rejects.toThrow('cancelled')
  } finally { globalThis.Worker = previous }
})
