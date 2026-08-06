import type {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
} from './schema'

export const TRAFFIC_SIGNAL_DIMENSIONS = {
  poleBottomRadius: 0.17,
  poleTopRadius: 0.115,
  baseRadius: 0.34,
  armBaseRadius: 0.14,
  armTipRadius: 0.08,
  armEndCollarLength: 0.2,
  hangerOffset: 0.13,
  sectionSize: 0.38,
  sectionGap: 0.018,
  faceDepth: 0.2,
  lensRadius: 0.1525,
  backplateMargin: 0.13,
  reflectiveBorderWidth: 0.05,
  cabinetWidth: 0.78,
  cabinetHeight: 1.18,
  cabinetDepth: 0.48,
} as const

export type TrafficSignalSection = {
  x: number
  y: number
  color: 'red' | 'yellow' | 'green'
  shape: 'circular' | 'arrow'
}

export type TrafficSignalHeadLayout = {
  width: number
  height: number
  sections: readonly TrafficSignalSection[]
}

export function resolveTrafficSignalHeadLayout(
  node: TrafficSignalNode,
): TrafficSignalHeadLayout {
  const step = TRAFFIC_SIGNAL_DIMENSIONS.sectionSize + TRAFFIC_SIGNAL_DIMENSIONS.sectionGap
  if (node.headLayout === 'five-section-cluster') {
    return {
      width: step * 2,
      height: step * 3,
      sections: [
        { x: 0, y: step, color: 'red', shape: 'circular' },
        { x: -step / 2, y: 0, color: 'yellow', shape: 'circular' },
        { x: step / 2, y: 0, color: 'yellow', shape: 'arrow' },
        { x: -step / 2, y: -step, color: 'green', shape: 'circular' },
        { x: step / 2, y: -step, color: 'green', shape: 'arrow' },
      ],
    }
  }
  if (node.headLayout === 'four-section-turn') {
    return {
      width: TRAFFIC_SIGNAL_DIMENSIONS.sectionSize,
      height: TRAFFIC_SIGNAL_DIMENSIONS.sectionSize + step * 3,
      sections: [
        { x: 0, y: step * 1.5, color: 'red', shape: 'circular' },
        { x: 0, y: step * 0.5, color: 'yellow', shape: 'circular' },
        { x: 0, y: -step * 0.5, color: 'yellow', shape: 'arrow' },
        { x: 0, y: -step * 1.5, color: 'green', shape: 'arrow' },
      ],
    }
  }
  if (node.headLayout === 'three-section-turn') {
    return {
      width: TRAFFIC_SIGNAL_DIMENSIONS.sectionSize,
      height: TRAFFIC_SIGNAL_DIMENSIONS.sectionSize + step * 2,
      sections: [
        { x: 0, y: step, color: 'red', shape: 'circular' },
        { x: 0, y: 0, color: 'yellow', shape: 'arrow' },
        { x: 0, y: -step, color: 'green', shape: 'arrow' },
      ],
    }
  }
  return {
    width: TRAFFIC_SIGNAL_DIMENSIONS.sectionSize,
    height: TRAFFIC_SIGNAL_DIMENSIONS.sectionSize + step * 2,
    sections: [
      { x: 0, y: step, color: 'red', shape: 'circular' },
      { x: 0, y: 0, color: 'yellow', shape: 'circular' },
      { x: 0, y: -step, color: 'green', shape: 'circular' },
    ],
  }
}

export type TrafficSignalLayout = {
  supportHeight: number
  armReach: number
  head: TrafficSignalHeadLayout
  faceCenters: readonly (readonly [number, number, number])[]
  armCenter: readonly [number, number, number]
  cabinetCenter: readonly [number, number, number]
  streetSignCenter: readonly [number, number, number]
  secondaryPoleCenter: readonly [number, number, number]
  footprintWidth: number
  footprintDepth: number
}

export function resolveTrafficSignalLayout(node: TrafficSignalNode): TrafficSignalLayout {
  const supportHeight = Math.max(2.4, Math.min(8, node.supportHeight))
  const overhead = node.mount === 'mast-arm' || node.mount === 'span-wire'
  const armReach = overhead ? Math.max(1, Math.min(12, node.armReach)) : 0
  const head = resolveTrafficSignalHeadLayout(node)
  const faceY = overhead
    ? supportHeight - head.height / 2 - 0.38
    : supportHeight - head.height / 2 - 0.18
  const dual = node.headCount === 'two' && overhead
  const hangerOffset = Math.min(TRAFFIC_SIGNAL_DIMENSIONS.hangerOffset, head.width * 0.25)
  const faceXs = node.mount === 'post'
    ? [0.38]
    : node.mount === 'span-wire'
      ? (dual ? [armReach * 0.38, armReach * 0.68] : [armReach * 0.55])
      : (dual ? [armReach * 0.56, armReach - hangerOffset] : [armReach - hangerOffset])
  const footprintDepth = node.cabinet
    ? 1.35
    : TRAFFIC_SIGNAL_DIMENSIONS.baseRadius * 2
  return {
    supportHeight,
    armReach,
    head,
    faceCenters: faceXs.map((faceX) => [faceX, faceY, 0] as const),
    armCenter: [armReach / 2, supportHeight, 0],
    cabinetCenter: [-0.56, TRAFFIC_SIGNAL_DIMENSIONS.cabinetHeight / 2 + 0.1, 0.38],
    streetSignCenter: [Math.min(1.45, armReach * 0.28), supportHeight - 0.29, 0],
    secondaryPoleCenter: [armReach, supportHeight / 2, 0],
    footprintWidth: Math.max(1.1, armReach + TRAFFIC_SIGNAL_DIMENSIONS.baseRadius),
    footprintDepth,
  }
}

export type GrateBar = {
  x: number
  z: number
  width: number
  length: number
  rotationY: number
}

export type DrainageInletLayout = {
  width: number
  length: number
  frameWidth: number
  bars: readonly GrateBar[]
  curbCenterZ: number
}

export function resolveDrainageInletLayout(node: DrainageInletNode): DrainageInletLayout {
  const width = Math.max(0.3, Math.min(1.5, node.width))
  const length = Math.max(0.5, Math.min(2.5, node.length))
  const frameWidth = 0.055
  const bars: GrateBar[] = []
  if (node.gratePattern === 'parallel') {
    const count = Math.max(4, Math.round(width / 0.1))
    for (let index = 0; index < count; index += 1) {
      bars.push({
        x: -length / 2 + frameWidth + ((index + 0.5) / count) * (length - frameWidth * 2),
        z: 0,
        width: 0.025,
        length: width - frameWidth * 2,
        rotationY: 0,
      })
    }
  } else {
    const count = Math.max(5, Math.round(length / 0.11))
    for (let index = 0; index < count; index += 1) {
      const x = -length / 2 + frameWidth + ((index + 0.5) / count) * (length - frameWidth * 2)
      bars.push({
        x,
        z: node.gratePattern === 'curved-vane' ? Math.sin(index * 0.9) * width * 0.035 : 0,
        width: 0.026,
        length: width - frameWidth * 2,
        rotationY: node.gratePattern === 'curved-vane' ? Math.sin(index * 0.8) * 0.16 : Math.PI / 2,
      })
    }
    if (node.gratePattern === 'reticuline') {
      const crossCount = Math.max(3, Math.round(width / 0.13))
      for (let index = 0; index < crossCount; index += 1) {
        bars.push({
          x: 0,
          z: -width / 2 + frameWidth + ((index + 0.5) / crossCount) * (width - frameWidth * 2),
          width: 0.022,
          length: length - frameWidth * 2,
          rotationY: 0,
        })
      }
    }
  }
  return {
    width,
    length,
    frameWidth,
    bars,
    curbCenterZ: width / 2 + 0.075,
  }
}

export function resolveManholeCoverLayout(node: ManholeCoverNode) {
  const diameter = Math.max(0.45, Math.min(1.2, node.diameter))
  const radius = diameter / 2
  const frameHeight = 0.075
  const coverThickness = 0.042
  const coverBackingThickness = 0.026
  const coverBackingCenterY = 0.066
  const coverCenterY = 0.104
  const treadY = 0.152
  const rimCenterY = 0.143
  return {
    diameter,
    radius,
    frameRadius: radius + 0.065,
    frameHeight,
    coverBackingThickness,
    coverBackingCenterY,
    coverBackingTopY: coverBackingCenterY + coverBackingThickness / 2,
    coverThickness,
    coverCenterY,
    coverBottomY: coverCenterY - coverThickness / 2,
    coverTopY: coverCenterY + coverThickness / 2,
    treadY,
    treadHeight: 0.018,
    treadBottomY: treadY - 0.009,
    rimCenterY,
    rimTubeRadius: 0.014,
    rimBottomY: rimCenterY - 0.014,
    treadRadius: radius * 0.84,
    rimRadius: radius * 0.91,
    reliefRadius: radius * 0.68,
    centerReliefRadius: radius * 0.2,
  }
}

export type FireHydrantLayout = {
  height: number
  scale: number
  isWetBarrel: boolean
  barrelRadius: number
  barrelHeight: number
  barrelBottomY: number
  barrelTopY: number
  barrelCenterY: number
  flangeRadius: number
  flangeHeight: number
  flangeTopY: number
  bonnetFlangeRadius: number
  bonnetFlangeHeight: number
  bonnetFlangeCenterY: number
  bonnetY: number
  bonnetRadius: number
  bonnetTopY: number
  stemNutY: number
  stemNutRadius: number
  stemNutHeight: number
  outletY: number
  drainY: number
  hoseRadius: number
  pumperRadius: number
  padRadius: number
}

export type FireHydrantOutletLayout = {
  angle: number
  radius: number
  kind: 'hose' | 'pumper'
}

export function resolveFireHydrantLayout(node: FireHydrantNode): FireHydrantLayout {
  const height = Math.max(0.65, Math.min(1.8, node.height))
  // Keep the new default tall and serviceable without making the barrel too wide.
  const scale = height / 1.25
  const isWetBarrel = node.barrelType === 'wet-barrel'
  const flangeHeight = 0.11 * scale
  const barrelBottomY = flangeHeight * 0.9
  const barrelRadius = 0.16 * scale
  const bonnetRadius = (isWetBarrel ? 0.13 : 0.17) * scale
  const bonnetFlangeRadius = (isWetBarrel ? 0.18 : 0.22) * scale
  const bonnetFlangeHeight = 0.075 * scale
  const stemNutHeight = (isWetBarrel ? 0 : 0.075) * scale
  const topClearance = (isWetBarrel ? 0.05 : stemNutHeight + 0.02 * scale)
  const barrelHeight = Math.max(
    0.55 * scale,
    height - barrelBottomY - bonnetFlangeHeight - bonnetRadius - topClearance,
  )
  const barrelTopY = barrelBottomY + barrelHeight
  const bonnetFlangeCenterY = barrelTopY + bonnetFlangeHeight / 2
  const bonnetY = barrelTopY + bonnetFlangeHeight
  const bonnetTopY = bonnetY + bonnetRadius
  const stemNutY = isWetBarrel
    ? bonnetTopY
    : bonnetTopY + stemNutHeight / 2 + 0.01 * scale
  return {
    height,
    scale,
    isWetBarrel,
    barrelRadius,
    barrelHeight,
    barrelBottomY,
    barrelTopY,
    barrelCenterY: barrelBottomY + barrelHeight / 2,
    flangeRadius: 0.29 * scale,
    flangeHeight,
    flangeTopY: flangeHeight,
    bonnetFlangeRadius,
    bonnetFlangeHeight,
    bonnetFlangeCenterY,
    bonnetY,
    bonnetRadius,
    bonnetTopY,
    stemNutY,
    stemNutRadius: 0.045 * scale,
    stemNutHeight,
    outletY: barrelBottomY + barrelHeight * (isWetBarrel ? 0.53 : 0.56),
    drainY: barrelBottomY + barrelHeight * 0.18,
    hoseRadius: 0.085 * scale,
    pumperRadius: 0.12 * scale,
    padRadius: 0.32 * scale,
  }
}

export function resolveFireHydrantOutletLayout(
  node: FireHydrantNode,
  layout = resolveFireHydrantLayout(node),
): FireHydrantOutletLayout[] {
  const outlets: FireHydrantOutletLayout[] = []
  if (layout.isWetBarrel) {
    if (node.outletLayout === 'one-hose') {
      outlets.push({ angle: 0, radius: layout.hoseRadius, kind: 'hose' })
    } else {
      outlets.push({ angle: 0, radius: layout.hoseRadius, kind: 'hose' })
      outlets.push({ angle: (Math.PI * 2) / 3, radius: layout.hoseRadius, kind: 'hose' })
      if (node.outletLayout === 'two-hose-one-pumper') {
        outlets.push({ angle: (Math.PI * 4) / 3, radius: layout.pumperRadius, kind: 'pumper' })
      }
    }
    return outlets
  }
  outlets.push({ angle: 0, radius: layout.hoseRadius, kind: 'hose' })
  if (node.outletLayout !== 'one-hose') {
    outlets.push({ angle: Math.PI, radius: layout.hoseRadius, kind: 'hose' })
  }
  if (node.outletLayout === 'two-hose-one-pumper') {
    outlets.push({ angle: -Math.PI / 2, radius: layout.pumperRadius, kind: 'pumper' })
  }
  return outlets
}
