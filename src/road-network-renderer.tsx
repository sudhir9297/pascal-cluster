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
} from './roadside-decoration-rules'
import { RoadNetworkModel } from './road-network-model'
import { RoadNetworkSplineControls } from './road-network-spline-controls'
import { resolveRoadAttachmentTransform } from './road-edge-attachments'
import { splitRoadGraphComponents } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import { useEnvironmentStore, type RoadElementSelection } from './store'
import { decodeTerrainField } from './terrain-field-compat'
import { roadRuntimeDefaultsPatch } from './road-network-runtime-defaults'

export default function RoadNetworkRenderer({ node: storeNode }: { node: RoadNetworkNode }) {
  const ref = useRef<Group>(null!)
  const normalizedSignatureRef = useRef<string | null>(null)
  const roadsideSyncSignatureRef = useRef<string | null>(null)
  const runtimeDefaultsSignatureRef = useRef<string | null>(null)
  const attachmentSyncSignatureRef = useRef<string | null>(null)
  const handlers = useNodeEvents(storeNode as never, 'environment:road-network' as never)
  const roadToolActive = useEditor(
    (state) => state.mode === 'build' && (state.tool as string | null) === 'environment:road-network',
  )
	const sceneNodes = useScene((state) => state.nodes)
	const clearancePeers = useMemo(
		() => Object.values(sceneNodes).flatMap((candidate) =>
			(candidate.id as string) !== storeNode.id &&
			(candidate.type as string) === 'environment:road-network'
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
  const storedElementSelection = useEnvironmentStore((state) => state.roadElementSelection)
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
      const store = useEnvironmentStore.getState()
      if (!networkSelected) {
        useViewer.getState().setSelection({ selectedIds: [storeNode.id as AnyNodeId] })
        store.setRoadElementSelection(null)
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
  const attachmentAssetSignature = useMemo(
    () => Object.values(node.attachments ?? {}).map((attachment) => {
      const asset = Object.values(sceneNodes).find(
        (candidate) => (candidate.id as string) === attachment.assetNodeId,
      ) as unknown as {
        diameter?: number
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
  useEffect(() => {
    if (attachmentSyncSignatureRef.current === attachmentSyncSignature) return
    attachmentSyncSignatureRef.current = attachmentSyncSignature
    const scene = useScene.getState()
    const attachmentIds = new Set(Object.keys(node.attachments ?? {}))
    for (const [attachmentId, attachment] of Object.entries(node.attachments ?? {})) {
      const asset = Object.values(scene.nodes).find(
        (candidate) => candidate.id === attachment.assetNodeId,
      ) as unknown as StreetInfrastructureNode & {
        id: string
        roadAttachment?: { networkNodeId: string; attachmentId: string; side?: 'left' | 'right' }
      } | undefined
      if (!asset || asset.roadAttachment?.networkNodeId !== node.id || asset.roadAttachment.attachmentId !== attachmentId) {
        continue
      }
      const transform = resolveRoadAttachmentTransform(node, attachment, asset)
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
      if (positionChanged || rotationChanged) {
        scene.updateNode(asset.id as AnyNodeId, {
          position: transform.position,
          rotation: transform.rotation,
        } as Partial<AnyNode>)
      }
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
  }, [attachmentSyncSignature, node])
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
  const roadsideLampStylePresets = useMemo(
    () => node.showRoadsideDecorations ? ensureRoadsideLampVerge(node) : null,
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
    () => buildRoadsideDecorations(roadsideNode),
    [roadsideNode],
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
      useEnvironmentStore.getState().setRoadElementSelection(null)
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
      const deletion = deleteRoadEdge(node, elementSelection.id)
      if (!deletion) return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      const scene = useScene.getState()
      useEnvironmentStore.getState().setRoadElementSelection(null)
      if (deletion.empty) {
        scene.deleteNode(node.id as AnyNodeId)
      } else {
        scene.updateNode(node.id as AnyNodeId, deletion.patch as Partial<AnyNode>)
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
		terrain={terrain}
      />
      {editingControls.splineHandles ? (
        <RoadNetworkSplineControls elementSelection={elementSelection} node={node} />
      ) : null}
      {editingControls.lengthArrows ? <RoadNetworkExtensionControls node={node} /> : null}
    </group>
  )
}
