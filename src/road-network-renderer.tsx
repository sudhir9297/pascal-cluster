'use client'

import {
  type AnyNode,
  type AnyNodeId,
  useLiveNodeOverrides,
  useRegistry,
  useScene,
} from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useNodeEvents, useViewer } from '@pascal-app/viewer'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { RoadNetworkExtensionControls } from './road-network-extension-controls'
import { roadNetworkEditingControlsState } from './road-network-editing-controls'
import { RoadNetworkModel } from './road-network-model'
import { RoadNetworkSplineControls } from './road-network-spline-controls'
import { splitRoadGraphComponents } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { useEnvironmentStore, type RoadElementSelection } from './store'

export default function RoadNetworkRenderer({ node: storeNode }: { node: RoadNetworkNode }) {
  const ref = useRef<Group>(null!)
  const normalizedSignatureRef = useRef<string | null>(null)
  const handlers = useNodeEvents(storeNode as never, 'environment:road-network' as never)
  const roadToolActive = useEditor(
    (state) => state.mode === 'build' && (state.tool as string | null) === 'environment:road-network',
  )
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
      elementSelection?.kind === 'spline' || elementSelection?.kind === 'control',
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
  return (
    <group
      ref={ref}
      visible={node.visible !== false}
      {...(roadToolActive ? {} : handlers)}
    >
      <RoadNetworkModel
        elementSelection={elementSelection}
        node={node}
        nonInteractive={roadToolActive}
        onSelectElement={roadToolActive ? undefined : onSelectElement}
      />
      {editingControls.splineHandles ? (
        <RoadNetworkSplineControls elementSelection={elementSelection} node={node} />
      ) : null}
      {editingControls.lengthArrows ? <RoadNetworkExtensionControls node={node} /> : null}
    </group>
  )
}
