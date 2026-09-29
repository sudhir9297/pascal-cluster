import { describe, expect, test } from 'bun:test'
import { Group, Mesh as ThreeMesh, MeshBasicMaterial, Raycaster, Vector3, type BufferAttribute, type Material, type Mesh } from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { PoolNode } from './schema'
import { buildPoolCopingGeometry, buildPoolGeometry, buildPoolPlacementPreviewGeometry, updatePoolInteriorFinish } from './geometry'
import { PoolWaterEffect } from '../shader/water-effect'
import { applyPoolColors } from './paint'

test('placement preview uses a small silhouette without creating a water simulation', () => {
  const preview = buildPoolPlacementPreviewGeometry(PoolNode.parse({ copingStyle: 'rock' }))
  expect(preview.getObjectByName('pool-preview-basin')).toBeDefined()
  expect(preview.getObjectByName('pool-preview-water')).toBeDefined()
  expect(preview.getObjectByName('pool-shell-walls')).toBeUndefined()
  expect(preview.userData.waterEffect).toBeUndefined()
  preview.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})

test('water surface uses a planar mesh without redundant tessellation', () => {
  const geometry = buildPoolGeometry(PoolNode.parse({ length: 9, width: 5.5 }))
  const water = geometry.getObjectByName('pool-water') as Mesh
  const positions = water.geometry.getAttribute('position')
  expect(positions.count).toBe(6)
  for (let index = 1; index < positions.count; index++) {
    expect(positions.getY(index)).toBeCloseTo(positions.getY(0))
  }
  geometry.userData.waterEffect.dispose()
  geometry.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})

test('coping is a separate replaceable layer beside a stable basin', () => {
  const node = PoolNode.parse({ copingStyle: 'rock' })
  const basin = buildPoolGeometry(node, { skipCoping: true })
  const coping = buildPoolCopingGeometry(node)
  expect(basin.getObjectByName('pool-shell-walls')).toBeDefined()
  expect(basin.getObjectByName('pool-coping')).toBeUndefined()
  expect(coping.getObjectByName('pool-coping')).toBeDefined()
  expect(coping.getObjectByName('pool-shell-walls')).toBeUndefined()
  basin.userData.waterEffect.dispose()
  for (const group of [basin, coping]) group.traverse((child) => {
    const mesh = child as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
  })
})

describe('pool connection wall openings', () => {
  test.each([false, true])('custom pool water follows the basin outline at the saved elevation, reversed=%s', (reversed) => {
    const polygon: [number, number][] = [
      [-3, -2], [3, -2], [3, -0.5], [1, -0.5],
      [1, 2], [-1.5, 2], [-1.5, 0.5], [-3, 0.5],
    ]
    const pool = PoolNode.parse({ shape: 'custom', polygon: reversed ? [...polygon].reverse() : polygon,
      position: [8, 1.4, -5], rotation: [0, 0.6, 0],
      finishedDeckElevation: -0.08, designWaterElevation: -0.2 })
    const geometry = buildPoolGeometry(pool)
    const water = geometry.getObjectByName('pool-water') as Mesh
    const probeMaterial = new MeshBasicMaterial()
    const probe = new ThreeMesh(water.geometry, probeMaterial)
    probe.position.copy(water.position)
    geometry.add(probe)
    const root = new Group()
    root.position.set(...pool.position)
    root.rotation.set(...pool.rotation)
    root.add(geometry)
    root.updateMatrixWorld(true)

    const rayAt = (x: number, z: number) => {
      const world = new Vector3(x, 0, z).applyEuler(root.rotation).add(root.position)
      return new Raycaster(new Vector3(world.x, 4, world.z), new Vector3(0, -1, 0))
        .intersectObject(probe, false)[0]?.point.y
    }
    expect(rayAt(-2, -1)).toBeCloseTo(pool.position[1] + pool.designWaterElevation)
    expect(rayAt(0, 1)).toBeCloseTo(pool.position[1] + pool.designWaterElevation)
    expect(rayAt(2, 1)).toBeUndefined()
    expect(rayAt(-2, 1)).toBeUndefined()
    geometry.remove(probe)
    probeMaterial.dispose()
    geometry.userData.waterEffect.dispose()
    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) material.dispose()
    })
  })
  test('uses lit materials and shadows for the shell walls, floor, and coping', () => {
    const pool = PoolNode.parse({ shellColor: '#123456', copingColor: '#654321' })
    const geometry = buildPoolGeometry(pool, { waterResolution: 16 })
    const floor = geometry.getObjectByName('pool-shell-floor') as Mesh
    const walls = geometry.getObjectByName('pool-shell-walls') as Mesh
    const coping = geometry.getObjectByName('pool-coping') as Mesh
    const wallMaterials = Array.isArray(walls.material) ? walls.material : [walls.material]

    expect(floor.material).toBeInstanceOf(MeshStandardNodeMaterial)
    expect(wallMaterials).toHaveLength(2)
    expect(wallMaterials.every((material) => material instanceof MeshStandardNodeMaterial)).toBe(true)
    expect((wallMaterials[1] as MeshStandardNodeMaterial).color.getHexString()).toBe('123456')
    expect(coping.material).toBeInstanceOf(MeshStandardNodeMaterial)
    expect(floor.receiveShadow).toBe(true)
    expect(walls.castShadow).toBe(true)
    expect(walls.receiveShadow).toBe(true)
    expect(coping.castShadow).toBe(true)
    expect(coping.receiveShadow).toBe(true)

    geometry.userData.waterEffect.dispose()
    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) material.dispose()
    })
  })

  test('uses the requested adaptive water resolution', () => {
    const geometry = buildPoolGeometry(PoolNode.parse({}), { waterResolution: 64 })
    expect(geometry.userData.waterEffect.resolution).toBe(64)
    geometry.userData.waterEffect.dispose()
    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) material.dispose()
    })
  })

  test('changes the interior finish without replacing geometry or water simulation', () => {
    const original = PoolNode.parse({ interiorFinish: 'light-mosaic', copingStyle: 'rock' })
    const group = buildPoolGeometry(original, { waterResolution: 16 })
    const floor = group.getObjectByName('pool-shell-floor') as Mesh
    const walls = group.getObjectByName('pool-shell-walls') as Mesh
    const coping = group.getObjectByName('pool-coping')!
    const floorGeometry = floor.geometry
    const floorMaterial = floor.material
    const waterEffect = group.userData.waterEffect
    const copingChildren = [...coping.children]

    expect(updatePoolInteriorFinish(group, PoolNode.parse({ ...original, interiorFinish: 'natural-pebble-aqua' }))).toBe(true)

    expect(floor.geometry).toBe(floorGeometry)
    expect(floor.material).not.toBe(floorMaterial)
    expect((walls.material as Material[])[0]).toBe(floor.material as Material)
    expect(group.userData.waterEffect).toBe(waterEffect)
    expect(coping.children).toEqual(copingChildren)
    expect(updatePoolInteriorFinish(group, PoolNode.parse({ ...original, interiorFinish: 'natural-pebble-aqua' }))).toBe(false)
    expect(updatePoolInteriorFinish(group, original)).toBe(true)
    expect(floor.material).toBe(floorMaterial)
    const finishMaterials = group.userData.finishMaterials as Map<string, Material>
    waterEffect.dispose()
    group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) material.dispose()
    })
    for (const material of finishMaterials.values()) material.dispose()
  })

  test('changes the visible finish when shell paint has cloned its material', () => {
    const original = PoolNode.parse({ interiorFinish: 'light-mosaic' })
    const group = buildPoolGeometry(original, { waterResolution: 16 })
    const root = new Group()
    root.userData.poolPaintOwner = original.id
    root.add(group)
    const floor = group.getObjectByName('pool-shell-floor') as Mesh
    const finish = PoolNode.parse({ ...original, interiorFinish: 'natural-pebble-aqua' })
    let restorePaint = applyPoolColors(root, { shell: '#cc8855' })
    const painted = floor.material as MeshStandardNodeMaterial
    expect(painted).not.toBe(group.userData.shellMaterial)
    expect(updatePoolInteriorFinish(group, finish)).toBe(true)
    expect(floor.material).toBe(painted)
    expect(painted.userData.poolInteriorFinish).toBe(finish.interiorFinish)
    expect(painted.colorNode).toBe((group.userData.shellMaterial as MeshStandardNodeMaterial).colorNode)

    restorePaint()
    restorePaint = applyPoolColors(root, { shell: '#cc8855' })
    expect(updatePoolInteriorFinish(group, finish)).toBe(true)
    expect((floor.material as MeshStandardNodeMaterial).userData.poolInteriorFinish).toBe(finish.interiorFinish)
    restorePaint()
    group.userData.waterEffect.dispose()
    group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose()
    })
    for (const material of (group.userData.finishMaterials as Map<string, Material>).values()) material.dispose()
  })

  test('batches an unconnected straight rock rim into one colored mesh', () => {
    const group = buildPoolGeometry(PoolNode.parse({ copingStyle: 'rock' }), { waterResolution: 16 })
    const coping = group.getObjectByName('pool-coping') as Group
    expect(coping.children).toHaveLength(1)
    const rock = coping.children[0] as Mesh
    expect(rock.geometry.getAttribute('color')?.count).toBe(rock.geometry.getAttribute('position').count)
    expect(rock.material).toBeInstanceOf(MeshStandardNodeMaterial)
    group.userData.waterEffect.dispose()
    group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) material.dispose()
    })
  })

  test('connection-ready rock stones share one material', () => {
    const group = buildPoolGeometry(PoolNode.parse({ copingStyle: 'rock' }), {
      waterResolution: 16,
      preserveIndividualRocks: true,
    })
    const coping = group.getObjectByName('pool-coping') as Group
    const stones = coping.children as Mesh[]
    expect(stones.length).toBeGreaterThan(10)
    expect(new Set(stones.map((stone) => stone.material)).size).toBe(1)
    group.userData.waterEffect.dispose()
    const disposed = new Set<Material>()
    group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) {
        if (disposed.has(material)) continue
        material.dispose()
        disposed.add(material)
      }
    })
  })

  test('reuses water resources across a coping style change', () => {
    const original = PoolNode.parse({ copingStyle: 'continuous' })
    const effect = new PoolWaterEffect(original, 16)
    const first = buildPoolGeometry(original, { waterEffect: effect })
    const second = buildPoolGeometry(PoolNode.parse({ ...original, copingStyle: 'rock' }), { waterEffect: effect })
    expect(first.userData.waterEffect).toBe(effect)
    expect(second.userData.waterEffect).toBe(effect)
    expect((first.getObjectByName('pool-water') as Mesh).material).toBe((second.getObjectByName('pool-water') as Mesh).material)
    for (const group of [first, second]) group.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      if (mesh.name === 'pool-water') return
      for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Material[]) material.dispose()
    })
    effect.dispose()
  })

  test('keeps wall fragments on both sides of a narrow opening', () => {
    const pool = PoolNode.parse({
      polygon: [[-4, -2], [4, -2], [4, 2], [-4, 2]],
      coveRadius: 0,
    })
    const geometry = buildPoolGeometry(pool, {
      removeWallRegions: [[[3.7, -0.3], [4.3, -0.3], [4.3, 0.3], [3.7, 0.3]]],
    })
    const walls = geometry.getObjectByName('pool-shell-walls') as Mesh
    const positions = walls.geometry.getAttribute('position') as BufferAttribute
    const rightWallTriangleCenters: number[] = []
    for (let index = 0; index < positions.count; index += 3) {
      const xs = [positions.getX(index), positions.getX(index + 1), positions.getX(index + 2)]
      if (!xs.every((x) => Math.abs(x - 4) < 1e-6)) continue
      rightWallTriangleCenters.push((positions.getZ(index) + positions.getZ(index + 1) + positions.getZ(index + 2)) / 3)
    }

    expect(rightWallTriangleCenters.some((z) => z < -0.3)).toBe(true)
    expect(rightWallTriangleCenters.some((z) => z > 0.3)).toBe(true)
    expect(rightWallTriangleCenters.every((z) => Math.abs(z) >= 0.3)).toBe(true)

    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) material.dispose()
    })
  })

  test('keeps every connected-pool mesh non-empty and UV mapped', () => {
    const pool = PoolNode.parse({
      polygon: [[-4, -2], [4, -2], [4, 2], [-4, 2]],
      coveRadius: 0.2,
    })
    const opening: [number, number][][] = [[[3.7, -0.4], [4.3, -0.4], [4.3, 0.4], [3.7, 0.4]]]
    const geometry = buildPoolGeometry(pool, {
      removeWallRegions: opening,
      removeFloorRegions: opening,
      removeWaterRegions: opening,
    })
    const invalidMeshes: string[] = []
    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      if ((mesh.geometry.getAttribute('position')?.count ?? 0) === 0 || !mesh.geometry.getAttribute('uv')) {
        invalidMeshes.push(mesh.name || mesh.geometry.type)
      }
    })

    expect(invalidMeshes).toEqual([])

    geometry.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials as Material[]) material.dispose()
    })
  })
})
