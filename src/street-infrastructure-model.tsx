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
  resolveFireHydrantOutletLayout,
  resolveManholeCoverLayout,
} from './street-infrastructure-geometry'
import { TrafficSignalModel } from './traffic-signal-model'

const RADIAL_TREAD_ANGLES = Array.from({ length: 24 }, (_, index) => (index * Math.PI * 2) / 24)
const GRID_TREAD_OFFSETS = [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72] as const
const RING_TREAD_FACTORS = [0.84, 0.64, 0.44] as const
const HYDRANT_BOLT_ANGLES = Array.from({ length: 8 }, (_, index) => (index * Math.PI * 2) / 8)
const HYDRANT_CAP_BOLT_ANGLES = Array.from({ length: 6 }, (_, index) => (index * Math.PI * 2) / 6)

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
  // Curb openings are side-specific. Without mirroring this assembly, a
  // right-side inlet leaves its curb block on the opposite side of the road.
  const curbSide = node.roadAttachment?.side === 'right' ? -1 : 1
  return (
    <group>
      {layout.hasSurfaceGrate ? (
        <>
          <mesh castShadow={!ghost} layers={layer} position={[0, layout.surroundHeight / 2, 0]}>
            <boxGeometry args={[layout.length + 0.16, layout.surroundHeight, layout.width + 0.16]} />
            <MetalMaterial color="#767b76" ghost={ghost} roughness={0.86} />
          </mesh>
          <mesh layers={layer} position={[0, layout.voidCenterY, 0]}>
            <boxGeometry args={[layout.innerLength, layout.voidDepth, layout.innerWidth]} />
            <meshStandardMaterial color="#111718" opacity={ghost ? 0.58 : 1} roughness={0.34} transparent={ghost} />
          </mesh>
          {node.wetness > 0.01 ? (
            <mesh layers={layer} position={[0, layout.voidTopY + 0.003, 0]}>
              <boxGeometry args={[layout.innerLength * 0.92, 0.006, layout.innerWidth * 0.92]} />
              <meshStandardMaterial
                color="#29434a"
                metalness={0.28}
                opacity={ghost ? 0.3 : 0.22 + node.wetness * 0.38}
                roughness={0.18}
                transparent
              />
            </mesh>
          ) : null}
          <mesh castShadow={!ghost} layers={layer} position={[0, layout.frameCenterY, layout.width / 2 - layout.frameWidth / 2]}>
            <boxGeometry args={[layout.length, layout.frameHeight, layout.frameWidth]} />
            <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} position={[0, layout.frameCenterY, -layout.width / 2 + layout.frameWidth / 2]}>
            <boxGeometry args={[layout.length, layout.frameHeight, layout.frameWidth]} />
            <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} position={[layout.length / 2 - layout.frameWidth / 2, layout.frameCenterY, 0]}>
            <boxGeometry args={[layout.frameWidth, layout.frameHeight, layout.innerWidth]} />
            <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} position={[-layout.length / 2 + layout.frameWidth / 2, layout.frameCenterY, 0]}>
            <boxGeometry args={[layout.frameWidth, layout.frameHeight, layout.innerWidth]} />
            <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
          </mesh>
          <mesh layers={layer} position={[0, layout.seatCenterY, layout.width / 2 - layout.frameWidth - 0.012]}>
            <boxGeometry args={[layout.innerLength, layout.seatHeight, 0.024]} />
            <MetalMaterial color="#252b2c" ghost={ghost} roughness={0.48} />
          </mesh>
          <mesh layers={layer} position={[0, layout.seatCenterY, -layout.width / 2 + layout.frameWidth + 0.012]}>
            <boxGeometry args={[layout.innerLength, layout.seatHeight, 0.024]} />
            <MetalMaterial color="#252b2c" ghost={ghost} roughness={0.48} />
          </mesh>
          <mesh layers={layer} position={[layout.length / 2 - layout.frameWidth - 0.012, layout.seatCenterY, 0]}>
            <boxGeometry args={[0.024, layout.seatHeight, layout.innerWidth]} />
            <MetalMaterial color="#252b2c" ghost={ghost} roughness={0.48} />
          </mesh>
          <mesh layers={layer} position={[-layout.length / 2 + layout.frameWidth + 0.012, layout.seatCenterY, 0]}>
            <boxGeometry args={[0.024, layout.seatHeight, layout.innerWidth]} />
            <MetalMaterial color="#252b2c" ghost={ghost} roughness={0.48} />
          </mesh>
          {layout.bars.map((bar, index) => (
            <mesh
              castShadow={!ghost}
              key={`${bar.x}:${bar.z}:${bar.rotationY}:${index}`}
              layers={layer}
              position={[bar.x, layout.barCenterY, bar.z]}
              rotation={[0, bar.rotationY, 0]}
            >
              <boxGeometry args={[bar.width, layout.barHeight, bar.length]} />
              <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
            </mesh>
          ))}
        </>
      ) : null}
      {layout.hasCurbOpening ? (
        <group position={[layout.curbOpeningOffsetX, node.curbHeight / 2, curbSide * layout.curbCenterZ]}>
          <mesh castShadow={!ghost} layers={layer}>
            <boxGeometry args={[layout.curbOpeningLength + layout.curbDepth, node.curbHeight, layout.curbDepth]} />
            <MetalMaterial color="#8b8c87" ghost={ghost} roughness={0.82} />
          </mesh>
          <mesh layers={layer} position={[0, -node.curbHeight * 0.04, -layout.curbDepth / 2 - 0.006]}>
            <boxGeometry args={[layout.curbOpeningLength, node.curbHeight * 0.58, 0.032]} />
            <meshStandardMaterial color="#141a1b" opacity={ghost ? 0.55 : 1} roughness={0.4} transparent={ghost} />
          </mesh>
          <mesh layers={layer} position={[0, -node.curbHeight * 0.38, -layout.curbDepth / 2 + 0.012]}>
            <boxGeometry args={[layout.curbOpeningLength + 0.08, 0.04, 0.11]} />
            <MetalMaterial color="#686d68" ghost={ghost} roughness={0.86} />
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
  return (
    <group>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.frameHeight / 2, 0]}>
        <cylinderGeometry args={[layout.frameRadius, layout.frameRadius * 0.98, layout.frameHeight, 48]} />
        <MetalMaterial color="#343938" ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, layout.coverBackingCenterY, 0]}>
        <cylinderGeometry args={[layout.radius * 0.98, layout.radius * 0.96, layout.coverBackingThickness, 48]} />
        <MetalMaterial color="#252a29" ghost={ghost} roughness={0.54} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.coverCenterY, 0]}>
        <cylinderGeometry args={[layout.radius * 0.96, layout.radius * 0.94, layout.coverThickness, 48]} />
        <MetalMaterial color={node.metalColor} ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, layout.rimCenterY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[layout.rimRadius, layout.rimTubeRadius, 8, 48]} />
        <MetalMaterial color="#272d2b" ghost={ghost} roughness={0.5} />
      </mesh>
      {node.treadPattern === 'rings'
        ? RING_TREAD_FACTORS.map((factor) => (
            <mesh key={`ring:${factor}`} layers={layer} position={[0, layout.treadY, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[layout.radius * factor, 0.012, 8, 48]} />
              <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
            </mesh>
          ))
        : null}
      {node.treadPattern === 'radial'
        ? RADIAL_TREAD_ANGLES.map((angle) => (
            <mesh
              key={`radial:${angle}`}
              layers={layer}
              position={[Math.cos(angle) * layout.radius * 0.39, layout.treadY, Math.sin(angle) * layout.radius * 0.39]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[layout.radius * 0.7, layout.treadHeight, 0.016]} />
              <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
            </mesh>
          ))
        : null}
      {node.treadPattern === 'grid'
        ? GRID_TREAD_OFFSETS.flatMap((offset) => {
            const position = offset * layout.treadRadius
            const span = Math.sqrt(Math.max(0, layout.treadRadius ** 2 - position ** 2)) * 2
            return [
              <mesh key={`grid-x:${offset}`} layers={layer} position={[position, layout.treadY, 0]}>
                <boxGeometry args={[0.014, layout.treadHeight, span]} />
                <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
              </mesh>,
              <mesh key={`grid-z:${offset}`} layers={layer} position={[0, layout.treadY, position]}>
                <boxGeometry args={[span, layout.treadHeight, 0.014]} />
                <MetalMaterial color="#303534" ghost={ghost} roughness={roughness} />
              </mesh>,
            ]
          })
        : null}
      <mesh layers={layer} position={[0, layout.treadY + 0.003, 0]}>
        <cylinderGeometry args={[layout.centerReliefRadius, layout.centerReliefRadius * 0.92, 0.018, 16]} />
        <MetalMaterial color="#3b403f" ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[-layout.radius * 0.58, layout.treadY + 0.004, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.065, 0.018, 0.024]} />
        <MetalMaterial color="#1f2423" ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[layout.radius * 0.58, layout.treadY + 0.004, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.065, 0.018, 0.024]} />
        <MetalMaterial color="#1f2423" ghost={ghost} roughness={roughness} />
      </mesh>
    </group>
  )
}

function HydrantOutlet({
  bodyColor,
  capColor,
  ghost,
  layer,
  position,
  radius,
  rotation,
}: {
  bodyColor: string
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
        <MetalMaterial color={bodyColor} ghost={ghost} roughness={0.42} />
      </mesh>
      <mesh layers={layer} position={[0, radius * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.82, radius * 0.075, 6, 18]} />
        <MetalMaterial color="#242a2b" ghost={ghost} roughness={0.5} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, radius * 0.62, 0]}>
        <cylinderGeometry args={[radius, radius * 0.92, radius * 0.3, 8]} />
        <MetalMaterial color={capColor} ghost={ghost} roughness={0.38} />
      </mesh>
      {HYDRANT_CAP_BOLT_ANGLES.map((angle) => (
        <mesh
          key={angle}
          layers={layer}
          position={[Math.cos(angle) * radius * 0.58, radius * 0.81, Math.sin(angle) * radius * 0.58]}
        >
          <cylinderGeometry args={[radius * 0.065, radius * 0.065, radius * 0.075, 6]} />
          <MetalMaterial color="#5e6665" ghost={ghost} roughness={0.42} />
        </mesh>
      ))}
      <mesh layers={layer} position={[0, radius * 0.84, 0]}>
        <cylinderGeometry args={[radius * 0.16, radius * 0.14, radius * 0.08, 5]} />
        <MetalMaterial color="#303738" ghost={ghost} roughness={0.34} />
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
  const outlets = resolveFireHydrantOutletLayout(node, layout)
  const roughness = 0.38 + node.weathering * 0.35
  return (
    <group>
      <mesh castShadow={!ghost} layers={layer} position={[0, 0.018 * layout.scale, 0]}>
        <cylinderGeometry args={[layout.padRadius, layout.padRadius * 0.98, 0.035 * layout.scale, 32]} />
        <MetalMaterial color="#b7b3aa" ghost={ghost} roughness={0.84} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.flangeHeight / 2, 0]}>
        <cylinderGeometry args={[layout.flangeRadius, layout.flangeRadius * 0.92, layout.flangeHeight, 24]} />
        <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, layout.flangeTopY + 0.008 * layout.scale, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[layout.flangeRadius * 0.83, 0.018 * layout.scale, 8, 28]} />
        <MetalMaterial color="#5d2a25" ghost={ghost} roughness={0.5} />
      </mesh>
      {HYDRANT_BOLT_ANGLES.map((angle) => (
        <mesh
          key={angle}
          layers={layer}
          position={[
            Math.cos(angle) * layout.flangeRadius * 0.78,
            layout.flangeTopY + 0.024 * layout.scale,
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
      <mesh layers={layer} position={[0, layout.barrelTopY - 0.018 * layout.scale, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[layout.barrelRadius * 0.98, 0.014 * layout.scale, 8, 24]} />
        <MetalMaterial color="#642b27" ghost={ghost} roughness={0.5} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.bonnetFlangeCenterY, 0]}>
        <cylinderGeometry args={[layout.bonnetFlangeRadius, layout.bonnetFlangeRadius * 0.96, layout.bonnetFlangeHeight, 28]} />
        <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={roughness} />
      </mesh>
      <mesh layers={layer} position={[0, layout.bonnetFlangeCenterY + layout.bonnetFlangeHeight * 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[layout.bonnetFlangeRadius * 0.9, 0.015 * layout.scale, 8, 28]} />
        <MetalMaterial color={node.capColor} ghost={ghost} roughness={0.48} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.bonnetY, 0]}>
        <sphereGeometry args={[layout.bonnetRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <MetalMaterial color={node.bonnetColor} ghost={ghost} roughness={roughness} />
      </mesh>
      {!layout.isWetBarrel ? (
        <>
          <mesh layers={layer} position={[0, layout.bonnetTopY + layout.stemNutHeight * 0.16, 0]}>
            <cylinderGeometry args={[layout.stemNutRadius * 0.92, layout.stemNutRadius, layout.stemNutHeight * 0.42, 12]} />
            <MetalMaterial color={node.capColor} ghost={ghost} roughness={0.35} />
          </mesh>
          <mesh layers={layer} position={[0, layout.stemNutY, 0]}>
            <cylinderGeometry args={[layout.stemNutRadius, layout.stemNutRadius * 0.88, layout.stemNutHeight, 5]} />
            <MetalMaterial color={node.capColor} ghost={ghost} roughness={0.35} />
          </mesh>
        </>
      ) : (
        <mesh layers={layer} position={[0, layout.bonnetTopY - 0.012 * layout.scale, 0]}>
          <cylinderGeometry args={[layout.bonnetRadius * 0.62, layout.bonnetRadius * 0.72, 0.026 * layout.scale, 20]} />
          <MetalMaterial color={node.bonnetColor} ghost={ghost} roughness={roughness} />
        </mesh>
      )}
      {outlets.map((outlet) => {
        const x = Math.cos(outlet.angle) * layout.barrelRadius * 1.02
        const z = Math.sin(outlet.angle) * layout.barrelRadius * 1.02
        return (
          <HydrantOutlet
            bodyColor={node.bodyColor}
            capColor={node.capColor}
            ghost={ghost}
            key={`${outlet.kind}:${outlet.angle}`}
            layer={layer}
            position={[x, layout.outletY, z]}
            radius={outlet.radius}
            rotation={[0, -outlet.angle, -Math.PI / 2]}
          />
        )
      })}
      {!layout.isWetBarrel ? (
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={`drain:${side}`}
              layers={layer}
              position={[side * layout.barrelRadius * 0.83, layout.drainY, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.018 * layout.scale, 0.018 * layout.scale, 0.035 * layout.scale, 10]} />
              <MetalMaterial color="#6a302a" ghost={ghost} roughness={0.5} />
            </mesh>
          ))}
        </>
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
