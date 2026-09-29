'use client'

import {
  type AnyNode,
  pauseSceneHistory,
  resumeSceneHistory,
  useScene,
} from '@pascal-app/core'
import { useEffect } from 'react'
import {
  syncPoolGroundOpenings,
  syncPoolSlabOpenings,
} from '../design/opening-sync'
import { syncSharedPoolJoints } from '../design/shared-joint'
import { syncPoolSpillovers } from '../spillover/design/sync'
import { syncAutomaticPoolFittings } from '../design/sync-pool-fittings'
import { poolAttachmentUpdates } from '../design/pool-attachments'
import { poolParentLinkUpdates } from '../design/pool-parent-links'
import {
  getPoolChildResizePreviewPosition,
  getPoolLevelAttachedPath,
  getPoolLevelAttachedPosition,
  getPoolLevelAttachedRotation,
  selectPoolConnectedPipes,
} from './pool-render-plan'
import { PoolNode } from '../core/schema'

function isOpeningRelevantNode(node: AnyNode | undefined) {
  const type = node?.type as string | undefined
  return type === 'pool:pool' || type === 'slab' || type === 'building' || type === 'level'
}

function isConnectionRelevantNode(node: AnyNode | undefined) {
  const type = node?.type as string | undefined
  return type?.startsWith('pool:') === true
}

const APPEARANCE_FIELDS = new Set([
  'copingStyle', 'copingProfile', 'copingCorner', 'copingStoneLength',
  'copingJointWidth', 'copingIrregularity', 'copingSeed', 'copingColor',
  'interiorFinish',
  'shellColor', 'visualPreset',
  'waterPreset', 'waterQuality', 'shallowWaterColor', 'deepWaterColor', 'waterColor',
  'waterMode', 'surfaceDetail', 'viscosity', 'rippleSize', 'clarity', 'rain', 'breeze',
  'sunElevation', 'sunAzimuth',
  'normalScale', 'normalStrength', 'normalSpeed', 'reflectionStrength',
  'reflectionFresnel', 'reflectionDistortion', 'refractionStrength',
  'causticsStrength', 'causticsScale', 'causticsSpeed',
  'intersectionStrength', 'intersectionColor', 'intersectionWidth',
  'shorelineStrength', 'shorelineWidth', 'shorelineSpeed',
  'specularStrength', 'specularSize', 'specularHardness',
])

/** Appearance edits cannot move openings, fittings, or pool connections. */
export function isAppearanceOnlyPoolChange(next: AnyNode | undefined, previous: AnyNode | undefined) {
  if (!next || !previous || String(next.type) !== 'pool:pool' || String(previous.type) !== 'pool:pool') return false
  const fields = new Set([...Object.keys(next), ...Object.keys(previous)])
  for (const field of fields) {
    if (APPEARANCE_FIELDS.has(field)) continue
    const nextValue = (next as Record<string, unknown>)[field]
    const previousValue = (previous as Record<string, unknown>)[field]
    if (nextValue !== previousValue && JSON.stringify(nextValue) !== JSON.stringify(previousValue)) return false
  }
  return true
}

function hasOpeningRelevantChange(
  nextNodes: Record<string, AnyNode>,
  previousNodes: Record<string, AnyNode>,
) {
  if (nextNodes === previousNodes) return false
  const ids = new Set([...Object.keys(nextNodes), ...Object.keys(previousNodes)])
  for (const id of ids) {
    const nextNode = nextNodes[id]
    const previousNode = previousNodes[id]
    if (nextNode === previousNode) continue
    if (isAppearanceOnlyPoolChange(nextNode, previousNode)) continue
    if (isOpeningRelevantNode(nextNode) || isOpeningRelevantNode(previousNode)) return true
  }
  return false
}

function hasConnectionRelevantChange(
  nextNodes: Record<string, AnyNode>,
  previousNodes: Record<string, AnyNode>,
) {
  if (nextNodes === previousNodes) return false
  const ids = new Set([...Object.keys(nextNodes), ...Object.keys(previousNodes)])
  for (const id of ids) {
    const nextNode = nextNodes[id]
    const previousNode = previousNodes[id]
    if (nextNode === previousNode) continue
    if (isAppearanceOnlyPoolChange(nextNode, previousNode)) continue
    if (isConnectionRelevantNode(nextNode) || isConnectionRelevantNode(previousNode)) return true
  }
  return false
}

/** Keeps the site, shadow receiver, and host slabs open beneath every pool. */
export function initializePoolOpeningSync() {
  let syncing = false

  const applyUpdates = (nodes: Record<string, AnyNode>, previousNodes: Record<string, AnyNode> = {}) => {
    const affectedPoolIds = new Set<string>()
    if (Object.keys(previousNodes).length > 0) {
      for (const id of new Set([...Object.keys(nodes), ...Object.keys(previousNodes)])) {
        const next = nodes[id]
        const previous = previousNodes[id]
        if (next === previous) continue
        for (const value of [next, previous]) {
          if (!value) continue
          if (String(value.type) === 'pool:pool') affectedPoolIds.add(id)
          if (String(value.type) === 'pool:spillover') {
            const spillover = value as { sourcePoolId?: string; targetPoolId?: string }
            if (spillover.sourcePoolId) affectedPoolIds.add(spillover.sourcePoolId)
            if (spillover.targetPoolId) affectedPoolIds.add(spillover.targetPoolId)
          }
          if (String(value.type) === 'pool:shared-joint') {
            for (const poolId of (value as { poolIds?: string[] }).poolIds ?? []) affectedPoolIds.add(poolId)
          }
        }
      }
    }
    const parentLinkUpdates = poolParentLinkUpdates(nodes)
    const genericChildUpdates: { id: string; data: Record<string, unknown> }[] = []
    for (const previousValue of Object.values(previousNodes)) {
      const previousPool = PoolNode.safeParse(previousValue)
      if (!previousPool.success) continue
      const pool = PoolNode.safeParse(nodes[previousPool.data.id])
      if (!pool.success) continue
      const resized = previousPool.data.length !== pool.data.length || previousPool.data.width !== pool.data.width ||
        JSON.stringify(previousPool.data.polygon) !== JSON.stringify(pool.data.polygon)
      const moved = previousPool.data.position.some((value, index) => value !== pool.data.position[index]) ||
        previousPool.data.rotation.some((value, index) => value !== pool.data.rotation[index])
      if (!resized && !moved) continue
      if (resized) for (const childId of previousPool.data.children ?? []) {
        const child = nodes[childId as never]
        if (!child || child.parentId !== pool.data.id || 'poolId' in child) continue
        genericChildUpdates.push({
          id: child.id,
          data: { position: getPoolChildResizePreviewPosition(previousPool.data, pool.data, (child as unknown as { position: [number, number, number] }).position) },
        })
      }
      for (const value of selectPoolConnectedPipes(nodes, pool.data.id)) {
        const child = value as unknown as { id: string; type: string; path?: [number, number, number][]; position?: [number, number, number]; rotation?: [number, number, number] }
        if (child.type === 'pipe-segment' && child.path) {
          genericChildUpdates.push({ id: child.id, data: { path: getPoolLevelAttachedPath(previousPool.data, pool.data, child.path) } })
        } else if (child.position) {
          genericChildUpdates.push({ id: child.id, data: {
            position: getPoolLevelAttachedPosition(previousPool.data, pool.data, child.position),
            ...(child.rotation ? { rotation: getPoolLevelAttachedRotation(previousPool.data, pool.data, child.rotation) } : {}),
          } })
        }
      }
    }
    const fittingChanges = syncAutomaticPoolFittings(nodes)
    const fittingNodes = { ...nodes }
    for (const node of fittingChanges.create) fittingNodes[node.id] = node as unknown as AnyNode
    for (const update of fittingChanges.update) {
      fittingNodes[update.id] = { ...fittingNodes[update.id], ...update.data } as AnyNode
    }
    for (const id of fittingChanges.delete) delete fittingNodes[id]
    const attachmentUpdates = poolAttachmentUpdates(fittingNodes)
    const spilloverChanges = syncPoolSpillovers(fittingNodes)
    // Resolve spillover endpoints before deriving slab/ground openings. The
    // stored node can contain the initial placeholder position and length for
    // one render; using it here leaves the floor cut behind because this sync
    // pass suppresses its own follow-up notification.
    const resolvedNodes = { ...fittingNodes }
    for (const update of spilloverChanges.update) {
      const current = resolvedNodes[update.id]
      if (current) resolvedNodes[update.id] = { ...current, ...update.data } as AnyNode
    }
    for (const id of spilloverChanges.delete) delete resolvedNodes[id]

    const slabUpdates = syncPoolSlabOpenings(resolvedNodes)
    const groundChanges = syncPoolGroundOpenings(resolvedNodes)
    const connectionChanges = syncSharedPoolJoints(
      resolvedNodes, Object.keys(previousNodes).length > 0 ? affectedPoolIds : undefined,
    )
    if (
      slabUpdates.length === 0 &&
      groundChanges.create.length === 0 &&
      groundChanges.update.length === 0 &&
      groundChanges.delete.length === 0 &&
      connectionChanges.create.length === 0 &&
      connectionChanges.update.length === 0 &&
      connectionChanges.delete.length === 0
      && spilloverChanges.update.length === 0
      && spilloverChanges.delete.length === 0
      && attachmentUpdates.length === 0
      && fittingChanges.create.length === 0
      && fittingChanges.update.length === 0
      && fittingChanges.delete.length === 0
      && parentLinkUpdates.length === 0
      && genericChildUpdates.length === 0
    ) return

    syncing = true
    pauseSceneHistory(useScene)
    try {
      useScene.getState().applyNodeChanges({
        create: [...groundChanges.create, ...fittingChanges.create].map((node) => ({
          node: node as unknown as AnyNode,
          parentId: node.parentId ?? undefined,
        })).concat(connectionChanges.create.map((node) => ({
          node: node as unknown as AnyNode,
          parentId: node.parentId ?? undefined,
        }))) as unknown as never,
      update: [...parentLinkUpdates, ...slabUpdates, ...groundChanges.update, ...connectionChanges.update, ...spilloverChanges.update, ...fittingChanges.update, ...attachmentUpdates, ...genericChildUpdates] as never,
        delete: [...groundChanges.delete, ...connectionChanges.delete, ...spilloverChanges.delete, ...fittingChanges.delete] as never,
      })
    } finally {
      resumeSceneHistory(useScene)
      syncing = false
    }
  }

  applyUpdates(useScene.getState().nodes)
  return useScene.subscribe((state, previousState) => {
    if (syncing || (
      !hasOpeningRelevantChange(state.nodes, previousState.nodes) &&
      !hasConnectionRelevantChange(state.nodes, previousState.nodes)
    )) return
    applyUpdates(state.nodes, previousState.nodes)
  })
}

export default function PoolOpeningSystem() {
  useEffect(() => initializePoolOpeningSync(), [])
  return null
}
