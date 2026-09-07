import { expect, test } from 'bun:test'
import { buildOsmRoadStyle } from './osm-road-style'
import {
  osmSurfaceMaterial,
  ROAD_SURFACE_MATERIALS,
  roadSurfaceDescription,
  roadSurfaceTexturePixels,
  roadSurfaceUvs,
} from './road-surface-material'
import { roadSurfaceTexture } from './road-surface-textures'
import { createEmptyRoadGraph, insertRoadSegment } from './road-network-topology'
import { RoadNetworkNode } from './schema'
import { exportRoadNetworkGraph, importRoadNetworkGraph } from './road-network-io'

for (const [tag, kind] of [
  ['asphalt', 'asphalt'],
  ['concrete', 'concrete'],
  ['concrete:plates', 'concrete'],
  ['paving_stones', 'paving-stones'],
] as const) {
  test(`OSM ${tag} retains its tag and selects ${kind}`, () => {
    const style = buildOsmRoadStyle({ highway: 'residential', surface: tag }, 'local-street', false)
    expect(style.surfaceMaterial).toBe(kind)
    expect(style.surfaceColor).toBe(ROAD_SURFACE_MATERIALS[kind].color)
    expect(style.surfaceSource).toEqual({ kind: 'mapped', tag })
  })
}

test('missing, general and unsupported materials are not mislabeled as mapped asphalt', () => {
  for (const tag of [undefined, 'paved', 'unpaved', 'concrete:lanes', 'asphalt;concrete', 'wood']) {
    const style = buildOsmRoadStyle(
      { highway: 'residential', ...(tag ? { surface: tag } : {}) },
      'local-street',
      false,
    )
    expect(osmSurfaceMaterial(tag)).toBeUndefined()
    expect(style.surfaceMaterial).toBeUndefined()
    expect(style.surfaceSource).toEqual({ kind: 'default', tag })
    expect(roadSurfaceDescription(style)).toContain(
      tag ? 'Unresolved surface' : 'Surface not mapped',
    )
  }
})

test('material and source survive road exchange without altering geometry', () => {
  const graph = insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [20, 0, 0]).graph
  graph.stylePresets['local-street'] = buildOsmRoadStyle(
    { highway: 'residential', surface: 'paving_stones' },
    'local-street',
    false,
  )
  const restored = importRoadNetworkGraph(exportRoadNetworkGraph(RoadNetworkNode.parse(graph)))
  expect(restored.stylePresets['local-street']!.surfaceSource).toEqual({
    kind: 'mapped',
    tag: 'paving_stones',
  })
  expect(restored.stylePresets['local-street']!.surfaceMaterial).toBe('paving-stones')
  expect(restored.graphNodes).toEqual(graph.graphNodes)
  const legacy = RoadNetworkNode.parse(
    insertRoadSegment(createEmptyRoadGraph(), [0, 0, 0], [20, 0, 0]).graph,
  )
  expect(legacy.stylePresets['local-street']!.surfaceMaterial).toBeUndefined()
})

test('road and junction textures use identical metre coordinates at seams and negative origins', () => {
  const road = roadSurfaceUvs([-22, 1, 47, -12, 1, 47])
  const junction = roadSurfaceUvs([3, 0, -3, 13, 0, -3], [-25, 1, 50])
  expect(junction).toEqual(road)
  expect(road[2]! - road[0]!).toBe(10)
})

test('textures are deterministic, opaque, shared and visibly distinct', () => {
  const materials = ['asphalt', 'concrete', 'paving-stones'] as const
  const images = materials.map((kind) => roadSurfaceTexturePixels(kind))
  expect(images[0]).not.toEqual(images[1])
  expect(images[1]).not.toEqual(images[2])
  for (const kind of materials) {
    const data = roadSurfaceTexturePixels(kind)
    expect(data).toEqual(roadSurfaceTexturePixels(kind))
    expect(data.length).toBe(128 * 128 * 4)
    expect(data.filter((_, i) => i % 4 === 3).every((value) => value === 255)).toBe(true)
    const texture = roadSurfaceTexture(kind)!
    expect(roadSurfaceTexture(kind)).toBe(texture)
    expect(texture.repeat.x).toBe(1 / ROAD_SURFACE_MATERIALS[kind].tileMeters)
    expect(texture.generateMipmaps).toBe(true)
  }
  expect(roadSurfaceTexture(undefined)).toBeNull()
})
