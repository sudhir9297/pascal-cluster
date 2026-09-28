import { type AnyNodeId, useLiveNodeOverrides, useScene } from '@pascal-app/core'
import { roadCurbCornerRadiusAtPlanPoint } from './road-network-corner-editing'
import { moveRoadGraphNode } from './road-network-graph-editing'
import { insertRoadSplinePoint } from './road-network-spline-handles'
import type { RoadNetworkNode } from './schema'
import { useStreetscapeStore } from './store'

type RoadControlPayload = { edgeId: string; index: number }
type RoadInsertPayload = RoadControlPayload & { elevation: number }
type RoadNodePayload = { nodeId: string }
type RoadCurbCornerPayload = { cornerKey: string; junctionId: string }
type PlanPoint = readonly [number, number]

/** Drag one selected spline point in the 2D floor plan. */
export const roadControlPointAffordance = {
  start({
    node,
    payload,
  }: {
    node: RoadNetworkNode
    payload: unknown
  }) {
    const { edgeId, index } = payload as RoadControlPayload
    const nodeId = node.id as AnyNodeId
    useStreetscapeStore.getState().setRoadElementSelection({
      networkId: node.id,
      kind: 'control',
      id: edgeId,
      index,
    })
    const originalEdge = node.edges[edgeId]
    let lastEdges = node.edges
    return {
      affectedIds: [nodeId],
      apply({ planPoint }: { planPoint: PlanPoint }) {
        if (!originalEdge?.alignment[index]) return
        const alignment = originalEdge.alignment.map((point, pointIndex) =>
          pointIndex === index
            ? ([planPoint[0], point[1], planPoint[1]] as [number, number, number])
            : point,
        )
        lastEdges = {
          ...node.edges,
          [edgeId]: { ...originalEdge, alignment },
        }
        useLiveNodeOverrides.getState().set(nodeId, { edges: lastEdges })
        useScene.getState().markDirty(nodeId)
      },
      canCommit() {
        return Boolean(originalEdge)
      },
      commit() {
        useScene.getState().updateNode(nodeId, { edges: lastEdges } as never)
        useLiveNodeOverrides.getState().clear(nodeId)
      },
    }
  },
}

/** Insert a centerline control in plan without changing its road elevation. */
export const roadInsertPointAffordance = {
  start({ node, payload }: { node: RoadNetworkNode; payload: unknown }) {
    const { edgeId, index, elevation } = payload as RoadInsertPayload
    const nodeId = node.id as AnyNodeId
    let patch: Pick<RoadNetworkNode, 'edges'> | null = null
    return {
      affectedIds: [nodeId],
      apply({ planPoint }: { planPoint: PlanPoint }) {
        const next = insertRoadSplinePoint(node, edgeId, index,
          [planPoint[0], elevation, planPoint[1]])
        if (!next) return
        patch = next
        useLiveNodeOverrides.getState().set(nodeId, patch)
        useScene.getState().markDirty(nodeId)
      },
      canCommit() { return patch !== null },
      commit() {
        if (patch) useScene.getState().updateNode(nodeId, patch as never)
        useLiveNodeOverrides.getState().clear(nodeId)
        useStreetscapeStore.getState().setRoadElementSelection({
          networkId: node.id, kind: 'control', id: edgeId, index,
        })
      },
    }
  },
}

/** Drag one graph endpoint or junction while all incident edges stay attached. */
export const roadNodePointAffordance = {
  start({
    node,
    payload,
  }: {
    node: RoadNetworkNode
    payload: unknown
  }) {
    const { nodeId: graphNodeId } = payload as RoadNodePayload
    const nodeId = node.id as AnyNodeId
    const originalGraphNode = node.graphNodes[graphNodeId]
    let lastPatch: Pick<RoadNetworkNode, 'graphNodes' | 'junctions'> = {
      graphNodes: node.graphNodes,
      junctions: node.junctions,
    }
    useStreetscapeStore.getState().setRoadElementSelection({
      networkId: node.id,
      kind: 'control',
      id: graphNodeId,
    })
    return {
      affectedIds: [nodeId],
      apply({ planPoint }: { planPoint: PlanPoint }) {
        if (!originalGraphNode) return
        const moved = moveRoadGraphNode(node, graphNodeId, [
          planPoint[0],
          originalGraphNode.position[1],
          planPoint[1],
        ])
        if (!moved) return
        lastPatch = moved.patch
        useLiveNodeOverrides.getState().set(nodeId, lastPatch)
        useScene.getState().markDirty(nodeId)
      },
      canCommit() {
        return Boolean(originalGraphNode)
      },
      commit() {
        useScene.getState().updateNode(nodeId, lastPatch as never)
        useLiveNodeOverrides.getState().clear(nodeId)
      },
    }
  },
}

/** The outward floor-plan arrow directly moves the existing terminal node. */
export const roadExtendEndpointAffordance = roadNodePointAffordance

/** Drag one curb-return handle while preserving every other junction corner. */
export const roadCurbCornerAffordance = {
  start({
    node,
    payload,
  }: {
    node: RoadNetworkNode
    payload: unknown
  }) {
    const { cornerKey, junctionId } = payload as RoadCurbCornerPayload
    const nodeId = node.id as AnyNodeId
    const originalJunction = node.junctions[junctionId]
    let lastJunctions = node.junctions
    useStreetscapeStore.getState().setRoadElementSelection({
      networkId: node.id,
      kind: 'corner',
      id: junctionId,
      cornerKey,
    })
    return {
      affectedIds: [nodeId],
      apply({ planPoint }: { planPoint: PlanPoint }) {
        if (!originalJunction || !(cornerKey in originalJunction.cornerRadii)) return
        const radius = roadCurbCornerRadiusAtPlanPoint(
          node,
          junctionId,
          cornerKey,
          planPoint,
        )
        if (radius === null) return
        lastJunctions = {
          ...node.junctions,
          [junctionId]: {
            ...originalJunction,
            cornerRadii: {
              ...originalJunction.cornerRadii,
              [cornerKey]: radius,
            },
            solverStatus: 'manual',
          },
        }
        useLiveNodeOverrides.getState().set(nodeId, { junctions: lastJunctions })
        useScene.getState().markDirty(nodeId)
      },
      canCommit() {
        return Boolean(originalJunction && cornerKey in originalJunction.cornerRadii)
      },
      commit() {
        useScene.getState().updateNode(nodeId, { junctions: lastJunctions } as never)
        useLiveNodeOverrides.getState().clear(nodeId)
      },
    }
  },
}
