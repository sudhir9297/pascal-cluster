'use client'

import { useEffect, useMemo, useState } from 'react'
import { Color, DoubleSide, QuadraticBezierCurve3, Quaternion, Vector3 } from 'three'
import type { TrafficSignalNode } from './schema'
import {
  TRAFFIC_SIGNAL_DIMENSIONS,
  resolveTrafficSignalLayout,
  type TrafficSignalSection as TrafficSignalSectionSpec,
} from './street-infrastructure-geometry'

const ANCHOR_ANGLES = Array.from({ length: 6 }, (_, index) => (index * Math.PI * 2) / 6)
const CABINET_VENT_OFFSETS = [-0.24, -0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18, 0.24] as const

const DEFAULT_LENS_COLORS = {
  red: '#f13b32',
  yellow: '#ffc338',
  green: '#35c76d',
} as const

function resolveLensColors(node: TrafficSignalNode, color: 'red' | 'yellow' | 'green') {
  const active = node[`${color}Color`] ?? DEFAULT_LENS_COLORS[color]
  const dark = new Color(active).multiplyScalar(0.24).getHexString()
  return { active, dark: `#${dark}` }
}

function SignalMetalMaterial({
  color,
  ghost,
  metalness = 0.74,
  roughness = 0.36,
}: {
  color: string
  ghost: boolean
  metalness?: number
  roughness?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      opacity={ghost ? 0.62 : 1}
      roughness={roughness}
      transparent={ghost}
    />
  )
}

function TubeBetween({
  color,
  from,
  ghost,
  layer,
  radius,
  to,
}: {
  color: string
  from: readonly [number, number, number]
  ghost: boolean
  layer: number
  radius: number
  to: readonly [number, number, number]
}) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const dz = to[2] - from[2]
  const length = Math.hypot(dx, dy, dz)
  const midpoint: [number, number, number] = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ]
  const direction = useMemo(() => new Vector3(dx, dy, dz).normalize(), [dx, dy, dz])
  const quaternion = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction),
    [direction],
  )
  return (
    <mesh castShadow={!ghost} layers={layer} position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius * 0.92, radius, length, 14]} />
      <SignalMetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

function SupportPole({
  color,
  ghost,
  height,
  layer,
  x = 0,
}: {
  color: string
  ghost: boolean
  height: number
  layer: number
  x?: number
}) {
  const dimensions = TRAFFIC_SIGNAL_DIMENSIONS
  return (
    <group position={[x, 0, 0]}>
      <mesh castShadow={!ghost} layers={layer} position={[0, 0.035, 0]}>
        <cylinderGeometry args={[dimensions.baseRadius * 0.92, dimensions.baseRadius, 0.07, 28]} />
        <SignalMetalMaterial color={color} ghost={ghost} roughness={0.32} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, 0.11, 0]}>
        <cylinderGeometry args={[dimensions.poleBottomRadius * 1.18, dimensions.baseRadius * 0.74, 0.14, 24]} />
        <SignalMetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, height / 2 + 0.12, 0]}>
        <cylinderGeometry
          args={[dimensions.poleTopRadius, dimensions.poleBottomRadius, height - 0.24, 24]}
        />
        <SignalMetalMaterial color={color} ghost={ghost} roughness={0.39} />
      </mesh>
      <mesh layers={layer} position={[0, 0.7, -dimensions.poleBottomRadius - 0.008]}>
        <boxGeometry args={[0.13, 0.3, 0.018]} />
        <SignalMetalMaterial color="#40484c" ghost={ghost} roughness={0.46} />
      </mesh>
      <mesh layers={layer} position={[0.045, 0.7, -dimensions.poleBottomRadius - 0.02]}>
        <boxGeometry args={[0.012, 0.085, 0.012]} />
        <SignalMetalMaterial color="#202629" ghost={ghost} roughness={0.4} />
      </mesh>
      {ANCHOR_ANGLES.map((angle) => (
        <group
          key={angle}
          position={[Math.cos(angle) * 0.255, 0.105, Math.sin(angle) * 0.255]}
        >
          <mesh castShadow={!ghost} layers={layer}>
            <cylinderGeometry args={[0.026, 0.026, 0.105, 10]} />
            <SignalMetalMaterial color="#2f3538" ghost={ghost} roughness={0.45} />
          </mesh>
          <mesh layers={layer} position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.025, 6]} />
            <SignalMetalMaterial color="#343b3e" ghost={ghost} roughness={0.42} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function sectionIsActive(
  node: TrafficSignalNode,
  section: TrafficSignalSectionSpec,
  hasCircularGreen: boolean,
  hasCircularYellow: boolean,
  hasArrowYellow: boolean,
  hasArrowGreen: boolean,
  flashingOn: boolean,
) {
  if (node.signalState === 'flashing-yellow' && !flashingOn) return false
  if (node.signalState === 'red') return section.color === 'red'
  if (node.signalState === 'yellow') {
    return section.color === 'yellow' && (section.shape === 'circular' || (!hasCircularYellow && section.shape === 'arrow'))
  }
  if (node.signalState === 'flashing-yellow') {
    return section.color === 'yellow' && (section.shape === 'arrow' || (!hasArrowYellow && section.shape === 'circular'))
  }
  if (node.signalState === 'green') {
    return section.color === 'green' && (section.shape === 'circular' || !hasCircularGreen)
  }
  if (node.signalState === 'green-arrow') {
    return section.color === 'green' && (section.shape === 'arrow' || (!hasArrowGreen && section.shape === 'circular'))
  }
  return false
}

function TrafficSignalSection({
  ghost,
  hasArrowGreen,
  hasArrowYellow,
  hasCircularGreen,
  hasCircularYellow,
  flashingOn,
  layer,
  node,
  section,
}: {
  ghost: boolean
  hasArrowGreen: boolean
  hasArrowYellow: boolean
  hasCircularGreen: boolean
  hasCircularYellow: boolean
  flashingOn: boolean
  layer: number
  node: TrafficSignalNode
  section: TrafficSignalSectionSpec
}) {
  const dimensions = TRAFFIC_SIGNAL_DIMENSIONS
  const active = sectionIsActive(
    node,
    section,
    hasCircularGreen,
    hasCircularYellow,
    hasArrowYellow,
    hasArrowGreen,
    flashingOn,
  )
  const colors = resolveLensColors(node, section.color)
  const lensZ = -dimensions.faceDepth / 2 - 0.04
  const arrowDirection = 1
  const arrowVisible =
    section.shape === 'arrow' ||
    (section.color === 'yellow' && node.signalState === 'flashing-yellow' && !hasArrowYellow) ||
    (section.color === 'green' && node.signalState === 'green-arrow' && !hasArrowGreen)

  return (
    <group position={[section.x, section.y, 0]}>
      <mesh castShadow={!ghost} layers={layer}>
        <boxGeometry
          args={[dimensions.sectionSize, dimensions.sectionSize, dimensions.faceDepth]}
        />
        <SignalMetalMaterial color={node.housingColor} ghost={ghost} metalness={0.22} roughness={0.48} />
      </mesh>
      <mesh layers={layer} position={[0, 0, lensZ + 0.018]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[dimensions.lensRadius + 0.035, dimensions.lensRadius + 0.035, 0.055, 28]} />
        <SignalMetalMaterial color="#0b0e0f" ghost={ghost} metalness={0.12} roughness={0.42} />
      </mesh>
      <mesh layers={layer} position={[0, 0, lensZ - 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[dimensions.lensRadius, dimensions.lensRadius, 0.026, 36]} />
        <meshStandardMaterial
          color={active ? colors.active : colors.dark}
          emissive={active && !ghost ? colors.active : '#000000'}
          emissiveIntensity={active && !ghost ? 2.4 : 0}
          metalness={0.03}
          opacity={ghost ? 0.72 : 1}
          roughness={active ? 0.2 : 0.42}
          transparent={ghost}
        />
      </mesh>
      <TrafficSignalVisor ghost={ghost} layer={layer} node={node} lensZ={lensZ} />
      {arrowVisible ? (
        <group position={[0, 0, lensZ - 0.042]}>
          <mesh layers={layer} position={[-arrowDirection * 0.035, 0, 0]}>
            <boxGeometry args={[0.13, 0.048, 0.012]} />
            <meshStandardMaterial
              color={active ? colors.active : colors.dark}
              emissive={active && !ghost ? colors.active : '#000000'}
              emissiveIntensity={active && !ghost ? 2.8 : 0}
              opacity={ghost ? 0.72 : 1}
              transparent={ghost}
            />
          </mesh>
          <mesh
            layers={layer}
            position={[arrowDirection * 0.067, 0, -0.001]}
            rotation={[0, 0, arrowDirection > 0 ? 0 : Math.PI]}
          >
            <circleGeometry args={[0.09, 3]} />
            <meshStandardMaterial
              color={active ? colors.active : colors.dark}
              emissive={active && !ghost ? colors.active : '#000000'}
              emissiveIntensity={active && !ghost ? 2.8 : 0}
              opacity={ghost ? 0.72 : 1}
              transparent={ghost}
            />
          </mesh>
        </group>
      ) : null}
      <mesh layers={layer} position={[-0.19, -0.085, -dimensions.faceDepth / 2 - 0.008]}>
        <boxGeometry args={[0.025, 0.12, 0.025]} />
        <SignalMetalMaterial color="#0b0e0f" ghost={ghost} metalness={0.14} roughness={0.46} />
      </mesh>
      <mesh layers={layer} position={[0.19, -0.085, -dimensions.faceDepth / 2 - 0.008]}>
        <boxGeometry args={[0.018, 0.075, 0.025]} />
        <SignalMetalMaterial color="#0b0e0f" ghost={ghost} metalness={0.14} roughness={0.46} />
      </mesh>
    </group>
  )
}

function TrafficSignalVisor({
  ghost,
  layer,
  lensZ,
  node,
}: {
  ghost: boolean
  layer: number
  lensZ: number
  node: TrafficSignalNode
}) {
  if (node.visorStyle === 'none') return null
  const radius = TRAFFIC_SIGNAL_DIMENSIONS.lensRadius + 0.052
  if (node.visorStyle === 'cap') {
    return (
      <group>
        <mesh
          castShadow={!ghost}
          layers={layer}
          position={[0, radius * 0.82, lensZ - 0.075]}
        >
          <boxGeometry args={[radius * 2.12, 0.07, 0.14]} />
          <SignalMetalMaterial color="#111516" ghost={ghost} metalness={0.12} roughness={0.62} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh
            castShadow={!ghost}
            key={side}
            layers={layer}
            position={[side * (radius - 0.016), 0.02, lensZ - 0.055]}
          >
            <boxGeometry args={[0.025, 0.14, 0.1]} />
            <SignalMetalMaterial color="#111516" ghost={ghost} metalness={0.12} roughness={0.62} />
          </mesh>
        ))}
      </group>
    )
  }
  const tunnelDepth = 0.34
  return (
    <group>
      <mesh
        castShadow={!ghost}
        layers={layer}
        position={[0, 0, lensZ - tunnelDepth / 2 + 0.01]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[radius, radius, tunnelDepth, 30, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color="#111516"
          metalness={0.12}
          opacity={ghost ? 0.55 : 1}
          roughness={0.62}
          side={DoubleSide}
          transparent={ghost}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          castShadow={!ghost}
          key={side}
          layers={layer}
          position={[side * radius, 0, lensZ - tunnelDepth / 2 + 0.01]}
        >
          <boxGeometry args={[0.026, radius * 1.9, tunnelDepth]} />
          <SignalMetalMaterial color="#0b0e0f" ghost={ghost} metalness={0.12} roughness={0.62} />
        </mesh>
      ))}
    </group>
  )
}

function RoundedPlate({
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  ghost,
  height,
  layer,
  radius,
  width,
  z,
}: {
  color: string
  emissive?: string
  emissiveIntensity?: number
  ghost: boolean
  height: number
  layer: number
  radius: number
  width: number
  z: number
}) {
  const corner = Math.min(radius, width / 2, height / 2)
  const material = (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={ghost ? 0 : emissiveIntensity}
      opacity={ghost ? 0.58 : 1}
      roughness={emissiveIntensity > 0 ? 0.3 : 0.76}
      transparent={ghost}
    />
  )
  return (
    <group position={[0, 0, z]}>
      <mesh layers={layer}>
        <boxGeometry args={[width - corner * 2, height, 0.026]} />
        {material}
      </mesh>
      <mesh layers={layer}>
        <boxGeometry args={[width, height - corner * 2, 0.026]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={ghost ? 0 : emissiveIntensity}
          opacity={ghost ? 0.58 : 1}
          roughness={emissiveIntensity > 0 ? 0.3 : 0.76}
          transparent={ghost}
        />
      </mesh>
      {[-1, 1].flatMap((xSide) =>
        [-1, 1].map((ySide) => (
          <mesh
            key={`${xSide}-${ySide}`}
            layers={layer}
            position={[xSide * (width / 2 - corner), ySide * (height / 2 - corner), 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[corner, corner, 0.026, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={ghost ? 0 : emissiveIntensity}
              opacity={ghost ? 0.58 : 1}
              roughness={emissiveIntensity > 0 ? 0.3 : 0.76}
              transparent={ghost}
            />
          </mesh>
        )),
      )}
    </group>
  )
}

function ReflectiveBackplate({
  ghost,
  height,
  layer,
  node,
  width,
}: {
  ghost: boolean
  height: number
  layer: number
  node: TrafficSignalNode
  width: number
}) {
  const margin = TRAFFIC_SIGNAL_DIMENSIONS.backplateMargin
  const plateWidth = width + margin * 2
  const plateHeight = height + margin * 2
  const border = TRAFFIC_SIGNAL_DIMENSIONS.reflectiveBorderWidth
  if (!node.backplate) return null
  return (
    <group>
      <RoundedPlate
        color="#090b0c"
        ghost={ghost}
        height={plateHeight}
        layer={layer}
        radius={0.075}
        width={plateWidth}
        z={TRAFFIC_SIGNAL_DIMENSIONS.faceDepth / 2 + 0.032}
      />
      {node.reflectiveBorder ? (
        <>
          <RoundedPlate
            color="#ffd84a"
            emissive="#8b6e0d"
            emissiveIntensity={0.18}
            ghost={ghost}
            height={plateHeight}
            layer={layer}
            radius={0.075}
            width={plateWidth}
            z={TRAFFIC_SIGNAL_DIMENSIONS.faceDepth / 2 + 0.02}
          />
          <RoundedPlate
            color="#090b0c"
            ghost={ghost}
            height={plateHeight - border * 2}
            layer={layer}
            radius={0.05}
            width={plateWidth - border * 2}
            z={TRAFFIC_SIGNAL_DIMENSIONS.faceDepth / 2 + 0.006}
          />
        </>
      ) : null}
    </group>
  )
}

function TrafficSignalHead({
  flashingOn,
  ghost,
  layer,
  node,
  position,
}: {
  flashingOn: boolean
  ghost: boolean
  layer: number
  node: TrafficSignalNode
  position: readonly [number, number, number]
}) {
  const layout = resolveTrafficSignalLayout(node)
  const hasCircularGreen = layout.head.sections.some(
    (section) => section.color === 'green' && section.shape === 'circular',
  )
  const hasCircularYellow = layout.head.sections.some(
    (section) => section.color === 'yellow' && section.shape === 'circular',
  )
  const hasArrowYellow = layout.head.sections.some(
    (section) => section.color === 'yellow' && section.shape === 'arrow',
  )
  const hasArrowGreen = layout.head.sections.some(
    (section) => section.color === 'green' && section.shape === 'arrow',
  )
  const hangerOffset = Math.min(TRAFFIC_SIGNAL_DIMENSIONS.hangerOffset, layout.head.width * 0.25)
  const hangerLength =
    0.38 - TRAFFIC_SIGNAL_DIMENSIONS.armBaseRadius * 0.84
  const hangerCenterY = layout.head.height / 2 + hangerLength / 2
  return (
    <group position={position}>
      <ReflectiveBackplate
        ghost={ghost}
        height={layout.head.height}
        layer={layer}
        node={node}
        width={layout.head.width}
      />
      {layout.head.sections.map((section, index) => (
        <TrafficSignalSection
          flashingOn={flashingOn}
          ghost={ghost}
          hasArrowGreen={hasArrowGreen}
          hasArrowYellow={hasArrowYellow}
          hasCircularGreen={hasCircularGreen}
          hasCircularYellow={hasCircularYellow}
          key={`${section.x}-${section.y}-${index}`}
          layer={layer}
          node={node}
          section={section}
        />
      ))}
      {node.mount !== 'post' ? (
        <>
          {[-hangerOffset, hangerOffset].map((x) => (
            <mesh
              castShadow={!ghost}
              key={x}
              layers={layer}
              position={[x, hangerCenterY, 0]}
            >
              <cylinderGeometry args={[0.018, 0.018, hangerLength, 10]} />
              <SignalMetalMaterial color={node.poleColor} ghost={ghost} roughness={0.4} />
            </mesh>
          ))}
          <mesh
            layers={layer}
            position={[0, layout.head.height / 2 + 0.37, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <torusGeometry args={[0.085, 0.018, 7, 18]} />
            <SignalMetalMaterial color="#353c40" ghost={ghost} roughness={0.4} />
          </mesh>
        </>
      ) : null}
    </group>
  )
}

function ControllerCabinet({
  ghost,
  layer,
  position,
}: {
  ghost: boolean
  layer: number
  position: readonly [number, number, number]
}) {
  const dimensions = TRAFFIC_SIGNAL_DIMENSIONS
  return (
    <group position={position}>
      <mesh castShadow={!ghost} layers={layer} position={[0, -dimensions.cabinetHeight / 2 - 0.055, 0]}>
        <boxGeometry args={[dimensions.cabinetWidth + 0.16, 0.11, dimensions.cabinetDepth + 0.16]} />
        <meshStandardMaterial color="#a8a39a" metalness={0.04} opacity={ghost ? 0.55 : 1} roughness={0.82} transparent={ghost} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer}>
        <boxGeometry args={[dimensions.cabinetWidth, dimensions.cabinetHeight, dimensions.cabinetDepth]} />
        <SignalMetalMaterial color="#929a9a" ghost={ghost} metalness={0.68} roughness={0.48} />
      </mesh>
      <mesh layers={layer} position={[0, 0, -dimensions.cabinetDepth / 2 - 0.012]}>
        <boxGeometry args={[dimensions.cabinetWidth - 0.07, dimensions.cabinetHeight - 0.08, 0.024]} />
        <SignalMetalMaterial color="#7e8788" ghost={ghost} metalness={0.65} roughness={0.5} />
      </mesh>
      <mesh layers={layer} position={[dimensions.cabinetWidth / 2 - 0.12, 0.02, -dimensions.cabinetDepth / 2 - 0.035]}>
        <boxGeometry args={[0.035, 0.14, 0.035]} />
        <SignalMetalMaterial color="#2e3537" ghost={ghost} metalness={0.72} roughness={0.36} />
      </mesh>
      {CABINET_VENT_OFFSETS.map((offset) => (
        <mesh key={offset} layers={layer} position={[offset, 0.38, -dimensions.cabinetDepth / 2 - 0.036]}>
          <boxGeometry args={[0.025, 0.16, 0.02]} />
          <SignalMetalMaterial color="#4b5456" ghost={ghost} metalness={0.55} roughness={0.5} />
        </mesh>
      ))}
      {[-0.33, 0.33].map((y) => (
        <mesh key={y} layers={layer} position={[-dimensions.cabinetWidth / 2 + 0.045, y, -dimensions.cabinetDepth / 2 - 0.035]}>
          <boxGeometry args={[0.035, 0.1, 0.03]} />
          <SignalMetalMaterial color="#444c4e" ghost={ghost} roughness={0.42} />
        </mesh>
      ))}
    </group>
  )
}

function StreetNameSign({
  ghost,
  layer,
  position,
}: {
  ghost: boolean
  layer: number
  position: readonly [number, number, number]
}) {
  return (
    <group position={position}>
      <mesh castShadow={!ghost} layers={layer}>
        <boxGeometry args={[1.35, 0.32, 0.045]} />
        <meshStandardMaterial color="#17633f" metalness={0.12} opacity={ghost ? 0.62 : 1} roughness={0.48} transparent={ghost} />
      </mesh>
      <group position={[0, 0, -0.026]}>
        {[-1, 1].map((side) => (
          <mesh key={`v-${side}`} layers={layer} position={[side * 0.635, 0, 0]}>
            <boxGeometry args={[0.018, 0.27, 0.008]} />
            <meshStandardMaterial color="#f2f4ea" opacity={ghost ? 0.62 : 0.9} transparent={ghost} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`h-${side}`} layers={layer} position={[0, side * 0.135, 0]}>
            <boxGeometry args={[1.27, 0.018, 0.008]} />
            <meshStandardMaterial color="#f2f4ea" opacity={ghost ? 0.62 : 0.9} transparent={ghost} />
          </mesh>
        ))}
        <mesh layers={layer} position={[0, 0, 0]}>
          <boxGeometry args={[0.72, 0.055, 0.008]} />
          <meshStandardMaterial color="#f2f4ea" opacity={ghost ? 0.55 : 0.78} transparent />
        </mesh>
      </group>
    </group>
  )
}

export function TrafficSignalModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: TrafficSignalNode
}) {
  const [flashingOn, setFlashingOn] = useState(true)
  const layout = resolveTrafficSignalLayout(node)
  useEffect(() => {
    if (ghost || node.signalState !== 'flashing-yellow') {
      setFlashingOn(true)
      return
    }
    const timer = window.setInterval(() => setFlashingOn((value) => !value), 700)
    return () => window.clearInterval(timer)
  }, [ghost, node.signalState])
  const primaryFace = layout.faceCenters[0]!
  const spanCurve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(0, layout.supportHeight, 0),
        new Vector3(layout.armReach / 2, layout.supportHeight - 0.32, 0),
        new Vector3(layout.armReach, layout.supportHeight, 0),
      ),
    [layout.armReach, layout.supportHeight],
  )

  return (
    <group>
      <SupportPole color={node.poleColor} ghost={ghost} height={layout.supportHeight} layer={layer} />

      {node.mount === 'mast-arm' ? (
        <>
          <mesh
            castShadow={!ghost}
            layers={layer}
            position={layout.armCenter}
            rotation={[0, 0, -Math.PI / 2]}
          >
            <cylinderGeometry
              args={[
                TRAFFIC_SIGNAL_DIMENSIONS.armTipRadius,
                TRAFFIC_SIGNAL_DIMENSIONS.armBaseRadius,
                layout.armReach,
                20,
              ]}
            />
            <SignalMetalMaterial color={node.poleColor} ghost={ghost} roughness={0.38} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            position={[
              layout.armReach - TRAFFIC_SIGNAL_DIMENSIONS.armEndCollarLength / 2,
              layout.supportHeight,
              0,
            ]}
            rotation={[0, 0, -Math.PI / 2]}
          >
            <cylinderGeometry
              args={[
                TRAFFIC_SIGNAL_DIMENSIONS.armBaseRadius * 0.84,
                TRAFFIC_SIGNAL_DIMENSIONS.armBaseRadius * 0.84,
                TRAFFIC_SIGNAL_DIMENSIONS.armEndCollarLength,
                20,
              ]}
            />
            <SignalMetalMaterial color="#252a2c" ghost={ghost} metalness={0.58} roughness={0.5} />
          </mesh>
          <TubeBetween
            color={node.poleColor}
            from={[0, layout.supportHeight - 0.5, 0]}
            ghost={ghost}
            layer={layer}
            radius={0.045}
            to={[Math.min(1.25, layout.armReach * 0.28), layout.supportHeight, 0]}
          />
          <mesh castShadow={!ghost} layers={layer} position={[0, layout.supportHeight - 0.06, 0]}>
            <sphereGeometry args={[0.2, 20, 12]} />
            <SignalMetalMaterial color={node.poleColor} ghost={ghost} roughness={0.38} />
          </mesh>
          {node.streetNameSign ? (
            <StreetNameSign ghost={ghost} layer={layer} position={layout.streetSignCenter} />
          ) : null}
        </>
      ) : null}

      {node.mount === 'span-wire' ? (
        <>
          <SupportPole
            color={node.poleColor}
            ghost={ghost}
            height={layout.supportHeight}
            layer={layer}
            x={layout.armReach}
          />
          <mesh castShadow={!ghost} layers={layer}>
            <tubeGeometry args={[spanCurve, 40, 0.018, 8, false]} />
            <SignalMetalMaterial color="#252a2c" ghost={ghost} metalness={0.58} roughness={0.5} />
          </mesh>
        </>
      ) : null}

      {node.mount === 'post' ? (
        <TubeBetween
          color={node.poleColor}
          from={[0, primaryFace[1] + layout.head.height * 0.28, 0]}
          ghost={ghost}
          layer={layer}
          radius={0.035}
          to={[primaryFace[0], primaryFace[1] + layout.head.height * 0.28, 0]}
        />
      ) : null}

      {layout.faceCenters.map((position, index) => (
        <TrafficSignalHead
          flashingOn={flashingOn}
          ghost={ghost}
          key={`${position[0]}-${index}`}
          layer={layer}
          node={node}
          position={position}
        />
      ))}

      {node.cabinet ? (
        <ControllerCabinet ghost={ghost} layer={layer} position={layout.cabinetCenter} />
      ) : null}
    </group>
  )
}
