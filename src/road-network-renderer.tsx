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
import { buildDirectedRoadLanes } from './road-network-lanes'
import { buildRoadLaneMovements } from './road-lane-movements'
import { buildRoadSignalPlans } from './road-signal-phasing'
import { buildDividedRoadJunctionExpansions } from './road-divided-junctions'
import { buildRoadActiveModeMovements } from './road-active-modes'
import { buildRoadTrafficRoutes } from './road-traffic-simulation'
import { buildRoadsideDecorations } from './roadside-decoration-rules'
import { RoadNetworkModel } from './road-network-model'
import { RoadNetworkSplineControls } from './road-network-spline-controls'
import { splitRoadGraphComponents } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { useEnvironmentStore, type RoadElementSelection } from './store'
import { decodeTerrainField } from './terrain-field-compat'

export default function RoadNetworkRenderer({ node: storeNode }: { node: RoadNetworkNode }) {
  const ref = useRef<Group>(null!)
  const normalizedSignatureRef = useRef<string | null>(null)
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
  const node = override ? ({ ...storeNode, ...override } as RoadNetworkNode) : storeNode
  const generatedLanes = useMemo(() => buildDirectedRoadLanes(node), [
    node.activeStyleId,
    node.applyStyleToAll,
    node.edges,
    node.graphNodes,
		node.junctions,
    node.regionalPack,
    node.stylePresets,
  ])
  useEffect(() => {
    if (JSON.stringify(node.lanes) === JSON.stringify(generatedLanes)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      lanes: generatedLanes,
    } as Partial<AnyNode>)
  }, [generatedLanes, node.id, node.lanes])
  const generatedLaneMovements = useMemo(
    () => buildRoadLaneMovements({ ...node, lanes: generatedLanes }),
    [generatedLanes, node],
  )
  useEffect(() => {
    if (JSON.stringify(node.laneMovements) === JSON.stringify(generatedLaneMovements)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      laneMovements: generatedLaneMovements,
    } as Partial<AnyNode>)
  }, [generatedLaneMovements, node.id, node.laneMovements])
  const generatedActiveModeMovements = useMemo(
    () => buildRoadActiveModeMovements({
      ...node,
      lanes: generatedLanes,
      laneMovements: generatedLaneMovements,
    }),
    [generatedLaneMovements, generatedLanes, node],
  )
  useEffect(() => {
    if (JSON.stringify(node.activeModeMovements ?? {}) === JSON.stringify(generatedActiveModeMovements)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      activeModeMovements: generatedActiveModeMovements,
    } as Partial<AnyNode>)
  }, [generatedActiveModeMovements, node.activeModeMovements, node.id])
  const generatedSignalPlans = useMemo(
    () => buildRoadSignalPlans({
      ...node,
      lanes: generatedLanes,
      laneMovements: generatedLaneMovements,
    }),
    [generatedLaneMovements, generatedLanes, node],
  )
  useEffect(() => {
    if (JSON.stringify(node.signalPlans ?? {}) === JSON.stringify(generatedSignalPlans)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      signalPlans: generatedSignalPlans,
    } as Partial<AnyNode>)
  }, [generatedSignalPlans, node.id, node.signalPlans])
  const generatedTrafficRoutes = useMemo(
    () => buildRoadTrafficRoutes({
      ...node,
      lanes: generatedLanes,
      laneMovements: generatedLaneMovements,
      signalPlans: generatedSignalPlans,
    }),
    [generatedLaneMovements, generatedLanes, generatedSignalPlans, node],
  )
  useEffect(() => {
    if (JSON.stringify(node.trafficRoutes ?? {}) === JSON.stringify(generatedTrafficRoutes)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      trafficRoutes: generatedTrafficRoutes,
    } as Partial<AnyNode>)
  }, [generatedTrafficRoutes, node.id, node.trafficRoutes])
  const generatedRoadsideDecorations = useMemo(
    () => buildRoadsideDecorations(node),
    [node],
  )
  useEffect(() => {
    if (JSON.stringify(node.roadsideDecorations ?? {}) === JSON.stringify(generatedRoadsideDecorations)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      roadsideDecorations: generatedRoadsideDecorations,
    } as Partial<AnyNode>)
  }, [generatedRoadsideDecorations, node.id, node.roadsideDecorations])
  const generatedDividedJunctions = useMemo(
    () => buildDividedRoadJunctionExpansions({
      ...node,
      lanes: generatedLanes,
      laneMovements: generatedLaneMovements,
    }),
    [generatedLaneMovements, generatedLanes, node],
  )
  useEffect(() => {
    if (JSON.stringify(node.dividedJunctions ?? {}) === JSON.stringify(generatedDividedJunctions)) return
    useScene.getState().updateNode(node.id as AnyNodeId, {
      dividedJunctions: generatedDividedJunctions,
    } as Partial<AnyNode>)
  }, [generatedDividedJunctions, node.dividedJunctions, node.id])
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
    scene.updateNode(storeNode.id as AnyNodeId, {
      graphNodes: first.graphNodes,
      edges: first.edges,
      attachments: first.attachments,
      junctions: first.junctions,
    } as Partial<AnyNode>)
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
        node={node}
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
