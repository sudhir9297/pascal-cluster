import { type GeometryContext, type AnyNodeId } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  TubeGeometry,
  CurvePath,
  LineCurve3,
  QuadraticBezierCurve3,
  Vector3,
  Euler,
  Shape,
  ExtrudeGeometry,
  type BufferGeometry,
} from 'three'
import { type ShowerAssemblyNode } from './schema'
import { addAssemblyTargets, assemblySockets, assemblyFront, assemblyHolder } from './targets'
import { buildShowerControlGeometry } from '../shower-control/geometry'
import { ShowerControlNode } from '../shower-control/schema'
import { buildBodyJetGeometry } from '../body-jet/geometry'
import { buildWallSpoutGeometry } from '../wall-spout/geometry'
import { assemblyJet, assemblyJetHeight, assemblySpout, assemblySurface } from './parts'
import { buildShowerHeadGeometry } from '../shower-head/geometry'
import { ShowerHeadNode } from '../shower-head/schema'
import { HandShowerNode } from '../hand-shower/schema'
import { ShowerHoseNode } from '../shower-hose/schema'
import { buildHandShowerGeometry, handShowerHoseTarget } from '../hand-shower/geometry'
import { buildHoseAt } from '../shower-hose/geometry'
import { assemblyChildren } from './children'

function panelShape(n: ShowerAssemblyNode) {
  if (n.profile === 'curved') {
    const s = new Shape()
    s.moveTo(0, 0)
    s.lineTo(-n.depth, 0)
    s.quadraticCurveTo(-n.depth - 0.07, n.height * 0.5, -n.depth, n.height)
    s.lineTo(0, n.height)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: n.width, bevelEnabled: false, curveSegments: 32 })
    g.rotateY(Math.PI / 2)
    g.translate(-n.width / 2, 0, 0)
    return g
  }
  const w = n.width,
    h = n.height,
    r = n.profile === 'rounded' ? Math.min(0.04, w * 0.2) : 0.001,
    s = new Shape(),
    x = -w / 2
  s.moveTo(x + r, 0)
  s.lineTo(x + w - r, 0)
  s.quadraticCurveTo(x + w, 0, x + w, r)
  s.lineTo(x + w, h - r)
  s.quadraticCurveTo(x + w, h, x + w - r, h)
  s.lineTo(x + r, h)
  s.quadraticCurveTo(x, h, x, h - r)
  s.lineTo(x, r)
  s.quadraticCurveTo(x, 0, x + r, 0)
  return new ExtrudeGeometry(s, { depth: n.depth, bevelEnabled: false, curveSegments: 12 })
}
export function buildShowerAssemblyGeometry(n: ShowerAssemblyNode, ctx?: GeometryContext) {
  const root = new Group(),
    front = assemblyFront(n),
    square = n.profile === 'square'
  const add = (g: BufferGeometry, slot: string, p: [number, number, number]) => {
    const material =
      (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered') : null) ??
      createDefaultMaterial(
        slot === 'body' && n.family === 'panel' ? '#42464d' : '#ffffff',
        0.25,
        'rendered',
      )
    const mesh = new Mesh(g, material)
    mesh.position.fromArray(p)
    mesh.userData = { slotId: slot, assemblyPart: true, __fromGeometry: true }
    root.add(mesh)
    return mesh
  }
  const nested = (g: Group, p: [number, number, number], map: Record<string, string> = {}) => {
    for (const child of [...g.children]) if (child.userData.slotType) g.remove(child)
    g.traverse((o) => {
      if (o instanceof Mesh && map[o.userData.slotId]) o.userData.slotId = map[o.userData.slotId]
    })
    g.position.fromArray(p)
    root.add(g)
    return g
  }
  if (n.family === 'panel') add(panelShape(n), 'body', [0, 0, 0])
  const radius = n.tubeSize / 2,
    armEnd = front + n.armLength,
    path = new CurvePath<Vector3>()
  if (n.family === 'column') {
    path.add(new LineCurve3(new Vector3(0, 0, front), new Vector3(0, n.height - 0.06, front)))
    path.add(
      new QuadraticBezierCurve3(
        new Vector3(0, n.height - 0.06, front),
        new Vector3(0, n.height, front),
        new Vector3(0, n.height, front + 0.06),
      ),
    )
  }
  const start =
    n.family === 'panel'
      ? new Vector3(0, n.height - 0.03, front)
      : new Vector3(0, n.height, front + 0.06)
  if (n.family === 'column' && n.profile === 'curved')
    path.add(
      new QuadraticBezierCurve3(
        start,
        new Vector3(0, n.height + 0.08, front + n.armLength * 0.65),
        new Vector3(0, n.height - 0.04, armEnd),
      ),
    )
  else {
    path.add(new LineCurve3(start, new Vector3(0, n.height, armEnd - 0.04)))
    path.add(
      new QuadraticBezierCurve3(
        new Vector3(0, n.height, armEnd - 0.04),
        new Vector3(0, n.height, armEnd),
        new Vector3(0, n.height - 0.04, armEnd),
      ),
    )
  }
  if (square)
    for (const curve of path.curves) {
      const a = curve.getPoint(0),
        b = curve.getPoint(1),
        delta = b.clone().sub(a),
        mesh = add(
          new BoxGeometry(n.tubeSize, delta.length(), n.tubeSize),
          'pipe',
          a.add(b).multiplyScalar(0.5).toArray(),
        )
      mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize())
    }
  else add(new TubeGeometry(path, 96, radius, 20, false), 'pipe', [0, 0, 0])
  if (n.flangeEnabled && n.family === 'column')
    for (const y of [n.height * 0.12, n.height * 0.86]) {
      const bracket = add(new CylinderGeometry(radius, radius, front, 24), 'brackets', [
        0,
        y,
        front / 2,
      ])
      bracket.rotation.x = Math.PI / 2
      const flange = add(
        square
          ? new BoxGeometry(n.flangeSize, n.flangeSize, 0.007)
          : new CylinderGeometry(n.flangeSize / 2, n.flangeSize / 2, 0.007, 32),
        'brackets',
        [0, y, 0.0035],
      )
      if (!square) flange.rotation.x = Math.PI / 2
    }
  const holder = assemblyHolder(n),
    holderStart = n.family === 'panel' ? ((n.holderSide === 'left' ? -1 : 1) * n.width) / 2 : 0
  add(new BoxGeometry(Math.abs(holder[0] - holderStart), 0.025, 0.03), 'holder', [
    (holder[0] + holderStart) / 2,
    holder[1],
    holder[2],
  ])
  const cradle = add(new BoxGeometry(0.035, 0.02, 0.045), 'holder', holder)
  cradle.rotation.x = (n.holderTilt * Math.PI) / 180
  const control = ShowerControlNode.parse(
    n.family === 'column'
      ? {
          layout: n.controlStyle === 'thermostat' ? 'bar' : 'bridge',
          handleStyle: n.controlStyle === 'thermostat' ? 'knob' : n.controlStyle,
          plateShape: square ? 'square' : 'round',
          handleShape: square ? 'square' : 'round',
          projection: front,
          bodyWidth: 0.26,
          flangeEnabled: false,
          slots: n.slots,
        }
      : {
          layout: 'dual',
          plateShape: 'rectangle',
          plateWidth: Math.min(n.width * 0.7, 0.13),
          plateHeight: 0.2,
          handleStyle: n.controlStyle === 'lever' ? 'lever' : 'knob',
          flangeEnabled: false,
          slots: n.slots,
        },
  )
  nested(
    buildShowerControlGeometry(control, ctx),
    [
      0,
      n.family === 'panel' ? n.height * 0.24 : 0,
      n.family === 'panel' ? assemblySurface(n, n.height * 0.24) : 0,
    ],
    { handles: 'controls', plate: 'controls', body: 'controls' },
  )
  for (let i = 0; i < n.jets; i++)
    nested(
      buildBodyJetGeometry(assemblyJet(n), ctx),
      [0, assemblyJetHeight(n, i), assemblySurface(n, assemblyJetHeight(n, i))],
      { body: 'jets', face: 'jets' },
    )
  if (n.spoutEnabled)
    nested(
      buildWallSpoutGeometry(assemblySpout(n), ctx),
      [
        0,
        n.family === 'panel' ? n.height * 0.07 : -0.03,
        assemblySurface(n, n.family === 'panel' ? n.height * 0.07 : -0.03),
      ],
      { body: 'spout' },
    )
  if (n.shelfEnabled)
    add(new BoxGeometry(n.width * 0.9, 0.012, 0.12), 'shelf', [0, n.height * 0.37, front + 0.06])
  if (n.waterfallEnabled) {
    add(new BoxGeometry(n.width * 0.8, 0.025, n.armLength), 'waterfall', [
      0,
      n.height - 0.025,
      front + n.armLength / 2,
    ])
    add(new BoxGeometry(n.width * 0.7, 0.003, 0.008), 'aerator', [
      0,
      n.height - 0.04,
      armEnd - 0.005,
    ])
  }
  for (const s of assemblySockets(n))
    if (s.id === 'hose')
      add(new CylinderGeometry(0.011, 0.011, 0.018, 24), 'connector', [
        s.position[0],
        s.position[1] - 0.009,
        s.position[2],
      ])
  addAssemblyTargets(root, n)
  return root
}

// Preview includes separate child models. Persisted assembly geometry deliberately excludes them.
export function buildAssemblyPreview(n: ShowerAssemblyNode, ctx?: GeometryContext) {
  const root = buildShowerAssemblyGeometry(n, ctx),
    slots = assemblySockets(n),
    defaults = assemblyChildren(n)
  const existing = n.children.map((id) => ctx?.resolve?.(id as AnyNodeId)).filter(Boolean)
  const headRaw = existing.find((c) => String(c?.type) === 'bath-space:shower-head'),
    handRaw = existing.find((c) => String(c?.type) === 'bath-space:hand-shower'),
    hoseRaw = existing.find((c) => String(c?.type) === 'bath-space:shower-hose')
  const head = headRaw ? ShowerHeadNode.parse(headRaw) : defaults.head,
    hand = handRaw ? HandShowerNode.parse(handRaw) : defaults.hand,
    hose = hoseRaw ? ShowerHoseNode.parse(hoseRaw) : defaults.hose
  const headSlot = slots.find((s) => s.id === 'shower-head'),
    handSlot = slots.find((s) => s.id === 'hand-shower'),
    hoseSlot = slots.find((s) => s.id === 'hose')
  if (head && headSlot) {
    const g = buildShowerHeadGeometry(head, ctx)
    g.position.fromArray(headSlot.position)
    g.rotation.set(...headSlot.rotation)
    root.add(g)
  }
  if (hand && handSlot) {
    const g = buildHandShowerGeometry(hand, ctx)
    g.position.fromArray(handSlot.position)
    g.rotation.set(...handSlot.rotation)
    root.add(g)
  }
  if (hose && hand && handSlot && hoseSlot) {
    const end = new Vector3(...handShowerHoseTarget(hand).position)
      .applyEuler(new Euler(...handSlot.rotation))
      .add(new Vector3(...handSlot.position))
      .sub(new Vector3(...hoseSlot.position))
    const direction = new Vector3(0, -1, 0).applyEuler(new Euler(...handSlot.rotation))
    const g = buildHoseAt(hose, end, direction, ctx)
    g.position.fromArray(hoseSlot.position)
    root.add(g)
  }
  return root
}
export const showerAssemblyGeometryKey = (n: ShowerAssemblyNode) => {
  const {
    id,
    type,
    object,
    parentId,
    children,
    wallId,
    position,
    rotation,
    side,
    mountingHeight,
    metadata,
    visible,
    name,
    defaultHead,
    defaultHand,
    ...shape
  } = n
  return JSON.stringify(shape)
}
