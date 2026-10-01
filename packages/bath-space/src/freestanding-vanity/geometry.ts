import type { GeometryContext } from '@pascal-app/core'
import { BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, type BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { VanityParameters, VanityNode, WALL_MOUNTED_VANITY } from './schema'
import { vanityMaterials } from './materials'
import { vanitySlotForPart } from './slots'
import { vanityBays, vanityPartOpening } from './layout'

type Vec3 = [number, number, number]

export function vanityGeometryKey(node: VanityNode) {
  const { drawerOpen: _drawerOpen, doorOpen: _doorOpen, ...parameters } = VanityParameters.parse(node)
  return JSON.stringify({ geometryVersion: 4, kind: node.type, parameters, slots: node.slots ?? {} })
}

export function buildFreestandingVanityGeometry(rawNode: VanityNode, ctx?: GeometryContext): Group {
  const node = VanityNode.parse(rawNode)
  const { width, height, depth, panelThickness: t, frontGap: gap } = node
  const group = new Group()
  const materials = vanityMaterials(node, ctx)
  const topThickness = node.countertopEnabled ? node.countertopThickness : 0
  const cabinetTop = height - topThickness
  const wallMounted = node.type === WALL_MOUNTED_VANITY
  const base = wallMounted ? Math.min(node.mountingHeight, cabinetTop - 0.2) : node.legHeight
  const bodyHeight = cabinetTop - base
  const frontZ = -depth / 2 + (node.frontMount === 'inset' ? t : 0)
  const carcassDepth = depth - t
  const isConsole = node.storageLayout === 'console'
  const upperBottom = isConsole ? cabinetTop - bodyHeight * 0.34 : base

  function mesh(name: string, geometry: BufferGeometry, position: Vec3, parent: Group = group) {
    const slotId = vanitySlotForPart(name)
    const result = new Mesh(geometry, materials[slotId])
    result.userData.slotId = slotId
    result.userData.__fromGeometry = true
    result.name = name
    result.position.set(...position)
    result.castShadow = true
    result.receiveShadow = true
    parent.add(result)
    return result
  }

  function box(name: string, size: Vec3, position: Vec3, parent: Group = group, radius = 0) {
    const geometry = radius > 0
      ? new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((value) => value / 3)))
      : new BoxGeometry(...size)
    return mesh(name, geometry, position, parent)
  }

  function cylinder(name: string, radius: number, length: number, position: Vec3, parent: Group = group) {
    return mesh(name, new CylinderGeometry(radius, radius, length, 16), position, parent)
  }

  function front(name: string, w: number, h: number, x: number, y: number, parent: Group) {
    if (node.frontStyle === 'shaker') {
      const frame = Math.min(node.frameWidth, w * 0.23, h * 0.23)
      box(`${name}-panel`, [w - frame * 2, h - frame * 2, t * 0.5], [x, y, t * 0.7], parent, 0.001)
      for (const side of [-1, 1]) {
        box(`${name}-stile-${side}`, [frame, h, t], [x + side * (w - frame) / 2, y, t / 2], parent, 0.0015)
        box(`${name}-rail-${side}`, [w - frame * 2, frame, t], [x, y + side * (h - frame) / 2, t / 2], parent, 0.0015)
      }
    } else {
      box(`${name}-panel`, [w, h, t], [x, y, t / 2], parent, 0.002)
      if (node.frontStyle === 'fluted') {
        const count = Math.max(2, Math.floor(w / node.fluteSpacing))
        const spacing = w / count
        for (let index = 0; index < count; index++) {
          const rib = cylinder(`${name}-flute-${index}`, spacing * 0.32, h - 0.004, [x - w / 2 + spacing * (index + 0.5), y, 0.001], parent)
          rib.scale.z = 0.6
        }
      }
    }
  }

  function handle(name: string, w: number, h: number, x: number, y: number, isDoor: boolean, parent: Group) {
    if (node.handleStyle === 'none') return
    const length = Math.min(node.handleLength, isDoor ? h * 0.5 : w * 0.65)
    const pullY = isDoor ? y + h * 0.2 : y + (node.frontStyle === 'shaker' ? h / 2 - Math.min(node.frameWidth, h * 0.23) / 2 : 0)
    if (node.handleStyle === 'knob') {
      const stem = cylinder(`${name}-knob-stem`, 0.006, 0.018, [x, pullY, -0.01], parent)
      stem.rotation.x = Math.PI / 2
      const knob = mesh(`${name}-knob`, new SphereGeometry(0.013, 16, 12), [x, pullY, -0.025], parent)
      knob.scale.z = 0.7
    } else if (node.handleStyle === 'edge') {
      box(`${name}-edge-lip`, [Math.min(w * 0.65, node.handleLength), 0.008, 0.025], [x, y + h / 2 - 0.004, -0.011], parent, 0.001)
    } else {
      const pull = cylinder(`${name}-bar`, 0.005, length, [x, pullY, -0.03], parent)
      if (!isDoor) pull.rotation.z = Math.PI / 2
      for (const side of [-1, 1]) {
        const stem = cylinder(`${name}-mount-${side}`, 0.004, 0.026,
          [x + (isDoor ? 0 : side * length * 0.36), pullY + (isDoor ? side * length * 0.36 : 0), -0.016], parent)
        stem.rotation.x = Math.PI / 2
      }
    }
  }

  box('vanity-left-side', [t, cabinetTop - upperBottom, carcassDepth], [-width / 2 + t / 2, (upperBottom + cabinetTop) / 2, t / 2])
  box('vanity-right-side', [t, cabinetTop - upperBottom, carcassDepth], [width / 2 - t / 2, (upperBottom + cabinetTop) / 2, t / 2])
  box('vanity-bottom', [width - t * 2, t, carcassDepth], [0, upperBottom + t / 2, t / 2])
  box('vanity-top-brace', [width - t * 2, t, 0.065], [0, cabinetTop - t / 2, -depth / 2 + t + 0.0325])
  box('vanity-back-brace', [width - t * 2, 0.07, t], [0, cabinetTop - 0.035, depth / 2 - t / 2])
  box('vanity-back', [width - t * 2, cabinetTop - upperBottom, 0.008], [0, (upperBottom + cabinetTop) / 2, depth / 2 - 0.012])

  const bays = vanityBays(node)

  const orderedBays = [...bays].sort((a, b) => a.x - b.x)
  for (let i = 0; i < orderedBays.length - 1; i++) {
    const bay = orderedBays[i]!
    box(`vanity-partition-${i}`, [t, cabinetTop - upperBottom - t * 2, carcassDepth - t], [bay.x + bay.width / 2 + gap / 2, (upperBottom + cabinetTop) / 2, t / 2])
  }

  for (const bay of bays) {
    const bayIndex = bay.id
    const availableHeight = cabinetTop - upperBottom - gap * 2
    if (bay.kind === 'doors') {
      const count = bay.doorCount
      const doorWidth = (bay.width - gap * (count - 1)) / count
      for (let i = 0; i < count; i++) {
        const leftHinge = i % 2 === 0
        const doorX = bay.x - bay.width / 2 + doorWidth / 2 + i * (doorWidth + gap)
        const pivot = new Group()
        pivot.name = `vanity-door-${bayIndex}-${i}`
        pivot.position.set(doorX + (leftHinge ? -1 : 1) * doorWidth / 2, upperBottom + gap + availableHeight / 2, frontZ)
        pivot.rotation.y = (leftHinge ? 1 : -1) * vanityPartOpening(node, { id: pivot.name, kind: 'door' }) * Math.PI / 2
        pivot.userData.vanityPose = { kind: 'door', id: pivot.name, direction: leftHinge ? 1 : -1 }
        group.add(pivot)
        const localX = (leftHinge ? 1 : -1) * doorWidth / 2
        front(pivot.name, doorWidth, availableHeight, localX, 0, pivot)
        handle(pivot.name, doorWidth, availableHeight, localX + (leftHinge ? 1 : -1) * doorWidth * 0.28, 0, true, pivot)
        for (const side of [-1, 1]) box(`${pivot.name}-hinge-${side}`, [0.03, 0.04, 0.005], [(leftHinge ? 1 : -1) * 0.02, side * availableHeight * 0.32, t + 0.006], pivot)
      }
    }
    if (bay.kind === 'doors' || bay.kind === 'open') {
      for (let i = 0; i < bay.shelves; i++) box(`vanity-shelf-${bayIndex}-${i}`,
        [bay.width - t * 2, t * 0.75, carcassDepth - 0.055], [bay.x, upperBottom + (cabinetTop - upperBottom) * (i + 1) / (bay.shelves + 1), t / 2 + 0.015])
      continue
    }

    const rows = bay.drawerHeights.length
    const weights = bay.drawerHeights
    const rowUnit = (availableHeight - gap * (rows - 1)) / weights.reduce((sum, weight) => sum + weight, 0)
    let rowTop = cabinetTop - gap
    for (let i = 0; i < rows; i++) {
      const rowHeight = rowUnit * weights[i]!
      const rowY = rowTop - rowHeight / 2
      rowTop -= rowHeight + gap
      const drawer = new Group()
      drawer.name = `vanity-drawer-${bayIndex}-${i}`
      drawer.position.set(bay.x, rowY, frontZ - vanityPartOpening(node, { id: drawer.name, kind: 'drawer' }) * (depth - 0.09) * 0.8)
      drawer.userData.vanityPose = { kind: 'drawer', id: drawer.name, closedZ: frontZ, travel: (depth - 0.09) * 0.8 }
      group.add(drawer)
      front(drawer.name, bay.width, rowHeight, 0, 0, drawer)
      handle(drawer.name, bay.width, rowHeight, 0, 0, false, drawer)
      const boxWidth = bay.width - t * 2 - 0.012
      const boxHeight = Math.max(0.012, rowHeight - 0.026)
      const boxDepth = depth - t * 2 - 0.045
      const wall = 0.009
      const bottomY = -rowHeight / 2 + 0.009
      const rear = t + boxDepth
      drawer.userData.drawerBox = { width: boxWidth, height: boxHeight, depth: boxDepth, wall, bottomY, front: t, rear }
      box(`${drawer.name}-bottom`, [boxWidth, wall, boxDepth], [0, bottomY, t + boxDepth / 2], drawer)
      for (const side of [-1, 1]) {
        box(`${drawer.name}-side-${side}`, [wall, boxHeight, boxDepth], [side * (boxWidth - wall) / 2, bottomY + boxHeight / 2, t + boxDepth / 2], drawer)
        box(`${drawer.name}-slide-${side}`, [0.006, 0.02, boxDepth * 0.85], [side * (boxWidth / 2 + 0.003), bottomY + 0.025, t + boxDepth / 2], drawer)
      }
      box(`${drawer.name}-back`, [boxWidth - wall * 2, boxHeight, wall], [0, bottomY + boxHeight / 2, rear - wall / 2], drawer)
      box(`${drawer.name}-inner-front`, [boxWidth - wall * 2, boxHeight, wall], [0, bottomY + boxHeight / 2, t + wall / 2], drawer)
    }
  }

  if (!wallMounted) {
    if (node.baseStyle === 'plinth') {
      box('vanity-recessed-plinth', [width - 0.055, base, depth - 0.055], [0, base / 2, 0.015])
    } else {
      for (const xSide of [-1, 1]) {
        for (const zSide of [-1, 1]) {
          const x = xSide * (width / 2 - node.legInset - node.legWidth / 2)
          const z = zSide * (depth / 2 - node.legInset - node.legWidth / 2)
          const name = `vanity-leg-${xSide}-${zSide}`
          if (node.baseStyle === 'tapered') {
            const leg = mesh(name, new CylinderGeometry(node.legWidth / Math.SQRT2, node.legWidth * 0.6 / Math.SQRT2, base, 4), [x, base / 2, z])
            leg.rotation.y = Math.PI / 4
          } else if (node.baseStyle === 'metal') cylinder(name, node.legWidth / 2, base, [x, base / 2, z])
          else box(name, [node.legWidth, base, node.legWidth], [x, base / 2, z], group, 0.002)
          if (isConsole) box(`${name}-post`, [node.legWidth, upperBottom - base, node.legWidth], [x, (upperBottom + base) / 2, z], group, 0.002)
        }
      }
    }
    if (isConsole) {
      box('vanity-console-shelf', [width - t * 2, t, depth - 0.025], [0, base + t / 2, 0], group, 0.002)
      // Console shelves need supports even when the user switches to a plinth base.
      if (node.baseStyle === 'plinth') {
        for (const side of [-1, 1]) box(`vanity-console-support-${side}`, [t, upperBottom - base, 0.06], [side * (width / 2 - t / 2), (upperBottom + base) / 2, depth / 2 - 0.04])
      }
    } else if (node.lowerShelf && node.baseStyle !== 'plinth') box('vanity-lower-shelf', [width - node.legInset * 2, t, depth - node.legInset * 2], [0, base * 0.3, 0], group, 0.002)
  }
  if (wallMounted && isConsole) {
    box('vanity-console-shelf', [width - t * 2, t, depth - 0.025], [0, base + t / 2, 0], group, 0.002)
    for (const side of [-1, 1]) box(`vanity-console-support-${side}`, [t, upperBottom - base, carcassDepth],
      [side * (width / 2 - t / 2), (upperBottom + base) / 2, t / 2])
  }
  if (node.countertopEnabled) {
    const overhang = node.countertopOverhang
    box('vanity-countertop', [width + overhang * 2, topThickness, depth + overhang], [0, height - topThickness / 2, -overhang / 2], group, node.countertopEdge === 'soft' ? 0.005 : 0.001)
    if (node.backsplashHeight > 0) box('vanity-backsplash', [width + overhang * 2, node.backsplashHeight, topThickness], [0, height + node.backsplashHeight / 2, depth / 2 - topThickness / 2], group, 0.002)
  }
  return group
}
