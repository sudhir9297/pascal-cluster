import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { AnyNode } from '@pascal-app/core'
import { CATALOG_LAMP_VARIANTS, getCatalogLampStyleOptions, isCatalogLampKind, LAMP_VISUAL_FAMILIES } from './catalog-lamp-config'
import { cobraHeadLightDefinition } from './cobra-head-light-definition'
import { resolveCobraHeadLightLayout } from './cobra-head-light-geometry'
import { multiHeadAreaLightDefinition } from './multi-head-area-light-definition'
import { areaHeadAngles, resolveMultiHeadAreaLightLayout } from './multi-head-area-light-geometry'
import { trussRoadwayLightDefinition } from './truss-roadway-light-definition'
import { resolveTrussRoadwayLightLayout } from './truss-roadway-light-geometry'
import { twinArmMedianLightDefinition } from './twin-arm-median-light-definition'
import { resolveTwinArmMedianLightLayout } from './twin-arm-median-light-geometry'
import { heritageCrookLightDefinition } from './heritage-crook-light-definition'
import {
  buildHeritageCrookCurves,
  resolveHeritageCrookLightLayout,
} from './heritage-crook-light-geometry'
import { environmentHostPanel, environmentPlugin } from './index'
import { postTopLightDefinition } from './post-top-light-definition'
import { resolvePostTopLightLayout } from './post-top-light-geometry'
import {
  CobraHeadLightNode,
  HeritageCrookLightNode,
  MultiHeadAreaLightNode,
  PedestrianPostLightNode,
  StreetLightNode,
  TrussRoadwayLightNode,
  TwinArmMedianLightNode,
  UtilityPoleNode,
  UtilityWireSpanNode,
  RoadSplineNode,
  RoadSignNode,
  createRoadSignNode,
  createRoadSignPreviewNode,
  ROAD_SIGN_PREVIEW_ID,
} from './schema'
import { useEnvironmentStore } from './store'
import {
  findNearestUtilityPoleForConnection,
  findUtilityPoleInlineInsertion,
  resolveUtilityPoleAutoConnect,
  resolveUtilityPolePlacementRotation,
  STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M,
  STANDARD_UTILITY_POLE_INLINE_INSERT_DISTANCE_M,
  utilityPoleCrossarmRotationY,
} from './utility-wire-auto-connect'
import { utilityWireDefinition } from './utility-wire-definition'
import { buildUtilityConductorCurves } from './utility-wire-geometry'
import { streetLightDefinition } from './street-light-definition'
import { resolveStreetLightLayout } from './street-light-geometry'
import { utilityPoleDefinition } from './utility-pole-definition'
import { roadSplineDefinition } from './road-spline-definition'
import {
  buildRoadSplineGeometry,
  sampleOffsetRoadCenterline,
  sampleRoadCenterline,
} from './road-spline-geometry'
import { buildRoadMarkingGeometries } from './road-spline-markings'
import { appendOrthogonalRoute } from './road-path'
import { findNearestRoadConnection, findRoadIntersections } from './road-connections'
import { buildRoadJunctionGeometries } from './road-junctions'
import { roadSurfaceRenderOrder } from './road-surface-render-order'
import { createRoadSurfaceTexture } from './road-surface-texture'
import { ROAD_SIGN_CATALOG, buildRoadSignGraphicSvg } from './road-sign-config'
import { roadSignDefinition } from './road-sign-definition'
import {
  buildRoadSignBackGeometry,
  buildRoadSignPlateGeometry,
  resolveRoadSignLayout,
  resolveRoadSignBracketWidth,
  resolveRoadSignPostPositions,
  ROAD_SIGN_BACK_FACE_GAP_M,
  ROAD_SIGN_FACE_GRAPHIC_GAP_M,
} from './road-sign-geometry'
import {
  resolveUtilityPoleLayout,
  STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M,
  STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M,
} from './utility-pole-geometry'

describe('Environment plugin manifest', () => {
  test('exports the stable plugin identity and node kinds', () => {
    expect(environmentPlugin.id).toBe('pascal:environment')
    expect(environmentPlugin.apiVersion).toBe(1)
    expect(environmentPlugin.nodes?.map((definition) => definition.kind)).toEqual([
      'environment:street-light',
      'environment:pedestrian-post-light',
      'environment:heritage-crook-light',
      'environment:cobra-head-light',
      'environment:twin-arm-median-light',
      'environment:multi-head-area-light',
      'environment:truss-roadway-light',
      'environment:high-mast-crown-light',
      'environment:shoebox-area-light',
      'environment:floodlight-pole',
      'environment:traditional-post-top-lantern',
      'environment:globe-post-top-light',
      'environment:decorative-candelabra-light',
      'environment:path-garden-light',
      'environment:bollard-light',
      'environment:catenary-street-light',
      'environment:wall-arm-light',
      'environment:wall-pack-light',
      'environment:tunnel-luminaire',
      'environment:canopy-soffit-light',
      'environment:solar-street-light',
      'environment:utility-pole',
      'environment:utility-wire-span',
      'environment:road-spline',
      'environment:road-sign',
    ])
  })

  test('associates the Environment panel with the plugin', () => {
    expect(environmentHostPanel.pluginId).toBe(environmentPlugin.id)
    expect(environmentHostPanel.defaultInstalled).toBe(true)
    expect(environmentHostPanel.pluginUrl).toBe(
      'https://github.com/pascalorg/plugin-environment',
    )
  })

  test('creates a street light with stable defaults', () => {
    const streetLight = StreetLightNode.parse({})
    expect(streetLight.type).toBe('environment:street-light')
    expect(streetLight.height).toBe(6)
    expect(streetLight.armLength).toBe(1.2)
    expect(streetLight.lightOn).toBe(false)
    expect(streetLight.intensity).toBe(1200)
    expect(() => StreetLightNode.parse({ height: 0.25 })).toThrow()
    expect(() => StreetLightNode.parse({ height: 31 })).toThrow()
  })

  test('registers placement, rendering, and floorplan support for street lights', () => {
    expect(streetLightDefinition.tool).toBeDefined()
    expect(streetLightDefinition.preview).toBeDefined()
    expect(streetLightDefinition.renderer).toBeDefined()
    expect(streetLightDefinition.floorplan).toBeDefined()
    expect(streetLightDefinition.handles).toHaveLength(3)
  })

  test('keeps the mast arm below the top face of the lamp housing', () => {
    const layout = resolveStreetLightLayout(StreetLightNode.parse({}))
    expect(layout.armEndY + layout.armRadius).toBeLessThan(layout.fixtureTopY)
  })

  test('creates an off pedestrian post-top light with stable defaults', () => {
    const postTopLight = PedestrianPostLightNode.parse({})
    expect(postTopLight.type).toBe('environment:pedestrian-post-light')
    expect(postTopLight.height).toBe(6)
    expect(postTopLight.lightOn).toBe(false)
    expect(postTopLight.intensity).toBe(650)
    expect(() => PedestrianPostLightNode.parse({ height: 0.25 })).toThrow()
    expect(() => PedestrianPostLightNode.parse({ height: 31 })).toThrow()
  })

  test('registers the pedestrian post-top model and keeps its head above its pole', () => {
    expect(postTopLightDefinition.tool).toBeDefined()
    expect(postTopLightDefinition.preview).toBeDefined()
    expect(postTopLightDefinition.renderer).toBeDefined()
    expect(postTopLightDefinition.floorplan).toBeDefined()
    expect(postTopLightDefinition.handles).toHaveLength(2)
    const layout = resolvePostTopLightLayout(PedestrianPostLightNode.parse({}))
    expect(layout.neckTopY).toBeGreaterThan(layout.poleTopY)
    expect(layout.lensY).toBeGreaterThan(layout.poleTopY)
    expect(layout.capCenterY + layout.capHeight / 2).toBeCloseTo(layout.height)
  })

  test("creates an off heritage Bishop's Crook lamp with stable defaults", () => {
    const crookLight = HeritageCrookLightNode.parse({})
    expect(crookLight.type).toBe('environment:heritage-crook-light')
    expect(crookLight.height).toBe(6)
    expect(crookLight.armReach).toBe(0.9)
    expect(crookLight.lightOn).toBe(false)
    expect(crookLight.intensity).toBe(750)
    expect(() => HeritageCrookLightNode.parse({ armReach: 0.4 })).toThrow()
    expect(() => HeritageCrookLightNode.parse({ height: 31 })).toThrow()
  })

  test('registers the heritage crook model and hangs its lamp below the arm', () => {
    expect(heritageCrookLightDefinition.tool).toBeDefined()
    expect(heritageCrookLightDefinition.preview).toBeDefined()
    expect(heritageCrookLightDefinition.renderer).toBeDefined()
    expect(heritageCrookLightDefinition.floorplan).toBeDefined()
    expect(heritageCrookLightDefinition.handles).toHaveLength(3)
    const layout = resolveHeritageCrookLightLayout(HeritageCrookLightNode.parse({}))
    expect(layout.armEndY).toBeGreaterThan(layout.lampCenterY)
    expect(layout.straightPoleTopY).toBeLessThan(layout.height)
    expect(layout.armReach).toBe(0.9)
  })

  test('creates an off cobra-head roadway lamp with stable defaults', () => {
    const cobraHead = CobraHeadLightNode.parse({})
    expect(cobraHead.type).toBe('environment:cobra-head-light')
    expect(cobraHead.height).toBe(6)
    expect(cobraHead.armLength).toBe(1.25)
    expect(cobraHead.lightOn).toBe(false)
    expect(cobraHead.intensity).toBe(1400)
    expect(() => CobraHeadLightNode.parse({ armLength: 0.4 })).toThrow()
    expect(() => CobraHeadLightNode.parse({ height: 31 })).toThrow()
  })

  test('registers the cobra-head model with a straight mast arm below the housing', () => {
    expect(cobraHeadLightDefinition.tool).toBeDefined()
    expect(cobraHeadLightDefinition.preview).toBeDefined()
    expect(cobraHeadLightDefinition.renderer).toBeDefined()
    expect(cobraHeadLightDefinition.floorplan).toBeDefined()
    expect(cobraHeadLightDefinition.handles).toHaveLength(3)
    const layout = resolveCobraHeadLightLayout(CobraHeadLightNode.parse({}))
    expect(layout.armY).toBeGreaterThan(layout.poleTopY)
    expect(layout.fixtureTopY).toBeGreaterThan(layout.armY)
    expect(layout.fixtureLength).toBeGreaterThan(0.8)
  })

  test('creates an off twin-arm median lamp with stable defaults', () => {
    const twinArm = TwinArmMedianLightNode.parse({})
    expect(twinArm.type).toBe('environment:twin-arm-median-light')
    expect(twinArm.height).toBe(6)
    expect(twinArm.armLength).toBe(1.35)
    expect(twinArm.lightOn).toBe(false)
    expect(twinArm.intensity).toBe(1400)
    expect(() => TwinArmMedianLightNode.parse({ armLength: 0.4 })).toThrow()
    expect(() => TwinArmMedianLightNode.parse({ height: 31 })).toThrow()
  })

  test('registers the twin-arm median model with two opposing fixture spans', () => {
    expect(twinArmMedianLightDefinition.tool).toBeDefined()
    expect(twinArmMedianLightDefinition.preview).toBeDefined()
    expect(twinArmMedianLightDefinition.renderer).toBeDefined()
    expect(twinArmMedianLightDefinition.floorplan).toBeDefined()
    expect(twinArmMedianLightDefinition.handles).toHaveLength(3)
    const layout = resolveTwinArmMedianLightLayout(TwinArmMedianLightNode.parse({}))
    expect(layout.armLength).toBe(1.35)
    expect(layout.fixtureStartX + layout.fixtureLength).toBeGreaterThan(layout.armLength)
  })

  test('creates an off four-head area pole with stable defaults', () => {
    const areaLight = MultiHeadAreaLightNode.parse({})
    expect(areaLight.type).toBe('environment:multi-head-area-light')
    expect(areaLight.height).toBe(6)
    expect(areaLight.armLength).toBe(1.2)
    expect(areaLight.headCount).toBe(4)
    expect(areaLight.lightOn).toBe(false)
    expect(() => MultiHeadAreaLightNode.parse({ headCount: 2 })).toThrow()
    expect(() => MultiHeadAreaLightNode.parse({ headCount: 5 })).toThrow()
  })

  test('registers the area pole with three- and four-head radial layouts', () => {
    expect(multiHeadAreaLightDefinition.tool).toBeDefined()
    expect(multiHeadAreaLightDefinition.preview).toBeDefined()
    expect(multiHeadAreaLightDefinition.renderer).toBeDefined()
    expect(multiHeadAreaLightDefinition.floorplan).toBeDefined()
    expect(multiHeadAreaLightDefinition.handles).toHaveLength(3)
    const layout = resolveMultiHeadAreaLightLayout(MultiHeadAreaLightNode.parse({}))
    expect(areaHeadAngles(3)).toHaveLength(3)
    expect(areaHeadAngles(4)).toHaveLength(4)
    expect(layout.fixtureStartX + layout.fixtureLength).toBeGreaterThan(layout.armLength)
  })

  test('creates an off truss roadway lamp with stable defaults', () => {
    const trussLight = TrussRoadwayLightNode.parse({})
    expect(trussLight.type).toBe('environment:truss-roadway-light')
    expect(trussLight.height).toBe(6)
    expect(trussLight.armLength).toBe(1.6)
    expect(trussLight.braceDepth).toBe(0.7)
    expect(trussLight.lightOn).toBe(false)
    expect(() => TrussRoadwayLightNode.parse({ braceDepth: 0.2 })).toThrow()
    expect(() => TrussRoadwayLightNode.parse({ armLength: 3.6 })).toThrow()
  })

  test('registers the truss roadway model with a braced outreach', () => {
    expect(trussRoadwayLightDefinition.tool).toBeDefined()
    expect(trussRoadwayLightDefinition.preview).toBeDefined()
    expect(trussRoadwayLightDefinition.renderer).toBeDefined()
    expect(trussRoadwayLightDefinition.floorplan).toBeDefined()
    expect(trussRoadwayLightDefinition.handles).toHaveLength(3)
    const layout = resolveTrussRoadwayLightLayout(TrussRoadwayLightNode.parse({}))
    expect(layout.braceDepth).toBe(0.7)
    expect(layout.fixtureStartX + layout.fixtureLength).toBeGreaterThan(layout.armLength)
  })

  test('registers every remaining lamp archetype with off-by-default placement support', () => {
    for (const variant of CATALOG_LAMP_VARIANTS) {
      const node = variant.schema.parse({})
      expect(node.type).toBe(variant.kind)
      expect(node.lightOn).toBe(false)
      const definition = environmentPlugin.nodes?.find((candidate) => candidate.kind === variant.kind)
      expect(definition?.tool).toBeDefined()
      expect(definition?.preview).toBeDefined()
      expect(definition?.renderer).toBeDefined()
      expect(definition?.floorplan).toBeDefined()
    }
  })

  test('keeps every lamp archetype on the shared six-metre height contract', () => {
    const nodes = [
      StreetLightNode.parse({}),
      PedestrianPostLightNode.parse({}),
      HeritageCrookLightNode.parse({}),
      CobraHeadLightNode.parse({}),
      TwinArmMedianLightNode.parse({}),
      MultiHeadAreaLightNode.parse({}),
      TrussRoadwayLightNode.parse({}),
      ...CATALOG_LAMP_VARIANTS.map((variant) => variant.schema.parse({})),
    ]
    for (const node of nodes) {
      expect(node.height).toBe(6)
    }
    expect(() => StreetLightNode.parse({ height: 0.49 })).toThrow()
    expect(() => CATALOG_LAMP_VARIANTS[0].schema.parse({ height: 30.1 })).toThrow()
  })

  test('groups similar silhouettes behind shared side-menu style families', () => {
    expect(LAMP_VISUAL_FAMILIES.map((family) => family.id)).toEqual([
      'roadway-head',
      'post-top',
      'path-scale',
      'structure-mounted',
    ])
    expect(getCatalogLampStyleOptions('environment:shoebox-area-light').map((option) => option.value)).toContain('floodlight')
    expect(getCatalogLampStyleOptions('environment:traditional-post-top-lantern').map((option) => option.value)).toContain('globe')
    expect(getCatalogLampStyleOptions('environment:wall-pack-light').map((option) => option.value)).toContain('wall-arm')
  })

  test('removes the in-ground uplight from the catalog and registry', () => {
    expect(CATALOG_LAMP_VARIANTS.some((variant) => (variant.kind as string) === 'environment:in-ground-uplight')).toBe(false)
    expect(isCatalogLampKind('environment:in-ground-uplight')).toBe(false)
    expect(environmentPlugin.nodes?.some((definition) => definition.kind === 'environment:in-ground-uplight')).toBe(false)
  })

  test('keeps the heritage crook smooth and joins its decorative brace', () => {
    const layout = resolveHeritageCrookLightLayout(HeritageCrookLightNode.parse({}))
    const { crookCurve, braceCurve } = buildHeritageCrookCurves(layout)
    const endTangent = crookCurve.getTangent(1)
    expect(Math.abs(endTangent.x)).toBeLessThan(0.05)
    expect(endTangent.y).toBeLessThan(-0.99)

    const braceEnd = braceCurve.getPoint(1)
    let braceGap = Number.POSITIVE_INFINITY
    for (let index = 0; index <= 200; index += 1) {
      braceGap = Math.min(
        braceGap,
        braceEnd.distanceTo(crookCurve.getPoint(index / 200)),
      )
    }
    expect(braceGap).toBeLessThan(0.01)

    let maxTangentStep = 0
    for (let index = 0; index < 64; index += 1) {
      maxTangentStep = Math.max(
        maxTangentStep,
        crookCurve
          .getTangent(index / 64)
          .angleTo(crookCurve.getTangent((index + 1) / 64)),
      )
    }
    expect(maxTangentStep).toBeLessThan(0.09)
  })

  test('creates a utility pole with stable defaults', () => {
    const utilityPole = UtilityPoleNode.parse({})
    expect(utilityPole.type).toBe('environment:utility-pole')
    expect(utilityPole.height).toBe(STANDARD_UTILITY_POLE_EXPOSED_HEIGHT_M)
    expect(utilityPole.crossarmLength).toBe(STANDARD_UTILITY_POLE_CROSSARM_LENGTH_M)
    expect(utilityPole.assembly).toBe('tangent')
    expect(utilityPole.transformerMounted).toBe(true)
    expect(() => UtilityPoleNode.parse({ height: 5.9 })).toThrow()
    expect(() => UtilityPoleNode.parse({ crossarmLength: 4.6 })).toThrow()
  })

  test('registers placement, rendering, and floorplan support for utility poles', () => {
    expect(utilityPoleDefinition.tool).toBeDefined()
    expect(utilityPoleDefinition.preview).toBeDefined()
    expect(utilityPoleDefinition.renderer).toBeDefined()
    expect(utilityPoleDefinition.floorplan).toBeDefined()
    expect(utilityPoleDefinition.handles).toHaveLength(3)
  })

  test('exposes stable primary and neutral conductor attachment points', () => {
    const layout = resolveUtilityPoleLayout(UtilityPoleNode.parse({}))
    expect(layout.wireAttachments.map((attachment) => attachment.id)).toEqual([
      'phase-left',
      'phase-center',
      'phase-right',
      'neutral',
    ])
    expect(layout.wireAttachments[1]?.position[1]).toBeGreaterThan(
      layout.wireAttachments[0]?.position[1] ?? 0,
    )
    expect(layout.wireAttachments[3]?.position[1]).toBeLessThan(
      layout.wireAttachments[0]?.position[1] ?? 0,
    )
  })

  test('uses the visible height of a standard installed 35-foot residential pole', () => {
    const layout = resolveUtilityPoleLayout(UtilityPoleNode.parse({}))
    expect(layout.height).toBeCloseTo(8.9916, 4)
    expect(layout.crossarmLength).toBeCloseTo(2.4384, 4)
    expect(layout.poleBottomRadius * 2).toBeLessThan(0.4)
  })

  test('migrates only untouched 40-foot v1 pole defaults to the residential height', () => {
    const migrate = utilityPoleDefinition.migrate?.[1]
    expect(migrate?.({ height: 10.3632 })).toEqual({ height: 8.9916 })
    expect(migrate?.({ height: 12 })).toEqual({ height: 12 })
    expect(utilityPoleDefinition.migrate?.[2]?.({ height: 9 })).toEqual({
      height: 9,
      assembly: 'tangent',
    })
    expect(utilityPoleDefinition.migrate?.[2]?.({ assembly: 'dead-end' })).toEqual({
      assembly: 'dead-end',
    })
  })

  test('supports single and continuous environment placement modes', () => {
    expect(useEnvironmentStore.getState().placementMode).toBe('continuous')
    useEnvironmentStore.getState().setPlacementMode('single')
    expect(useEnvironmentStore.getState().placementMode).toBe('single')
    useEnvironmentStore.getState().setPlacementMode('continuous')
  })

  test('separates lighting and utility assets into panel categories', () => {
    expect(useEnvironmentStore.getState().panelCategory).toBe('lighting')
    useEnvironmentStore.getState().setPanelCategory('roads')
    expect(useEnvironmentStore.getState().panelCategory).toBe('roads')
    useEnvironmentStore.getState().setRoadWidth(9)
    expect(useEnvironmentStore.getState().roadWidth).toBe(9)
    useEnvironmentStore.getState().setPanelCategory('utilities')
    expect(useEnvironmentStore.getState().panelCategory).toBe('utilities')
    useEnvironmentStore.getState().setPanelCategory('lighting')
    expect(useEnvironmentStore.getState().postTopLightOn).toBe(false)
    expect(useEnvironmentStore.getState().heritageCrookLightOn).toBe(false)
    expect(useEnvironmentStore.getState().cobraHeadLightOn).toBe(false)
    expect(useEnvironmentStore.getState().twinArmMedianLightOn).toBe(false)
    expect(useEnvironmentStore.getState().multiHeadAreaLightOn).toBe(false)
    expect(useEnvironmentStore.getState().trussRoadwayLightOn).toBe(false)
    useEnvironmentStore.getState().setRoadWidth(7)
  })

  test('creates a road spline with stable defaults and smooth samples', () => {
    const road = RoadSplineNode.parse({})
    expect(road.type).toBe('environment:road-spline')
    expect(road.pathMode).toBe('spline')
    expect(road.points).toEqual([
      [0, 0],
      [12, 0],
    ])
    expect(road.width).toBe(7)
    expect(road.laneCount).toBe(2)
    expect(road.centerLineStyle).toBe('double')
    expect(road.edgeLines).toBe(true)
    expect(sampleRoadCenterline([[0, 0], [10, 0], [10, 10]])[0]).toEqual([0, 0])
    expect(sampleRoadCenterline([[0, 0], [10, 0], [10, 10]]).at(-1)).toEqual([10, 10])
    const geometry = buildRoadSplineGeometry(
      RoadSplineNode.parse({ points: [[0, 0], [10, 0], [10, 10]] }),
    )
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    geometry.dispose()
    const markings = buildRoadMarkingGeometries(road)
    expect(markings.map(({ id }) => id)).toEqual([
      'center-left',
      'center-right',
      'edge-left',
      'edge-right',
    ])
    markings.forEach(({ geometry: markingGeometry }) => {
      const normals = markingGeometry.getAttribute('normal')
      expect(normals.count).toBeGreaterThan(0)
      expect(normals.getY(0)).toBeGreaterThan(0)
    })
    markings.forEach(({ geometry: markingGeometry }) => markingGeometry.dispose())
    const texture = createRoadSurfaceTexture()
    expect(texture.image.width).toBeGreaterThan(0)
    texture.dispose()
  })

  test('routes straight and L-shaped roads with mitered joins', () => {
    expect(appendOrthogonalRoute([[0, 0]], [12, 0])).toEqual([[12, 0]])
    expect(appendOrthogonalRoute([[0, 0]], [12, 5])).toEqual([[12, 0], [12, 5]])

    const road = RoadSplineNode.parse({
      centerLineStyle: 'none',
      pathMode: 'orthogonal',
      points: [[0, 0], [8, 0], [8, 8]],
    })
    const geometry = buildRoadSplineGeometry(road)
    const positions = geometry.getAttribute('position')
    expect(positions.count).toBe(12)
    expect(positions.getX(4)).toBeCloseTo(4.5)
    expect(positions.getZ(4)).toBeCloseTo(3.5)
    expect(positions.getX(5)).toBeCloseTo(11.5)
    expect(positions.getZ(5)).toBeCloseTo(-3.5)
    geometry.dispose()

    const markings = buildRoadMarkingGeometries(road).find(({ id }) => id === 'edge-left')
    expect(markings?.geometry.getAttribute('position').count).toBeGreaterThan(6)
    expect(markings?.geometry.getIndex()?.count).toBeGreaterThan(12)
    markings?.geometry.dispose()
  })

  test('snaps nearby road drawing points to existing road centerlines', () => {
    const existing = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      position: [10, 0, 5],
      points: [[0, 0], [12, 0]],
    })
    const connection = findNearestRoadConnection([16.8, 5.9], [existing], 1.5)
    expect(connection).not.toBeNull()
    expect(connection?.point).toEqual([16.8, 5])
    expect(connection?.distance).toBeCloseTo(0.9)
    expect(connection?.nodeId).toBe(existing.id)
  })

  test('finds crossing roads even when no point is clicked at the crossing', () => {
    const source = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      position: [0, 0, 6],
      points: [[0, 0], [12, 0]],
    })
    const existing = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      position: [6, 0, 0],
      points: [[0, 0], [0, 12]],
    })
    const intersections = findRoadIntersections(source, [existing])
    expect(intersections).toHaveLength(1)
    expect(intersections[0]?.nodeId).toBe(existing.id)
    expect(intersections[0]?.worldPoint).toEqual([6, 6])
  })

  test('does not render a circular overlay for an L-corner T branch', () => {
    const road = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      points: [[0, 0], [12, 0], [12, 12]],
      junctions: [[12, 0]],
    })
    expect(buildRoadJunctionGeometries(road)).toHaveLength(0)
  })

  test('orders coplanar road surfaces deterministically', () => {
    const first = roadSurfaceRenderOrder('road-spline-a')
    const second = roadSurfaceRenderOrder('road-spline-b')
    expect(first).not.toBe(second)
    expect(first).toBeLessThan(0)
    expect(second).toBeLessThan(0)
  })

  test('keeps orthogonal T, plus, and J/U road surfaces free of shadow artifacts', () => {
    const combinations = [
      [
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          junctions: [[12, 0]],
          points: [[0, 0], [12, 0], [12, 12]],
        }),
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          junctions: [[0, 0]],
          points: [[0, 0], [0, 10]],
          position: [12, 0, 0],
        }),
      ],
      [
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          points: [[-12, 0], [12, 0]],
        }),
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          points: [[0, -12], [0, 12]],
        }),
      ],
      [RoadSplineNode.parse({
        pathMode: 'orthogonal',
        points: [[-8, -12], [-8, 0], [8, 0], [8, -12]],
      })],
    ]

    for (const roads of combinations) {
      for (const road of roads) {
        const geometry = buildRoadSplineGeometry(road)
        const position = geometry.getAttribute('position')
        const index = geometry.getIndex()
        expect(index).toBeDefined()
        for (let triangle = 0; triangle < index!.count; triangle += 3) {
          const a = index!.getX(triangle)
          const b = index!.getX(triangle + 1)
          const c = index!.getX(triangle + 2)
          if (
            Math.abs(position.getY(a) - road.thickness) > 0.000001 ||
            Math.abs(position.getY(b) - road.thickness) > 0.000001 ||
            Math.abs(position.getY(c) - road.thickness) > 0.000001
          ) continue
          const abX = position.getX(b) - position.getX(a)
          const abZ = position.getZ(b) - position.getZ(a)
          const acX = position.getX(c) - position.getX(a)
          const acZ = position.getZ(c) - position.getZ(a)
          expect(abX * acZ - abZ * acX).toBeGreaterThan(0.000001)
        }
        geometry.dispose()
      }
    }

    const modelSource = readFileSync(new URL('./road-spline-model.tsx', import.meta.url), 'utf8')
    expect(modelSource).toContain('castShadow={false}')
    expect(modelSource).toContain('receiveShadow={false}')
  })

  test('keeps a T branch anchored to the exact corner of an L road', () => {
    const lRoad = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      points: [[0, 0], [12, 0], [12, 12]],
    })
    const connection = findNearestRoadConnection([12, 0], [lRoad], 0.1)
    expect(connection?.point).toEqual([12, 0])

    const branch = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      position: [12, 0, 0],
      junctions: [[0, 0]],
      points: [[0, 0], [0, 8]],
    })
    const geometry = buildRoadSplineGeometry(branch)
    const positions = geometry.getAttribute('position')
    for (let index = 0; index < positions.count; index += 1) {
      expect(Number.isFinite(positions.getX(index))).toBe(true)
      expect(Number.isFinite(positions.getZ(index))).toBe(true)
    }
    geometry.dispose()
  })

  test('removes the snapped T branch cap after orthogonal elbow routing', () => {
    const branch = RoadSplineNode.parse({
      pathMode: 'orthogonal',
      junctions: [[0, 0]],
      points: [[0, 0], [8, 0], [8, 8]],
    })
    const geometry = buildRoadSplineGeometry(branch)
    const positions = geometry.getAttribute('position')
    const index = geometry.getIndex()
    let startCapTriangles = 0

    for (let triangle = 0; triangle < (index?.count ?? 0); triangle += 3) {
      const ids = [
        index!.getX(triangle),
        index!.getX(triangle + 1),
        index!.getX(triangle + 2),
      ]
      const isStartCap = ids.every((id) => Math.abs(positions.getX(id)) < 0.000001)
      const spansThickness = ids.some((id) => Math.abs(positions.getY(id)) < 0.000001)
        && ids.some((id) => Math.abs(positions.getY(id) - branch.thickness) < 0.000001)
      if (isStartCap && spansThickness) startCapTriangles += 1
    }

    expect(startCapTriangles).toBe(0)
    geometry.dispose()
  })

  test('keeps T, plus, and J orthogonal footprints topologically clean', () => {
    const roads = [
      [
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          points: [[0, 0], [12, 0], [12, 12]],
          junctions: [[12, 0]],
        }),
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          position: [12, 0, 0],
          points: [[0, 0], [8, 0], [8, 8]],
          junctions: [[0, 0]],
        }),
      ],
      [
        RoadSplineNode.parse({ pathMode: 'orthogonal', points: [[-12, 0], [12, 0]] }),
        RoadSplineNode.parse({ pathMode: 'orthogonal', points: [[0, -12], [0, 12]] }),
      ],
      [
        RoadSplineNode.parse({
          pathMode: 'orthogonal',
          points: [[0, 0], [0, 12], [12, 12], [12, 0]],
        }),
      ],
    ]

    const isCovered = (nodes: readonly RoadSplineNode[], worldPoint: [number, number]): boolean => {
      return nodes.some((node) => {
        const geometry = buildRoadSplineGeometry(node)
        const positions = geometry.getAttribute('position')
        const index = geometry.getIndex()!
        const offsetX = node.position?.[0] ?? 0
        const offsetZ = node.position?.[2] ?? 0
        const point: [number, number] = [worldPoint[0] - offsetX, worldPoint[1] - offsetZ]
        let covered = false

        for (let triangle = 0; triangle < index.count && !covered; triangle += 3) {
          const ids = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)]
          if (!ids.every((id) => Math.abs(positions.getY(id) - node.thickness) < 0.000001)) continue
          const points = ids.map((id) => [positions.getX(id), positions.getZ(id)] as [number, number])
          const cross = (a: [number, number], b: [number, number], c: [number, number]) =>
            (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
          const signs = [
            cross(points[0]!, points[1]!, point),
            cross(points[1]!, points[2]!, point),
            cross(points[2]!, points[0]!, point),
          ]
          covered = signs.every((sign) => sign >= -0.000001) || signs.every((sign) => sign <= 0.000001)
        }

        geometry.dispose()
        return covered
      })
    }

    expect(isCovered(roads[0]!, [12, 0])).toBe(true)
    expect(isCovered(roads[1]!, [0, 0])).toBe(true)
    expect(isCovered(roads[2]!, [6, 10])).toBe(true)
    expect(isCovered(roads[2]!, [6, 4])).toBe(false)
  })

  test('keeps orthogonal road triangles local around retraced connected branches', () => {
    const paths = [
      [[0, 0], [30, 0], [30, 30]],
      [[0, 0], [30, 0], [30, 30], [0, 30]],
      [[0, 0], [30, 0], [30, 30], [0, 30], [0, 0], [-30, 0]],
    ]

    for (const points of paths) {
      const road = RoadSplineNode.parse({
        centerLineStyle: 'none',
        pathMode: 'orthogonal',
        points,
      })
      const geometry = buildRoadSplineGeometry(road)
      const position = geometry.getAttribute('position')
      const index = geometry.getIndex()!
      let topTriangles = 0

      for (let triangle = 0; triangle < index.count; triangle += 3) {
        const ids = [index.getX(triangle), index.getX(triangle + 1), index.getX(triangle + 2)]
        if (!ids.every((id) => Math.abs(position.getY(id) - road.thickness) < 0.000001)) continue
        topTriangles += 1
        const edgeLengths = [
          [ids[0]!, ids[1]!],
          [ids[1]!, ids[2]!],
          [ids[2]!, ids[0]!],
        ].map(([first, second]) => Math.hypot(
          position.getX(first!) - position.getX(second!),
          position.getZ(first!) - position.getZ(second!),
        ))
        expect(Math.max(...edgeLengths)).toBeLessThan(40)
      }

      expect(topTriangles).toBeGreaterThan(0)
      geometry.dispose()
    }
  })

  test('renders a shared asphalt junction and clears markings through it', () => {
    const road = RoadSplineNode.parse({
      centerLineStyle: 'double',
      junctions: [[12, 0]],
      pathMode: 'orthogonal',
      points: [[0, 0], [12, 0], [12, 12]],
    })
    const edge = buildRoadMarkingGeometries(road).find(({ id }) => id === 'edge-left')
    const fullIndexCount = (edge?.geometry.getAttribute('position').count ?? 0) / 2 * 6 - 6
    expect(edge?.geometry.getIndex()?.count).toBeGreaterThan(0)
    expect(edge?.geometry.getIndex()?.count).toBeLessThan(fullIndexCount)
    edge?.geometry.dispose()
  })

  test('keeps markings on legacy road nodes missing the marking fields', () => {
    const legacyRoad = {
      ...RoadSplineNode.parse({ points: [[0, 0], [12, 0]] }),
      laneCount: undefined,
      centerLineStyle: undefined,
      edgeLines: undefined,
    } as unknown as RoadSplineNode
    const markings = buildRoadMarkingGeometries(legacyRoad)
    expect(markings.length).toBeGreaterThan(0)
    markings.forEach(({ geometry }) => geometry.dispose())
  })

  test('keeps solid edge markings connected around curves', () => {
    const road = RoadSplineNode.parse({
      centerLineStyle: 'none',
      points: [[0, 0], [8, 0], [8, 8], [16, 8]],
    })
    const edge = buildRoadMarkingGeometries(road).find(({ id }) => id === 'edge-left')
    expect(edge).toBeDefined()
    const positions = edge!.geometry.getAttribute('position')
    const index = edge!.geometry.getIndex()
    expect(index).toBeDefined()
    const segmentCount = index!.count / 6
    expect(positions.count).toBe((segmentCount + 1) * 2)

    for (let triangle = 0; triangle < index!.count; triangle += 3) {
      const a = index!.getX(triangle)
      const b = index!.getX(triangle + 1)
      const c = index!.getX(triangle + 2)
      const abX = positions.getX(b) - positions.getX(a)
      const abZ = positions.getZ(b) - positions.getZ(a)
      const acX = positions.getX(c) - positions.getX(a)
      const acZ = positions.getZ(c) - positions.getZ(a)
      expect(abZ * acX - abX * acZ).toBeGreaterThan(0.000001)
    }

    const roadGeometry = buildRoadSplineGeometry(road)
    const roadRingCount = roadGeometry.getAttribute('position').count / 4
    expect(roadRingCount).toBeGreaterThanOrEqual(positions.count / 2)
    roadGeometry.dispose()

    edge!.geometry.dispose()
  })

  test('keeps spline boundaries finite and smooth through gentle and tight curves', () => {
    const points: Array<[number, number]> = [[0, 0], [5, -2], [11, 1], [16, 8]]
    const centerline = sampleRoadCenterline(points, 128)
    const leftBoundary = sampleOffsetRoadCenterline(points, 3.5, 128)
    const rightBoundary = sampleOffsetRoadCenterline(points, -3.5, 128)

    expect(leftBoundary).toHaveLength(centerline.length)
    for (const boundary of [leftBoundary, rightBoundary]) {
      boundary.forEach(([x, z], index) => {
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(z)).toBe(true)
        const [centerX, centerZ] = centerline[index]!
        expect(Math.hypot(x - centerX, z - centerZ)).toBeLessThanOrEqual(3.501)
      })
    }

    for (let index = 1; index < leftBoundary.length - 1; index += 1) {
      const previous = leftBoundary[index - 1]!
      const current = leftBoundary[index]!
      const next = leftBoundary[index + 1]!
      const incoming: [number, number] = [current[0] - previous[0], current[1] - previous[1]]
      const outgoing: [number, number] = [next[0] - current[0], next[1] - current[1]]
      const incomingLength = Math.hypot(...incoming)
      const outgoingLength = Math.hypot(...outgoing)
      expect((incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (incomingLength * outgoingLength))
        .toBeGreaterThan(0.75)
    }
  })

  test('keeps spline edge markings aligned with the sampled road boundary', () => {
    const road = RoadSplineNode.parse({
      centerLineStyle: 'double',
      points: [[0, 0], [5, -2], [11, 1], [16, 8]],
    })
    const roadGeometry = buildRoadSplineGeometry(road)
    const roadPositions = roadGeometry.getAttribute('position')
    const edge = buildRoadMarkingGeometries(road).find(({ id }) => id === 'edge-left')
    expect(edge).toBeDefined()

    const markingPositions = edge!.geometry.getAttribute('position')
    expect(markingPositions.count / 2).toBe(roadPositions.count / 4)
    for (let index = 0; index < markingPositions.count; index += 2) {
      const markingX = markingPositions.getX(index)
      const markingZ = markingPositions.getZ(index)
      const ring = index / 2
      const leftX = roadPositions.getX(ring * 4)
      const leftZ = roadPositions.getZ(ring * 4)
      const rightX = roadPositions.getX(ring * 4 + 1)
      const rightZ = roadPositions.getZ(ring * 4 + 1)
      const distanceToBoundary = Math.min(
        Math.hypot(markingX - leftX, markingZ - leftZ),
        Math.hypot(markingX - rightX, markingZ - rightZ),
      )
      expect(distanceToBoundary).toBeLessThan(0.35)
    }

    edge!.geometry.dispose()
    roadGeometry.dispose()
  })

  test('registers road spline placement, rendering, and floorplan support', () => {
    expect(roadSplineDefinition.tool).toBeDefined()
    expect(roadSplineDefinition.preview).toBeDefined()
    expect(roadSplineDefinition.renderer).toBeDefined()
    expect(roadSplineDefinition.floorplan).toBeDefined()
  })

  test('creates catalog-driven road signs with stable mounting defaults', () => {
    const sign = RoadSignNode.parse({})
    expect(sign.type).toBe('environment:road-sign')
    expect(sign.signId).toBe('stop')
    expect(sign.postHeight).toBe(2.1)
    expect(sign.mounting).toBe('single-post')
    expect(ROAD_SIGN_CATALOG).toHaveLength(8)
    const stop = ROAD_SIGN_CATALOG.find(({ id }) => id === 'stop')
    expect(stop?.width).toBeCloseTo(0.762)
    expect(stop?.postStyle).toBe('u-channel')
    expect(() => RoadSignNode.parse({ scale: 0.2 })).toThrow()
    expect(() => RoadSignNode.parse({ postHeight: 5 })).toThrow()
  })

  test('creates every catalog sign with a fresh persistent ID', () => {
    const occupiedIds = new Set<string>()
    const placed = ROAD_SIGN_CATALOG.map((entry) => {
      const sign = createRoadSignNode({ signId: entry.id }, occupiedIds)
      occupiedIds.add(sign.id)
      return sign
    })

    expect(new Set(placed.map((sign) => sign.id)).size).toBe(ROAD_SIGN_CATALOG.length)
    expect(placed.every((sign) => /^road-sign_[0-9a-z]{16}$/.test(sign.id))).toBe(true)

    const duplicateInput = createRoadSignNode({ id: placed[0]!.id, signId: 'stop' }, occupiedIds)
    expect(duplicateInput.id).not.toBe(placed[0]!.id)
    expect(occupiedIds.has(duplicateInput.id)).toBe(false)
  })

  test('keeps the placement preview out of the persistent sign ID space', () => {
    const preview = createRoadSignPreviewNode({ signId: 'warning' })
    expect(preview.id).toBe(ROAD_SIGN_PREVIEW_ID)
    expect(preview.id).not.toMatch(/^road-sign_[0-9a-z]{16}$/)
  })

  test('registers road sign placement, rendering, inspector, and floorplan support', () => {
    expect(roadSignDefinition.tool).toBeDefined()
    expect(roadSignDefinition.preview).toBeDefined()
    expect(roadSignDefinition.renderer).toBeDefined()
    expect(roadSignDefinition.floorplan).toBeDefined()
    expect(roadSignDefinition.handles).toHaveLength(3)
    const layout = resolveRoadSignLayout(RoadSignNode.parse({ signId: 'pedestrian-crossing' }))
    expect(layout.signCenterY).toBeGreaterThan(layout.postHeight)
    expect(layout.postCount).toBe(1)
    expect(layout.postStyle).toBe('u-channel')
    const doublePost = resolveRoadSignLayout(
      RoadSignNode.parse({ signId: 'directional', mounting: 'double-post' }),
    )
    expect(doublePost.postCount).toBe(2)
    expect(doublePost.postSpacing).toBeGreaterThan(0)
    const geometry = buildRoadSignPlateGeometry(doublePost)
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    geometry.dispose()
  })

  test('keeps sign graphics vector-based and safely escapes custom text', () => {
    const svg = buildRoadSignGraphicSvg({ signId: 'directional', text: '<MAIN & 2nd>' })
    expect(svg).toContain('MAIN &amp; 2nd')
    expect(svg).not.toContain('<MAIN & 2nd>')
    expect(svg).toContain('<svg')
    expect(svg).toContain('MAIN &amp; 2nd')
  })

  test('keeps circular graphic strokes inside their texture bounds', () => {
    for (const entry of ROAD_SIGN_CATALOG.filter(({ shape }) => shape === 'circle')) {
      const svg = buildRoadSignGraphicSvg({ signId: entry.id })
      const circle = svg.match(/<circle[^>]*r="([0-9.]+)"[^>]*stroke-width="([0-9.]+)"/)
      expect(circle).not.toBeNull()

      const radius = Number(circle![1])
      const strokeWidth = Number(circle![2])
      expect(radius + strokeWidth / 2).toBeLessThanOrEqual(Math.min(entry.width, entry.height) / 2)
    }
  })

  test('keeps diamond graphic strokes inside their texture bounds', () => {
    for (const entry of ROAD_SIGN_CATALOG.filter(({ shape }) => shape === 'diamond')) {
      const svg = buildRoadSignGraphicSvg({ signId: entry.id })
      const polygon = svg.match(
        /<polygon points="([^"]+)"[^>]*stroke="[^"]+"[^>]*stroke-width="([0-9.]+)"/,
      )
      expect(polygon).not.toBeNull()

      const strokeWidth = Number(polygon![2])
      for (const point of polygon![1]!.split(' ')) {
        const [xText, yText] = point.split(',')
        const x = Number(xText)
        const y = Number(yText)
        expect(Math.abs(x) + strokeWidth / 2).toBeLessThanOrEqual(entry.width / 2)
        expect(Math.abs(y) + strokeWidth / 2).toBeLessThanOrEqual(entry.height / 2)
      }
    }
  })

  test('keeps diamond sign hardware inside the visible sign silhouette', () => {
    const layout = resolveRoadSignLayout(RoadSignNode.parse({ signId: 'warning' }))
    const bracketWidth = resolveRoadSignBracketWidth(layout)
    expect(bracketWidth).toBeGreaterThan(0.08)
    expect(bracketWidth).toBeLessThan(layout.width * 0.5)
  })

  test('resolves stable single- and double-post layouts for every sign', () => {
    for (const entry of ROAD_SIGN_CATALOG) {
      const singleLayout = resolveRoadSignLayout(RoadSignNode.parse({ signId: entry.id }))
      expect(resolveRoadSignPostPositions(singleLayout)).toEqual([0])

      const doubleLayout = resolveRoadSignLayout(
        RoadSignNode.parse({ signId: entry.id, mounting: 'double-post' }),
      )
      const positions = resolveRoadSignPostPositions(doubleLayout)
      expect(positions).toHaveLength(2)
      expect(positions[0]!).toBeLessThan(0)
      expect(positions[1]!).toBeGreaterThan(0)
      expect(positions[0]).toBe(-positions[1]!)
    }
  })

  test('keeps every sign face layer outside the plate depth', () => {
    expect(ROAD_SIGN_FACE_GRAPHIC_GAP_M).toBeGreaterThan(0.0015)
    expect(ROAD_SIGN_BACK_FACE_GAP_M).toBeGreaterThan(0.0015)

    for (const entry of ROAD_SIGN_CATALOG) {
      const layout = resolveRoadSignLayout(RoadSignNode.parse({ signId: entry.id }))
      const plate = buildRoadSignPlateGeometry(layout)
      const back = buildRoadSignBackGeometry(layout)
      plate.computeBoundingBox()
      back.computeBoundingBox()
      expect(plate.boundingBox!.min.z - back.boundingBox!.max.z).toBeGreaterThan(0.0015)
      plate.dispose()
      back.dispose()
    }
  })

  test('registers an automatic primary-and-neutral utility wire span', () => {
    const span = UtilityWireSpanNode.parse({
      fromPoleId: 'utility-pole_from',
      toPoleId: 'utility-pole_to',
    })
    expect(span.type).toBe('environment:utility-wire-span')
    expect(span.sagRatio).toBe(0.035)
    expect(utilityWireDefinition.renderer).toBeDefined()
    expect(utilityWireDefinition.floorplan).toBeDefined()
  })

  test('connects only to the nearest same-level pole inside the urban span limit', () => {
    const placed = UtilityPoleNode.parse({
      id: 'utility-pole_placed',
      parentId: 'level_test',
      position: [0, 0, 0],
    })
    const nearest = UtilityPoleNode.parse({
      id: 'utility-pole_nearest',
      parentId: 'level_test',
      position: [32, 0, 0],
    })
    const outsideRange = UtilityPoleNode.parse({
      id: 'utility-pole_far',
      parentId: 'level_test',
      position: [STANDARD_UTILITY_POLE_AUTO_CONNECT_DISTANCE_M + 0.1, 0, 0],
    })
    const otherLevel = UtilityPoleNode.parse({
      id: 'utility-pole_other-level',
      parentId: 'level_other',
      position: [2, 0, 0],
    })
    const nodes = Object.fromEntries(
      [placed, nearest, outsideRange, otherLevel].map((node) => [
        node.id,
        node as unknown as AnyNode,
      ]),
    )
    expect(findNearestUtilityPoleForConnection(placed, nodes)?.id).toBe(nearest.id)
  })

  test('builds three primary and one neutral sagging conductor curves between pole anchors', () => {
    const from = UtilityPoleNode.parse({
      id: 'utility-pole_curve-from',
      position: [0, 0, 0],
    })
    const to = UtilityPoleNode.parse({
      id: 'utility-pole_curve-to',
      position: [30, 0, 0],
    })
    const span = UtilityWireSpanNode.parse({
      fromPoleId: from.id,
      toPoleId: to.id,
    })
    const curves = buildUtilityConductorCurves(span, { node: from }, { node: to })
    expect(curves).toHaveLength(4)
    for (const { curve } of curves) {
      expect(curve.getPoint(0.5).y).toBeLessThan((curve.v0.y + curve.v2.y) / 2)
    }
  })

  test('splits a through-span when a new pole is placed inline', () => {
    const from = UtilityPoleNode.parse({
      id: 'utility-pole_inline-from',
      parentId: 'level_inline',
      position: [0, 0, 0],
    })
    const to = UtilityPoleNode.parse({
      id: 'utility-pole_inline-to',
      parentId: 'level_inline',
      position: [30, 0, 0],
    })
    const placed = UtilityPoleNode.parse({
      id: 'utility-pole_inline-placed',
      parentId: 'level_inline',
      position: [15, 0, STANDARD_UTILITY_POLE_INLINE_INSERT_DISTANCE_M - 0.5],
    })
    const span = UtilityWireSpanNode.parse({
      id: 'utility-wire-span_inline',
      parentId: 'level_inline',
      fromPoleId: from.id,
      toPoleId: to.id,
    })
    const nodes = Object.fromEntries(
      [from, to, placed, span].map((node) => [node.id, node as unknown as AnyNode]),
    )

    const insertion = findUtilityPoleInlineInsertion(placed, nodes)
    expect(insertion?.span.id).toBe(span.id)
    expect(insertion?.positionT).toBeCloseTo(0.5)
    expect(insertion?.distance).toBeCloseTo(STANDARD_UTILITY_POLE_INLINE_INSERT_DISTANCE_M - 0.5)
    expect(resolveUtilityPoleAutoConnect(placed, nodes)?.kind).toBe('inline')
  })

  test('keeps a nearby endpoint available for a T-junction branch', () => {
    const center = UtilityPoleNode.parse({
      id: 'utility-pole_junction-center',
      parentId: 'level_junction',
      position: [0, 0, 0],
    })
    const through = UtilityPoleNode.parse({
      id: 'utility-pole_junction-through',
      parentId: 'level_junction',
      position: [30, 0, 0],
    })
    const branch = UtilityPoleNode.parse({
      id: 'utility-pole_junction-branch',
      parentId: 'level_junction',
      position: [0, 0, 20],
    })
    const span = UtilityWireSpanNode.parse({
      id: 'utility-wire-span_junction',
      parentId: 'level_junction',
      fromPoleId: center.id,
      toPoleId: through.id,
    })
    const nodes = Object.fromEntries(
      [center, through, branch, span].map((node) => [node.id, node as unknown as AnyNode]),
    )

    expect(resolveUtilityPoleAutoConnect(branch, nodes)).toMatchObject({
      kind: 'branch',
      pole: { id: center.id },
    })
  })

  test('orients a new pole crossarm perpendicular to its connected line', () => {
    const from = UtilityPoleNode.parse({
      id: 'utility-pole_heading-from',
      parentId: 'level_heading',
      position: [0, 0, 0],
    })
    const to = UtilityPoleNode.parse({
      id: 'utility-pole_heading-to',
      parentId: 'level_heading',
      position: [30, 0, 0],
    })
    const placed = UtilityPoleNode.parse({
      id: 'utility-pole_heading-placed',
      parentId: 'level_heading',
      position: [15, 0, 0],
    })
    const span = UtilityWireSpanNode.parse({
      id: 'utility-wire-span_heading',
      parentId: 'level_heading',
      fromPoleId: from.id,
      toPoleId: to.id,
    })
    const nodes = Object.fromEntries(
      [from, to, placed, span].map((node) => [node.id, node as unknown as AnyNode]),
    )

    expect(utilityPoleCrossarmRotationY(0)).toBeCloseTo(-Math.PI / 2)
    expect(resolveUtilityPolePlacementRotation(placed, nodes)).toBeCloseTo(-Math.PI / 2)
  })
})
