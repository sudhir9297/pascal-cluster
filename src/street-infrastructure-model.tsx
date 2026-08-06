'use client'

import type {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
} from './schema'
import type { StreetInfrastructureNode } from './street-infrastructure-config'
import {
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveManholeCoverLayout,
} from './street-infrastructure-geometry'
import { TrafficSignalModel } from './traffic-signal-model'

const RADIAL_TREAD_ANGLES = Array.from({ length: 16 }, (_, index) => (index * Math.PI * 2) / 16)
const GRID_TREAD_OFFSETS = [-0.2, -0.1, 0, 0.1, 0.2] as const
const HYDRANT_BOLT_ANGLES = Array.from({ length: 8 }, (_, index) => (index * Math.PI * 2) / 8)

function MetalMaterial({
  color,
  ghost,
  roughness = 0.4,
}: {
  color: string
  ghost: boolean
  roughness?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={0.72}
      opacity={ghost ? 0.62 : 1}
      roughness={roughness}
      transparent={ghost}
    />
  )
}

export function DrainageInletModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: DrainageInletNode
}) {
  const layout = resolveDrainageInletLayout(node)
  const roughness = 0.62 - node.wetness * 0.35
  return (
    <group>
      <mesh layers={layer} position={[0, 0.012, 0]}>
        <boxGeometry args={[layout.length + 0.09, 0.045, layout.width + 0.09]} />
        <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, 0.038, 0]}>
        <boxGeometry args={[layout.length - 0.06, 0.025, layout.width - 0.06]} />
        <meshStandardMaterial color="#111718" opacity={ghost ? 0.55 : 1} roughness={0.3} transparent={ghost} />
      </mesh>
      {layout.bars.map((bar, index) => (
        <mesh
          castShadow={!ghost}
          key={`${bar.x}:${bar.z}:${index}`}
          layers={layer}
          position={[bar.x, 0.065, bar.z]}
          rotation={[0, bar.rotationY, 0]}
        >
          <boxGeometry args={[bar.width, 0.035, bar.length]} />
          <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
        </mesh>
      ))}
      {node.inletType === 'combination' ? (
        <group position={[0, node.curbHeight / 2, layout.curbCenterZ]}>
          <mesh castShadow={!ghost} layers={layer}>
            <boxGeometry args={[layout.length + 0.16, node.curbHeight, 0.15]} />
            <meshStandardMaterial color="#8b8c87" opacity={ghost ? 0.58 : 1} roughness={0.82} transparent={ghost} />
          </mesh>
          <mesh layers={layer} position={[0, -node.curbHeight * 0.05, -0.081]}>
            <boxGeometry args={[layout.length * 0.7, node.curbHeight * 0.48, 0.025]} />
            <meshStandardMaterial color="#141a1b" opacity={ghost ? 0.55 : 1} roughness={0.4} transparent={ghost} />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

export function ManholeCoverModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: ManholeCoverNode
}) {
  const layout = resolveManholeCoverLayout(node)
  const roughness = 0.62 - node.wetness * 0.35
  const ringCount = node.treadPattern === 'rings' ? 3 : 1
  return (
    <group>
      <mesh layers={layer} position={[0, 0.018, 0]}>
        <cylinderGeometry args={[layout.frameRadius, layout.frameRadius, 0.055, 40]} />
        <MetalMaterial color="#343938" ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, 0.051, 0]}>
        <cylinderGeometry args={[layout.radius, layout.radius, 0.025, 48]} />
        <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
      </mesh>
      {Array.from({ length: ringCount }, (_, index) => (
        <mesh key={`ring:${index}`} layers={layer} position={[0, 0.068, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[layout.reliefRadius * (1 - index * 0.24), 0.012, 6, 36]} />
          <MetalMaterial color="#2f3433" ghost={ghost} roughness={roughness} />
        </mesh>
      ))}
      {node.treadPattern === 'radial'
        ? RADIAL_TREAD_ANGLES.map((angle) => (
            <mesh
              key={angle}
              layers={layer}
              position={[Math.cos(angle) * layout.radius * 0.55, 0.072, Math.sin(angle) * layout.radius * 0.55]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[layout.diameter * 0.18, 0.018, 0.018]} />
              <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
            </mesh>
          ))
        : node.treadPattern === 'grid'
          ? GRID_TREAD_OFFSETS.flatMap((offset) => [
              <mesh key={`x:${offset}`} layers={layer} position={[offset * layout.diameter, 0.072, 0]}>
                <boxGeometry args={[0.012, 0.018, layout.diameter * 0.7]} />
                <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
              </mesh>,
              <mesh key={`z:${offset}`} layers={layer} position={[0, 0.072, offset * layout.diameter]}>
                <boxGeometry args={[layout.diameter * 0.7, 0.018, 0.012]} />
                <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
              </mesh>,
            ])
          : null}
      <mesh layers={layer} position={[0, 0.078, 0]}>
        <cylinderGeometry args={[layout.diameter * 0.16, layout.diameter * 0.16, 0.018, 24]} />
        <MetalMaterial color="#3b403f" ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[-layout.diameter * 0.24, 0.082, 0]}>
        <boxGeometry args={[0.055, 0.018, 0.025]} />
        <MetalMaterial color="#1f2423" ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[layout.diameter * 0.24, 0.082, 0]}>
        <boxGeometry args={[0.055, 0.018, 0.025]} />
        <MetalMaterial color="#1f2423" ghost={ghost} roughness={roughness} />
      </mesh>
    </group>
  )
}

function HydrantOutlet({
  capColor,
  ghost,
  layer,
  position,
  radius,
  rotation,
}: {
  capColor: string
  ghost: boolean
  layer: number
  position: readonly [number, number, number]
  radius: number
  rotation: readonly [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={!ghost} layers={layer}>
        <cylinderGeometry args={[radius * 0.82, radius, radius * 1.05, 18]} />
        <MetalMaterial color="#8e2f29" ghost={ghost} roughness={0.42} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, radius * 0.62, 0]}>
        <cylinderGeometry args={[radius, radius * 0.92, radius * 0.3, 8]} />
        <MetalMaterial color={capColor} ghost={ghost} roughness={0.38} />
      </mesh>
    </group>
  )
}

export function FireHydrantModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: FireHydrantNode
}) {
  const layout = resolveFireHydrantLayout(node)
  const roughness = 0.38 + node.weathering * 0.35
  const showBothHoseOutlets = node.outletLayout !== 'one-hose'
  const showPumper = node.outletLayout === 'two-hose-one-pumper'
  return (
    <group>
      <mesh castShadow={!ghost} layers={layer} position={[0, 0.055 * layout.scale, 0]}>
        <cylinderGeometry args={[layout.flangeRadius, layout.flangeRadius * 0.92, 0.11 * layout.scale, 24]} />
        <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={roughness} />
      </mesh>
      {HYDRANT_BOLT_ANGLES.map((angle) => (
        <mesh
          key={angle}
          layers={layer}
          position={[
            Math.cos(angle) * layout.flangeRadius * 0.78,
            0.125 * layout.scale,
            Math.sin(angle) * layout.flangeRadius * 0.78,
          ]}
        >
          <cylinderGeometry args={[0.018 * layout.scale, 0.018 * layout.scale, 0.035 * layout.scale, 8]} />
          <MetalMaterial color="#592722" ghost={ghost} roughness={0.45} />
        </mesh>
      ))}
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.barrelCenterY, 0]}>
        <cylinderGeometry args={[layout.barrelRadius * 0.94, layout.barrelRadius, layout.barrelHeight, 24]} />
        <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.bonnetY, 0]}>
        <sphereGeometry args={[layout.barrelRadius * 1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <MetalMaterial color={node.bonnetColor} ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, layout.bonnetY + layout.barrelRadius * 0.98, 0]}>
        <cylinderGeometry args={[0.045 * layout.scale, 0.052 * layout.scale, 0.075 * layout.scale, 6]} />
        <MetalMaterial color={node.capColor} ghost={ghost} roughness={0.35} />
      </mesh>
      <HydrantOutlet
        capColor={node.capColor}
        ghost={ghost}
        layer={layer}
        position={[layout.barrelRadius * 1.02, layout.outletY, 0]}
        radius={layout.hoseRadius}
        rotation={[0, 0, -Math.PI / 2]}
      />
      {showBothHoseOutlets ? (
        <HydrantOutlet
          capColor={node.capColor}
          ghost={ghost}
          layer={layer}
          position={[-layout.barrelRadius * 1.02, layout.outletY, 0]}
          radius={layout.hoseRadius}
          rotation={[0, 0, Math.PI / 2]}
        />
      ) : null}
      {showPumper ? (
        <HydrantOutlet
          capColor={node.capColor}
          ghost={ghost}
          layer={layer}
          position={[0, layout.outletY, -layout.barrelRadius * 1.02]}
          radius={layout.pumperRadius}
          rotation={[Math.PI / 2, 0, 0]}
        />
      ) : null}
      {node.protectiveGuards ? (
        [-1, 1].map((side) => (
          <group key={side} position={[side * layout.guardOffset, 0, 0.15 * layout.scale]}>
            <mesh castShadow={!ghost} layers={layer} position={[0, 0.32 * layout.scale, 0]}>
              <cylinderGeometry args={[0.055 * layout.scale, 0.065 * layout.scale, 0.64 * layout.scale, 14]} />
              <MetalMaterial color="#e2aa2e" ghost={ghost} roughness={0.5} />
            </mesh>
            <mesh layers={layer} position={[0, 0.64 * layout.scale, 0]}>
              <sphereGeometry args={[0.055 * layout.scale, 14, 8]} />
              <MetalMaterial color="#e2aa2e" ghost={ghost} roughness={0.5} />
            </mesh>
          </group>
        ))
      ) : null}
    </group>
  )
}

export function StreetInfrastructureModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: StreetInfrastructureNode
}) {
  const kind = node.type as string
  if (kind === 'environment:traffic-signal') {
    return <TrafficSignalModel ghost={ghost} layer={layer} node={node as TrafficSignalNode} />
  }
  if (kind === 'environment:drainage-inlet') {
    return <DrainageInletModel ghost={ghost} layer={layer} node={node as DrainageInletNode} />
  }
  if (kind === 'environment:manhole-cover') {
    return <ManholeCoverModel ghost={ghost} layer={layer} node={node as ManholeCoverNode} />
  }
  return <FireHydrantModel ghost={ghost} layer={layer} node={node as FireHydrantNode} />
}
