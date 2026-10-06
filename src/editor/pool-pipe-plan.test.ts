import { afterEach, expect, spyOn, test } from 'bun:test'
import { LevelNode, nodeRegistry, useScene, type AnyNode, PipeSegmentNode } from '@pascal-app/core'
import { Vector3 } from 'three'
import { nativeFittingPorts } from '../../tests/pipe-fitting-ports'
import { PoolNode } from '../core/schema'
import { createDefaultPoolAttachments } from '../design/default-pool-attachments'
import { pipeVolumes, pipeVolumesOverlap } from '../design/pool-pipe-clearance'
import { POOL_SHAPES, DEFAULT_POOL_SHAPE_DIMENSIONS, createPoolShapePolygon, type PoolShape } from '../design/shapes'
import { DEFAULT_POOL_PIPE_OPTIONS } from '../design/pool-pipe-layout'
import { poolDrainDefinition } from '../drain/core/definition'
import { poolSkimmerDefinition } from '../skimmer/core/definition'
import { poolInletDefinition } from '../inlet/core/definition'
import { commitPoolPipes, preparePoolPipes } from './pool-pipe-plan'
import { preparePoolPipesAsync } from './pool-pipe-client'
import { poolConnectionState, deletePoolConnection } from './pool-connection-state'

const before = useScene.getState()
const registryGet = nodeRegistry.get.bind(nodeRegistry)
const spies: { mockRestore: () => void }[] = []
afterEach(() => { spies.forEach((spy) => spy.mockRestore()); spies.length = 0; useScene.setState(before) })

function setup(shape: PoolShape = 'rectangle') {
  const level = LevelNode.parse({})
  const pool = PoolNode.parse({ parentId: level.id, shape, ...DEFAULT_POOL_SHAPE_DIMENSIONS[shape], polygon: createPoolShapePolygon(shape, DEFAULT_POOL_SHAPE_DIMENSIONS[shape].length, DEFAULT_POOL_SHAPE_DIMENSIONS[shape].width) })
  const children = createDefaultPoolAttachments(pool)
  useScene.setState({ readOnly: false, nodes: Object.fromEntries([level, pool, ...children].map((node) => [node.id, node])) as Record<AnyNode['id'], AnyNode> })
  spies.push(spyOn(nodeRegistry, 'get').mockImplementation((kind) => {
    if (kind === 'pool:drain') return poolDrainDefinition as never
    if (kind === 'pool:skimmer') return poolSkimmerDefinition as never
    if (kind === 'pool:inlet') return poolInletDefinition as never
    if (kind === 'pipe-fitting') return { ports: nativeFittingPorts } as never
    if (kind === 'pipe-segment') return { ports: (node: PipeSegmentNode) => node.path.map((position, i) => ({ id: String(i), position, direction: new Vector3(...position).sub(new Vector3(...node.path[1 - i]!)).normalize().toArray(), diameter: node.diameter, system: node.system })) } as never
    return registryGet(kind)
  }))
  return { level, pool }
}

test.each(['inlets', 'skimmers', 'drains'] as const)('%s: one batch, duplicate guard and independent circuits', (circuit) => {
  const options = { ...DEFAULT_POOL_PIPE_OPTIONS, circuit }
  const { pool, level } = setup()
  const commit = spyOn(useScene.getState(), 'applyNodeChanges').mockImplementation((changes) => {
    const nodes = { ...useScene.getState().nodes }
    for (const { node, parentId } of changes.create ?? []) nodes[node.id] = { ...node, parentId } as AnyNode
    useScene.setState({ nodes })
  })
  spies.push(commit)
  const preview = preparePoolPipes(pool.id, options)
  expect(commit).not.toHaveBeenCalled()
  commitPoolPipes(preview)
  expect(commit).toHaveBeenCalledTimes(1)
  const created = commit.mock.calls[0]![0].create!
  expect(created.every((entry) => entry.parentId === level.id)).toBe(true)
  expect(new Set(created.map((entry) => entry.node.id)).size).toBe(created.length)
  expect(() => preparePoolPipes(pool.id, options)).toThrow('already has a pipe')
  for (const other of ['inlets', 'skimmers', 'drains'] as const) {
    if (other !== circuit) expect(() => preparePoolPipes(pool.id, { ...options, circuit: other })).not.toThrow()
  }
})

test('stale previews and read-only scenes never mutate', () => {
  const { pool } = setup()
  const commit = spyOn(useScene.getState(), 'applyNodeChanges').mockImplementation(() => {})
  spies.push(commit)
  const preview = preparePoolPipes(pool.id, DEFAULT_POOL_PIPE_OPTIONS)
  useScene.setState({ readOnly: true })
  expect(() => commitPoolPipes(preview)).toThrow('read-only')
  useScene.setState({ readOnly: false, nodes: { ...useScene.getState().nodes } })
  expect(() => commitPoolPipes(preview)).toThrow('scene changed')
  expect(commit).not.toHaveBeenCalled()
})

for (const shape of POOL_SHAPES) for (const order of [
  ['inlets', 'skimmers', 'drains'], ['inlets', 'drains', 'skimmers'],
  ['skimmers', 'inlets', 'drains'], ['skimmers', 'drains', 'inlets'],
  ['drains', 'inlets', 'skimmers'], ['drains', 'skimmers', 'inlets'],
] as const) for (const exitCorner of [0, 1, 2, 3]) {
  test(`${shape}: non-overlapping ${order.join('/')} at exit ${exitCorner}`, () => {
    const { pool, level } = setup(shape)
    const volumes = [] as ReturnType<typeof pipeVolumes>
    for (const circuit of order) {
      const snapshot = useScene.getState().nodes
      const plan = preparePoolPipes(pool.id, { ...DEFAULT_POOL_PIPE_OPTIONS, circuit, exitCorner })
      expect(useScene.getState().nodes).toBe(snapshot)
      const added = pipeVolumes(plan.pipes, plan.fittings, nativeFittingPorts)
      expect(pipeVolumesOverlap(added, volumes)).toBe(false)
      volumes.push(...added)
      useScene.setState({ nodes: { ...snapshot, ...Object.fromEntries([...plan.pipes, ...plan.fittings].map((node) => [node.id, { ...node, parentId: level.id }])) } })
    }
  })
}

test('a crossing manual pipe lowers the new drain collector without changing existing pipes', () => {
  const { pool, level } = setup()
  const options = { ...DEFAULT_POOL_PIPE_OPTIONS, circuit: 'drains' as const }
  const initial = preparePoolPipes(pool.id, options)
  const end = initial.freeEnd
  const blocker = PipeSegmentNode.parse({ parentId: level.id, diameter: 8, path: [[end[0], end[1], end[2] - 2], [end[0], end[1], end[2] + 2]] })
  useScene.setState({ nodes: { ...useScene.getState().nodes, [blocker.id]: blocker } })
  const adjusted = preparePoolPipes(pool.id, options)
  expect(adjusted.freeEnd[1]).toBeLessThan(initial.freeEnd[1] - 0.1)
  expect(useScene.getState().nodes[blocker.id]).toBe(blocker)
})

test('a blocked inlet socket never creates an overlapping route', () => {
  const { pool, level } = setup()
  const inlet = createDefaultPoolAttachments(pool).find((node) => node.type === 'pool:inlet')!
  const port = poolInletDefinition.ports!(inlet as never)[0]!
  const [x, y, z] = port.position
  const blocker = PipeSegmentNode.parse({ parentId: level.id, path: [[x - 1, y, z - 1], [x + 1, y, z + 1]] })
  const snapshot = { ...useScene.getState().nodes, [blocker.id]: blocker }
  useScene.setState({ nodes: snapshot })
  expect(() => preparePoolPipes(pool.id, DEFAULT_POOL_PIPE_OPTIONS)).toThrow('No clear pipe route')
  expect(useScene.getState().nodes).toBe(snapshot)
})

for (const circuit of ['inlets', 'skimmers', 'drains'] as const) test(`${circuit}: connected status and deletion follow the saved network`, () => {
  const { pool, level } = setup()
  expect(poolConnectionState(pool.id, circuit).status).toBe('empty')
  const plan = preparePoolPipes(pool.id, { ...DEFAULT_POOL_PIPE_OPTIONS, circuit })
  const members = [...plan.pipes, ...plan.fittings]
  const base = useScene.getState().nodes
  const connected = { ...base, ...Object.fromEntries(members.map((node) => [node.id, { ...node, parentId: level.id }])) }
  useScene.setState({ nodes: connected })
  const state = poolConnectionState(pool.id, circuit)
  expect(state.status).toBe('connected')
  expect(new Set(state.pipeIds)).toEqual(new Set(members.map((node) => node.id)))
  expect(state.shared).toBe(false)
  const apply = spyOn(useScene.getState(), 'applyNodeChanges').mockImplementation((changes) => {
    const nodes = { ...useScene.getState().nodes }
    for (const id of changes.delete ?? []) delete nodes[id]
    useScene.setState({ nodes })
  })
  spies.push(apply)
  useScene.setState({ readOnly: true })
  expect(() => deletePoolConnection(pool.id, circuit)).toThrow('read-only')
  expect(apply).not.toHaveBeenCalled()
  useScene.setState({ readOnly: false })
  deletePoolConnection(pool.id, circuit)
  expect(apply).toHaveBeenCalledTimes(1)
  const deletedIds = new Set(apply.mock.calls[0]![0].delete ?? [])
  for (const member of members) expect(deletedIds.has(member.id)).toBe(true)
  if (circuit === 'inlets') {
    const inletIds = new Set(Object.values(base).filter((node) => String(node.type) === 'pool:inlet').map((node) => node.id))
    for (const id of inletIds) expect(deletedIds.has(id)).toBe(true)
    expect(Object.keys(useScene.getState().nodes).some((id) => inletIds.has(id as AnyNode['id']))).toBe(false)
  } else {
    expect(useScene.getState().nodes).toEqual(base)
  }
  expect(poolConnectionState(pool.id, circuit).status).toBe('empty')
  useScene.setState({ nodes: connected })
  expect(poolConnectionState(pool.id, circuit).status).toBe('connected')
  const broken: Record<AnyNode['id'], AnyNode> = { ...connected }
  delete broken[plan.pipes[0]!.id]
  useScene.setState({ nodes: broken })
  expect(poolConnectionState(pool.id, circuit).status).toBe('partial')
})

test('delete includes detached generated pieces and protects a shared connection', () => {
  const { pool, level } = setup()
  const plan = preparePoolPipes(pool.id, DEFAULT_POOL_PIPE_OPTIONS)
  const members = [...plan.pipes, ...plan.fittings].map((node) => ({ ...node, parentId: level.id, metadata: { poolConnection: { poolId: pool.id, circuit: 'inlets' } } }))
  const isolated = PipeSegmentNode.parse({ parentId: level.id, path: [[50, 0, 50], [51, 0, 50]], metadata: members[0]!.metadata })
  const nodes: Record<AnyNode['id'], AnyNode> = { ...useScene.getState().nodes, ...Object.fromEntries([...members, isolated].map(node => [node.id, node])) }
  useScene.setState({ nodes })
  expect(poolConnectionState(pool.id, 'inlets').pipeIds).toContain(isolated.id)
  const inlet = Object.values(nodes).find(node => String(node.type) === 'pool:inlet')!
  useScene.setState({ nodes: { ...nodes, [inlet.id]: { ...inlet, poolId: 'another-pool' } as unknown as AnyNode } })
  expect(poolConnectionState(pool.id, 'inlets').shared).toBe(true)
  const snapshot = useScene.getState().nodes
  expect(() => deletePoolConnection(pool.id, 'inlets')).toThrow('serves other pool connections')
  expect(useScene.getState().nodes).toBe(snapshot)
})

test.each(['inlets', 'skimmers', 'drains'] as const)('%s: serialized worker search matches native socket placement', async circuit => {
  const { collectPoolPipeInput, serializePoolPipeInput } = await import('./pool-pipe-plan')
  const { searchSerializedPoolPipes } = await import('../design/pool-pipe-worker-search')
  const { pool } = setup('kidney')
  const options = { ...DEFAULT_POOL_PIPE_OPTIONS, circuit }
  const expected = preparePoolPipes(pool.id, options)
  const actual = searchSerializedPoolPipes(structuredClone(serializePoolPipeInput(collectPoolPipeInput(pool.id, options))))
  expect(actual.preview).toEqual(expected.preview)
  const paths = actual.pipes.flatMap(p => p.path.flat())
  const expectedPaths = expected.pipes.flatMap(p => p.path.flat())
  expect(paths).toHaveLength(expectedPaths.length)
  paths.forEach((value, i) => expect(value).toBeCloseTo(expectedPaths[i]!, 10))
  expect(actual.fittings.map(p => p.position)).toEqual(expected.fittings.map(p => p.position))
})

test('real worker plans a circuit asynchronously and supports cancellation', async () => {
  const { preparePoolPipesAsync } = await import('./pool-pipe-client')
  const { pool } = setup()
  const request = preparePoolPipesAsync(pool.id, DEFAULT_POOL_PIPE_OPTIONS)
  const plan = await request.promise
  expect(plan.poolId).toBe(pool.id)
  expect(plan.pipes.length).toBeGreaterThan(0)
  const cancelled = preparePoolPipesAsync(pool.id, DEFAULT_POOL_PIPE_OPTIONS)
  cancelled.cancel()
  await expect(cancelled.promise).rejects.toMatchObject({ name: 'AbortError' })
}, 30000)


test.each(['inlets', 'skimmers', 'drains'] as const)('%s: preview and creation survive unavailable routing workers', async (circuit) => {
  const { pool } = setup()
  const worker = globalThis.Worker
  globalThis.Worker = class {
    constructor() { throw new Error('Worker blocked by host') }
  } as unknown as typeof Worker
  try {
    const request = preparePoolPipesAsync(pool.id, { ...DEFAULT_POOL_PIPE_OPTIONS, circuit })
    const plan = await request.promise
    expect(plan.preview.length).toBeGreaterThan(0)
    expect(plan.corners.length).toBe(4)
    const commit = spyOn(useScene.getState(), 'applyNodeChanges').mockImplementation(() => {})
    spies.push(commit)
    commitPoolPipes(plan)
    expect(commit).toHaveBeenCalledTimes(1)
  } finally { globalThis.Worker = worker }
})

test('worker load errors recover the route preview', async () => {
  const { pool } = setup()
  const worker = globalThis.Worker
  globalThis.Worker = class {
    onerror?: (event: { preventDefault(): void }) => void
    constructor() { queueMicrotask(() => this.onerror?.({ preventDefault() {} })) }
    terminate() {}
  } as unknown as typeof Worker
  try {
    const plan = await preparePoolPipesAsync(pool.id, DEFAULT_POOL_PIPE_OPTIONS).promise
    expect(plan.preview.length).toBeGreaterThan(0)
    expect(plan.snapshot).toBe(useScene.getState().nodes)
  } finally { globalThis.Worker = worker }
})

test('cancelling a local fallback rejects without creating pipes', async () => {
  const { pool } = setup()
  const worker = globalThis.Worker
  globalThis.Worker = class {
    constructor() { throw new Error('Worker unavailable') }
  } as unknown as typeof Worker
  try {
    const request = preparePoolPipesAsync(pool.id, DEFAULT_POOL_PIPE_OPTIONS)
    request.cancel()
    await expect(request.promise).rejects.toThrow('cancelled')
  } finally { globalThis.Worker = worker }
})
