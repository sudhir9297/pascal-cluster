'use client'

import {
  type AnyNode,
  type AnyNodeId,
  useLiveNodeOverrides,
  useRegistry,
  useScene,
} from '@pascal-app/core'
import { triggerSFX, useEditor } from '@pascal-app/editor'
import { useNodeEvents, useViewer } from '@pascal-app/viewer'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { RoadNetworkExtensionControls } from './road-network-extension-controls'
import { roadNetworkEditingControlsState } from './road-network-editing-controls'
import { deleteRoadEdge } from './road-network-graph-editing'
import {
  buildRoadsideDecorations,
  ensureRoadsideLampVerge,
  materializeRoadsideDecorationSelection,
} from './roadside-decoration-rules'
import { RoadNetworkModel } from './road-network-model'
import { RoadNetworkSplineControls } from './road-network-spline-controls'
import {
  pruneOrphanedRoadAttachments,
  reanchorRoadAttachment,
  resolveRoadAttachmentTransform,
  synchronizeRoadAttachmentOpening,
} from './road-edge-attachments'
import { splitRoadGraphComponents } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import {
  isStreetInfrastructureKind,
  type StreetInfrastructureNode,
} from './street-infrastructure-config'
import { planRoadAutoInfrastructureAttachmentMigration } from './road-auto-infrastructure'
import { useStreetscapeStore, type RoadElementSelection } from './store'
import { decodeTerrainField } from './terrain-field-compat'
import { roadRuntimeDefaultsPatch } from './road-network-runtime-defaults'

export default function RoadNetworkRenderer({ node: storeNode }: { node: RoadNetworkNode }) {
  const ref = useRef<Group>(null!)
  const normalizedSignatureRef = useRef<string | null>(null)
  const roadsideSyncSignatureRef = useRef<string | null>(null)
  const runtimeDefaultsSignatureRef = useRef<string | null>(null)
  const attachmentSyncSignatureRef = useRef<string | null>(null)
  const attachmentRoadSignatureRef = useRef<string | null>(null)
  const handlers = useNodeEvents(storeNode as never, 'streetscape:road-network' as never)
  const roadToolActive = useEditor(
    (state) => state.mode === 'build' && (state.tool as string | null) === 'streetscape:road-network',
  )
	const sceneNodes = useScene((state) => state.nodes)
	const clearancePeers = useMemo(
		() => Object.values(sceneNodes).flatMap((candidate) =>
			(candidate.id as string) !== storeNode.id &&
			(candidate.type as string) === 'streetscape:road-network'
				? [candidate as unknown as RoadNetworkNode]
				: [],
		),
		[sceneNodes, storeNode.id],
	)
	const terrain = useMemo(() => {
		const site = Object.values(sceneNodes).find(
			(candidate) => (candidate.type as string) === 'site',
		) as (AnyNode & { terrain?: unknown }) | undefined
		return decodeTerrainField(site?.terrain)
	}, [sceneNodes])
  const networkSelected = useViewer((state) =>
    ((state.selection as { selectedIds?: AnyNodeId[] }).selectedIds ?? []).includes(
      storeNode.id as AnyNodeId,
    ),
  )
  const storedElementSelection = useStreetscapeStore((state) => state.roadElementSelection)
  const elementSelection =
    storedElementSelection?.networkId === storeNode.id ? storedElementSelection : null
  const editingControls = roadNetworkEditingControlsState({
    networkSelected,
    roadToolActive,
    splineEditing:
      elementSelection?.kind === 'spline' ||
      elementSelection?.kind === 'control' ||
      elementSelection?.kind === 'endpoint',
  })
  const onSelectElement = useCallback(
    (
      selection: Omit<RoadElementSelection, 'networkId'>,
      event: { stopPropagation: () => void },
    ) => {
      event.stopPropagation()
      const store = useStreetscapeStore.getState()
      if (!networkSelected) {
        useViewer.getState().setSelection({ selectedIds: [storeNode.id as AnyNodeId] })
        store.setRoadElementSelection(
          selection.kind === 'decoration'
            ? { networkId: storeNode.id, ...selection }
            : null,
        )
        return
      }
      const current = store.roadElementSelection
      const same =
        current?.networkId === storeNode.id &&
        current.kind === selection.kind &&
        current.id === selection.id &&
        current.cornerKey === selection.cornerKey &&
        current.index === selection.index
      store.setRoadElementSelection(
        same ? null : { networkId: storeNode.id, ...selection },
      )
    },
    [networkSelected, storeNode.id],
  )
  useRegistry(storeNode.id as AnyNodeId, storeNode.type, ref)
  const override = useLiveNodeOverrides(
    (state) => state.get(storeNode.id as AnyNodeId) as Partial<RoadNetworkNode> | undefined,
  )
  // Local editor scenes can retain an already-mounted node while a plugin schema
  // advances. Parse at the renderer boundary so every derived subsystem receives
  // the same defaults even before the host persists its migration patch.
  const node = useMemo(
    () => RoadNetworkNode.parse(override ? { ...storeNode, ...override } : storeNode),
    [override, storeNode],
  )
  const onSelectRoadsideDecoration = useCallback(
    (id: string, event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      const scene = useScene.getState()
      const materialized = materializeRoadsideDecorationSelection(
        node,
        id,
        Object.keys(scene.nodes),
      )
      if (!materialized) {
        onSelectElement({ kind: 'decoration', id }, event)
        return
      }
      scene.applyNodeChanges({
        update: [{
          id: node.id as AnyNodeId,
          data: materialized.networkPatch as Partial<AnyNode>,
        }],
        create: [{
          node: materialized.node as unknown as AnyNode,
          parentId: node.parentId as AnyNodeId,
        }],
      })
      useStreetscapeStore.getState().setRoadElementSelection(null)
      useViewer.getState().setSelection({
        selectedIds: materialized.selection.selectedIds as AnyNodeId[],
      })
    },
    [node, onSelectElement],
  )
  useEffect(() => {
    const migration = planRoadAutoInfrastructureAttachmentMigration({
      network: node,
      nodes: Object.values(sceneNodes).flatMap((candidate) =>
        isStreetInfrastructureKind(candidate.type as string)
          ? [candidate as unknown as StreetInfrastructureNode]
          : [],
      ),
    })
    if (migration.nodeUpdates.length === 0) return
    useScene.getState().applyNodeChanges({
      update: [
        {
          id: node.id as AnyNodeId,
          data: {
            attachments: { ...node.attachments, ...migration.attachments },
          } as Partial<AnyNode>,
        },
        ...migration.nodeUpdates.map((update) => ({
          id: update.id as AnyNodeId,
          data: { roadAttachment: update.roadAttachment } as Partial<AnyNode>,
        })),
      ],
    })
  }, [node, sceneNodes])
  const attachmentAssetSignature = useMemo(
    () => Object.values(node.attachments ?? {}).map((attachment) => {
      const asset = Object.values(sceneNodes).find(
        (candidate) => (candidate.id as string) === attachment.assetNodeId,
      ) as unknown as {
        diameter?: number
        curveAmount?: number
        drivewayShape?: string
        height?: number
        id?: string
        length?: number
        position?: [number, number, number]
        rotation?: [number, number, number]
        supportHeight?: number
        type?: string
        width?: number
      } | undefined
      return [
        attachment.assetNodeId,
        asset?.type,
        asset?.position,
        asset?.rotation,
        asset?.diameter,
        asset?.curveAmount,
        asset?.drivewayShape,
        asset?.height,
        asset?.length,
        asset?.supportHeight,
        asset?.width,
      ]
    }),
    [node.attachments, sceneNodes],
  )
  const attachmentSyncSignature = useMemo(
    () => JSON.stringify({
      activeStyleId: node.activeStyleId,
      applyStyleToAll: node.applyStyleToAll,
      attachmentAssets: attachmentAssetSignature,
      attachments: node.attachments,
      edges: node.edges,
      graphNodes: node.graphNodes,
      stylePresets: node.stylePresets,
    }),
    [
      node.activeStyleId,
      node.applyStyleToAll,
      attachmentAssetSignature,
      node.attachments,
      node.edges,
      node.graphNodes,
      node.stylePresets,
    ],
  )
  const attachmentRoadSignature = useMemo(
    () => JSON.stringify({
      activeStyleId: node.activeStyleId,
      applyStyleToAll: node.applyStyleToAll,
      edges: node.edges,
      graphNodes: node.graphNodes,
      stylePresets: node.stylePresets,
    }),
    [node.activeStyleId, node.applyStyleToAll, node.edges, node.graphNodes, node.stylePresets],
  )
  useEffect(() => {
    if (attachmentSyncSignatureRef.current === attachmentSyncSignature) return
    attachmentSyncSignatureRef.current = attachmentSyncSignature
    const scene = useScene.getState()
    const roadChanged = attachmentRoadSignatureRef.current === null
      || attachmentRoadSignatureRef.current !== attachmentRoadSignature
    attachmentRoadSignatureRef.current = attachmentRoadSignature
    let nextAttachments = pruneOrphanedRoadAttachments(
      node.attachments,
      new Set(Object.values(scene.nodes).map((candidate) => candidate.id as string)),
    )
    const attachmentIds = new Set(Object.keys(nextAttachments))
    for (const [attachmentId, attachment] of Object.entries(nextAttachments)) {
      const asset = Object.values(scene.nodes).find(
        (candidate) => candidate.id === attachment.assetNodeId,
      ) as unknown as StreetInfrastructureNode & {
        id: string
        roadAttachment?: { networkNodeId: string; attachmentId: string; side?: 'left' | 'right' }
      } | undefined
      if (!asset || asset.roadAttachment?.networkNodeId !== node.id || asset.roadAttachment.attachmentId !== attachmentId) {
        continue
      }
      const syncedAttachment = synchronizeRoadAttachmentOpening(node, attachment, asset)
      if (
        syncedAttachment.roadOpeningOffset !== attachment.roadOpeningOffset
        || syncedAttachment.roadOpeningWidth !== attachment.roadOpeningWidth
        || JSON.stringify(syncedAttachment.roadOpeningProfile)
          !== JSON.stringify(attachment.roadOpeningProfile)
      ) {
        nextAttachments = { ...nextAttachments, [attachmentId]: syncedAttachment }
      }
      const transform = resolveRoadAttachmentTransform(node, syncedAttachment, asset)
      if (!transform) continue
      if (asset.roadAttachment?.side !== attachment.side) {
        scene.updateNode(asset.id as AnyNodeId, {
          roadAttachment: {
            networkNodeId: node.id,
            attachmentId,
            side: attachment.side,
          },
        } as Partial<AnyNode>)
      }
      const positionChanged = !asset.position || asset.position.some((value, index) => Math.abs(value - transform.position[index]!) > 1e-4)
      const rotationChanged = !asset.rotation || asset.rotation.some((value, index) => Math.abs(value - transform.rotation[index]!) > 1e-4)
      if ((positionChanged || rotationChanged) && !roadChanged) {
        const adjusted = reanchorRoadAttachment(node, syncedAttachment, asset)
        if (adjusted) {
          nextAttachments = { ...nextAttachments, [attachmentId]: adjusted }
          continue
        }
      }
      if ((positionChanged || rotationChanged) && roadChanged) {
        scene.updateNode(asset.id as AnyNodeId, {
          position: transform.position,
          rotation: transform.rotation,
		  ...(attachment.generatedKey && attachment.placementMode !== 'adjusted'
			? {
				metadata: {
					...((asset.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata))
						? asset.metadata as Record<string, unknown>
						: {}),
					roadAutoInfrastructureInitialPosition: transform.position,
					roadAutoInfrastructureInitialRotation: transform.rotation,
				},
			}
			: null),
        } as Partial<AnyNode>)
      }
    }
    if (nextAttachments !== node.attachments) {
      scene.updateNode(node.id as AnyNodeId, { attachments: nextAttachments } as Partial<AnyNode>)
    }
    for (const candidate of Object.values(scene.nodes)) {
      const asset = candidate as unknown as {
        id: string
        roadAttachment?: { networkNodeId: string; attachmentId: string }
      }
      const ref = asset.roadAttachment
      if (ref?.networkNodeId !== node.id || attachmentIds.has(ref.attachmentId)) continue
      scene.updateNode(asset.id as AnyNodeId, { roadAttachment: undefined } as Partial<AnyNode>)
    }
  }, [attachmentRoadSignature, attachmentSyncSignature, node])
  useEffect(() => {
    const patch = roadRuntimeDefaultsPatch(storeNode, node)
    const missingKeys = Object.keys(patch)
    if (missingKeys.length === 0) {
      runtimeDefaultsSignatureRef.current = null
      return
    }
    const signature = `${storeNode.id}:${missingKeys.join(',')}`
    if (runtimeDefaultsSignatureRef.current === signature) return
    runtimeDefaultsSignatureRef.current = signature
    useScene.getState().updateNode(
      storeNode.id as AnyNodeId,
      patch as Partial<AnyNode>,
    )
  }, [node, storeNode])
  useEffect(() => {
    const visibility = node.roadsideItemVisibility ?? {}
    const scene = useScene.getState()
    for (const candidate of Object.values(scene.nodes)) {
      const metadata = candidate.metadata
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) continue
      const values = metadata as Record<string, unknown>
      if (values.generatedBy !== 'road-auto-infrastructure' || values.roadNetworkId !== node.id) {
        continue
      }
      const visibilityKey = typeof values.roadsideItemKind === 'string'
        ? values.roadsideItemKind
        : candidate.type as string
      const visible = visibility[visibilityKey] === true
      if (candidate.visible === visible) continue
      scene.updateNode(candidate.id as AnyNodeId, { visible } as Partial<AnyNode>)
    }
  }, [node.id, node.roadsideItemVisibility, sceneNodes])
  const roadsideLampStylePresets = useMemo(
    () => node.showRoadsideDecorations
      || node.roadsideItemVisibility?.lamp === true
      || node.roadsideItemVisibility?.sign === true
      ? ensureRoadsideLampVerge(node)
      : null,
    [node],
  )
  const roadsideNode = useMemo(
    () => roadsideLampStylePresets
      ? { ...node, stylePresets: roadsideLampStylePresets }
      : node,
    [node, roadsideLampStylePresets],
  )
  useEffect(() => {
    if (!roadsideLampStylePresets) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      stylePresets: roadsideLampStylePresets,
    } as Partial<AnyNode>)
  }, [node.id, roadsideLampStylePresets])
  const generatedRoadsideDecorations = useMemo(
    () => node.showRoadsideDecorations
      || node.roadsideItemVisibility?.lamp === true
      || node.roadsideItemVisibility?.sign === true
      ? buildRoadsideDecorations(roadsideNode)
      : {},
    [node.roadsideItemVisibility, node.showRoadsideDecorations, roadsideNode],
  )
  useEffect(() => {
    const signature = JSON.stringify(generatedRoadsideDecorations)
    if (JSON.stringify(node.roadsideDecorations ?? {}) === signature) {
      roadsideSyncSignatureRef.current = null
      return
    }
    if (roadsideSyncSignatureRef.current === signature) return
    roadsideSyncSignatureRef.current = signature
    useScene.getState().updateNode(node.id as AnyNodeId, {
      roadsideDecorations: generatedRoadsideDecorations,
    } as Partial<AnyNode>)
  }, [generatedRoadsideDecorations, node.id, node.roadsideDecorations])
  const renderedNode = useMemo(
    () => ({
      ...roadsideNode,
      roadsideDecorations: generatedRoadsideDecorations,
    }),
    [generatedRoadsideDecorations, roadsideNode],
  )
  const storedComponents = useMemo(
    () => splitRoadGraphComponents(storeNode),
    [storeNode],
  )
  useEffect(() => {
    if (storedComponents.length <= 1 || !storeNode.parentId) return
    const signature = storedComponents
      .map((component) => Object.keys(component.edges).sort().join(','))
      .join('|')
    if (normalizedSignatureRef.current === signature) return
    normalizedSignatureRef.current = signature
    const scene = useScene.getState()
    const first = storedComponents[0]!
    const rebindAttachments = (component: typeof first, networkId: string) => {
      for (const attachment of Object.values(component.attachments ?? {})) {
        const asset = Object.values(scene.nodes).find(
          (candidate) => candidate.id === attachment.assetNodeId,
        ) as unknown as {
          id: string
          roadAttachment?: { networkNodeId: string; attachmentId: string }
        } | undefined
        if (
          !asset ||
          asset.roadAttachment?.attachmentId !== attachment.id ||
          asset.roadAttachment.networkNodeId === networkId
        ) continue
        scene.updateNode(asset.id as AnyNodeId, {
          roadAttachment: {
            networkNodeId: networkId,
            attachmentId: attachment.id,
            side: attachment.side,
          },
        } as Partial<AnyNode>)
      }
    }
    scene.updateNode(storeNode.id as AnyNodeId, {
      graphNodes: first.graphNodes,
      edges: first.edges,
      attachments: first.attachments,
      junctions: first.junctions,
    } as Partial<AnyNode>)
    rebindAttachments(first, storeNode.id)
    for (const component of storedComponents.slice(1)) {
      const separated = RoadNetworkNode.parse({
        ...storeNode,
        id: undefined,
        graphNodes: component.graphNodes,
        edges: component.edges,
        attachments: component.attachments,
        junctions: component.junctions,
      })
      scene.createNode(
        separated as unknown as AnyNode,
        storeNode.parentId as AnyNodeId,
      )
      rebindAttachments(component, separated.id)
    }
  }, [storeNode, storedComponents])
  useEffect(() => {
    if (!networkSelected && elementSelection) {
      useStreetscapeStore.getState().setRoadElementSelection(null)
    }
  }, [elementSelection, networkSelected])
  useEffect(() => {
    if (elementSelection?.kind !== 'edge') return
    const onDeleteEdge = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const scene = useScene.getState()
      useStreetscapeStore.getState().setRoadElementSelection(null)
      if (elementSelection.kind === 'decoration') {
        const nextDecorations = { ...node.roadsideDecorations }
        if (!(elementSelection.id in nextDecorations)) return
        delete nextDecorations[elementSelection.id]
        scene.updateNode(node.id as AnyNodeId, {
          roadsideDecorations: nextDecorations,
          roadsideDecorationSuppressed: {
            ...(node.roadsideDecorationSuppressed ?? {}),
            [elementSelection.id]: true,
          },
        } as Partial<AnyNode>)
      } else {
        const deletion = deleteRoadEdge(node, elementSelection.id)
        if (!deletion) return
        if (deletion.empty) {
          scene.deleteNode(node.id as AnyNodeId)
        } else {
          scene.updateNode(node.id as AnyNodeId, deletion.patch as Partial<AnyNode>)
        }
      }
      triggerSFX('sfx:item-delete')
    }
    window.addEventListener('keydown', onDeleteEdge, true)
    return () => window.removeEventListener('keydown', onDeleteEdge, true)
  }, [elementSelection, node])
  return (
    <group
      ref={ref}
      visible={node.visible !== false}
      {...(roadToolActive ? {} : handlers)}
    >
      <RoadNetworkModel
		clearancePeers={clearancePeers}
        elementSelection={elementSelection}
        node={renderedNode}
        nonInteractive={roadToolActive}
        onSelectElement={roadToolActive ? undefined : onSelectElement}
		onSelectRoadsideDecoration={roadToolActive ? undefined : onSelectRoadsideDecoration}
		terrain={terrain}
      />
      {editingControls.splineHandles ? (
        <RoadNetworkSplineControls elementSelection={elementSelection} node={node} />
      ) : null}
      {editingControls.lengthArrows ? <RoadNetworkExtensionControls node={node} /> : null}
    </group>
  )
}
