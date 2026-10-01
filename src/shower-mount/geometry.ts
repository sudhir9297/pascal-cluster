import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  TorusGeometry,
  type BufferGeometry,
} from 'three'
import { addShowerMountTargets, showerMountSockets } from './targets'
import { hasHolder, hasSupply, isRail, hasAdjustmentLever, type ShowerMountNode } from './schema'

export function buildShowerMountGeometry(n: ShowerMountNode, ctx?: GeometryContext) {
  const root = new Group()
  const square = n.style.startsWith('square')
  const rail = isRail(n)
  const material = (slot: string) =>
    (n.slots?.[slot] ? resolveMaterialRef(n.slots[slot], ctx?.materials, 'rendered') : null) ??
    createDefaultMaterial('#ffffff', 0.25, 'rendered')
  const add = (
    g: BufferGeometry,
    slot: string,
    position: [number, number, number],
    parent = root,
  ) => {
    const mesh = new Mesh(g, material(slot))
    mesh.position.fromArray(position)
    mesh.userData = { slotId: slot, __fromGeometry: true }
    parent.add(mesh)
    return mesh
  }
  const axial = (
    size: number,
    length: number,
    slot: string,
    position: [number, number, number],
  ) => {
    const mesh = add(
      square
        ? new BoxGeometry(size, size, length)
        : new CylinderGeometry(size / 2, size / 2, length, 40),
      slot,
      position,
    )
    if (!square) mesh.rotation.x = Math.PI / 2
    return mesh
  }
  const bracketY = n.railLength / 2 - Math.min(n.railBracketInset, n.railLength / 4)
  for (const y of rail ? [-bracketY, bracketY] : [0]) {
    if (n.flangeEnabled) {
      axial(n.flangeSize, n.flangeThickness, 'flange', [0, y, n.flangeThickness / 2])
      // Raised centre and a narrow perimeter seam distinguish the wall cover from the body.
      axial(n.flangeSize * 0.78, 0.002, 'flange', [0, y, n.flangeThickness + 0.001])
    }
    axial(n.tubeSize * (rail ? 1.35 : 1.6), n.projection, 'body', [0, y, n.projection / 2])
    axial(n.tubeSize * 1.7, 0.006, 'body', [0, y, n.projection - 0.003])
  }
  if (rail) {
    add(
      square
        ? new BoxGeometry(n.tubeSize, n.railLength, n.tubeSize)
        : new CylinderGeometry(n.tubeSize / 2, n.tubeSize / 2, n.railLength, 40),
      'body',
      [0, 0, n.projection],
    )
    for (const sign of [-1, 1]) {
      add(
        square
          ? new BoxGeometry(n.tubeSize * 1.08, 0.008, n.tubeSize * 1.08)
          : new CylinderGeometry(n.tubeSize * 0.54, n.tubeSize * 0.54, 0.008, 40),
        'body',
        [0, sign * (n.railLength / 2 - 0.004), n.projection],
      )
    }
    const y = (n.sliderPosition - 0.5) * n.railLength
    add(
      square
        ? new BoxGeometry(n.tubeSize * 1.6, 0.045, n.tubeSize * 1.6)
        : new CylinderGeometry(n.tubeSize * 0.8, n.tubeSize * 0.8, 0.045, 40),
      'holder',
      [0, y, n.projection],
    )
    const lock = add(new CylinderGeometry(0.009, 0.009, 0.012, 32), 'holder', [
      n.tubeSize * 0.9,
      y,
      n.projection,
    ])
    lock.rotation.z = Math.PI / 2
    add(new BoxGeometry(0.012, 0.028, 0.009), 'holder', [n.tubeSize * 1.1, y - 0.008, n.projection])
    if (n.shelfEnabled) {
      const sy = -n.railLength * 0.25
      add(new BoxGeometry(n.shelfWidth, 0.008, n.shelfDepth), 'shelf', [
        0,
        sy,
        n.projection + n.shelfDepth / 2,
      ])
      for (const x of [-n.shelfWidth / 2 + 0.003, n.shelfWidth / 2 - 0.003])
        add(new BoxGeometry(0.006, 0.012, n.shelfDepth), 'shelf', [
          x,
          sy + 0.006,
          n.projection + n.shelfDepth / 2,
        ])
      add(new BoxGeometry(n.shelfWidth, 0.012, 0.006), 'shelf', [
        0,
        sy + 0.006,
        n.projection + n.shelfDepth - 0.003,
      ])
    }
  }
  if (hasHolder(n)) {
    const socket = showerMountSockets(n).find((s) => s.id === 'hand-shower')!
    const holder = new Group()
    holder.position.fromArray(socket.position)
    holder.rotation.set(...socket.rotation)
    root.add(holder)
    const outer = n.holderDiameter / 2
    const inner = Math.min(0.012, outer * 0.65)
    // Open-sided fork, with two lips and a deep cradle, leaves room for the handset grip.
    for (const y of [-n.holderDepth / 2, n.holderDepth / 2]) {
      const rim = add(
        new TorusGeometry((outer + inner) / 2, (outer - inner) / 2, 12, 40, Math.PI * 1.55),
        'holder',
        [0, y, 0],
        holder,
      )
      rim.rotation.x = Math.PI / 2
      rim.rotation.z = Math.PI * 0.225
    }
    for (const x of [-1, 1])
      add(
        new BoxGeometry((outer - inner) * 0.8, n.holderDepth, outer),
        'holder',
        [(x * (outer + inner)) / 2, 0, -outer / 2],
        holder,
      )
    add(
      new BoxGeometry(n.holderDiameter * 0.7, n.holderDepth, outer - inner),
      'holder',
      [0, 0, -outer],
      holder,
    )
    const pivot = add(
      new CylinderGeometry(
        n.holderDiameter * 0.42,
        n.holderDiameter * 0.42,
        n.holderDiameter * 0.85,
        40,
      ),
      'holder',
      [0, socket.position[1], n.projection],
    )
    pivot.rotation.z = Math.PI / 2
    const cap = add(
      new CylinderGeometry(n.holderDiameter * 0.27, n.holderDiameter * 0.27, 0.004, 32),
      'holder',
      [n.holderDiameter * 0.45, socket.position[1], n.projection],
    )
    cap.rotation.z = Math.PI / 2
    if (hasAdjustmentLever(n))
      add(new BoxGeometry(0.008, n.holderDiameter * 0.8, 0.01), 'holder', [
        n.holderDiameter * 0.5,
        socket.position[1] - n.holderDiameter * 0.25,
        n.projection,
      ])
  }
  if (hasSupply(n)) {
    const socket = showerMountSockets(n).find((s) => s.id === 'hose')!
    const y = socket.position[1]
    // The shoulder joins the body; the threaded nipple terminates exactly at the hose slot.
    add(new CylinderGeometry(0.014, 0.014, n.outletLength * 0.25, 40), 'connector', [
      0,
      y + n.outletLength * 0.875,
      socket.position[2],
    ])
    add(new CylinderGeometry(0.0105, 0.0105, n.outletLength * 0.75, 40), 'connector', [
      0,
      y + n.outletLength * 0.375,
      socket.position[2],
    ])
    for (let i = 0; i < 5; i++) {
      const thread = add(new TorusGeometry(0.0105, 0.0008, 8, 40), 'connector', [
        0,
        y + 0.002 + i * n.outletLength * 0.1,
        socket.position[2],
      ])
      thread.rotation.x = Math.PI / 2
    }
  }
  addShowerMountTargets(root, n)
  return root
}
export const showerMountGeometryKey = (n: ShowerMountNode) =>
  JSON.stringify([
    4,
    n.style,
    n.tubeSize,
    n.flangeEnabled,
    n.flangeSize,
    n.flangeThickness,
    n.projection,
    n.holderDiameter,
    n.holderDepth,
    n.holderTilt,
    hasAdjustmentLever(n),
    n.outletLength,
    n.railBracketInset,
    n.railLength,
    n.sliderPosition,
    n.railSupply,
    n.shelfEnabled,
    n.shelfWidth,
    n.shelfDepth,
    n.slots,
  ])
