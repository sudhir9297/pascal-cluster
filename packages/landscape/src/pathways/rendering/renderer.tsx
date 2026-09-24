'use client'
import { type AnyNodeId, useLiveNodeOverrides } from '@pascal-app/core'
import { useNodeEvents, useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo } from 'react'
import { useEditor } from '@pascal-app/editor'
import type { PathwayNode } from '../domain/schema'
import { PATHWAY_KIND } from '../domain/schema'
import { PathwayExtensionControls } from '../editor/extension-controls'
import { PathwayJunctionControls } from '../editor/junction-controls'
import { buildPathwayGeometry, createPathwayMaterial, disposePathwayGeometry } from './geometry'

export default function PathwayRenderer({ node }: { node: PathwayNode }) {
  const override = useLiveNodeOverrides((state) => state.overrides.get(node.id))
  const renderedNode = useMemo(() => override ? { ...node, ...override } as PathwayNode : node,
    [node, override])
  const selected = useViewer((state) =>
    ((state.selection as { selectedIds?: AnyNodeId[] }).selectedIds ?? []).includes(node.id as AnyNodeId))
  const drawing = useEditor((state) => state.mode === 'build' && state.tool === PATHWAY_KIND)
  const handlers = useNodeEvents(node as never, PATHWAY_KIND as never)
  const material = useMemo(() => createPathwayMaterial(renderedNode),
    [renderedNode.finish, renderedNode.color])
  useEffect(() => () => { material.dispose(); material.map?.dispose() }, [material])
  const geometry = useMemo(() => buildPathwayGeometry(renderedNode, undefined, material), [renderedNode, material])
  useEffect(() => () => disposePathwayGeometry(geometry, false), [geometry])
  return <group visible={renderedNode.visible !== false} {...(drawing ? {} : handlers)}>
    <primitive object={geometry} />
    {selected && !drawing && <PathwayExtensionControls node={renderedNode} />}
    {selected && !drawing && <PathwayJunctionControls node={renderedNode} />}
  </group>
}
