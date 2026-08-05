import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  roadRibbonShadowPolicy,
  RoadDraftPreviewSurface,
  RoadNetworkModel,
} from './road-network-model'
import { buildRoadNetworkFloorplan } from './road-network-floorplan'
import { moveRoadTerminal } from './road-network-extension-handles'
import type { GeometryContext } from '@pascal-app/core'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { sampleRoadAlignmentPoints } from './road-network-geometry'
import { DEFAULT_ROAD_STYLE_PRESETS } from './road-style-presets'

function renderThree(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  const previousConsoleError = console.error
  console.error = () => {}
  try {
    return renderToStaticMarkup(element)
  } finally {
    console.error = previousConsoleError
  }
}

function renderRoad(node: RoadNetworkNode): string {
  return renderThree(createElement(RoadNetworkModel, { node }))
}

describe('road network corner rendering', () => {
  test('submits one continuous carriageway mesh while previewing a spline', () => {
    const points = sampleRoadAlignmentPoints(
      [0, 0, 0],
      [[6, 0, 5]],
      [12, 0, 0],
      16,
    )
    const markup = renderThree(createElement(RoadDraftPreviewSurface, {
      points,
      style: DEFAULT_ROAD_STYLE_PRESETS['local-street'],
    }))

    expect(points.length).toBeGreaterThan(2)
    expect(markup.match(/name="road-segment-preview"/g)).toHaveLength(1)
    expect(markup.match(/name="road-side-[^"]+-preview"/g)).toHaveLength(8)
  })

  test('keeps flat curved ribbons from casting shadow acne onto themselves', () => {
    expect(roadRibbonShadowPolicy(false)).toEqual({
      castShadow: false,
      receiveShadow: true,
    })
    expect(roadRibbonShadowPolicy(true)).toEqual({
      castShadow: false,
      receiveShadow: false,
    })
  })

  test('treats a degree-two L bend as a continuous road rather than an intersection disk', () => {
    const first = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [10, 0, 0])
    const second = insertRoadSegment(first.graph, [10, 0, 0], [10, 0, 10])

    const markup = renderRoad(RoadNetworkNode.parse(second.graph))

    expect(markup.match(/name="road-segment-surface"/g)).toHaveLength(1)
    expect(markup.match(/name="road-side-left-sidewalk"/g)).toHaveLength(1)
    expect(markup.match(/name="road-side-right-sidewalk"/g)).toHaveLength(1)
    expect(markup).toContain('name="road-marking-centerline"')
    expect(markup).not.toContain('name="road-junction-surface"')
  })

  test('keeps a junction surface where three roads meet', () => {
    const first = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
    const second = insertRoadSegment(first.graph, [0, 0, -10], [0, 0, 0])

    const markup = renderRoad(RoadNetworkNode.parse(second.graph))

    expect(markup).toContain('name="road-junction-surface"')
    expect(markup).toContain('name="road-junction-sidewalk"')
  })

  test('renders independently configured components on each road side', () => {
    const result = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [20, 0, 0])
    result.graph.stylePresets['local-street'] = {
      ...result.graph.stylePresets['local-street']!,
      leftSide: {
        parkingLaneWidth: 2.4,
        bikeLaneWidth: 1.5,
        gutterWidth: 0.3,
        curbWidth: 0.15,
        vergeWidth: 0.8,
        sidewalkWidth: 1.8,
      },
      rightSide: {
        parkingLaneWidth: 0,
        bikeLaneWidth: 0,
        gutterWidth: 0.25,
        curbWidth: 0.12,
        vergeWidth: 0,
        sidewalkWidth: 1.2,
      },
    }

    const node = RoadNetworkNode.parse(result.graph)
    const markup = renderRoad(node)
    const floorplan = buildRoadNetworkFloorplan(node, {
      viewState: {
        selected: false,
        palette: { selectedStroke: '#2563eb' },
      },
    } as unknown as GeometryContext)

    expect(markup).toContain('name="road-side-left-parking-lane"')
    expect(markup).toContain('name="road-side-left-bike-lane"')
    expect(markup).not.toContain('name="road-side-right-parking-lane"')
    expect(markup).not.toContain('name="road-side-right-bike-lane"')
    expect(markup).toContain('name="road-side-right-gutter"')
    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const polygons = floorplan.children.filter((child) => child.kind === 'polygon')
    expect(polygons.some((polygon) => polygon.fill === '#44484c')).toBe(true)
    expect(polygons.some((polygon) => polygon.fill === '#517665')).toBe(true)
    expect(polygons.some((polygon) => polygon.fill === '#85888a')).toBe(true)
  })

  test('renders topology-driven centerlines, arrows, stop lines, and crosswalks', () => {
    const first = insertRoadSegment(createEmptyRoadGraph(), [-30, 0, 0], [30, 0, 0])
    const tee = insertRoadSegment(first.graph, [0, 0, -30], [0, 0, 0], { tolerance: 0.1 })

    const markup = renderRoad(RoadNetworkNode.parse(tee.graph))

    expect(markup).toContain('name="road-marking-centerline"')
    expect(markup).toContain('name="road-marking-direction-arrow"')
    expect(markup).toContain('name="road-marking-stop-line"')
    expect(markup).toContain('name="road-marking-crosswalk"')
  })

  test('renders dashed internal lane boundaries for multi-lane roads', () => {
    const result = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [40, 0, 0])
    result.graph.stylePresets['local-street'] = {
      ...result.graph.stylePresets['local-street']!,
      laneCount: 4,
    }

    const markup = renderRoad(RoadNetworkNode.parse(result.graph))

    expect(markup).toContain('name="road-marking-lane-dash"')
  })

  test('uses the solved junction boundary in the selected floorplan', () => {
    const first = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
    const second = insertRoadSegment(first.graph, [0, 0, -10], [0, 0, 0])
    const node = RoadNetworkNode.parse(second.graph)
    const floorplan = buildRoadNetworkFloorplan(node, {
      viewState: {
        selected: true,
        palette: { selectedStroke: '#2563eb' },
      },
    } as unknown as GeometryContext)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const solvedPatch = floorplan.children.find(
      (child) => child.kind === 'polygon' && child.points.length > 4,
    )
    expect(solvedPatch).toBeDefined()
  })

  test('keeps spline controls out of the always-on road hit targets', () => {
    const curved = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0], {
      alignment: [[0, 0, 4]],
    })
    const tee = insertRoadSegment(curved.graph, [0, 0, -10], [0, 0, 4], {
      tolerance: 0.1,
    })
    const node = RoadNetworkNode.parse(tee.graph)
    const edgeId = Object.keys(node.edges)[0]!
    const junctionId = Object.values(node.graphNodes).find((graphNode) =>
      Object.values(node.edges).filter(
        (edge) => edge.startNodeId === graphNode.id || edge.endNodeId === graphNode.id,
      ).length >= 3,
    )!.id
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(RoadNetworkModel, {
        node,
        elementSelection: { networkId: node.id, kind: 'edge', id: edgeId },
        onSelectElement: () => {},
      }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain(`name="road-edge-hit:${edgeId}"`)
    expect(markup).not.toContain('name="road-control-hit:')
    expect(markup).toContain('name="road-junction-surface"')
    expect(junctionId).toBeTruthy()
  })

  test('shows the inferred primary approaches when a junction is selected', () => {
    const base = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
    const tee = insertRoadSegment(base.graph, [0, 0, -10], [0, 0, 0], { tolerance: 0.1 })
    const node = RoadNetworkNode.parse(tee.graph)
    const junctionId = Object.keys(node.junctions)[0]!
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(RoadNetworkModel, {
        node,
        elementSelection: { networkId: node.id, kind: 'junction', id: junctionId },
        onSelectElement: () => {},
      }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup.match(/name="road-primary-approach:/g)).toHaveLength(2)
  })

  test('renders independently selectable curb-return handles for one junction', () => {
    const base = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
    const tee = insertRoadSegment(base.graph, [0, 0, -10], [0, 0, 0], { tolerance: 0.1 })
    const node = RoadNetworkNode.parse(tee.graph)
    const junctionId = Object.keys(node.junctions)[0]!
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(RoadNetworkModel, {
        node,
        elementSelection: { networkId: node.id, kind: 'junction', id: junctionId },
        onSelectElement: () => {},
      }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup.match(/name="road-curb-corner-hit:/g)).toHaveLength(2)
  })

  test('adds draggable curb-return handles to a selected floorplan junction', () => {
    const base = insertRoadSegment(createEmptyRoadGraph(), [-10, 0, 0], [10, 0, 0])
    const tee = insertRoadSegment(base.graph, [0, 0, -10], [0, 0, 0], { tolerance: 0.1 })
    const node = RoadNetworkNode.parse(tee.graph)
    const floorplan = buildRoadNetworkFloorplan(node, {
      viewState: {
        selected: true,
        palette: { selectedStroke: '#2563eb' },
      },
    } as unknown as GeometryContext)

    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const handles = floorplan.children.filter(
      (child) => child.kind === 'endpoint-handle' && child.affordance === 'road-curb-corner',
    )
    expect(handles).toHaveLength(2)
    expect(handles.every(
      (handle) => handle.kind === 'endpoint-handle' && handle.variant === 'curve',
    )).toBe(true)
  })

  test('adds draggable graph-node and curve-control handles to selected floorplans', () => {
    const result = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [10, 0, 0], {
      alignment: [[5, 0, 3]],
    })
    const node = RoadNetworkNode.parse(result.graph)
    const floorplan = buildRoadNetworkFloorplan(node, {
      viewState: {
        selected: true,
        palette: { selectedStroke: '#2563eb' },
      },
    } as unknown as GeometryContext)
    expect(floorplan.kind).toBe('group')
    if (floorplan.kind !== 'group') return
    const handles = floorplan.children.filter((child) => child.kind === 'endpoint-handle')
    const extensionArrows = floorplan.children.filter((child) => child.kind === 'move-arrow')
    expect(handles.filter((handle) => handle.affordance === 'road-node-point')).toHaveLength(2)
    expect(handles.filter((handle) => handle.affordance === 'road-control-point')).toHaveLength(1)
    expect(extensionArrows).toHaveLength(2)
    expect(extensionArrows.every((arrow) => arrow.affordance === 'road-extend-endpoint')).toBe(true)
  })

  test('extends an existing terminal without creating another road item', () => {
    const first = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [10, 0, 0])
    const second = insertRoadSegment(first.graph, [10, 0, 0], [10, 0, 10])
    const node = RoadNetworkNode.parse(second.graph)
    const terminal = Object.values(node.graphNodes).find(
      (graphNode) => graphNode.position[0] === 10 && graphNode.position[2] === 10,
    )!
    const patch = moveRoadTerminal(node, terminal.id, [10, 0, 15])

    expect(patch).not.toBeNull()
    expect(Object.keys(patch!.graphNodes)).toHaveLength(Object.keys(node.graphNodes).length)
    expect(Object.keys(patch!).sort()).toEqual(['graphNodes', 'junctions'])
    expect(patch!.graphNodes[terminal.id]?.position).toEqual([10, 0, 15])
    expect(node.graphNodes[terminal.id]?.position).toEqual([10, 0, 10])
  })

  test('renders an in-scene marker for a blocking graph conflict', () => {
    const result = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [10, 0, 0])
    const first = Object.values(result.graph.edges)[0]!
    result.graph.edges.duplicate = { ...first, id: 'duplicate' }

    const markup = renderRoad(RoadNetworkNode.parse(result.graph))

    expect(markup).toContain('name="road-validation-error:duplicate-edge"')
  })

  test('does not submit an empty junction-sidewalk mesh to the renderer', () => {
    let graph = createEmptyRoadGraph()
    graph = insertRoadSegment(graph, [-10, 0, 0], [10, 0, 0]).graph
    graph = insertRoadSegment(graph, [0, 0, -10], [0, 0, 10]).graph
    graph = insertRoadSegment(graph, [-8, 0, -8], [8, 0, 8]).graph

    const markup = renderRoad(RoadNetworkNode.parse(graph))
    const emptyPositionAttribute = 'count="0"'

    expect(markup).not.toContain(emptyPositionAttribute)
  })
})
