import { type GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  CurvePath,
  ExtrudeGeometry,
  Group,
  LineCurve3,
  Mesh,
  QuadraticBezierCurve3,
  SphereGeometry,
  Shape,
  Vector2,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three'
import { type WallSpoutNode, waterfallSpout } from './schema'
import { spoutFinishProperties } from './finishes'
import { spoutWaterOutlet, wallSpoutSockets, addWallSpoutTargets } from './targets'
export function spoutPath(n: WallSpoutNode) {
  const start = new Vector3(),
    end = new Vector3(...spoutWaterOutlet(n)),
    path = new CurvePath<Vector3>()
  if (n.style === 'round-arched') {
    const top = new Vector3(0, n.rise, n.length * 0.5)
    path.add(new QuadraticBezierCurve3(start, new Vector3(0, n.rise, 0), top))
    path.add(new QuadraticBezierCurve3(top, new Vector3(0, n.rise, n.length), end))
  } else if (n.style === 'round-curved') {
    const r = Math.min(n.bendRadius, n.length * 0.65, n.drop),
      a = new Vector3(0, 0, n.length - r),
      b = new Vector3(0, -r, n.length)
    path.add(new LineCurve3(start, a))
    path.add(new QuadraticBezierCurve3(a, new Vector3(0, 0, n.length), b))
    if (n.drop > r) path.add(new LineCurve3(b, end))
  } else if (n.style === 'square-angled') {
    const corner = new Vector3(0, 0, n.length * 0.65)
    path.add(new LineCurve3(start, corner))
    path.add(new LineCurve3(corner, end))
  } else {
    const corner = new Vector3(0, 0, n.length)
    path.add(new LineCurve3(start, corner))
    path.add(new LineCurve3(corner, end))
  }
  return { path, end }
}
/** A single closed prism with shared mitres, rather than overlapping segment caps. */
function squareSpoutBody(n: WallSpoutNode) {
  const half = n.tubeSize / 2
  let outline: Vector2[]
  if (n.style === 'square-straight') {
    // A short outlet can terminate before the inside corner of the elbow.
    const innerY = Math.max(-n.drop, -half)
    outline = [
      new Vector2(0, half),
      new Vector2(n.length + half, half),
      new Vector2(n.length + half, -n.drop),
      new Vector2(n.length - half, -n.drop),
      new Vector2(n.length - half, innerY),
      new Vector2(0, -half),
    ]
    // When drop < half, the horizontal underside remains at -half.
    if (n.drop < half)
      outline = [
        new Vector2(0, half),
        new Vector2(n.length + half, half),
        new Vector2(n.length + half, -n.drop),
        new Vector2(n.length, -n.drop),
        new Vector2(n.length, -half),
        new Vector2(0, -half),
      ]
  } else {
    const points = [
      new Vector2(0, 0),
      new Vector2(n.length * 0.65, 0),
      new Vector2(n.length, -n.drop),
    ]
    const directions = points.slice(1).map((point, i) => point.clone().sub(points[i]!).normalize())
    const normals = directions.map((direction) => new Vector2(-direction.y, direction.x))
    const mitre = normals[0]!.clone().add(normals[1]!).normalize()
    mitre.multiplyScalar(half / mitre.dot(normals[0]!))
    const offsets = [
      normals[0]!.clone().multiplyScalar(half),
      mitre,
      normals[1]!.clone().multiplyScalar(half),
    ]
    outline = [
      ...points.map((point, i) => point.clone().add(offsets[i]!)),
      ...points.map((point, i) => point.clone().sub(offsets[i]!)).reverse(),
    ]
  }
  const shape = new Shape()
  outline = outline.filter((point, i) => !point.equals(outline[(i + 1) % outline.length]!))
  outline.forEach((point, i) =>
    i === 0 ? shape.moveTo(-point.x, point.y) : shape.lineTo(-point.x, point.y),
  )
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: n.tubeSize, bevelEnabled: false })
  geometry.rotateY(Math.PI / 2)
  geometry.translate(-half, 0, 0)
  return geometry
}

export function buildWallSpoutGeometry(n: WallSpoutNode, ctx?: GeometryContext) {
  const root = new Group(),
    square = n.style.startsWith('square'),
    waterfall = waterfallSpout(n),
    materials = new Map<string, ReturnType<typeof createDefaultMaterial>>()
  const add = (g: BufferGeometry, slot: string, p: [number, number, number], parent = root) => {
    let mat = materials.get(slot)
    if (!mat) {
      mat =
        (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered') : null) ??
        createDefaultMaterial(slot === 'aerator' ? '#666666' : '#c0c0c0', 0.25, 'rendered')
      const color = n.slots?.[slot] ?? (slot === 'aerator' ? '#666666' : '#c0c0c0')
      const finish = spoutFinishProperties[color.toLowerCase()]
      if (finish) {
        mat = mat.clone()
        delete mat.userData.__pascalCachedMaterial
        Object.assign(mat, finish)
      }
      materials.set(slot, mat)
    }
    const mesh = new Mesh(g, mat)
    mesh.position.fromArray(p)
    mesh.userData = { slotId: slot, __fromGeometry: true }
    parent.add(mesh)
    return mesh
  }
  const segment = (a: Vector3, b: Vector3, size = n.tubeSize, slot = 'body') => {
    const delta = b.clone().sub(a),
      mesh = add(
        square
          ? new BoxGeometry(size, delta.length(), size)
          : new CylinderGeometry(size / 2, size / 2, delta.length(), 32),
        slot,
        a.clone().add(b).multiplyScalar(0.5).toArray(),
      )
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize())
    return mesh
  }
  if (waterfall) {
    const channel = new Group()
    channel.rotation.x = (n.waterfallSlope * Math.PI) / 180
    root.add(channel)
    const wall = 0.003,
      h = n.waterfallHeight,
      w = n.waterfallWidth
    add(new BoxGeometry(w, wall, n.length), 'body', [0, -h / 2, n.length / 2], channel)
    for (const x of [-w / 2 + wall / 2, w / 2 - wall / 2])
      add(new BoxGeometry(wall, h, n.length), 'body', [x, 0, n.length / 2], channel)
    add(new BoxGeometry(w, h, wall), 'body', [0, 0, wall / 2], channel)
    if (n.style === 'waterfall-closed')
      add(new BoxGeometry(w, wall, n.length), 'body', [0, h / 2, n.length / 2], channel)
    if (n.aeratorEnabled)
      add(
        new BoxGeometry(w - wall * 2, wall, h * 0.1),
        'aerator',
        [0, -h / 2 + wall, n.length - 0.005],
        channel,
      )
  } else {
    const { path, end } = spoutPath(n)
    if (square) {
      add(squareSpoutBody(n), 'body', [0, 0, 0]).name = 'spout-square-body'
    } else if (n.style === 'round-tapered') {
      const main = add(
        new CylinderGeometry(n.tubeSize * 0.35, n.tubeSize * 0.5, n.length, 40),
        'body',
        [0, 0, n.length / 2],
      )
      main.rotation.x = Math.PI / 2
      add(new SphereGeometry(n.tubeSize * 0.35, 24, 16), 'body', [0, 0, n.length])
      segment(new Vector3(0, 0, n.length), end, n.tubeSize * 0.7)
    } else add(new TubeGeometry(path, 64, n.tubeSize / 2, 24, false), 'body', [0, 0, 0])
    const outletSize = n.style === 'round-tapered' ? n.tubeSize * 0.7 : n.tubeSize,
      outlet = spoutWaterOutlet(n)
    const tip = new Group()
    tip.name = 'spout-outlet-rim'
    tip.position.fromArray(outlet)
    tip.rotation.set(...wallSpoutSockets(n).find((s) => s.id === 'water-outlet')!.rotation)
    root.add(tip)
    const collar = add(
      square
        ? new BoxGeometry(outletSize * 1.06, 0.009, outletSize * 1.06)
        : new TorusGeometry(outletSize * 0.46, outletSize * 0.07, 10, 32),
      'outlet',
      [0, 0, 0],
      tip,
    )
    if (!square) collar.rotation.x = Math.PI / 2
    if (n.aeratorEnabled) {
      const face = add(
        square
          ? new BoxGeometry(outletSize * 0.8, 0.001, outletSize * 0.8)
          : new CylinderGeometry(outletSize * 0.4, outletSize * 0.4, 0.001, 32),
        'aerator',
        [0, -0.005, 0],
        tip,
      )
      face.userData.slotId = 'aerator'
    }
  }
  if (n.flangeEnabled) {
    const rectangle = n.flangeShape === 'rectangle',
      size = rectangle ? Math.max(n.flangeSize, n.waterfallWidth) : n.flangeSize,
      flange = add(
        n.flangeShape === 'round'
          ? new CylinderGeometry(size / 2, size / 2, n.flangeThickness, 40)
          : new BoxGeometry(
              size,
              rectangle ? Math.max(0.04, n.waterfallHeight * 1.5) : size,
              n.flangeThickness,
            ),
        'flange',
        [0, 0, n.flangeThickness / 2],
      )
    if (n.flangeShape === 'round') flange.rotation.x = Math.PI / 2
  }
  if (n.diverterStyle !== 'none') {
    const desiredZ = n.length * (n.diverterStyle === 'button' ? 0.25 : 0.75)
    // Keep the vertical pull-up stem and cap on the flat body before the bend.
    const z =
        n.style === 'square-angled'
          ? Math.min(desiredZ, n.length * 0.65 - n.diverterSize / 2 - 0.003)
          : desiredZ,
      y = waterfall
        ? n.waterfallHeight / 2 - Math.tan((n.waterfallSlope * Math.PI) / 180) * z
        : n.tubeSize / 2,
      raise = n.diverterRaised ? 0.015 : 0
    add(
      new CylinderGeometry(n.diverterSize * 0.25, n.diverterSize * 0.25, 0.014 + raise, 20),
      'diverter',
      [0, y + (0.014 + raise) / 2, z],
    )
    add(
      square
        ? new BoxGeometry(n.diverterSize, 0.008, n.diverterSize)
        : new CylinderGeometry(n.diverterSize / 2, n.diverterSize / 2, 0.008, 24),
      'diverter',
      [0, y + 0.018 + raise, z],
    )
  }
  if (n.fixtureType === 'bib') {
    const z = n.length * 0.27,
      y = n.tubeSize / 2 + 0.015
    add(new CylinderGeometry(n.tubeSize * 0.38, n.tubeSize * 0.38, 0.03, 24), 'handle', [
      0,
      y - 0.015,
      z,
    ])
    const handle = new Group()
    handle.position.set(0, y, z)
    handle.rotation.y = (n.handleAngle * Math.PI) / 180
    root.add(handle)
    if (n.handleStyle === 'knob')
      add(
        new CylinderGeometry(n.tubeSize * 0.6, n.tubeSize * 0.6, 0.02, 32),
        'handle',
        [0, 0.01, 0],
        handle,
      )
    else {
      add(
        new BoxGeometry(n.tubeSize * 0.25, 0.012, n.handleLength),
        'handle',
        [0, 0.006, n.handleStyle === 'lever' ? n.handleLength / 2 : 0],
        handle,
      )
      if (n.handleStyle === 'cross')
        add(
          new BoxGeometry(n.handleLength, 0.012, n.tubeSize * 0.25),
          'handle',
          [0, 0.006, 0],
          handle,
        )
    }
  }
  if (n.hoseOutletEnabled) {
    const p = wallSpoutSockets(n).find((s) => s.id === 'hose')!.position
    add(new CylinderGeometry(0.012, 0.012, 0.03, 24), 'connector', [p[0], p[1] + 0.015, p[2]])
  }
  addWallSpoutTargets(root, n)
  return root
}
export const wallSpoutGeometryKey = (n: WallSpoutNode) =>
  JSON.stringify([
    2,
    n.fixtureType,
    n.style,
    n.length,
    n.tubeSize,
    n.drop,
    n.rise,
    n.bendRadius,
    n.waterfallWidth,
    n.waterfallHeight,
    n.waterfallSlope,
    n.flangeEnabled,
    n.flangeShape,
    n.flangeSize,
    n.flangeThickness,
    n.diverterStyle,
    n.diverterRaised,
    n.diverterSize,
    n.hoseOutletEnabled,
    n.handleStyle,
    n.handleLength,
    n.handleAngle,
    n.aeratorEnabled,
    n.slots,
  ])
