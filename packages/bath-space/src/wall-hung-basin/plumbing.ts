import { CatmullRomCurve3, CylinderGeometry, Mesh, MeshStandardMaterial, Shape, ShapeGeometry, TubeGeometry, Vector2, Vector3, type BufferGeometry, type Group, type Material } from 'three'
import type { WallHungBasinNode } from '../countertop-basin/schema'
import { buildBasinShell, unwrapBasinDrainCover, type BasinRing } from '../countertop-basin/uv'
import { WALL_BASIN_DRAIN_Z, wallBasinOutline } from './profile'

export function addWallBasinPlumbing(group: Group, node: WallHungBasinNode, ceramic: Material, hardware: Material) {
  if (!node.plumbingEnabled) return
  const back = node.depth / 2, drainZ = WALL_BASIN_DRAIN_Z
  const outletY = -node.height - node.plumbingDrop
  const add = (name: string, geometry: BufferGeometry, material = hardware, slot = 'plumbing') => {
    const mesh = new Mesh(geometry, material)
    mesh.name = name
    mesh.userData.slotId = slot
    mesh.userData.__fromGeometry = true
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const cylinder = (name: string, radius: number, length: number, position: [number, number, number], alongZ = false) => {
    const geometry = unwrapBasinDrainCover(new CylinderGeometry(radius, radius, length, 48), radius, length)
    if (alongZ) geometry.rotateX(Math.PI / 2)
    const mesh = add(name, geometry)
    mesh.position.fromArray(position)
    return mesh
  }
  const collar = cylinder('basin-waste-collar', 0.029, 0.02, [0, -node.height - 0.008, drainZ])
  collar.userData.pipeConnection = 'drain'
  const flange = cylinder('basin-wall-flange', 0.048, 0.014, [0, outletY, back - 0.007], true)
  flange.userData.pipeConnection = 'wall'
  cylinder('basin-wall-socket', 0.026, 0.035, [0, outletY, back - 0.025], true)

  if (node.plumbingStyle === 'bottle' || node.plumbingStyle === 'concealed') {
    const length = node.plumbingDrop + 0.008
    cylinder('basin-waste-tailpiece', 0.018, length, [0, -node.height - length / 2, drainZ])
    cylinder('basin-bottle-trap', 0.032, 0.09, [0, outletY - 0.017, drainZ])
    cylinder('basin-trap-cap', 0.034, 0.008, [0, outletY - 0.064, drainZ])
    cylinder('basin-wall-return', 0.018, back - drainZ - 0.01, [0, outletY, (back + drainZ - 0.01) / 2], true)
    cylinder('basin-trap-coupling', 0.024, 0.017, [0, outletY + 0.04, drainZ])
  } else {
    const flexible = node.plumbingStyle === 'flexible'
    const bend = flexible ? 0.08 : 0.06
    const curve = new CatmullRomCurve3([
      new Vector3(0, -node.height - 0.008, drainZ),
      new Vector3(0, outletY - 0.025, drainZ),
      new Vector3(0, outletY - bend, drainZ + 0.045),
      new Vector3(0, outletY - 0.025, drainZ + 0.09),
      new Vector3(0, outletY, drainZ + 0.13),
      new Vector3(0, outletY, back - 0.02),
    ], false, 'centripetal')
    const segments = flexible ? 192 : 96, sides = 24, radius = flexible ? 0.022 : 0.018
    const geometry = new TubeGeometry(curve, segments, radius, sides, false)
    const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv')
    const length = curve.getLength()
    for (let ring = 0; ring <= segments; ring++) {
      const center = curve.getPointAt(ring / segments)
      const scale = flexible ? 1 + 0.18 * Math.cos(ring * Math.PI / 2) : 1
      for (let side = 0; side <= sides; side++) {
        const index = ring * (sides + 1) + side
        const point = new Vector3().fromBufferAttribute(positions, index).sub(center).multiplyScalar(scale).add(center)
        positions.setXYZ(index, point.x, point.y, point.z)
        uv.setXY(index, ring / segments * length, side / sides * Math.PI * 2 * radius)
      }
    }
    geometry.computeVertexNormals()
    add(flexible ? 'basin-flexible-waste' : 'basin-curved-trap', geometry, flexible && !node.slots?.plumbing ? new MeshStandardMaterial({ color: '#cbd0d6', metalness: 0.12, roughness: 0.42 }) : hardware)
    cylinder('basin-trap-coupling', 0.027, 0.025, [0, -node.height - 0.018, drainZ])
  }

  if (node.plumbingStyle === 'concealed') {
    const rings: BasinRing[] = []
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, flare = Math.sin(u * Math.PI / 2)
      rings.push({ y: outletY - 0.08 + (node.plumbingDrop + 0.085) * u,
        points: wallBasinOutline(node, node.width * (0.47 + flare * 0.23), node.depth * (0.72 + flare * 0.14)) })
    }
    add('basin-ceramic-shroud', buildBasinShell(rings, [{ start: 0, end: 16, mapping: 'curved' }]), ceramic, 'bowl')
    const bottom = new Shape(rings[0]!.points.map(([x, z]) => new Vector2(x, z)))
    const cap = new ShapeGeometry(bottom)
    cap.rotateX(Math.PI / 2)
    const mesh = add('basin-shroud-bottom', cap, ceramic, 'bowl')
    mesh.position.y = rings[0]!.y
  }
}
