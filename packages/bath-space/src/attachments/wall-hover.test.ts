import { expect, test } from 'bun:test'
import type { WallEvent } from '@pascal-app/core'
import { createWallHoverHandlers } from './wall-hover'

test('direct wall entry replaces the host despite synchronous pointer leaves', () => {
  let target: { wallId: string; position: number[] } | null = null
  const handlers = createWallHoverHandlers(
    (event) => ({ wallId: event.node.id, position: [...event.localPosition] }),
    (next) => { target = next },
    () => target,
  )
  const event = (id: string, position: number[], stop = () => {}): WallEvent =>
    ({ node: { id }, localPosition: position, stopPropagation: stop }) as WallEvent
  const first = event('wall_a', [1, 0.8, 0.05])
  handlers.enterOrMove(first)
  const second = event('wall_b', [2, 1.3, -0.05], () => {
    handlers.leave(first)
    // A stale hover of the new collision surface can also be flushed by R3F.
    handlers.leave(event('wall_b', [0, 0, 0]))
  })
  handlers.enterOrMove(second)
  expect(target).toEqual({ wallId: 'wall_b', position: [2, 1.3, -0.05] })
  handlers.leave(first)
  expect(target?.wallId).toBe('wall_b')
  handlers.enterOrMove(event('wall_b', [2.4, 1.5, -0.05]))
  expect(target?.position).toEqual([2.4, 1.5, -0.05])
  handlers.leave(second)
  expect(target).toBeNull()
  handlers.enterOrMove(first)
  expect(target?.wallId).toBe('wall_a')
})

test('invalid wall faces do not consume the event or replace the current host', () => {
  let target: { wallId: string } | null = { wallId: 'wall_a' }
  let stopped = false
  const handlers = createWallHoverHandlers(
    () => null,
    (next) => { target = next },
    () => target,
  )
  handlers.enterOrMove({
    node: { id: 'wall_b' },
    stopPropagation: () => { stopped = true },
  } as WallEvent)
  expect(stopped).toBe(false)
  expect(target).toEqual({ wallId: 'wall_a' })
})
