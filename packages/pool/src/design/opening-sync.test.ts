import { describe, expect, test } from 'bun:test'
import { pointInPolygon2D, SlabNode } from '@pascal-app/core'
import { generateSlabGeometry } from '@pascal-app/viewer'
import { Euler, Group, Mesh, Vector3 } from 'three'
import { buildPoolGeometry } from '../core/geometry'
import { poolDefinition, poolFloorplan } from '../core/definition'
import { PoolNode } from '../core/schema'
import { PoolSharedJointNode } from '../shared-joint/core/schema'
import { PoolSpilloverNode } from '../spillover/core/schema'
import { localizePoolPolygon, syncPoolGroundOpenings, syncPoolSlabOpenings } from './opening-sync'
import { createPoolShapePolygon, POOL_SHAPES } from './shapes'

describe('swimming pool floor openings', () => {
  test.each([...POOL_SHAPES])('%s pool plan, water, and ground opening share an offset rotated frame', (shape) => {
    const polygon: [number, number][] = shape === 'custom' || shape === 'spline'
      ? [[-4, -2], [3, -2.5], [4, 1], [0.5, 3], [-3, 1.5]]
      : createPoolShapePolygon(shape, 8, shape === 'circle' ? 8 : 5)
    const pool = PoolNode.parse({
      id: `pool_alignment_${shape}`, parentId: 'level_alignment', shape,
      polygon, position: [11, 0.4, -7], rotation: [0, Math.PI / 5, 0],
    })
    const plan = poolFloorplan(pool)
    expect(plan.kind).toBe('path')
    if (plan.kind !== 'path') return
    const planCoordinates = plan.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number)
    polygon.forEach(([x, z], index) => {
      const point = new Vector3(x, 0, z).applyEuler(new Euler(...pool.rotation)).add(new Vector3(...pool.position))
      expect(planCoordinates[index * 2]).toBeCloseTo(point.x, 7)
      expect(planCoordinates[index * 2 + 1]).toBeCloseTo(point.z, 7)
    })

    const level = { id: 'level_alignment', type: 'level', children: [pool.id] }
    // Match preset placement: draw around an off-origin click, localize the
    // polygon, then rotate its local points back against the stored yaw.
    const yaw = Math.PI / 5
    const clicked = [13, -9] as const
    const worldOutline = polygon.map(([x, z]) => [
      clicked[0] + x * Math.cos(yaw) + z * Math.sin(yaw),
      clicked[1] - x * Math.sin(yaw) + z * Math.cos(yaw),
    ] as [number, number])
    const localized = localizePoolPolygon(worldOutline)
    const placedPool = PoolNode.parse({
      ...pool,
      position: [localized.position[0], pool.position[1], localized.position[2]],
      rotation: [0, yaw, 0],
      polygon: localized.polygon.map(([x, z]): [number, number] => [
        x * Math.cos(yaw) - z * Math.sin(yaw),
        x * Math.sin(yaw) + z * Math.cos(yaw),
      ]),
    })
    const placedHelper = syncPoolGroundOpenings({ [placedPool.id]: placedPool, [level.id]: level } as never).create[0]!
    const placedPlan = poolFloorplan(placedPool)
    expect(placedPlan.kind).toBe('path')
    if (placedPlan.kind !== 'path') return
    const placedCoordinates = placedPlan.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number)
    worldOutline.forEach(([x, z], index) => {
      expect(placedCoordinates[index * 2]).toBeCloseTo(x, 7)
      expect(placedCoordinates[index * 2 + 1]).toBeCloseTo(z, 7)
      expect(pointInPolygon2D([x, z], placedHelper.polygon, { includeBoundary: true })).toBe(true)
    })

    const building = new Group()
    const poolFrame = new Group()
    poolFrame.position.fromArray(placedPool.position)
    poolFrame.rotation.fromArray([...placedPool.rotation, 'XYZ'])
    building.add(poolFrame)
    const assembly = buildPoolGeometry(placedPool)
    poolFrame.add(assembly)
    building.updateWorldMatrix(true, true)
    const water = assembly.getObjectByName('pool-water') as Mesh
    const positions = water.geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i += Math.max(1, Math.floor(positions.count / 100))) {
      const world = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(water.matrixWorld)
      expect(pointInPolygon2D([world.x, world.z], placedHelper.polygon, { includeBoundary: true })).toBe(true)
    }
    assembly.userData.waterEffect.dispose()
    assembly.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) material.dispose()
    })
  })

  test('creates a recessed helper for the site and shadow receiver', () => {
    const pool = PoolNode.parse({
      ...poolDefinition.defaults(),
      id: 'pool_ground-opening',
      parentId: 'level_ground',
    })

    const changes = syncPoolGroundOpenings({ [pool.id]: pool })
    const helper = changes.create[0]

    expect(helper?.recessed).toBe(true)
    expect(helper?.holes).toHaveLength(1)
    expect(helper?.metadata).toMatchObject({ poolGroundOpeningFor: pool.id })
  })

  test('ground opening ignores a level pose that its renderer does not apply', () => {
    const pool = PoolNode.parse({ id: 'pool_level_pose', parentId: 'level_ground',
      shape: 'custom', polygon: [[-2, -1], [2, -1], [2, 1], [-2, 1]],
      position: [4, 0, -3] })
    const level = { id: 'level_ground', type: 'level', parentId: 'building_a',
      position: [0, 0, 12], rotation: [0, 0, 0], children: [pool.id] }
    const building = { id: 'building_a', type: 'building', parentId: 'site_a',
      position: [10, 0, 0], rotation: [0, Math.PI / 2, 0], children: [level.id] }
    const helper = syncPoolGroundOpenings({ [pool.id]: pool, [level.id]: level,
      [building.id]: building } as never).create[0]!
    const xs = helper.polygon.map(([x]) => x)
    const zs = helper.polygon.map(([, z]) => z)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(7)
    expect((Math.min(...zs) + Math.max(...zs)) / 2).toBeCloseTo(-4)
  })

  test('site cutout helper does not render a second, displaced slab', () => {
    const pool = PoolNode.parse({ id: 'pool_new_lagoon', parentId: 'level_ground',
      shape: 'lagoon', polygon: [[-3, -1], [-2, -2], [2, -2], [3, 1], [0, 2], [-2, 1]],
      position: [8, 0, -4] })
    const level = { id: 'level_ground', type: 'level', parentId: 'building_a', children: [pool.id] }
    const building = { id: 'building_a', type: 'building', parentId: 'site_a',
      position: [12, 0, 5], rotation: [0, 0, 0], children: [level.id] }
    const helper = syncPoolGroundOpenings({ [pool.id]: pool, [level.id]: level,
      [building.id]: building } as never).create[0]!
    const geometry = generateSlabGeometry(helper, { walls: [], siblingSlabs: [] })
    expect(geometry.getIndex()?.count ?? 0).toBe(0)
    geometry.dispose()
  })

  for (const shape of ['circle', 'lagoon', 'custom', 'spline'] as const) {
    test(`new ${shape} pool water lies inside its ground opening through a building transform`, () => {
      const points: [number, number][] = shape === 'circle'
        ? Array.from({ length: 20 }, (_, index) => {
          const angle = index * Math.PI / 10
          return [8 + Math.cos(angle) * 2, -4 + Math.sin(angle) * 2]
        })
        : [[5, -5], [7, -6], [10, -6], [11, -3], [9, -1], [6, -2]]
      const localized = localizePoolPolygon(points)
      const pool = PoolNode.parse({
        id: `pool_new_${shape}`, shape, parentId: 'level_ground',
        position: localized.position, polygon: localized.polygon,
      })
      const level = { id: 'level_ground', type: 'level', parentId: 'building_a', children: [pool.id] }
      const building = { id: 'building_a', type: 'building', parentId: 'site_a',
        position: [12, 0, 5] as [number, number, number],
        rotation: [0, Math.PI / 5, 0] as [number, number, number], children: [level.id] }
      const helper = syncPoolGroundOpenings({ [pool.id]: pool, [level.id]: level,
        [building.id]: building } as never).create[0]!
      const buildingGroup = new Group()
      buildingGroup.position.fromArray(building.position)
      buildingGroup.rotation.fromArray([...building.rotation, 'XYZ'])
      const poolGroup = new Group()
      poolGroup.position.fromArray(pool.position)
      poolGroup.rotation.fromArray([...pool.rotation, 'XYZ'])
      buildingGroup.add(poolGroup)
      const assembly = buildPoolGeometry(pool)
      poolGroup.add(assembly)
      buildingGroup.updateWorldMatrix(true, true)
      const water = assembly.getObjectByName('pool-water') as Mesh
      const vertices = water.geometry.getAttribute('position')
      for (let index = 0; index < vertices.count; index += Math.max(1, Math.floor(vertices.count / 100))) {
        const point = new Vector3().fromBufferAttribute(vertices, index).applyMatrix4(water.matrixWorld)
        expect(pointInPolygon2D([point.x, point.z], helper.polygon, { includeBoundary: true })).toBe(true)
      }
    })
  }

  test('adds the pool construction opening to its host slab', () => {
    const slab = SlabNode.parse({
      id: 'slab_pool-deck',
      parentId: 'level_ground',
      polygon: [[-12, -8], [12, -8], [12, 8], [-12, 8]],
    })
    const pool = PoolNode.parse({
      ...poolDefinition.defaults(),
      id: 'pool_slab-opening',
      parentId: 'level_ground',
      supportSlabId: slab.id,
    })

    const updates = syncPoolSlabOpenings({ [pool.id]: pool, [slab.id]: slab })

    expect(updates).toHaveLength(1)
    expect(updates[0]?.id).toBe(slab.id)
    expect(updates[0]?.data.holes).toHaveLength(1)
  })

  test('creates a recessed helper for a submerged pool connection', () => {
    const connection = PoolSharedJointNode.parse({
      id: 'pool-shared-joint_pool_a_pool_b',
      parentId: 'level_ground',
      poolIds: ['pool_a', 'pool_b'],
      position: [2.25, 0, 0],
      length: 0.85,
      width: 3,
    })

    const changes = syncPoolGroundOpenings({ [connection.id]: connection })
    const helper = changes.create[0]

    expect(helper?.recessed).toBe(true)
    expect(helper?.polygon).toHaveLength(4)
    expect(helper?.metadata).toMatchObject({
      poolGroundOpeningFor: `pool-connection:${connection.id}`,
    })
  })

  test('adds the connection opening to the host slab', () => {
    const slab = SlabNode.parse({
      id: 'slab_connection-deck',
      parentId: 'level_ground',
      polygon: [[-12, -8], [12, -8], [12, 8], [-12, 8]],
    })
    const connection = PoolSharedJointNode.parse({
      id: 'pool-shared-joint_pool_c_pool_d',
      parentId: 'level_ground',
      poolIds: ['pool_c', 'pool_d'],
      position: [2.25, 0, 0],
      length: 0.85,
      width: 3,
    })

    const updates = syncPoolSlabOpenings({ [slab.id]: slab, [connection.id]: connection })

    expect(updates).toHaveLength(1)
    expect(updates[0]?.data.holes).toHaveLength(1)
  })

  test('creates a recessed ground opening beneath a spillover gap', () => {
    const spillover = PoolSpilloverNode.parse({
      id: 'pool-spillover_ground-gap',
      parentId: 'level_ground',
      sourcePoolId: 'pool_a',
      targetPoolId: 'pool_b',
      position: [2.25, 0, 0],
      length: 1.25,
      width: 2,
    })
    const changes = syncPoolGroundOpenings({ [spillover.id]: spillover })
    const helper = changes.create[0]

    expect(helper?.recessed).toBe(true)
    expect(helper?.polygon).toHaveLength(4)
    expect(helper?.metadata).toMatchObject({
      poolGroundOpeningFor: `pool-connection:${spillover.id}`,
    })
  })

  test('matches the spillover floor opening to the channel-wall footprint', () => {
    const spillover = PoolSpilloverNode.parse({
      id: 'pool-spillover_wall-footprint',
      parentId: 'level_ground',
      sourcePoolId: 'pool_a',
      targetPoolId: 'pool_b',
      position: [0, 0, 0],
      length: 1.25,
      width: 2,
      effectiveWidth: 1.6,
      lipThickness: 0.08,
    })

    const helper = syncPoolGroundOpenings({ [spillover.id]: spillover }).create[0]!
    const xs = helper.polygon.map(([x]) => x)
    const zs = helper.polygon.map(([, z]) => z)
    expect(Math.max(...xs)).toBeCloseTo(0.725)
    expect(Math.min(...xs)).toBeCloseTo(-0.725)
    expect(Math.max(...zs)).toBeCloseTo(0.8)
    expect(Math.min(...zs)).toBeCloseTo(-0.8)
  })

  test('keeps the ground intact for a separated spillover at different elevations', () => {
    const source = PoolNode.parse({
      ...poolDefinition.defaults(), id: 'pool_raised_source', parentId: 'level_ground', position: [0, 1, 0],
    })
    const target = PoolNode.parse({
      ...poolDefinition.defaults(), id: 'pool_lower_target', parentId: 'level_ground', position: [8, 0, 0],
    })
    const spillover = PoolSpilloverNode.parse({
      id: 'pool-spillover_raised-gap', parentId: 'level_ground', sourcePoolId: source.id, targetPoolId: target.id,
      length: 2, width: 2,
    })

    const changes = syncPoolGroundOpenings({
      [source.id]: source, [target.id]: target, [spillover.id]: spillover,
    })
    expect(changes.create.some((node) => node.id.includes('connection-ground'))).toBe(false)
  })
})
