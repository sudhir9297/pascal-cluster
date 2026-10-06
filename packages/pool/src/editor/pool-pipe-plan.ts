import { findLevelAncestorId, nodeRegistry, useScene, PipeSegmentNode, PipeFittingNode, type AnyNode } from '@pascal-app/core'
import { PoolNode } from '../core/schema'
import { type PoolPipeOptions } from '../design/pool-pipe-layout'
import { resolvePoolAttachment } from '../design/pool-attachments'
import { PoolDrainNode } from '../drain/core/schema'
import { PoolSkimmerNode } from '../skimmer/core/schema'
import { PoolInletNode } from '../inlet/core/schema'
import { searchPoolPipeLayout } from '../design/pool-pipe-search'
import { connectionIndex } from './connection-index'
import { pipeVolumes } from '../design/pool-pipe-clearance'

export function collectPoolPipeInput(poolId: string, options: PoolPipeOptions, nodes = useScene.getState().nodes) {
  const drains = options.circuit === 'drains'
  const skimmers = options.circuit === 'skimmers'
  const kind = drains ? 'pool:drain' : skimmers ? 'pool:skimmer' : 'pool:inlet'
  const socketId = skimmers || drains ? 'suction' : 'return'
  const schema = drains ? PoolDrainNode : skimmers ? PoolSkimmerNode : PoolInletNode
  const pool = PoolNode.parse(nodes[poolId as keyof typeof nodes])
  const levelId = findLevelAncestorId(pool.id as AnyNode['id'], nodes)
  if (!levelId) throw new Error('Place the pool on a level first.')
  const fittingDefinition = nodeRegistry.get('pipe-fitting')
  const attachmentDefinition = nodeRegistry.get(kind)
  if (!fittingDefinition?.ports || !attachmentDefinition?.ports || !nodeRegistry.get('pipe-segment')) throw new Error('Load the pipe and fitting tools first.')
  const attachments = Object.values(nodes).flatMap((node) => {
    if (String(node.type) !== kind) return []
    const attachment = schema.parse(node)
    return attachment.poolId === poolId ? [attachment] : []
  })
  const index = connectionIndex(nodes)
  if (attachments.some((attachment) => index.isOccupied(attachment.id, socketId))) throw new Error(`A ${drains ? 'drain' : skimmers ? 'skimmer' : 'inlet'} already has a pipe attached. Disconnect it before connecting all ${options.circuit}.`)
  if (attachments.some((attachment) => findLevelAncestorId(attachment.id as AnyNode['id'], nodes) !== levelId)) throw new Error(`All ${options.circuit} must be on the pool's level.`)
  const ports = attachments.flatMap((attachment) => attachmentDefinition.ports!(resolvePoolAttachment(attachment, pool) as unknown as AnyNode).filter((port) => port.id === socketId))
  if (ports.length !== attachments.length) throw new Error(`An attachment is missing its ${socketId} socket.`)
  const fittingPorts = (node: PipeFittingNode) => fittingDefinition.ports!(node)
  const siblings = Object.values(nodes).filter((node) => findLevelAncestorId(node.id, nodes) === levelId)
  const pipes = siblings.flatMap((node) => node.type === 'pipe-segment' ? [PipeSegmentNode.parse(node)] : [])
  const fittings = siblings.flatMap((node) => node.type === 'pipe-fitting' ? [PipeFittingNode.parse(node)] : [])
  const existing = pipeVolumes(pipes, fittings, fittingPorts)
  return { pool, ports, options, existing, fittingPorts, levelId, poolId, circuit: options.circuit, snapshot: nodes }
}

export function preparePoolPipes(poolId: string, options: PoolPipeOptions, nodes = useScene.getState().nodes) {
  const input = collectPoolPipeInput(poolId, options, nodes)
  const { pool, ports, existing, fittingPorts, levelId, circuit, snapshot } = input
  return { ...searchPoolPipeLayout(pool, ports, options, fittingPorts, existing), levelId, poolId, circuit, snapshot }
}

export function commitPoolPipes(plan: ReturnType<typeof preparePoolPipes>) {
  const scene = useScene.getState()
  if (scene.readOnly) throw new Error('This scene is read-only.')
  if (scene.nodes !== plan.snapshot) throw new Error('The scene changed. Review the updated preview before connecting.')
  scene.applyNodeChanges({ create: [...plan.pipes, ...plan.fittings].map((node) => ({ node: { ...node, metadata: { ...node.metadata, poolConnection: { poolId: plan.poolId, circuit: plan.circuit } } }, parentId: plan.levelId as AnyNode['id'] })) })
}

/** Capture registry-specific socket geometry once; workers receive only plain data. */
export function serializePoolPipeInput(input: ReturnType<typeof collectPoolPipeInput>) {
  const first = input.ports[0]
  const templates = Object.fromEntries(['elbow', 'sanitary-tee'].map(fittingType => {
    const node = PipeFittingNode.parse({ fittingType, diameter: first?.diameter, diameter2: first?.diameter, system: first?.system, pipeMaterial: 'pvc', angle: 90, position: [0, 0, 0], rotation: [0, 0, 0] })
    return [fittingType, input.fittingPorts(node)]
  }))
  return { pool: input.pool, ports: input.ports, options: input.options, templates,
    existing: input.existing.map(v => ({ ...v, a: v.a.toArray(), b: v.b.toArray(), sockets: v.sockets.map(p => p.toArray()) })),
  }
}
