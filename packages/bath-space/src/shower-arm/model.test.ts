import { describe, expect, test } from 'bun:test'
import { WallNode, LevelNode, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { Mesh, Vector3, Raycaster } from 'three'
import { ShowerArmNode, showerArmPresets } from './schema'
import { armPath, buildShowerArmGeometry } from './geometry'
import { SHOWER_HEAD_TARGET_NAME, showerHeadTarget, showerHeadSlot } from './attachment'
import { createShowerArm, showerArmPlacement, showerArmPlacementInPlan } from './placement'

describe('shower arms', () => {
  test('every profile has finite geometry and a single outlet slot matching the connector endpoint', () => {
    for (const preset of showerArmPresets)
      for (const length of [0.1, 0.4, 1.2]) {
        const n = ShowerArmNode.parse({ ...preset, length, drop: 0.4 }),
          root = buildShowerArmGeometry(n)
        const targets = root.children.filter((c) => c.name === SHOWER_HEAD_TARGET_NAME)
        expect(targets).toHaveLength(1)
        const target = targets[0]!,
          pose = showerHeadTarget(n),
          end = armPath(n).end
        expect(target.position.toArray()).toEqual(pose.position)
        expect(target.position.distanceTo(end)).toBeCloseTo(n.connectorLength, 6)
        expect(target.userData).toMatchObject({
          attachmentTarget: 'showerhead',
          slotId: 'shower-head',
          capacity: 1,
        })
        const spray = new Vector3(0, -1, 0).applyEuler(target.rotation)
        expect(spray.y).toBeLessThanOrEqual(0)
        root.traverse((c) => {
          if (c instanceof Mesh) {
            for (const key of ['position', 'normal', 'uv'])
              for (const value of c.geometry.getAttribute(key).array)
                expect(Number.isFinite(value)).toBe(true)
            c.geometry.dispose()
            if (!Array.isArray(c.material) && !c.material.userData.__pascalCachedMaterial)
              c.material.dispose()
          }
        })
      }
  })
  test('resizing and switching shapes retains the slot identity while updating its pose', () => {
    const n = ShowerArmNode.parse({}),
      changed = ShowerArmNode.parse({
        ...n,
        length: 0.8,
        style: 'square-adjustable',
        outletAngle: 45,
      })
    expect(showerHeadSlot(changed)).toEqual(showerHeadSlot(n))
    expect(showerHeadTarget(changed).position).not.toEqual(showerHeadTarget(n).position)
    expect(showerHeadTarget(changed).rotation).not.toEqual(showerHeadTarget(n).rotation)
    expect(ShowerArmNode.parse(JSON.parse(JSON.stringify(changed)))).toEqual(changed)
  })
  test('mounts flush to both wall faces and follows thickness changes', () => {
    const n = ShowerArmNode.parse({}),
      wall = WallNode.parse({ start: [0, 0], end: [3, 0], thickness: 0.2 })
    const front = showerArmPlacement(n, wall, 1, 'front')!,
      back = showerArmPlacement(n, wall, 1, 'back')!
    expect(front.position).toEqual([1, 2.1, 0.1])
    expect(front.rotation).toBe(0)
    expect(back.position).toEqual([1, 2.1, -0.1])
    expect(back.rotation).toBe(Math.PI)
    expect(showerArmPlacement(n, { ...wall, thickness: 0.4 }, 1, 'front')!.position[2]).toBe(0.2)
  })
  test('empty plan space cannot create an arm and wall placement keeps its wall parent', () => {
    const node = ShowerArmNode.parse({}),
      level = LevelNode.parse({})
    const wall = WallNode.parse({ parentId: level.id, start: [0, 0], end: [3, 0] })
    const nodes = { [level.id]: { ...level, children: [wall.id] }, [wall.id]: wall } as Record<
      AnyNodeId,
      AnyNode
    >
    expect(showerArmPlacementInPlan(node, [1, 4], nodes, level.id)).toBeNull()
    const placement = showerArmPlacementInPlan(node, [1, 0.02], nodes, level.id)!
    const created = createShowerArm(node, placement)
    expect(created.parentId).toBe(wall.id)
    expect(created.wallId).toBe(wall.id)
    expect(() => createShowerArm(node, { ...placement, parentId: level.id })).toThrow('wall host')
    expect(showerArmPlacement(node, { ...wall, visible: false }, 1, 'front')).toBeNull()
  })
})

test('all arm outlets direct head spray along the actual connector, including straight and intermediate angles', () => {
  const styles = ShowerArmNode.shape.style.unwrap().options
  for (const style of styles)
    for (const outletAngle of [0, 1, 15, 45, 89, 90]) {
      const n = ShowerArmNode.parse({ style, outletAngle }),
        model = buildShowerArmGeometry(n),
        target = model.getObjectByName(SHOWER_HEAD_TARGET_NAME)!,
        { end, direction } = armPath(n)
      const spray = new Vector3(0, -1, 0).applyEuler(target.rotation)
      expect(spray.dot(direction)).toBeCloseTo(1, 8)
      expect(target.position.clone().sub(end).normalize().dot(spray)).toBeCloseTo(1, 8)
      expect(spray.z).toBeGreaterThanOrEqual(-1e-8)
      expect(spray.y).toBeLessThanOrEqual(1e-8)
      model.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose()
      })
    }
  expect(showerArmPresets).toHaveLength(4)
})

test('square arm faces remain outward and pickable across straight, angled and elbow settings',()=>{
  for(const outletAngle of [0,45,90]) {
    const n=ShowerArmNode.parse({style:'square-adjustable',outletAngle}),root=buildShowerArmGeometry(n),point=armPath(n).path.getPoint(.25)
    root.updateMatrixWorld(true)
    const meshes=root.children.filter(o=>o instanceof Mesh&&o.userData.slotId==='arm')
    for(const sign of [-1,1])expect(new Raycaster(new Vector3(sign,point.y,point.z),new Vector3(-sign,0,0)).intersectObjects(meshes)).not.toHaveLength(0)
    root.traverse(o=>{if(o instanceof Mesh)o.geometry.dispose()})
  }
})
