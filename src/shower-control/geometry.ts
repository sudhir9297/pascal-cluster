import { buildWallSpoutGeometry } from '../wall-spout/geometry'
import { bathMixerSpout, bathSpoutOrigin } from './bath-spout'
import { type GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three'
import { exposedControl, type ShowerControlNode } from './schema'
import { addShowerControlTargets, showerControlSockets } from './targets'
export function controlDimensions(n: ShowerControlNode) {
  const height =
      n.plateShape === 'round' || n.plateShape === 'square' ? n.plateWidth : n.plateHeight,
    spacing = Math.min(n.controlSpacing, height * 0.42),
    diameter = Math.min(
      n.handleDiameter,
      n.plateWidth * 0.6,
      n.layout === 'dual' ? spacing * 0.75 : height * 0.45,
    )
  return { height, spacing, diameter }
}
function roundedPlate(width: number, height: number, depth: number) {
  const r = Math.min(width, height) * 0.08,
    s = new Shape(),
    x = -width / 2,
    y = -height / 2
  s.moveTo(x + r, y)
  s.lineTo(x + width - r, y)
  s.quadraticCurveTo(x + width, y, x + width, y + r)
  s.lineTo(x + width, y + height - r)
  s.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  s.lineTo(x + r, y + height)
  s.quadraticCurveTo(x, y + height, x, y + height - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return new ExtrudeGeometry(s, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  })
}
export function buildShowerControlGeometry(n: ShowerControlNode, ctx?: GeometryContext) {
  const root = new Group(),
    exposed = exposedControl(n),
    square = n.plateShape === 'square',
    squareHandle = n.handleShape === 'square',
    d = controlDimensions(n)
  const add = (
    g: BufferGeometry,
    slot: string,
    p: [number, number, number],
    parent: Group = root,
  ) => {
    const m = new Mesh(
      g,
      (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered') : null) ??
        createDefaultMaterial(slot === 'markings' ? '#404040' : '#ffffff', 0.25, 'rendered'),
    )
    m.position.fromArray(p)
    m.userData = { slotId: slot, __fromGeometry: true }
    parent.add(m)
    return m
  }
  const axial = (
    radius: number,
    length: number,
    slot: string,
    p: [number, number, number],
    axis: 'x' | 'z' = 'z',
    parent = root,
  ) => {
    const m = add(new CylinderGeometry(radius, radius, length, 32), slot, p, parent)
    m.rotation[axis === 'z' ? 'x' : 'z'] = Math.PI / 2
    return m
  }
  const handle = (
    x: number,
    y: number,
    z: number,
    angle: number,
    diameter = d.diameter,
    side = false,
  ) => {
    const group = new Group()
    group.position.set(x, y, z)
    group.rotation[side ? 'x' : 'z'] = (angle * Math.PI) / 180
    root.add(group)
    if (side) {
      if (squareHandle) add(new BoxGeometry(0.035, diameter, diameter), 'handles', [0, 0, 0], group)
      else axial(diameter / 2, 0.035, 'handles', [0, 0, 0], 'x', group)
    } else {
      if (n.handleStyle === 'knob' && squareHandle)
        add(
          new BoxGeometry(diameter, diameter, n.handleProjection * 0.65),
          'handles',
          [0, 0, n.handleProjection * 0.325],
          group,
        )
      else
        axial(
          diameter / 2,
          n.handleProjection * 0.65,
          'handles',
          [0, 0, n.handleProjection * 0.325],
          'z',
          group,
        )
    }
    // Collar and inset cap give each control a distinct joint and front face.
    if (side) {
      axial(diameter * 0.53, 0.005, 'handles', [0, 0, 0], 'x', group)
      axial(diameter * 0.42, 0.002, 'handles', [x < 0 ? -0.019 : 0.019, 0, 0], 'x', group)
    } else {
      axial(diameter * 0.55, 0.005, 'handles', [0, 0, 0.0025], 'z', group)
      axial(
        diameter * 0.42,
        0.002,
        'handles',
        [0, 0, n.handleProjection * 0.65 + 0.001],
        'z',
        group,
      )
    }
    if (n.handleStyle === 'knob' && !squareHandle)
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16
        if (side)
          axial(
            0.0008,
            0.026,
            'handles',
            [0, (Math.cos(a) * diameter) / 2, (Math.sin(a) * diameter) / 2],
            'x',
            group,
          )
        else
          axial(
            0.0008,
            n.handleProjection * 0.45,
            'handles',
            [(Math.cos(a) * diameter) / 2, (Math.sin(a) * diameter) / 2, n.handleProjection * 0.36],
            'z',
            group,
          )
      }
    if (n.handleStyle === 'lever')
      add(
        squareHandle
          ? new BoxGeometry(diameter * 0.28, n.handleLength, diameter * 0.25)
          : new CylinderGeometry(diameter * 0.1, diameter * 0.14, n.handleLength, 24),
        'handles',
        [0, -n.handleLength / 2, side ? 0.022 : n.handleProjection * 0.7],
        group,
      )
    if (n.handleStyle === 'cross') {
      add(
        new BoxGeometry(diameter * 0.25, n.handleLength, diameter * 0.25),
        'handles',
        [0, 0, n.handleProjection * 0.72],
        group,
      )
      add(
        new BoxGeometry(n.handleLength, diameter * 0.25, diameter * 0.25),
        'handles',
        [0, 0, n.handleProjection * 0.72],
        group,
      )
    }
    if (n.handleStyle === 'cross' && !squareHandle)
      for (const [cx, cy] of [
        [0, -n.handleLength / 2],
        [0, n.handleLength / 2],
        [-n.handleLength / 2, 0],
        [n.handleLength / 2, 0],
      ])
        add(
          new SphereGeometry(diameter * 0.16, 16, 12),
          'handles',
          [cx!, cy!, n.handleProjection * 0.72],
          group,
        )
    if (n.markingsEnabled && side)
      add(
        new BoxGeometry(0.0015, diameter * 0.28, 0.002),
        'markings',
        [x < 0 ? -0.0205 : 0.0205, diameter * 0.23, 0],
        group,
      )
    if (n.markingsEnabled && !side)
      add(
        new BoxGeometry(0.002, diameter * 0.28, 0.0015),
        'markings',
        [0, diameter * 0.23, side ? 0.019 : n.handleProjection * 0.66 + 0.001],
        group,
      )
  }
  if (exposed) {
    for (const x of [
      -Math.min(n.inletSpacing, n.bodyWidth - 0.05) / 2,
      Math.min(n.inletSpacing, n.bodyWidth - 0.05) / 2,
    ]) {
      axial(n.tubeSize * 0.42, n.projection, 'body', [x, 0, n.projection / 2])
      axial(n.tubeSize * 0.56, 0.012, 'connectors', [x, 0, n.projection * 0.4])
      if (n.flangeEnabled) {
        const m = add(
          square
            ? new BoxGeometry(n.tubeSize * 1.5, n.tubeSize * 1.5, n.flangeThickness)
            : new CylinderGeometry(n.tubeSize * 0.75, n.tubeSize * 0.75, n.flangeThickness, 32),
          'plate',
          [x, 0, n.flangeThickness / 2],
        )
        if (!square) m.rotation.x = Math.PI / 2
      }
    }
    if (square)
      add(new BoxGeometry(n.bodyWidth, n.tubeSize, n.tubeSize), 'body', [0, 0, n.projection])
    else axial(n.tubeSize / 2, n.bodyWidth, 'body', [0, 0, n.projection], 'x')
    if (n.layout === 'bar') {
      handle(-n.bodyWidth / 2, 0, n.projection, n.handleAngle, n.handleDiameter, true)
      handle(n.bodyWidth / 2, 0, n.projection, n.secondaryAngle, n.handleDiameter, true)
    } else if (n.layout === 'bath-single') {
      handle(
        0,
        n.tubeSize / 2 + n.handleDiameter * 0.6,
        n.projection,
        n.handleAngle,
        n.handleDiameter,
      )
      add(
        new CylinderGeometry(
          n.handleDiameter * 0.38,
          n.handleDiameter * 0.38,
          n.handleDiameter * 0.6,
          24,
        ),
        'body',
        [0, n.tubeSize / 2 + n.handleDiameter * 0.3, n.projection],
      )
    } else {
      handle(
        -Math.min(n.inletSpacing, n.bodyWidth - 0.05) / 2,
        0,
        n.projection + n.tubeSize / 2,
        n.handleAngle,
        n.handleDiameter,
      )
      handle(
        Math.min(n.inletSpacing, n.bodyWidth - 0.05) / 2,
        0,
        n.projection + n.tubeSize / 2,
        n.secondaryAngle,
        n.handleDiameter,
      )
    }
  } else {
    if (n.flangeEnabled) {
      if (n.plateShape === 'round')
        axial(n.plateWidth / 2, n.flangeThickness, 'plate', [0, 0, n.flangeThickness / 2])
      else if (n.plateShape === 'soft-rectangle')
        add(roundedPlate(n.plateWidth, d.height, n.flangeThickness), 'plate', [0, 0, 0])
      else
        add(new BoxGeometry(n.plateWidth, d.height, n.flangeThickness), 'plate', [
          0,
          0,
          n.flangeThickness / 2,
        ])
    }
    if (n.layout === 'dual') {
      handle(
        0,
        d.spacing / 2,
        n.flangeThickness,
        n.handleAngle +
          (n.function === 'diverter' ? ((n.selectedOutlet - 1) * 360) / n.outletCount : 0),
      )
      handle(0, -d.spacing / 2, n.flangeThickness, n.secondaryAngle)
    } else if (n.layout === 'buttons') {
      handle(
        0,
        -d.height * 0.2,
        n.flangeThickness,
        n.handleAngle +
          (n.function === 'diverter' ? ((n.selectedOutlet - 1) * 360) / n.outletCount : 0),
      )
      const size = Math.min(0.03, n.plateWidth / (n.buttonCount + 1))
      for (let i = 0; i < n.buttonCount; i++) {
        const x = (i - (n.buttonCount - 1) / 2) * size * 1.5
        add(new BoxGeometry(size * 1.12, size * 1.12, 0.003), 'handles', [
          x,
          d.height * 0.23,
          n.flangeThickness + 0.0015,
        ])
        add(roundedPlate(size, size, 0.007), 'buttons', [
          x,
          d.height * 0.23,
          n.flangeThickness + 0.003,
        ])
        if (n.markingsEnabled)
          add(new BoxGeometry(size * 0.25, 0.002, 0.001), 'markings', [
            x,
            d.height * 0.23,
            n.flangeThickness + 0.01,
          ])
      }
    } else
      handle(
        0,
        0,
        n.flangeThickness,
        n.handleAngle +
          (n.function === 'diverter' ? ((n.selectedOutlet - 1) * 360) / n.outletCount : 0),
      )
  }
  if (exposed && n.spoutEnabled) {
    const spout = buildWallSpoutGeometry(bathMixerSpout(n), ctx)
    for (const child of [...spout.children]) if (child.userData.slotType) spout.remove(child)
    spout.name = 'bath-spout-model'
    spout.position.fromArray(bathSpoutOrigin(n))
    spout.rotation.y = (n.spoutSwivel * Math.PI) / 180
    spout.traverse((o) => {
      if (o instanceof Mesh && o.userData.slotId === 'body') o.userData.slotId = 'spout'
    })
    root.add(spout)
    if (n.riserEnabled)
      add(
        new CylinderGeometry(n.tubeSize * 0.35, n.tubeSize * 0.35, n.riserHeight, 24),
        'connectors',
        [0, n.tubeSize / 2 + n.riserHeight / 2, n.projection],
      )
  }
  for (const socket of showerControlSockets(n))
    if (socket.id === 'hose') {
      const p = socket.position
      if (!exposed) axial(n.tubeSize * 0.35, n.projection, 'body', [0, p[1], n.projection / 2])
      add(new CylinderGeometry(0.011, 0.011, 0.018, 32), 'connectors', [p[0], p[1] - 0.009, p[2]])
      for (let i = 0; i < 5; i++) {
        const ring = add(new TorusGeometry(0.011, 0.0007, 8, 32), 'connectors', [
          p[0],
          p[1] - 0.003 - i * 0.003,
          p[2],
        ])
        ring.rotation.x = Math.PI / 2
      }
    }
  if (n.function === 'diverter' && n.markingsEnabled)
    for (let i = 0; i < n.outletCount; i++) {
      const angle = (i * Math.PI * 2) / n.outletCount
      add(new BoxGeometry(0.003, 0.006, 0.0015), 'markings', [
        Math.sin(angle) * n.plateWidth * 0.35,
        Math.cos(angle) * d.height * 0.35,
        n.flangeThickness + 0.001,
      ])
    }
  addShowerControlTargets(root, n)
  return root
}
export const showerControlGeometryKey = (n: ShowerControlNode) =>
  JSON.stringify([
    4,
    n.layout,
    n.function,
    n.selectedOutlet,
    n.outletCount,
    n.plateShape,
    n.plateWidth,
    n.plateHeight,
    n.flangeEnabled,
    n.flangeThickness,
    n.tubeSize,
    n.handleStyle,
    n.handleShape,
    n.handleDiameter,
    n.handleLength,
    n.handleProjection,
    n.handleAngle,
    n.secondaryAngle,
    n.controlSpacing,
    n.buttonCount,
    n.bodyWidth,
    n.inletSpacing,
    n.projection,
    n.hoseOutletEnabled,
    n.spoutEnabled,
    n.spoutStyle,
    n.spoutLength,
    n.spoutDrop,
    n.spoutRise,
    n.spoutWidth,
    n.spoutHeight,
    n.spoutSlope,
    n.spoutSwivel,
    n.spoutAerator,
    n.bathDiverterStyle,
    n.bathDiverterRaised,
    n.riserEnabled,
    n.riserHeight,
    n.markingsEnabled,
    n.slots,
  ])
