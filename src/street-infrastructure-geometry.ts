import type {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
  TrafficBollardNode,
  RoadBarrierNode,
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

export type TrafficBollardLayout = {
	height: number
	radius: number
	baseRadius: number
	baseHeight: number
	collarY: number
	reflectiveBandY: number
	reflectiveBandHeight: number
}

export function resolveTrafficBollardLayout(node: TrafficBollardNode): TrafficBollardLayout {
	const height = Math.max(0.45, Math.min(1.5, node.height))
	const radius = Math.max(0.06, Math.min(0.3, node.radius))
	const baseRadius = Math.max(radius * 1.9, 0.16)
	const baseHeight = Math.min(0.12, height * 0.14)
	const bandHeight = Math.max(0.08, Math.min(0.16, height * 0.13))
	return {
		height,
		radius,
		baseRadius,
		baseHeight,
		collarY: height * 0.68,
		reflectiveBandY: height * 0.55,
		reflectiveBandHeight: bandHeight,
	}
}

export type RoadBarrierLayout = {
	length: number
	height: number
	width: number
	baseHeight: number
	postRadius: number
	beamY: number
	beamHeight: number
}

export function resolveRoadBarrierLayout(node: RoadBarrierNode): RoadBarrierLayout {
	const length = Math.max(0.5, Math.min(8, node.length))
	const height = Math.max(0.25, Math.min(1.8, node.height))
	const width = Math.max(0.12, Math.min(1.2, node.width))
	const baseHeight = Math.min(0.22, height * 0.24)
	return {
		length,
		height,
		width,
		baseHeight,
		postRadius: Math.max(0.045, width * 0.2),
		beamY: baseHeight + (height - baseHeight) * 0.58,
		beamHeight: Math.max(0.08, Math.min(0.22, height * 0.2)),
	}
}

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
  surroundOverhang: number
  curbDepth: number
  innerWidth: number
  innerLength: number
  surroundHeight: number
  frameHeight: number
  frameCenterY: number
  frameTopY: number
  voidDepth: number
  voidCenterY: number
  voidTopY: number
  seatHeight: number
  seatCenterY: number
  seatTopY: number
  barHeight: number
  barCenterY: number
  barBottomY: number
  bars: readonly GrateBar[]
  curbCenterZ: number
  curbOpeningLength: number
  curbOpeningOffsetX: number
  hasSurfaceGrate: boolean
  hasCurbOpening: boolean
}

export function resolveDrainageInletLayout(node: DrainageInletNode): DrainageInletLayout {
  const width = Math.max(0.3, Math.min(1.5, node.width))
  const length = Math.max(0.5, Math.min(2.5, node.length))
  const frameWidth = 0.065
  const surroundOverhang = 0.08
  const curbDepth = 0.18
  const innerWidth = Math.max(0.16, width - frameWidth * 2)
  const innerLength = Math.max(0.24, length - frameWidth * 2)
  const hasSurfaceGrate = node.inletType !== 'curb-opening'
  const hasCurbOpening = node.inletType !== 'grate'
  const curbOpeningLength = node.inletType === 'sweeper-combination'
    ? Math.min(2.5, length * 1.42)
    : length
  const curbOpeningOffsetX = node.inletType === 'sweeper-combination'
    ? -Math.min(0.35, length * 0.18)
    : 0
  // Keep the inlet stack shallow enough to sit in the road surface instead of
  // reading as a box buried below it. The visible bars still rise above the
  // frame for a crisp grate silhouette.
  const surroundHeight = 0.016
  const frameHeight = 0.04
  const frameCenterY = surroundHeight + frameHeight / 2
  const frameTopY = frameCenterY + frameHeight / 2
  const voidDepth = 0.014
  const voidCenterY = surroundHeight + 0.007
  const voidTopY = voidCenterY + voidDepth / 2
  const seatHeight = 0.012
  const seatCenterY = frameTopY + seatHeight / 2 + 0.003
  const seatTopY = seatCenterY + seatHeight / 2
  const barHeight = 0.02
  const barCenterY = seatTopY + barHeight / 2 + 0.003
  const bars: GrateBar[] = []
  if (hasSurfaceGrate && (node.gratePattern === 'parallel' || node.gratePattern === 'bicycle-safe' || node.gratePattern === 'curved-vane')) {
    const spacing = node.gratePattern === 'bicycle-safe' ? 0.09 : node.gratePattern === 'parallel' ? 0.14 : 0.17
    const count = Math.max(4, Math.round(innerLength / spacing))
    for (let index = 0; index < count; index += 1) {
      const x = -length / 2 + frameWidth + ((index + 0.5) / count) * (length - frameWidth * 2)
      const normalized = count === 1 ? 0 : (index / (count - 1)) * 2 - 1
      const rotationY = node.gratePattern === 'curved-vane' ? Math.sin(normalized * Math.PI / 2) * 0.22 : 0
      const z = node.gratePattern === 'curved-vane' ? Math.sin(normalized * Math.PI / 2) * innerWidth * 0.08 : 0
      const barWidth = node.gratePattern === 'bicycle-safe' ? 0.022 : 0.028
      const desiredLength = node.gratePattern === 'curved-vane' ? innerWidth * 0.86 : innerWidth
      const maxLengthX = Math.abs(Math.sin(rotationY)) > 0.001
        ? (2 * (length / 2 - Math.abs(x)) - Math.abs(Math.cos(rotationY)) * barWidth) / Math.abs(Math.sin(rotationY))
        : Number.POSITIVE_INFINITY
      const maxLengthZ = Math.abs(Math.cos(rotationY)) > 0.001
        ? (2 * (width / 2 - Math.abs(z)) - Math.abs(Math.sin(rotationY)) * barWidth) / Math.abs(Math.cos(rotationY))
        : Number.POSITIVE_INFINITY
      bars.push({
        x,
        z,
        width: barWidth,
        length: Math.max(0.04, Math.min(desiredLength, maxLengthX, maxLengthZ)),
        rotationY,
      })
    }
    if (node.gratePattern === 'bicycle-safe') {
      const strapCount = Math.max(3, Math.round(innerWidth / 0.16))
      for (let index = 0; index < strapCount; index += 1) {
        bars.push({
          x: 0,
          z: -innerWidth / 2 + ((index + 0.5) / strapCount) * innerWidth,
          width: 0.018,
          length: innerLength,
          rotationY: Math.PI / 2,
        })
      }
    }
  } else if (hasSurfaceGrate && node.gratePattern === 'reticuline') {
    const diagonalLength = Math.min(innerLength, innerWidth) * 0.78
    const diagonalHalfExtent = diagonalLength * Math.SQRT1_2 / 2
    const usableLength = Math.max(0.12, innerLength - diagonalHalfExtent * 2)
    const count = Math.max(3, Math.round(usableLength / 0.18))
    for (let index = 0; index < count; index += 1) {
      const x = -usableLength / 2 + ((index + 0.5) / count) * usableLength
      for (const rotationY of [-Math.PI / 4, Math.PI / 4]) {
        bars.push({
          x,
          z: 0,
          width: 0.022,
          length: diagonalLength,
          rotationY,
        })
      }
    }
  }
  return {
    width,
    length,
    frameWidth,
    innerWidth,
    innerLength,
    surroundHeight,
    frameHeight,
    frameCenterY,
    frameTopY,
    voidDepth,
    voidCenterY,
    voidTopY,
    seatHeight,
    seatCenterY,
    seatTopY,
    barHeight,
    barCenterY,
    barBottomY: barCenterY - barHeight / 2,
    bars,
    curbCenterZ: width / 2 + surroundOverhang + curbDepth / 2,
    curbOpeningLength,
    curbOpeningOffsetX,
    hasSurfaceGrate,
    hasCurbOpening,
    surroundOverhang,
    curbDepth,
  }
}

export function resolveManholeCoverLayout(node: ManholeCoverNode) {
  const diameter = Math.max(0.45, Math.min(1.2, node.diameter))
  const radius = diameter / 2
  // A flush utility cover is a shallow layered casting. Keeping the tread
  // close to the frame reduces the vertical extrusion that made attached
  // covers look like they were sitting inside the road slab.
  const frameHeight = 0.045
  const coverThickness = 0.028
  const coverBackingThickness = 0.016
  const coverBackingCenterY = 0.034
  const coverCenterY = 0.062
  const treadY = 0.1
  const rimCenterY = 0.09
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
    treadHeight: 0.012,
    treadBottomY: treadY - 0.006,
    rimCenterY,
    rimTubeRadius: 0.01,
    rimBottomY: rimCenterY - 0.01,
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
