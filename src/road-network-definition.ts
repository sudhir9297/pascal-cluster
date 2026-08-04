import type { AnyNode, AnyNodeId, NodeDefinition } from '@pascal-app/core'
import { buildRoadNetworkFloorplan } from './road-network-floorplan'
import { roadNetworkParametrics } from './road-network-parametrics'
import {
  roadControlPointAffordance,
  roadCurbCornerAffordance,
  roadExtendEndpointAffordance,
  roadNodePointAffordance,
} from './road-network-affordances'
import {
  createDefaultRoadStyle,
  incidentRoadEdges,
  reconcileRoadJunctions,
  roadJunctionPrimaryCandidates,
} from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { DEFAULT_ROAD_STYLE_ID, DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'
import { useEnvironmentStore } from './store'

const defaultStyle = createDefaultRoadStyle()

type RoadNetworkDefinition = NodeDefinition<typeof RoadNetworkNode> & Record<string, unknown>

export const roadNetworkDefinition: RoadNetworkDefinition = {
  kind: 'environment:road-network',
  schemaVersion: 8,
  schema: RoadNetworkNode,
  category: 'structure',
  snapProfile: 'structural',
  extensions: {
    'pascal:editor/floorplan': {
      tool: () => import('./road-network-floorplan-tool'),
      availableModes: ['default', 'expert'],
      preferredView: '3d',
    },
  },
  migrate: {
    1: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      const previousStyles =
        previous.stylePresets && typeof previous.stylePresets === 'object'
          ? (previous.stylePresets as Record<string, unknown>)
          : {}
      return {
        ...previous,
        stylePresets: { ...DEFAULT_ROAD_STYLE_PRESETS, ...previousStyles },
        applyStyleToAll:
          typeof previous.applyStyleToAll === 'boolean' ? previous.applyStyleToAll : true,
      }
    },
    2: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      const previousStyles =
        previous.stylePresets && typeof previous.stylePresets === 'object'
          ? (previous.stylePresets as Record<string, unknown>)
          : {}
      const stylePresets = { ...previousStyles }
      for (const [id, nextDefault] of Object.entries(DEFAULT_ROAD_STYLE_PRESETS)) {
        const current = previousStyles[id]
        stylePresets[id] = current && typeof current === 'object'
          ? { ...(current as Record<string, unknown>), sidewalkWidth: nextDefault.sidewalkWidth }
          : { ...nextDefault }
      }
      return { ...previous, stylePresets }
    },
    3: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      const previousEdges =
        previous.edges && typeof previous.edges === 'object'
          ? (previous.edges as Record<string, unknown>)
          : {}
      const edges = Object.fromEntries(
        Object.entries(previousEdges).map(([id, edge]) => [
          id,
          edge && typeof edge === 'object'
            ? { joinMode: 'auto', stackLevel: 0, ...(edge as Record<string, unknown>) }
            : edge,
        ]),
      )
      return { ...previous, edges }
    },
    4: (old: unknown) => old,
    5: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      const legacyTreatments =
        previous.junctionOverrides && typeof previous.junctionOverrides === 'object'
          ? previous.junctionOverrides as Record<string, unknown>
          : {}
      const parsed = RoadNetworkNode.parse({ ...previous, junctions: {} })
      reconcileRoadJunctions(parsed)
      for (const [nodeId, treatment] of Object.entries(legacyTreatments)) {
        const junction = parsed.junctions[nodeId]
        if (!junction) continue
        if (
          treatment === 'auto' || treatment === 'stop' || treatment === 'yield' ||
          treatment === 'signal' || treatment === 'roundabout'
        ) {
          parsed.junctions[nodeId] = { ...junction, treatment }
        }
      }
      const { junctionOverrides: _legacy, ...rest } = previous
      return { ...rest, junctions: parsed.junctions }
    },
    6: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      return {
        ...previous,
        attachments:
          previous.attachments && typeof previous.attachments === 'object'
            ? previous.attachments
            : {},
      }
    },
    7: (old: unknown) => {
      if (!(old && typeof old === 'object')) return old
      const previous = old as Record<string, unknown>
      const previousStyles =
        previous.stylePresets && typeof previous.stylePresets === 'object'
          ? (previous.stylePresets as Record<string, unknown>)
          : {}
      const stylePresets = { ...previousStyles }
      for (const [id, nextDefault] of Object.entries(DEFAULT_ROAD_STYLE_PRESETS)) {
        const current = previousStyles[id]
        if (!(current && typeof current === 'object')) {
          stylePresets[id] = { ...nextDefault }
          continue
        }
        const style = current as Record<string, unknown>
        stylePresets[id] = {
          ...style,
          leftSide: style.leftSide ?? { ...nextDefault.leftSide },
          rightSide: style.rightSide ?? { ...nextDefault.rightSide },
        }
      }
      return { ...previous, stylePresets }
    },
  },
  defaults: () => ({
    object: 'node',
    parentId: null,
    visible: true,
    metadata: {},
    graphNodes: {},
    edges: {},
    attachments: {},
    junctions: {},
    stylePresets: { ...DEFAULT_ROAD_STYLE_PRESETS },
    activeStyleId: defaultStyle.id,
    applyStyleToAll: true,
    snapTolerance: 0.5,
  }),
  capabilities: {
    selectable: { hitVolume: 'bbox' },
    deletable: true,
    duplicable: false,
    groupable: false,
    presettable: false,
    drawTool: true,
  },
  parametrics: roadNetworkParametrics,
  floorplan: buildRoadNetworkFloorplan,
  floorplanAffordances: {
    'road-control-point': roadControlPointAffordance,
    'road-curb-corner': roadCurbCornerAffordance,
    'road-extend-endpoint': roadExtendEndpointAffordance,
    'road-node-point': roadNodePointAffordance,
  },
  quickActions: ({ node }: { node: RoadNetworkNode }) => {
    const junctions = node.junctions ?? {}
    const selected = useEnvironmentStore.getState().roadElementSelection
    const hasSplineAlignment = Object.values(node.edges).some(
      (edge) => edge.alignment.length > 0,
    )
    const splineEditing =
      selected?.networkId === node.id &&
      (selected.kind === 'spline' || selected.kind === 'control')
    const splineAction = hasSplineAlignment ? {
      id: 'road:edit-spline',
      label: splineEditing ? 'Finish spline edit' : 'Edit spline',
      title: splineEditing
        ? 'Hide the spline reshape handles'
        : 'Show draggable controls for reshaping this spline road',
      icon: { kind: 'iconify' as const, name: 'lucide:move' },
      run: () => {
        useEnvironmentStore.getState().setRoadElementSelection(
          splineEditing
            ? null
            : { networkId: node.id, kind: 'spline', id: node.id },
        )
        return { selectedIds: [node.id as AnyNodeId] }
      },
    } : null
    const selectedJunctionId =
      selected?.networkId === node.id &&
      (selected.kind === 'junction' || selected.kind === 'corner') &&
      junctions[selected.id]
        ? selected.id
        : null
    const selectedCornerKey =
      selected?.networkId === node.id &&
      selected.kind === 'corner' &&
      selected.cornerKey &&
      junctions[selected.id]?.cornerRadii[selected.cornerKey] !== undefined
        ? selected.cornerKey
        : null
    const junctionNode = Object.values(node.graphNodes)
      .map((graphNode) => ({
        graphNode,
        degree: incidentRoadEdges(node, graphNode.id).length,
      }))
      .filter((candidate) => candidate.degree >= 3 && junctions[candidate.graphNode.id])
      .sort((left, right) => right.degree - left.degree)[0]
    const junctionId = selectedJunctionId ?? junctionNode?.graphNode.id
    if (!junctionId) return splineAction ? [splineAction] : []
    const junctionRecord = junctions[junctionId]!
    const roundabout = junctionRecord?.treatment === 'roundabout'
    const primaryCandidates = roadJunctionPrimaryCandidates(node, junctionId)
    const primaryKey = [...junctionRecord.primaryEdgeIds].sort().join(':')
    const currentPrimaryIndex = primaryCandidates.findIndex(
      (pair) => [...pair].sort().join(':') === primaryKey,
    )
    const nextPrimary = primaryCandidates[(currentPrimaryIndex + 1) % primaryCandidates.length]
    const updateJunction = (
      sceneApi: { update: (id: AnyNodeId, patch: Partial<AnyNode>) => void },
      patch: Partial<typeof junctionRecord>,
    ) => {
      sceneApi.update(node.id as AnyNodeId, {
        junctions: {
          ...junctions,
          [junctionId]: { ...junctionRecord, ...patch },
        },
      } as Partial<AnyNode>)
      return { selectedIds: [node.id as AnyNodeId] }
    }
    return [
      ...(splineAction ? [splineAction] : []),
      {
        id: 'road:toggle-roundabout',
        label: roundabout ? 'Standard junction' : 'Roundabout',
        title: roundabout
          ? 'Convert the selected junction back to automatic'
          : 'Convert the selected junction to a roundabout',
        icon: { kind: 'iconify' as const, name: 'lucide:circle-dot' },
        history: 'single' as const,
        run: ({ sceneApi }: { sceneApi: { update: (id: AnyNodeId, patch: Partial<AnyNode>) => void } }) => {
          return updateJunction(sceneApi, { treatment: roundabout ? 'auto' : 'roundabout' })
        },
      },
      {
        id: 'road:cycle-primary',
        label: 'Change primary road',
        title: 'Cycle the through-road pair for the selected junction',
        icon: { kind: 'iconify' as const, name: 'lucide:route' },
        history: 'single' as const,
        run: ({ sceneApi }: { sceneApi: { update: (id: AnyNodeId, patch: Partial<AnyNode>) => void } }) =>
          updateJunction(sceneApi, {
            primaryMode: 'manual',
            primaryEdgeIds: nextPrimary ? [...nextPrimary] : junctionRecord.primaryEdgeIds,
          }),
      },
      ...(selectedCornerKey
        ? [
            {
              id: 'road:tighten-corner',
              label: 'Tighter corner',
              title: 'Reduce only the selected curb-return radius by 1 metre',
              icon: { kind: 'iconify' as const, name: 'lucide:shrink' },
              history: 'single' as const,
              run: ({ sceneApi }: { sceneApi: { update: (id: AnyNodeId, patch: Partial<AnyNode>) => void } }) =>
                updateJunction(sceneApi, {
                  cornerRadii: {
                    ...junctionRecord.cornerRadii,
                    [selectedCornerKey]: Math.max(
                      0.5,
                      junctionRecord.cornerRadii[selectedCornerKey]! - 1,
                    ),
                  },
                  solverStatus: 'manual',
                }),
            },
            {
              id: 'road:widen-corner',
              label: 'Wider corner',
              title: 'Increase only the selected curb-return radius by 1 metre',
              icon: { kind: 'iconify' as const, name: 'lucide:expand' },
              history: 'single' as const,
              run: ({ sceneApi }: { sceneApi: { update: (id: AnyNodeId, patch: Partial<AnyNode>) => void } }) =>
                updateJunction(sceneApi, {
                  cornerRadii: {
                    ...junctionRecord.cornerRadii,
                    [selectedCornerKey]: Math.min(
                      100,
                      junctionRecord.cornerRadii[selectedCornerKey]! + 1,
                    ),
                  },
                  solverStatus: 'manual',
                }),
            },
          ]
        : []),
    ]
  },
  renderer: { kind: 'parametric', module: () => import('./road-network-renderer') },
  preview: () => import('./road-network-preview'),
  tool: () => import('./road-network-tool'),
  toolHints: [
    { key: 'Left click', label: 'Add road or spline point' },
    { key: 'Enter', label: 'Finish current road' },
    { key: 'Double click', label: 'Finish current road' },
    { key: 'C', label: 'Toggle straight / spline drawing' },
    { key: 'B', label: 'Toggle ground / bridge' },
    { key: 'J', label: 'Toggle automatic junctions' },
    { key: 'Esc', label: 'Stop road tool' },
  ],
  presentation: {
    label: 'Road',
    description: 'Draw independently selectable connected roads with automatic junction topology.',
    icon: { kind: 'iconify', name: 'lucide:route' },
    paletteSection: 'structure',
    paletteOrder: 15,
  },
  mcp: {
    description:
      'One connected road centerline component whose surface and junction shapes are generated automatically.',
  },
}
