import { createHash } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import {
  buildJunctionBoundaryGeometry,
  buildJunctionBoundarySidewalkGeometry,
  buildRoadRibbonGeometry,
  smoothRoadRenderPath,
  type RoadSurfaceGeometryData,
} from './road-network-geometry'
import { roadJunctionCornerKey } from './road-network-topology'

type ExactMeshSnapshot = {
  indexCount: number
  positionCount: number
  sha256: string
  triangleCount: number
  vertexCount: number
}

function exactMeshSnapshot(mesh: RoadSurfaceGeometryData): ExactMeshSnapshot {
  const bytes = new ArrayBuffer(mesh.positions.length * 8 + mesh.indices.length * 4)
  const view = new DataView(bytes)
  let offset = 0
  for (const value of mesh.positions) {
    view.setFloat64(offset, value, false)
    offset += 8
  }
  for (const value of mesh.indices) {
    view.setUint32(offset, value, false)
    offset += 4
  }
  return {
    indexCount: mesh.indices.length,
    positionCount: mesh.positions.length,
    sha256: createHash('sha256').update(new Uint8Array(bytes)).digest('hex'),
    triangleCount: mesh.indices.length / 3,
    vertexCount: mesh.positions.length / 3,
  }
}

function buildFixtureMeshes(): Record<string, RoadSurfaceGeometryData> {
  const curvedPoints = smoothRoadRenderPath(
    [[0, 0, 0], [12, 0, 0], [12, 0, 12]],
    [1],
    [4],
    8,
  )
  const teeApproaches = [
    { edgeId: 'east', angle: 0, halfWidth: 3.75 },
    { edgeId: 'west', angle: Math.PI, halfWidth: 3.75 },
    { edgeId: 'south', angle: -Math.PI / 2, halfWidth: 4.5 },
  ]
  const tee = buildJunctionBoundaryGeometry(
    teeApproaches,
    { [roadJunctionCornerKey('east', 'south')]: 7 },
    8,
  )
  const plus = buildJunctionBoundaryGeometry([
    { edgeId: 'east', angle: 0, halfWidth: 4 },
    { edgeId: 'north', angle: Math.PI / 2, halfWidth: 4 },
    { edgeId: 'west', angle: Math.PI, halfWidth: 4 },
    { edgeId: 'south', angle: -Math.PI / 2, halfWidth: 4 },
  ], {}, 8)
  return {
    curvedRibbon: buildRoadRibbonGeometry(curvedPoints, {
      surfaceThickness: 0.14,
      width: 7,
    }),
    offsetSideRibbon: buildRoadRibbonGeometry([[0, 0, 0], [12, 0, 0]], {
      elevationOffset: 0.05,
      lateralOffset: 4.25,
      surfaceThickness: 0.14,
      width: 1.5,
    }),
    plusJunction: plus,
    straightRibbon: buildRoadRibbonGeometry([[0, 0, 0], [12, 0, 0]], {
      surfaceThickness: 0.14,
      width: 7,
    }),
    teeJunction: tee,
    teeSidewalk: buildJunctionBoundarySidewalkGeometry(tee, 1.5),
  }
}

const ROAD_MESH_FIXTURES: Record<string, ExactMeshSnapshot> = {
  curvedRibbon: {
    indexCount: 60,
    positionCount: 66,
    sha256: 'e821862742404c58d0d5e1befec49a66682956fa6aa643c9c3c9fd49a2089e02',
    triangleCount: 20,
    vertexCount: 22,
  },
  offsetSideRibbon: {
    indexCount: 6,
    positionCount: 12,
    sha256: 'bf858af1c8a3492d2ef61283e6885619f78f8e9521c12473ab72be23bd33ca76',
    triangleCount: 2,
    vertexCount: 4,
  },
  plusJunction: {
    indexCount: 108,
    positionCount: 111,
    sha256: 'a1adeaf15ce0bad30bbd5b14161bbe5d14a877911e977ea177a5df8d727ee261',
    triangleCount: 36,
    vertexCount: 37,
  },
  straightRibbon: {
    indexCount: 6,
    positionCount: 12,
    sha256: '5b9ffa85c33339d4d8bfba081ce2ec119e33e4721c4b7ca216ca1986edd4a492',
    triangleCount: 2,
    vertexCount: 4,
  },
  teeJunction: {
    indexCount: 69,
    positionCount: 72,
    sha256: '64c3ac3a0bf5e6ca175d8132e719eee6a15d80b8f9f47fa5668a34571855f7e6',
    triangleCount: 23,
    vertexCount: 24,
  },
  teeSidewalk: {
    indexCount: 138,
    positionCount: 276,
    sha256: '23639634f43af9a1ff67fea0b4956afd61e6859e76ec9fdbec27bb510353d445',
    triangleCount: 46,
    vertexCount: 92,
  },
}

describe('exact deterministic road mesh fixtures', () => {
  test('matches the production vertex and index buffers byte for byte', () => {
    const actual = Object.fromEntries(
      Object.entries(buildFixtureMeshes()).map(([name, mesh]) => [name, exactMeshSnapshot(mesh)]),
    )
    expect(actual).toEqual(ROAD_MESH_FIXTURES)
  })

  test('rebuilding the fixture set is deterministic within the same run', () => {
    const first = Object.fromEntries(
      Object.entries(buildFixtureMeshes()).map(([name, mesh]) => [name, exactMeshSnapshot(mesh)]),
    )
    const second = Object.fromEntries(
      Object.entries(buildFixtureMeshes()).map(([name, mesh]) => [name, exactMeshSnapshot(mesh)]),
    )
    expect(second).toEqual(first)
  })
})
