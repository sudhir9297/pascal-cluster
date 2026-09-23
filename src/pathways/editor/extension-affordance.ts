import { type AnyNode, type AnyNodeId, type FloorplanAffordance, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { buildOutline } from '../rendering/outline'
import { movePathJunction, movePathTerminal, pathTerminalEnds } from '../domain/terminals'
import type { PathwayNode, Point } from '../domain/schema'

export const pathwayExtendEndpointAffordance: FloorplanAffordance<PathwayNode> = {
  start({ node, payload, initialPlanPoint }) {
    const vertexId = (payload as { vertexId?: string })?.vertexId
    const terminal = pathTerminalEnds(node).find((end) => end.vertexId === vertexId)
    const nodeId = node.id as AnyNodeId
    let latest: Pick<PathwayNode, 'vertices' | 'edges'> | null = null
    return {
      affectedIds: [nodeId],
      apply({ planPoint }) {
        if (!terminal) return
        const delta: Point = [planPoint[0] - initialPlanPoint[0], planPoint[1] - initialPlanPoint[1]]
        const projected = Math.max(-terminal.maxRetraction,
          delta[0] * terminal.direction[0] + delta[1] * terminal.direction[1])
        const target: Point = [terminal.point[0] + projected * terminal.direction[0],
          terminal.point[1] + projected * terminal.direction[1]]
        const graph = movePathTerminal(node, terminal.vertexId, target)
        if (!graph) return
        try { buildOutline({ ...node, ...graph }) } catch { return }
        latest = graph
        useLiveNodeOverrides.getState().set(nodeId, graph)
        useScene.getState().markDirty(nodeId)
      },
      canCommit: () => latest !== null,
      commit() {
        if (latest) useScene.getState().updateNode(nodeId, latest as Partial<AnyNode>)
        useLiveNodeOverrides.getState().clear(nodeId)
      },
    }
  },
}

export const pathwayMoveJunctionAffordance: FloorplanAffordance<PathwayNode> = {
  start({ node, payload }) {
    const vertexId = (payload as { vertexId?: string })?.vertexId
    const nodeId = node.id as AnyNodeId
    let latest: Pick<PathwayNode, 'vertices' | 'edges'> | null = null
    return {
      affectedIds: [nodeId],
      apply({ planPoint }) {
        if (!vertexId) return
        const graph = movePathJunction(node, vertexId, [planPoint[0], planPoint[1]])
        if (!graph) return
        try { buildOutline({ ...node, ...graph }) } catch { return }
        latest = graph
        useLiveNodeOverrides.getState().set(nodeId, graph)
        useScene.getState().markDirty(nodeId)
      },
      canCommit: () => latest !== null,
      commit() {
        if (latest) useScene.getState().updateNode(nodeId, latest as Partial<AnyNode>)
        useLiveNodeOverrides.getState().clear(nodeId)
      },
    }
  },
}
