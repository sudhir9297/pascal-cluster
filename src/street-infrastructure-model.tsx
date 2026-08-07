'use client'

import { useEffect, useMemo } from 'react'
import {
  BufferGeometry,
  Color,
  DataTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LinearFilter,
  Shape,
  SRGBColorSpace,
} from 'three'
import type {
  DrainageInletNode,
  FireHydrantNode,
  ManholeCoverNode,
  TrafficSignalNode,
  TrafficBollardNode,
  RoadBarrierNode,
  DrivewayNode,
  MailboxNode,
  ParcelBoxNode,
  TrashBinNode,
  RecyclingBinNode,
  ResidentialGateNode,
  SpeedHumpNode,
} from './schema'
import { isResidentialRoadAssetKind, type StreetInfrastructureNode } from './street-infrastructure-config'
import {
  buildDrivewayPlan,
  resolveDrainageInletLayout,
  resolveFireHydrantLayout,
  resolveFireHydrantOutletLayout,
  resolveManholeCoverLayout,
  resolveTrafficBollardLayout,
  resolveRoadBarrierLayout,
  resolveResidentialRoadAssetLayout,
} from './street-infrastructure-geometry'
import { TrafficSignalModel } from './traffic-signal-model'
import { resolveDrivewayGateOpenPose } from './driveway-gate-operation'

const RADIAL_TREAD_ANGLES = Array.from({ length: 24 }, (_, index) => (index * Math.PI * 2) / 24)
const GRID_TREAD_OFFSETS = [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72] as const
const RING_TREAD_FACTORS = [0.84, 0.64, 0.44] as const
const HYDRANT_BOLT_ANGLES = Array.from({ length: 8 }, (_, index) => (index * Math.PI * 2) / 8)
const HYDRANT_CAP_BOLT_ANGLES = Array.from({ length: 6 }, (_, index) => (index * Math.PI * 2) / 6)

function clamp01(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Math.min(1, Math.max(0, numeric))
}

/** Stagger the top lid and front access door through one Open slider. */
export function resolveParcelBoxOpenPose(operationState: number) {
  const open = clamp01(operationState)
  const lidProgress = clamp01(open / 0.58)
  const doorProgress = clamp01((open - 0.38) / 0.62)
  return {
    accessDoorAngle: -doorProgress * 1.68,
    accessDoorProgress: doorProgress,
    lidAngle: lidProgress * 1.72,
    lidProgress,
  }
}

function roundedRectangleRing(
  width: number,
  depth: number,
  radius: number,
  cornerSegments = 5,
): Array<readonly [number, number]> {
  const safeRadius = Math.min(radius, width / 2, depth / 2)
  const corners = [
    [width / 2 - safeRadius, depth / 2 - safeRadius, 0],
    [-width / 2 + safeRadius, depth / 2 - safeRadius, Math.PI / 2],
    [-width / 2 + safeRadius, -depth / 2 + safeRadius, Math.PI],
    [width / 2 - safeRadius, -depth / 2 + safeRadius, Math.PI * 1.5],
  ] as const
  return corners.flatMap(([centerX, centerZ, startAngle]) =>
    Array.from({ length: cornerSegments + 1 }, (_, index) => {
      const angle = startAngle + (index / cornerSegments) * Math.PI / 2
      return [
        centerX + Math.cos(angle) * safeRadius,
        centerZ + Math.sin(angle) * safeRadius,
      ] as const
    }),
  )
}

function buildRoundedFrustumGeometry({
  bottomDepth,
  bottomWidth,
  height,
  radius,
  topDepth,
  topWidth,
}: {
  bottomDepth: number
  bottomWidth: number
  height: number
  radius: number
  topDepth: number
  topWidth: number
}): BufferGeometry {
  const bottom = roundedRectangleRing(bottomWidth, bottomDepth, radius * 0.78)
  const top = roundedRectangleRing(topWidth, topDepth, radius)
  const ringLength = bottom.length
  const positions: number[] = []
  const indices: number[] = []
  for (const [x, z] of bottom) positions.push(x, 0, z)
  for (const [x, z] of top) positions.push(x, height, z)
  for (let index = 0; index < ringLength; index += 1) {
    const next = (index + 1) % ringLength
    const bottomIndex = index
    const bottomNext = next
    const topIndex = ringLength + index
    const topNext = ringLength + next
    indices.push(bottomIndex, topNext, bottomNext, bottomIndex, topIndex, topNext)
  }
  const bottomCenter = positions.length / 3
  positions.push(0, 0, 0)
  const topCenter = positions.length / 3
  positions.push(0, height, 0)
  for (let index = 0; index < ringLength; index += 1) {
    const next = (index + 1) % ringLength
    indices.push(bottomCenter, index, next)
    indices.push(topCenter, ringLength + next, ringLength + index)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function RoundedFrustum({
  bottomDepth,
  bottomWidth,
  color,
  ghost,
  height,
  layer,
  name,
  position,
  radius,
  roughness = 0.48,
  topDepth,
  topWidth,
}: {
  bottomDepth: number
  bottomWidth: number
  color: string
  ghost: boolean
  height: number
  layer: number
  name: string
  position: readonly [number, number, number]
  radius: number
  roughness?: number
  topDepth: number
  topWidth: number
}) {
  const geometry = useMemo(
    () => buildRoundedFrustumGeometry({ bottomDepth, bottomWidth, height, radius, topDepth, topWidth }),
    [bottomDepth, bottomWidth, height, radius, topDepth, topWidth],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh castShadow={!ghost} geometry={geometry} layers={layer} name={name} position={position} receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.025}
        opacity={ghost ? 0.62 : 1}
        roughness={roughness}
        transparent={ghost}
      />
    </mesh>
  )
}

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

export function TrafficBollardModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: TrafficBollardNode
}) {
  const layout = resolveTrafficBollardLayout(node)
  const flexible = node.style === 'flexible'
  return (
    <group>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.baseHeight / 2, 0]}>
        <cylinderGeometry args={[layout.baseRadius, layout.baseRadius * 1.04, layout.baseHeight, 24]} />
        <MetalMaterial color={node.baseColor} ghost={ghost} roughness={0.82} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, layout.baseHeight + (layout.height - layout.baseHeight) / 2, 0]}>
        <cylinderGeometry
          args={[
            flexible ? layout.radius * 0.92 : layout.radius,
            flexible ? layout.radius * 1.12 : layout.radius * 1.05,
            layout.height - layout.baseHeight,
            20,
          ]}
        />
        <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={flexible ? 0.72 : 0.42} />
      </mesh>
      {node.style === 'reflective' || node.style === 'steel' ? (
        <mesh layers={layer} position={[0, layout.reflectiveBandY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[layout.radius * 1.01, layout.reflectiveBandHeight / 2, 8, 24]} />
          <meshStandardMaterial
            color={node.reflectiveColor}
            emissive={node.reflectiveColor}
            emissiveIntensity={ghost ? 0.08 : 0.18}
            opacity={ghost ? 0.62 : 0.96}
            roughness={0.38}
            transparent={ghost}
          />
        </mesh>
      ) : null}
      <mesh layers={layer} position={[0, layout.collarY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[layout.radius * 0.96, layout.radius * 0.11, 8, 20]} />
        <MetalMaterial color={node.baseColor} ghost={ghost} roughness={0.58} />
      </mesh>
      <mesh layers={layer} position={[0, layout.height + 0.018, 0]}>
        <cylinderGeometry args={[layout.radius * 0.88, layout.radius * 0.98, 0.036, 20]} />
        <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={flexible ? 0.72 : 0.42} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`bolt:${side}`}
          layers={layer}
          position={[side * layout.baseRadius * 0.52, layout.baseHeight + 0.012, 0.02]}
        >
          <cylinderGeometry args={[0.018, 0.018, 0.024, 8]} />
          <MetalMaterial color="#d8ded7" ghost={ghost} roughness={0.5} />
        </mesh>
      ))}
      {flexible ? (
        <mesh layers={layer} position={[0, layout.height, 0]}>
          <sphereGeometry args={[layout.radius * 0.94, 16, 10]} />
          <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={0.72} />
        </mesh>
      ) : null}
    </group>
  )
}

export function RoadBarrierModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: RoadBarrierNode
}) {
  const layout = resolveRoadBarrierLayout(node)
  const halfLength = layout.length / 2
  const common = { castShadow: !ghost, layers: layer }
  if (node.barrierType === 'guardrail') {
    return (
      <group>
        {[-halfLength + layout.postRadius, halfLength - layout.postRadius].map((x) => (
          <mesh {...common} key={`post:${x}`} position={[x, layout.height / 2, 0]}>
            <cylinderGeometry args={[layout.postRadius, layout.postRadius * 1.1, layout.height, 12]} />
            <MetalMaterial color={node.metalColor} ghost={ghost} roughness={0.62} />
          </mesh>
        ))}
        <mesh {...common} position={[0, layout.beamY, 0]}>
          <boxGeometry args={[layout.length, layout.beamHeight, layout.width * 0.7]} />
          <MetalMaterial color={node.metalColor} ghost={ghost} roughness={0.52} />
        </mesh>
        <mesh {...common} position={[0, layout.beamY + layout.beamHeight * 0.9, 0]}>
          <boxGeometry args={[layout.length * 0.96, layout.beamHeight * 0.32, layout.width * 0.45]} />
          <MetalMaterial color={node.accentColor} ghost={ghost} roughness={0.66} />
        </mesh>
      </group>
    )
  }
  if (node.barrierType === 'crowd-control') {
    return (
      <group>
        {[-halfLength + layout.postRadius, halfLength - layout.postRadius].map((x) => (
          <group key={`post:${x}`}>
            <mesh {...common} position={[x, layout.height / 2, 0]}>
              <cylinderGeometry args={[layout.postRadius, layout.postRadius * 1.1, layout.height, 12]} />
              <MetalMaterial color={node.metalColor} ghost={ghost} roughness={0.52} />
            </mesh>
            <mesh {...common} position={[x, 0.04, 0]}>
              <cylinderGeometry args={[layout.postRadius * 2.5, layout.postRadius * 2.7, 0.08, 16]} />
              <MetalMaterial color={node.metalColor} ghost={ghost} roughness={0.72} />
            </mesh>
          </group>
        ))}
        <mesh {...common} position={[0, layout.beamY, 0]}>
          <boxGeometry args={[layout.length, layout.beamHeight * 0.7, layout.width * 0.34]} />
          <MetalMaterial color={node.accentColor} ghost={ghost} roughness={0.58} />
        </mesh>
      </group>
    )
  }
  const waterFilled = node.barrierType === 'water-filled'
  if (node.barrierType === 'jersey') {
    return <JerseyRoadBarrier ghost={ghost} layer={layer} node={node} />
  }
  return (
    <group>
      <mesh {...common} position={[0, layout.height / 2, 0]}>
        <boxGeometry args={[layout.length, layout.height, layout.width]} />
        <meshStandardMaterial
          color={node.bodyColor}
          opacity={ghost ? 0.62 : waterFilled ? 0.92 : 1}
          roughness={waterFilled ? 0.7 : 0.86}
          transparent={ghost || waterFilled}
        />
      </mesh>
      <mesh {...common} position={[0, layout.height * 0.62, 0]}>
        <boxGeometry args={[layout.length * 0.78, layout.height * 0.12, layout.width + 0.012]} />
        <meshStandardMaterial color={node.accentColor} opacity={ghost ? 0.62 : 0.96} roughness={0.5} transparent={ghost} />
      </mesh>
      {waterFilled ? (
        <mesh {...common} position={[0, layout.height + 0.025, 0]}>
          <boxGeometry args={[layout.length * 0.22, 0.05, layout.width * 0.32]} />
          <MetalMaterial color={node.bodyColor} ghost={ghost} roughness={0.76} />
        </mesh>
      ) : null}
    </group>
  )
}

function buildJerseyBarrierShellGeometry({
  height,
  length,
  surfaceOffset = 0,
  width,
}: {
  height: number
  length: number
  surfaceOffset?: number
  width: number
}): BufferGeometry {
  const bottomHalfWidth = width * 0.58 + surfaceOffset
  const shoulderHalfWidth = width * 0.43 + surfaceOffset
  const topHalfWidth = width * 0.24 + surfaceOffset
  const baseY = height * 0.2
  const shoulderY = height * 0.55
  const topY = height + surfaceOffset
  const cornerRadius = Math.min(height * 0.035, width * 0.08)
  const shape = new Shape()
  shape.moveTo(-bottomHalfWidth, 0)
  shape.lineTo(-bottomHalfWidth, baseY)
  shape.bezierCurveTo(
    -bottomHalfWidth,
    height * 0.29,
    -shoulderHalfWidth,
    height * 0.46,
    -topHalfWidth,
    shoulderY,
  )
  shape.lineTo(-topHalfWidth, topY - cornerRadius)
  shape.quadraticCurveTo(-topHalfWidth, topY, -topHalfWidth + cornerRadius, topY)
  shape.lineTo(topHalfWidth - cornerRadius, topY)
  shape.quadraticCurveTo(topHalfWidth, topY, topHalfWidth, topY - cornerRadius)
  shape.lineTo(topHalfWidth, shoulderY)
  shape.bezierCurveTo(
    shoulderHalfWidth,
    height * 0.46,
    bottomHalfWidth,
    height * 0.29,
    bottomHalfWidth,
    baseY,
  )
  shape.lineTo(bottomHalfWidth, 0)
  shape.closePath()

  const geometry = new ExtrudeGeometry(shape, {
    bevelEnabled: surfaceOffset === 0,
    bevelSegments: 2,
    bevelSize: Math.min(0.012, width * 0.035),
    bevelThickness: Math.min(0.012, length * 0.01),
    curveSegments: 8,
    depth: length,
    steps: 1,
  })
  geometry.rotateY(Math.PI / 2)
  geometry.translate(-length / 2, 0, 0)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function JerseyRoadBarrier({
  ghost,
  layer,
  node,
}: {
  ghost: boolean
  layer: number
  node: RoadBarrierNode
}) {
  const layout = resolveRoadBarrierLayout(node)
  const shellGeometry = useMemo(
    () => buildJerseyBarrierShellGeometry(layout),
    [layout.height, layout.length, layout.width],
  )
  const stripeWidth = layout.length * 0.1
  // The shell bevel grows beyond its profile. Keep the painted bands just
  // outside that bevel so they read as markings on the concrete instead of
  // becoming embedded inside it.
  const shellBevel = Math.min(0.012, layout.width * 0.035)
  const stripeSurfaceOffset = shellBevel + Math.min(0.003, layout.width * 0.01)
  const stripeGeometry = useMemo(
    () => buildJerseyBarrierShellGeometry({
      height: layout.height,
      length: stripeWidth,
      surfaceOffset: stripeSurfaceOffset,
      width: layout.width,
    }),
    [layout.height, layout.width, stripeSurfaceOffset, stripeWidth],
  )
  useEffect(() => () => shellGeometry.dispose(), [shellGeometry])
  useEffect(() => () => stripeGeometry.dispose(), [stripeGeometry])

  const opacity = ghost ? 0.62 : 1
  const recessXs = [-0.34, 0, 0.34].map((factor) => factor * layout.length)
  return (
    <group name="jersey-road-barrier">
      <mesh
        castShadow={!ghost}
        geometry={shellGeometry}
        layers={layer}
        name="jersey-barrier-shell"
        receiveShadow
      >
        <meshStandardMaterial
          color={node.bodyColor}
          metalness={0.015}
          opacity={opacity}
          roughness={0.91}
          transparent={ghost}
        />
      </mesh>
      {[-0.32, 0, 0.32].map((factor, index) => (
        <mesh
          castShadow={!ghost}
          geometry={stripeGeometry}
          key={`stripe:${factor}`}
          layers={layer}
          name={`jersey-barrier-stripe-${index + 1}`}
          position={[factor * layout.length, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial
            color={node.accentColor}
            metalness={0.01}
            opacity={opacity}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            roughness={0.87}
            transparent={ghost}
          />
        </mesh>
      ))}
      <mesh layers={layer} name="jersey-barrier-ground-shadow" position={[0, 0.012, 0]}>
        <boxGeometry args={[layout.length * 0.96, 0.024, layout.width * 1.02]} />
        <meshStandardMaterial color="#252321" opacity={ghost ? 0.25 : 0.68} roughness={1} transparent />
      </mesh>
      {recessXs.flatMap((x, index) =>
        ([-1, 1] as const).map((side) => (
          <mesh
            key={`foot-recess:${index}:${side}`}
            layers={layer}
            name="jersey-barrier-foot-recess"
            position={[x, layout.height * 0.043, side * layout.width * 0.585]}
          >
            <boxGeometry args={[layout.length * 0.065, layout.height * 0.075, 0.018]} />
            <meshStandardMaterial color="#2b2723" opacity={ghost ? 0.4 : 0.92} roughness={0.96} transparent={ghost} />
          </mesh>
        )),
      )}
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`end-recess:${side}`}
          layers={layer}
          name="jersey-barrier-end-recess"
          position={[side * layout.length * 0.506, layout.height * 0.055, 0]}
        >
          <boxGeometry args={[0.018, layout.height * 0.085, layout.width * 0.34]} />
          <meshStandardMaterial color="#292522" opacity={ghost ? 0.4 : 0.9} roughness={0.96} transparent={ghost} />
        </mesh>
      ))}
    </group>
  )
}

type ResidentialRoadAssetModelProps = {
  ghost?: boolean
  layer?: number
  node:
    | DrivewayNode
    | MailboxNode
    | ParcelBoxNode
    | TrashBinNode
    | RecyclingBinNode
    | ResidentialGateNode
    | SpeedHumpNode
}

function DrivewaySurface({
  color,
  ghost,
  height,
  layer,
  name,
  node,
  roughness,
  width,
  y = 0,
}: {
  color: string
  ghost: boolean
  height: number
  layer: number
  name: string
  node: DrivewayNode
  roughness: number
  width: number
  y?: number
}) {
  const geometry = useMemo(() => {
    const plan = buildDrivewayPlan(node, width)
    const shape = new Shape()
    const first = plan.outline[0]
    if (first) {
      shape.moveTo(first[0], -first[1])
      for (const point of plan.outline.slice(1)) shape.lineTo(point[0], -point[1])
      shape.closePath()
    }
    const result = new ExtrudeGeometry(shape, {
      bevelEnabled: false,
      curveSegments: 1,
      depth: height,
      steps: 1,
    })
    result.rotateX(-Math.PI / 2)
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [height, node.curveAmount, node.drivewayShape, node.length, width])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh castShadow={!ghost} geometry={geometry} layers={layer} name={name} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial
        color={color}
        opacity={ghost ? 0.62 : 1}
        roughness={roughness}
        transparent={ghost}
      />
    </mesh>
  )
}

function pointInPolygon(
  x: number,
  y: number,
  polygon: ReadonlyArray<readonly [number, number]>,
): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x1, y1] = polygon[index]!
    const [x2, y2] = polygon[previous]!
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
      inside = !inside
    }
  }
  return inside
}

function buildSpeedHumpSurfaceTexture(background: string): DataTexture {
  const size = 256
  const data = new Uint8Array(size * size * 4)
  const hex = new Color(background).getHex(SRGBColorSpace)
  const base = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255] as const
  const nearArrow = [
    [0.22, 0.23],
    [0.5, 0.08],
    [0.78, 0.23],
    [0.68, 0.28],
    [0.5, 0.18],
    [0.32, 0.28],
  ] as const
  const farArrow = nearArrow.map(([x, y]) => [x, 1 - y] as const)
  const fixingDots = [
    [0.22, 0.045],
    [0.78, 0.045],
    [0.22, 0.955],
    [0.78, 0.955],
  ] as const

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size
      const v = (y + 0.5) / size
      const reflective = pointInPolygon(u, v, nearArrow) || pointInPolygon(u, v, farArrow)
      const fixingDot = fixingDots.some(([dotX, dotY]) => Math.hypot(u - dotX, v - dotY) <= 0.027)
      const offset = (y * size + x) * 4
      data[offset] = reflective ? 247 : fixingDot ? 16 : base[0]
      data[offset + 1] = reflective ? 247 : fixingDot ? 18 : base[1]
      data[offset + 2] = reflective ? 242 : fixingDot ? 20 : base[2]
      data[offset + 3] = 255
    }
  }

  const texture = new DataTexture(data, size, size)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.name = 'speed-hump-surface-markings'
  texture.needsUpdate = true
  return texture
}

function SpeedHumpModule({
  ghost,
  height,
  layer,
  length,
  moduleIndex,
  surfaceTexture,
  width,
  x,
}: {
  ghost: boolean
  height: number
  layer: number
  length: number
  moduleIndex: number
  surfaceTexture: DataTexture
  width: number
  x: number
}) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-width / 2, 0)
    shape.bezierCurveTo(-width * 0.38, height * 0.08, -width * 0.22, height, 0, height)
    shape.bezierCurveTo(width * 0.22, height, width * 0.38, height * 0.08, width / 2, 0)
    shape.lineTo(-width / 2, 0)
    shape.closePath()
    const result = new ExtrudeGeometry(shape, {
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: Math.min(0.008, length * 0.018),
      bevelThickness: Math.min(0.006, height * 0.08),
      curveSegments: 8,
      depth: length * 0.97,
      steps: 1,
    })
    result.rotateY(Math.PI / 2)
    result.translate(-length * 0.485, 0, 0)
    const positions = result.getAttribute('position')
    const uvs = new Float32Array(positions.count * 2)
    for (let index = 0; index < positions.count; index += 1) {
      uvs[index * 2] = positions.getX(index) / length + 0.5
      uvs[index * 2 + 1] = positions.getZ(index) / width + 0.5
    }
    result.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    result.computeBoundingBox()
    result.computeBoundingSphere()
    return result
  }, [height, length, width])
  useEffect(() => () => geometry.dispose(), [geometry])

  const common = { castShadow: !ghost, layers: layer, receiveShadow: true }
  return (
    <group name="speed-hump-module" position={[x, 0, 0]}>
      <mesh {...common} geometry={geometry} name={`speed-hump-shell-${moduleIndex}`}>
        <meshStandardMaterial
          color="#ffffff"
          map={surfaceTexture}
          opacity={ghost ? 0.62 : 1}
          roughness={0.82}
          transparent={ghost}
        />
      </mesh>
    </group>
  )
}

function ModularSpeedHumpModel({
  ghost,
  layer,
  layout,
  node,
}: {
  ghost: boolean
  layer: number
  layout: ReturnType<typeof resolveResidentialRoadAssetLayout>
  node: SpeedHumpNode
}) {
  const legacyPalette = node.bodyColor === '#5a5b58' && node.accentColor === '#e7dfb9'
  const rubberColor = legacyPalette ? '#25282b' : node.bodyColor
  const yellowColor = legacyPalette ? '#f2b632' : node.accentColor
  const rubberTexture = useMemo(() => buildSpeedHumpSurfaceTexture(rubberColor), [rubberColor])
  const yellowTexture = useMemo(() => buildSpeedHumpSurfaceTexture(yellowColor), [yellowColor])
  useEffect(() => () => {
    rubberTexture.dispose()
    yellowTexture.dispose()
  }, [rubberTexture, yellowTexture])

  const moduleCount = Math.max(3, Math.round(layout.width / Math.max(layout.length, 0.1)))
  const moduleWidth = layout.width / moduleCount
  return (
    <group name="modular-rubber-speed-hump">
      {Array.from({ length: moduleCount }, (_, index) => (
        <SpeedHumpModule
          ghost={ghost}
          height={layout.height}
          key={`speed-hump-module:${index}`}
          layer={layer}
          length={moduleWidth}
          moduleIndex={index}
          surfaceTexture={index % 2 === 0 ? rubberTexture : yellowTexture}
          width={layout.length}
          x={-layout.width / 2 + moduleWidth * (index + 0.5)}
        />
      ))}
    </group>
  )
}

function CommercialTrashBinModel({
  ghost,
  layer,
  node,
  layout,
}: {
  ghost: boolean
  layer: number
  node: TrashBinNode
  layout: ReturnType<typeof resolveResidentialRoadAssetLayout>
}) {
  const legacyPalette = node.bodyColor === '#343b3b' && node.accentColor === '#202627'
  const bodyColor = legacyPalette ? '#2f713b' : node.bodyColor
  const lidColor = legacyPalette ? '#367f43' : node.accentColor
  const bodyDepth = layout.length * 0.86
  const wheelRadius = Math.max(0.075, Math.min(0.12, layout.height * 0.075))
  const wheelWidth = Math.max(0.05, Math.min(0.075, layout.width * 0.045))
  const bodyBottom = wheelRadius * 2.25
  const bodyHeight = layout.height * 0.55
  const bodyTop = bodyBottom + bodyHeight
  const frontZ = -(bodyDepth / 2 + layout.length * 0.015)
  const lidBase = bodyTop + layout.height * 0.075
  const common = { castShadow: !ghost, layers: layer }
  const material = (color: string, roughness = 0.68, metalness = 0.025) => (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      opacity={ghost ? 0.62 : 1}
      roughness={roughness}
      transparent={ghost}
    />
  )

  return (
    <group name="commercial-trash-bin">
      <RoundedFrustum
        bottomDepth={bodyDepth * 0.91}
        bottomWidth={layout.width * 0.84}
        color={bodyColor}
        ghost={ghost}
        height={bodyHeight}
        layer={layer}
        name="commercial-trash-bin-body"
        position={[0, bodyBottom, 0]}
        radius={Math.min(layout.width, layout.length) * 0.045}
        roughness={0.68}
        topDepth={bodyDepth}
        topWidth={layout.width * 0.96}
      />

      <RoundedFrustum
        bottomDepth={layout.length * 0.91}
        bottomWidth={layout.width * 0.99}
        color={bodyColor}
        ghost={ghost}
        height={layout.height * 0.085}
        layer={layer}
        name="trash-bin-reinforced-collar"
        position={[0, bodyTop - layout.height * 0.01, 0]}
        radius={Math.min(layout.width, layout.length) * 0.04}
        roughness={0.62}
        topDepth={layout.length * 0.98}
        topWidth={layout.width * 1.04}
      />
      <mesh {...common} position={[0, bodyTop + layout.height * 0.078, 0]}>
        <boxGeometry args={[layout.width * 1.07, layout.height * 0.032, layout.length]} />
        {material(lidColor, 0.58)}
      </mesh>

      {[-1, 1].flatMap((face) => [-0.36, -0.18, 0, 0.18, 0.36].map((offset) => (
        <group key={`commercial-bin-gusset:${face}:${offset}`}>
          <mesh
            {...common}
            position={[offset * layout.width, bodyTop - layout.height * 0.015, face * layout.length * 0.465]}
            rotation={[0, 0, Math.PI]}
          >
            <coneGeometry args={[layout.width * 0.032, layout.height * 0.105, 3]} />
            {material(bodyColor, 0.65)}
          </mesh>
        </group>
      )))}

      {[-0.36, -0.18, 0.18, 0.36].map((offset) => (
        <group key={`commercial-bin-front-rib:${offset}`}>
          <mesh
            {...common}
            position={[offset * layout.width, bodyBottom + bodyHeight * 0.5, frontZ]}
          >
            <boxGeometry args={[layout.width * 0.019, bodyHeight * 0.74, layout.length * 0.022]} />
            {material(lidColor, 0.61)}
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`commercial-bin-side-rib:${side}`}>
          <mesh
            {...common}
            position={[side * layout.width * 0.492, bodyBottom + bodyHeight * 0.5, 0]}
          >
            <boxGeometry args={[layout.width * 0.02, bodyHeight * 0.72, layout.length * 0.66]} />
            {material(lidColor, 0.61)}
          </mesh>
        </group>
      ))}

      <RoundedFrustum
        bottomDepth={layout.length * 1.02}
        bottomWidth={layout.width * 1.06}
        color={lidColor}
        ghost={ghost}
        height={layout.height * 0.065}
        layer={layer}
        name="trash-bin-domed-lid-base"
        position={[0, lidBase, -layout.length * 0.005]}
        radius={Math.min(layout.width, layout.length) * 0.055}
        roughness={0.56}
        topDepth={layout.length * 0.96}
        topWidth={layout.width * 1.02}
      />
      <RoundedFrustum
        bottomDepth={layout.length * 0.92}
        bottomWidth={layout.width * 0.98}
        color={lidColor}
        ghost={ghost}
        height={layout.height * 0.07}
        layer={layer}
        name="trash-bin-domed-lid"
        position={[0, lidBase + layout.height * 0.055, -layout.length * 0.01]}
        radius={Math.min(layout.width, layout.length) * 0.07}
        roughness={0.54}
        topDepth={layout.length * 0.72}
        topWidth={layout.width * 0.9}
      />
      {[-0.34, 0, 0.34].map((offset) => (
        <group key={`commercial-bin-lid-rib:${offset}`}>
          <mesh
            {...common}
            position={[offset * layout.width, lidBase + layout.height * 0.13, 0]}
          >
            <boxGeometry args={[layout.width * 0.025, layout.height * 0.025, layout.length * 0.72]} />
            {material(bodyColor, 0.52)}
          </mesh>
        </group>
      ))}
      <mesh {...common} position={[0, lidBase + layout.height * 0.135, 0]}>
        <boxGeometry args={[layout.width * 0.018, layout.height * 0.03, layout.length * 0.9]} />
        {material(bodyColor, 0.5)}
      </mesh>

      {[-0.3, 0.3].map((offset) => (
        <group key={`commercial-bin-hinge:${offset}`}>
          <mesh
            {...common}
            position={[offset * layout.width, lidBase + layout.height * 0.015, layout.length * 0.51]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[layout.height * 0.026, layout.height * 0.026, layout.width * 0.18, 14]} />
            {material('#18211a', 0.48, 0.18)}
          </mesh>
        </group>
      ))}
      <mesh {...common} position={[0, lidBase, -layout.length * 0.525]}>
        <boxGeometry args={[layout.width * 0.45, layout.height * 0.04, layout.width * 0.035]} />
        {material('#18211a', 0.54, 0.14)}
      </mesh>

      {[-1, 1].map((side) => (
        <group
          key={`commercial-bin-handle:${side}`}
          position={[side * layout.width * 0.515, bodyTop - layout.height * 0.1, layout.length * 0.2]}
        >
          {[-1, 1].map((end) => (
            <group key={`commercial-bin-handle-post:${side}:${end}`}>
              <mesh {...common} position={[side * layout.width * 0.018, 0, end * layout.length * 0.09]}>
                <boxGeometry args={[layout.width * 0.035, layout.height * 0.1, layout.width * 0.035]} />
                {material('#19211b', 0.54, 0.16)}
              </mesh>
            </group>
          ))}
          <mesh {...common} position={[side * layout.width * 0.035, layout.height * 0.045, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[layout.width * 0.014, layout.width * 0.014, layout.length * 0.24, 10]} />
            {material('#19211b', 0.5, 0.18)}
          </mesh>
        </group>
      ))}

      {[-1, 1].flatMap((side) => [-1, 1].map((end) => (
        <group
          key={`commercial-bin-caster:${side}:${end}`}
          name="trash-bin-caster"
          position={[side * layout.width * 0.4, 0, end * layout.length * 0.33]}
        >
          <mesh {...common} position={[0, bodyBottom * 0.88, 0]}>
            <boxGeometry args={[layout.width * 0.115, layout.height * 0.022, layout.length * 0.12]} />
            {material('#a87534', 0.38, 0.66)}
          </mesh>
          <mesh {...common} position={[0, bodyBottom * 0.7, 0]}>
            <cylinderGeometry args={[layout.width * 0.017, layout.width * 0.017, bodyBottom * 0.24, 10]} />
            {material('#b98037', 0.35, 0.7)}
          </mesh>
          {[-1, 1].map((fork) => (
            <group key={`commercial-bin-caster-fork:${fork}`}>
              <mesh {...common} position={[fork * wheelWidth * 0.68, wheelRadius * 1.2, 0]}>
                <boxGeometry args={[wheelWidth * 0.24, wheelRadius * 0.95, wheelRadius * 0.38]} />
                {material('#a87534', 0.38, 0.68)}
              </mesh>
            </group>
          ))}
          <mesh {...common} name="trash-bin-caster-wheel" position={[0, wheelRadius, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 20]} />
            {material('#171a18', 0.9)}
          </mesh>
          <mesh {...common} position={[side * wheelWidth * 0.53, wheelRadius, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius * 0.38, wheelRadius * 0.38, wheelWidth * 1.08, 14]} />
            {material('#b98037', 0.36, 0.7)}
          </mesh>
        </group>
      )))}

      <group name="trash-bin-disposal-badge" position={[0, bodyBottom + bodyHeight * 0.54, frontZ - layout.length * 0.03]}>
        <mesh {...common} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[layout.width * 0.095, 32]} />
          {material(bodyColor, 0.64)}
        </mesh>
        <mesh {...common}>
          <torusGeometry args={[layout.width * 0.088, layout.width * 0.009, 8, 32]} />
          {material('#eef1e7', 0.52)}
        </mesh>
        <mesh {...common} position={[-layout.width * 0.015, layout.height * 0.035, -layout.length * 0.008]}>
          <sphereGeometry args={[layout.width * 0.014, 10, 8]} />
          {material('#eef1e7', 0.52)}
        </mesh>
        <mesh {...common} position={[-layout.width * 0.015, -layout.height * 0.005, -layout.length * 0.008]}>
          <boxGeometry args={[layout.width * 0.022, layout.height * 0.065, layout.width * 0.012]} />
          {material('#eef1e7', 0.52)}
        </mesh>
        <mesh {...common} position={[layout.width * 0.026, -layout.height * 0.026, -layout.length * 0.008]}>
          <boxGeometry args={[layout.width * 0.032, layout.height * 0.052, layout.width * 0.012]} />
          {material('#eef1e7', 0.52)}
        </mesh>
      </group>
    </group>
  )
}

export function ResidentialRoadAssetModel({
  ghost = false,
  layer = 0,
  node,
}: ResidentialRoadAssetModelProps) {
  const layout = resolveResidentialRoadAssetLayout(node)
  const common = { castShadow: !ghost, layers: layer }
  const kind = node.type
  const material = (color: string, roughness = 0.75) => (
    <meshStandardMaterial
      color={color}
      opacity={ghost ? 0.62 : 1}
      roughness={roughness}
      transparent={ghost}
    />
  )

  if (kind === 'environment:trash-bin') {
    return <CommercialTrashBinModel ghost={ghost} layer={layer} layout={layout} node={node} />
  }

  if (kind === 'environment:driveway') {
    return (
      <group>
        <DrivewaySurface
          color={node.bodyColor}
          ghost={ghost}
          height={layout.height}
          layer={layer}
          name="driveway-base"
          node={node}
          roughness={0.88}
          width={layout.width}
        />
        <DrivewaySurface
          color={node.accentColor}
          ghost={ghost}
          height={0.025}
          layer={layer}
          name="driveway-finish"
          node={node}
          roughness={0.92}
          width={layout.width * 0.94}
          y={layout.height}
        />
      </group>
    )
  }

  if (kind === 'environment:speed-hump') {
    return <ModularSpeedHumpModel ghost={ghost} layer={layer} layout={layout} node={node} />
  }

  if (kind === 'environment:parcel-box') {
    const plate = Math.max(0.022, Math.min(layout.width, layout.length) * 0.045)
    const bodyHeight = layout.height - plate * 1.4
    const frontZ = -(layout.length / 2 + plate * 0.55)
    const pose = resolveParcelBoxOpenPose(node.operationState)
    const doorWidth = layout.width * 0.77
    const doorHeight = bodyHeight * 0.68
    const doorCenterY = bodyHeight * 0.43
    const doorHingeX = doorWidth / 2
    const reveal = Math.max(0.008, plate * 0.34)
    const lidWidth = layout.width * 1.08
    const lidDepth = layout.length * 1.08
    const doorBottomY = doorCenterY - doorHeight / 2
    const doorTopY = doorCenterY + doorHeight / 2
    const bottomRailHeight = doorBottomY
    const topRailHeight = bodyHeight - doorTopY
    const sideRailWidth = (layout.width - doorWidth) / 2
    return (
      <group name="parcel-box">
        <group name="parcel-cabinet-shell">
          {[-1, 1].map((side) => (
            <group key={`parcel-side-wall:${side}`} name={`parcel-side-wall-${side === -1 ? 'left' : 'right'}`}>
              <mesh
                {...common}
                name="parcel-side-wall"
                position={[side * (layout.width / 2 - plate / 2), bodyHeight / 2, 0]}
              >
                <boxGeometry args={[plate, bodyHeight, layout.length]} />
                {material(node.bodyColor, 0.7)}
              </mesh>
            </group>
          ))}
          <mesh {...common} name="parcel-back-wall" position={[0, bodyHeight / 2, layout.length / 2 - plate / 2]}>
            <boxGeometry args={[layout.width - plate * 2, bodyHeight, plate]} />
            {material(node.bodyColor, 0.72)}
          </mesh>
          <mesh {...common} name="parcel-cabinet-floor" position={[0, plate / 2, 0]}>
            <boxGeometry args={[layout.width - plate * 2, plate, layout.length - plate * 2]} />
            {material('#171a1b', 0.8)}
          </mesh>
          <mesh
            {...common}
            name="parcel-front-bottom-rail"
            position={[0, bottomRailHeight / 2, -layout.length / 2 + plate / 2]}
          >
            <boxGeometry args={[layout.width - plate * 2, bottomRailHeight, plate]} />
            {material(node.bodyColor, 0.68)}
          </mesh>
          <mesh
            {...common}
            name="parcel-front-top-rail"
            position={[0, doorTopY + topRailHeight / 2, -layout.length / 2 + plate / 2]}
          >
            <boxGeometry args={[layout.width - plate * 2, topRailHeight, plate]} />
            {material(node.bodyColor, 0.68)}
          </mesh>
          {[-1, 1].map((side) => (
            <group key={`parcel-front-side-rail:${side}`}>
              <mesh
                {...common}
                name="parcel-front-side-rail"
                position={[
                  side * (doorWidth / 2 + sideRailWidth / 2 - plate / 2),
                  doorCenterY,
                  -layout.length / 2 + plate / 2,
                ]}
              >
                <boxGeometry args={[sideRailWidth - plate, doorHeight, plate]} />
                {material(node.bodyColor, 0.68)}
              </mesh>
            </group>
          ))}
        </group>
        <group name="parcel-door-reveal" position={[0, doorCenterY, frontZ - plate * 0.04]}>
          {[-1, 1].map((vertical) => (
            <group key={`parcel-reveal-horizontal:${vertical}`}>
              <mesh {...common} position={[0, vertical * (doorHeight / 2 + reveal / 2), 0]}>
                <boxGeometry args={[doorWidth + reveal * 2, reveal, plate * 0.2]} />
                {material('#0d1011', 0.84)}
              </mesh>
            </group>
          ))}
          {[-1, 1].map((horizontal) => (
            <group key={`parcel-reveal-vertical:${horizontal}`}>
              <mesh {...common} position={[horizontal * (doorWidth / 2 + reveal / 2), 0, 0]}>
                <boxGeometry args={[reveal, doorHeight, plate * 0.2]} />
                {material('#0d1011', 0.84)}
              </mesh>
            </group>
          ))}
        </group>
        <group
          name="parcel-access-door"
          position={[doorHingeX, doorCenterY, frontZ - plate * 0.18]}
          rotation={[0, pose.accessDoorAngle, 0]}
        >
          <mesh
            {...common}
            name="parcel-access-door-panel"
            position={[-doorWidth / 2, 0, 0]}
          >
            <boxGeometry args={[doorWidth, doorHeight, plate * 0.72]} />
            {material(node.bodyColor, 0.62)}
          </mesh>
          <mesh
            {...common}
            name="parcel-door-lock-bezel"
            position={[-doorWidth * 0.78, 0, -plate * 0.62]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[plate * 0.75, plate * 0.75, plate * 0.45, 24]} />
            {material('#c7cbca', 0.24)}
          </mesh>
          <mesh
            {...common}
            name="parcel-door-lock-core"
            position={[-doorWidth * 0.78, 0, -plate * 0.88]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[plate * 0.32, plate * 0.32, plate * 0.18, 16]} />
            {material('#555b5a', 0.18)}
          </mesh>
          <mesh
            {...common}
            name="parcel-door-key-slot"
            position={[-doorWidth * 0.78, 0, -plate * 1.01]}
          >
            <boxGeometry args={[plate * 0.13, plate * 0.5, plate * 0.08]} />
            {material('#191d1d', 0.3)}
          </mesh>
        </group>
        <group
          name="parcel-top-lid"
          position={[0, bodyHeight, layout.length * 0.54]}
          rotation={[pose.lidAngle, 0, 0]}
        >
          <mesh {...common} name="parcel-lid-plate" position={[0, plate * 0.45, -lidDepth / 2]}>
            <boxGeometry args={[lidWidth, plate * 0.9, lidDepth]} />
            {material(node.bodyColor, 0.48)}
          </mesh>
          <mesh
            {...common}
            name="parcel-lid-front-edge"
            position={[0, -plate * 0.28, -lidDepth + plate * 0.38]}
          >
            <boxGeometry args={[lidWidth, plate * 1.2, plate * 0.76]} />
            {material(node.bodyColor, 0.54)}
          </mesh>
          {[-1, 1].map((side) => (
            <group key={`parcel-lid-hinge:${side}`}>
              <mesh
                {...common}
                name="parcel-lid-hinge"
                position={[side * layout.width * 0.46, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[plate * 0.38, plate * 0.38, layout.width * 0.08, 16]} />
                {material(node.accentColor, 0.3)}
              </mesh>
            </group>
          ))}
        </group>
      </group>
    )
  }

  if (kind === 'environment:mailbox') {
    const boxHeight = layout.height * 0.34
    const postHeight = Math.max(0.25, layout.height - boxHeight)
    return (
      <group name="reference-curbside-mailbox">
        <mesh {...common} name="mailbox-post" position={[0, postHeight / 2, 0]}>
          <boxGeometry args={[Math.max(0.09, layout.width * 0.18), postHeight, Math.max(0.09, layout.width * 0.15)]} />
          {material(node.bodyColor, 0.72)}
        </mesh>
        <mesh {...common} name="mailbox-post-crossbar" position={[0, postHeight * 0.08, 0]}>
          <boxGeometry args={[layout.width * 1.55, 0.08, layout.length * 0.72]} />
          {material(node.bodyColor, 0.72)}
        </mesh>
        <mesh {...common} name="mailbox-body" position={[0, postHeight + boxHeight / 2, 0]}>
          <boxGeometry args={[layout.width, boxHeight * 0.68, layout.length]} />
          {material(node.bodyColor, 0.56)}
        </mesh>
        <mesh {...common} name="mailbox-tunnel-top" position={[0, postHeight + boxHeight * 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[layout.width / 2, layout.width / 2, layout.length, 16, 1, false, 0, Math.PI]} />
          {material(node.bodyColor, 0.52)}
        </mesh>
        {[-1, 1].map((side) => (
          <group key={`mailbox-door:${side}`} name={`mailbox-access-door-${side === -1 ? 'front' : 'rear'}`}>
            <mesh {...common} name="mailbox-door-panel" position={[0, postHeight + boxHeight * 0.53, side * (layout.length / 2 + 0.008)]}>
              <boxGeometry args={[layout.width * 0.92, boxHeight * 0.46, 0.018]} />
              {material(node.bodyColor, 0.5)}
            </mesh>
            <mesh {...common} name="mailbox-door-handle" position={[0, postHeight + boxHeight * 0.52, side * (layout.length / 2 + 0.021)]}>
              <boxGeometry args={[layout.width * 0.42, boxHeight * 0.1, 0.012]} />
              {material(node.accentColor, 0.42)}
            </mesh>
            <mesh {...common} name="mailbox-door-arch" position={[0, postHeight + boxHeight * 0.74, side * (layout.length / 2 + 0.021)]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[layout.width * 0.46, layout.width * 0.46, 0.018, 16, 1, false, 0, Math.PI]} />
              {material(node.bodyColor, 0.5)}
            </mesh>
            <mesh {...common} name="mailbox-door-lock" position={[0, postHeight + boxHeight * 0.3, side * (layout.length / 2 + 0.022)]}>
              <boxGeometry args={[layout.width * 0.2, boxHeight * 0.055, 0.014]} />
              {material(node.accentColor, 0.38)}
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={`mailbox-flag:${side}`} name={`mailbox-flag-${side === -1 ? 'left' : 'right'}`}>
            <mesh {...common} name="mailbox-flag-arm" position={[side * (layout.width / 2 + 0.014), postHeight + boxHeight * 0.52, 0]}>
              <boxGeometry args={[0.025, boxHeight * 0.38, 0.025]} />
              {material(node.accentColor, 0.42)}
            </mesh>
            <mesh {...common} name="mailbox-flag-tab" position={[side * (layout.width / 2 + 0.014), postHeight + boxHeight * 0.7, 0]}>
              <boxGeometry args={[0.025, 0.025, boxHeight * 0.18]} />
              {material(node.accentColor, 0.42)}
            </mesh>
            <mesh {...common} name="mailbox-flag-pivot" position={[side * (layout.width / 2 + 0.03), postHeight + boxHeight * 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 0.06, 10]} />
              {material(node.accentColor, 0.38)}
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  if (kind === 'environment:recycling-bin') {
    const recycling = true
    const legacyPalette = node.bodyColor === '#2e6a73' && node.accentColor === '#d9e3d7'
    const bodyColor = legacyPalette ? '#087345' : node.bodyColor
    const lidColor = legacyPalette ? '#0a6b42' : node.accentColor
    const markingColor = '#d5d8c8'
    const wheelRadius = Math.max(0.075, Math.min(0.135, Math.min(layout.width, layout.length) * 0.19))
    const wheelThickness = Math.max(0.045, layout.width * 0.085)
    const wheelX = layout.width * 0.43
    const wheelY = wheelRadius * 1.02
    const rearZ = layout.length * 0.36
    const frontZ = -layout.length * 0.416
    const bodyBottomY = layout.height * 0.035
    const bodyHeight = layout.height * 0.735
    const spokeAngles = Array.from({ length: 8 }, (_, index) => index * Math.PI / 4)
    return (
      <group name="reference-green-wheelie-bin">
        <RoundedFrustum
          bottomDepth={layout.length * 0.72}
          bottomWidth={layout.width * 0.75}
          color={bodyColor}
          ghost={ghost}
          height={bodyHeight}
          layer={layer}
          name="bin-tapered-body"
          position={[0, bodyBottomY, 0]}
          radius={Math.min(layout.width, layout.length) * 0.065}
          roughness={0.46}
          topDepth={layout.length * 0.88}
          topWidth={layout.width * 0.9}
        />
        <RoundedFrustum
          bottomDepth={layout.length * 0.88}
          bottomWidth={layout.width * 0.9}
          color={bodyColor}
          ghost={ghost}
          height={layout.height * 0.105}
          layer={layer}
          name="bin-moulded-collar"
          position={[0, layout.height * 0.75, -layout.length * 0.005]}
          radius={Math.min(layout.width, layout.length) * 0.055}
          roughness={0.43}
          topDepth={layout.length * 0.96}
          topWidth={layout.width * 0.96}
        />
        <RoundedFrustum
          bottomDepth={layout.length * 0.98}
          bottomWidth={layout.width * 0.98}
          color={lidColor}
          ghost={ghost}
          height={layout.height * 0.075}
          layer={layer}
          name="bin-hinged-lid"
          position={[0, layout.height * 0.845, -layout.length * 0.012]}
          radius={Math.min(layout.width, layout.length) * 0.06}
          roughness={0.4}
          topDepth={layout.length * 0.91}
          topWidth={layout.width * 0.92}
        />
        <RoundedFrustum
          bottomDepth={layout.length * 0.49}
          bottomWidth={layout.width * 0.58}
          color={lidColor}
          ghost={ghost}
          height={layout.height * 0.06}
          layer={layer}
          name="bin-lid-raised-panel"
          position={[0, layout.height * 0.912, -layout.length * 0.08]}
          radius={Math.min(layout.width, layout.length) * 0.045}
          roughness={0.38}
          topDepth={layout.length * 0.41}
          topWidth={layout.width * 0.5}
        />
        <mesh {...common} name="bin-front-lip" position={[0, layout.height * 0.845, -layout.length * 0.515]}>
          <boxGeometry args={[layout.width * 0.93, layout.height * 0.055, layout.length * 0.045]} />
          {material(lidColor, 0.42)}
        </mesh>
        {[-1, 1].map((side) => (
          <group key={`bin-lid-grip:${side}`}>
            <mesh {...common} position={[side * layout.width * 0.33, layout.height * 0.927, layout.length * 0.23]}>
              <boxGeometry args={[layout.width * 0.15, layout.height * 0.012, layout.length * 0.18]} />
              {material('#154c38', 0.72)}
            </mesh>
            <mesh {...common} position={[side * layout.width * 0.33, layout.height * 0.94, layout.length * 0.31]}>
              <boxGeometry args={[layout.width * 0.19, layout.height * 0.035, layout.length * 0.035]} />
              {material(lidColor, 0.42)}
            </mesh>
          </group>
        ))}
        <mesh {...common} name="bin-wheel-axle" position={[0, wheelY, rearZ]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[wheelRadius * 0.14, wheelRadius * 0.14, layout.width * 0.82, 14]} />
          {material('#252827', 0.65)}
        </mesh>
        {[-1, 1].map((side) => (
          <group key={`bin-hinge:${side}`}>
            <mesh {...common} position={[side * layout.width * 0.34, layout.height * 0.84, rearZ]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, layout.width * 0.14, 14]} />
              {material(lidColor, 0.5)}
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={`bin-wheel:${side}`}>
            <mesh {...common} name="bin-rubber-wheel" position={[side * wheelX, wheelY, rearZ]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[wheelRadius, wheelRadius, wheelThickness, 28]} />
              {material('#171918', 0.9)}
            </mesh>
            <mesh {...common} position={[side * (wheelX + wheelThickness * 0.54), wheelY, rearZ]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[wheelRadius * 0.7, wheelRadius * 0.055, 8, 28]} />
              {material('#343836', 0.64)}
            </mesh>
            {spokeAngles.map((angle) => (
              <group key={`bin-wheel-spoke:${side}:${angle}`}>
                <mesh
                  {...common}
                  position={[side * (wheelX + wheelThickness * 0.56), wheelY, rearZ]}
                  rotation={[angle, 0, 0]}
                >
                  <boxGeometry args={[wheelThickness * 0.11, wheelRadius * 1.25, wheelRadius * 0.07]} />
                  {material('#343836', 0.64)}
                </mesh>
              </group>
            ))}
            <mesh {...common} position={[side * (wheelX + wheelThickness * 0.6), wheelY, rearZ]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[wheelRadius * 0.24, wheelRadius * 0.24, wheelThickness * 0.16, 18]} />
              {material('#1f2321', 0.66)}
            </mesh>
          </group>
        ))}
        <mesh {...common} name="bin-rear-handle" position={[0, layout.height * 0.845, layout.length * 0.485]}>
          <boxGeometry args={[layout.width * 0.62, layout.height * 0.045, layout.length * 0.04]} />
          {material(lidColor, 0.52)}
        </mesh>
        {[-1, 1].map((side) => (
          <group key={`bin-handle-post:${side}`}>
            <mesh {...common} position={[side * layout.width * 0.31, layout.height * 0.82, layout.length * 0.445]} rotation={[0.16, 0, 0]}>
              <boxGeometry args={[layout.width * 0.065, layout.height * 0.13, layout.length * 0.055]} />
              {material(bodyColor, 0.48)}
            </mesh>
          </group>
        ))}
        {[-0.27, 0, 0.27].map((offset) => (
          <group key={`bin-front-rib:${offset}`}>
            <mesh {...common} position={[offset * layout.width, layout.height * 0.39, frontZ + layout.length * 0.005]}>
              <boxGeometry args={[layout.width * 0.028, layout.height * 0.55, layout.length * 0.025]} />
              {material('#0a6941', 0.5)}
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={`bin-side-panel:${side}`}>
            <mesh {...common} position={[side * layout.width * 0.426, layout.height * 0.46, layout.length * 0.03]}>
              <boxGeometry args={[layout.width * 0.018, layout.height * 0.48, layout.length * 0.48]} />
              {material('#0a6941', 0.52)}
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={`bin-foot:${side}`}>
            <mesh {...common} position={[side * layout.width * 0.25, layout.height * 0.035, -layout.length * 0.19]}>
              <cylinderGeometry args={[layout.width * 0.075, layout.width * 0.085, layout.height * 0.07, 14]} />
              {material(bodyColor, 0.58)}
            </mesh>
          </group>
        ))}
        <group name={recycling ? 'bin-recycling-marking' : 'bin-food-waste-marking'}>
          {recycling ? [0, 1, 2].map((index) => {
            const angle = Math.PI / 6 + index * (Math.PI * 2 / 3)
            return (
              <group key={`recycling-mark:${index}`}>
                <mesh
                  {...common}
                  position={[
                    Math.cos(angle) * layout.width * 0.105,
                    layout.height * 0.51 + Math.sin(angle) * layout.height * 0.085,
                    frontZ - layout.length * 0.018,
                  ]}
                  rotation={[0, 0, angle]}
                >
                  <boxGeometry args={[layout.width * 0.045, layout.height * 0.16, layout.length * 0.018]} />
                  {material(markingColor, 0.48)}
                </mesh>
              </group>
            )
          }) : (
            <>
              {[-0.68, 0.68].map((angle) => (
                <group key={`food-waste-hourglass:${angle}`}>
                  <mesh {...common} position={[0, layout.height * 0.52, frontZ - layout.length * 0.018]} rotation={[0, 0, angle]}>
                    <boxGeometry args={[layout.width * 0.035, layout.height * 0.19, layout.length * 0.018]} />
                    {material(markingColor, 0.48)}
                  </mesh>
                </group>
              ))}
              {[-0.095, 0.095].map((offset) => (
                <group key={`food-waste-hourglass-cap:${offset}`}>
                  <mesh {...common} position={[0, layout.height * (0.52 + offset), frontZ - layout.length * 0.019]}>
                    <boxGeometry args={[layout.width * 0.28, layout.height * 0.018, layout.length * 0.019]} />
                    {material(markingColor, 0.48)}
                  </mesh>
                </group>
              ))}
              <mesh {...common} position={[0, layout.height * 0.49, frontZ - layout.length * 0.026]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[layout.height * 0.018, layout.height * 0.018, layout.length * 0.012, 12]} />
                {material(markingColor, 0.48)}
              </mesh>
            </>
          )}
          {[-0.055, -0.085].map((offset, index) => (
            <group key={`bin-label:${index}`}>
              <mesh {...common} position={[0, layout.height * (0.4 + offset), frontZ - layout.length * 0.02]}>
                <boxGeometry args={[layout.width * (index === 0 ? 0.27 : 0.2), layout.height * 0.012, layout.length * 0.018]} />
                {material(markingColor, 0.5)}
              </mesh>
            </group>
          ))}
          {[-0.16, 0, 0.16].map((offset) => (
            <group key={`bin-sort-guide:${offset}`}>
              <mesh {...common} position={[offset * layout.width, layout.height * 0.255, frontZ - layout.length * 0.021]}>
                <boxGeometry args={[layout.width * 0.115, layout.height * 0.09, layout.length * 0.018]} />
                {material(markingColor, 0.52)}
              </mesh>
            </group>
          ))}
        </group>
      </group>
    )
  }

  if (kind === 'environment:residential-gate') {
    const postWidth = Math.max(0.1, layout.width * 0.045)
    const frameWidth = Math.max(0.075, layout.width * 0.032)
    const frameDepth = Math.max(layout.depth, 0.075)
    const postDepth = Math.max(layout.depth * 2.25, 0.18)
    const hardwareDepth = Math.max(0.028, layout.depth * 0.3)
    const centerGap = Math.max(0.025, layout.width * 0.008)
    const innerWidth = layout.width - postWidth * 2.5
    const leafWidth = (innerWidth - centerGap) / 2
    const outerX = innerWidth / 2
    const bottomY = layout.height * 0.08
    const shoulderY = layout.height * 0.84
    const crownRise = layout.height * 0.1
    const panelBottomY = bottomY + frameWidth * 0.7
    const braceBottomY = layout.height * 0.23
    const braceTopY = layout.height * 0.66
    const braceRise = braceTopY - braceBottomY
    const braceLength = Math.hypot(leafWidth * 0.88, braceRise)
    const braceAngle = Math.atan2(braceRise, leafWidth * 0.88)
    const plankCountPerLeaf = 8
    const plankGap = Math.max(0.006, leafWidth * 0.006)
    const plankWidth = (leafWidth - frameWidth * 1.55) / plankCountPerLeaf
    const gateZ = -layout.depth * 0.5
    const faceZ = gateZ - frameDepth * 0.42
    const hardwareZ = faceZ - frameDepth * 0.62
    const pose = resolveDrivewayGateOpenPose(node.operationState)
    return (
      <group name="timber-driveway-gate">
        {([-1, 1] as const).map((side) => (
          <group key={`gate-post:${side}`}>
            <mesh {...common} position={[side * (layout.width / 2 - postWidth / 2), layout.height / 2, 0]}>
              <boxGeometry args={[postWidth, layout.height, postDepth]} />
              {material(node.bodyColor, 0.76)}
            </mesh>
            <mesh {...common} position={[side * (layout.width / 2 - postWidth / 2), layout.height + postWidth * 0.22, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[postWidth * 0.72, postWidth * 0.44, 4]} />
              {material(node.bodyColor, 0.7)}
            </mesh>
          </group>
        ))}
        {([-1, 1] as const).map((side) => {
          const leafCenterX = side * (centerGap / 2 + leafWidth / 2)
          const hingeX = side * (outerX - frameWidth * 0.68)
          const topRailY = shoulderY + crownRise / 2
          const topRailAngle = -side * Math.atan2(crownRise, leafWidth)
          const topRailLength = Math.hypot(leafWidth, crownRise)
          return (
            <group
              key={`gate-leaf:${side}`}
              name={side < 0 ? 'gate-left-leaf' : 'gate-right-leaf'}
              position={[hingeX, 0, 0]}
              rotation={[0, side < 0 ? pose.leftLeafAngle : pose.rightLeafAngle, 0]}
            >
              {Array.from({ length: plankCountPerLeaf }, (_, index) => {
                const fromOuter = (index + 0.5) / plankCountPerLeaf
                const x = side < 0
                  ? -outerX + frameWidth * 0.75 + (index + 0.5) * plankWidth
                  : outerX - frameWidth * 0.75 - (index + 0.5) * plankWidth
                const topY = shoulderY + crownRise * fromOuter - frameWidth * 0.5
                const height = topY - panelBottomY
                return (
                  <mesh key={`gate-board:${side}:${index}`} {...common} position={[x - hingeX, panelBottomY + height / 2, gateZ]}>
                    <boxGeometry args={[Math.max(0.018, plankWidth - plankGap), height, frameDepth * 0.58]} />
                    {material(node.bodyColor, 0.86)}
                  </mesh>
                )
              })}
              <mesh {...common} position={[leafCenterX - hingeX, bottomY, faceZ]}>
                <boxGeometry args={[leafWidth, frameWidth, frameDepth]} />
                {material(node.bodyColor, 0.68)}
              </mesh>
              <mesh {...common} position={[leafCenterX - hingeX, topRailY, faceZ]} rotation={[0, 0, topRailAngle]}>
                <boxGeometry args={[topRailLength, frameWidth, frameDepth]} />
                {material(node.bodyColor, 0.68)}
              </mesh>
              {[-1, 1].map((edge) => (
                <group key={`gate-stile:${side}:${edge}`}>
                  <mesh {...common} position={[leafCenterX + edge * (leafWidth / 2 - frameWidth / 2) - hingeX, layout.height * 0.48, faceZ]}>
                    <boxGeometry args={[frameWidth, layout.height * 0.8, frameDepth]} />
                    {material(node.bodyColor, 0.68)}
                  </mesh>
                </group>
              ))}
              <mesh {...common} position={[leafCenterX - hingeX, layout.height * 0.51, faceZ]}>
                <boxGeometry args={[leafWidth, frameWidth * 0.82, frameDepth]} />
                {material(node.bodyColor, 0.68)}
              </mesh>
              {([-1, 1] as const).map((slope) => (
                <group key={`gate-brace:${side}:${slope}`}>
                  <mesh {...common} position={[leafCenterX - hingeX, (braceBottomY + braceTopY) / 2, hardwareZ + hardwareDepth * 0.9]} rotation={[0, 0, slope * braceAngle]}>
                    <boxGeometry args={[braceLength, frameWidth * 0.72, frameDepth * 0.72]} />
                    {material(node.bodyColor, 0.64)}
                  </mesh>
                </group>
              ))}
              {[0.28, 0.68].map((heightFactor) => {
                const strapCenterX = hingeX - side * leafWidth * 0.16
                return (
                  <group key={`gate-hinge:${side}:${heightFactor}`}>
                    <mesh {...common} position={[strapCenterX - hingeX, layout.height * heightFactor, hardwareZ]}>
                      <boxGeometry args={[leafWidth * 0.32, frameWidth * 0.28, hardwareDepth]} />
                      {material(node.accentColor, 0.34)}
                    </mesh>
                    <mesh {...common} position={[side * frameWidth * 0.1, layout.height * heightFactor, hardwareZ]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[frameWidth * 0.17, frameWidth * 0.17, frameWidth * 0.75, 12]} />
                      {material(node.accentColor, 0.3)}
                    </mesh>
                  </group>
                )
              })}
              {side === -1 ? (
                <group name="gate-center-hardware">
                  <mesh {...common} name="gate-center-latch" position={[-hingeX, layout.height * 0.52, hardwareZ - hardwareDepth * 0.1]}>
                    <boxGeometry args={[centerGap + frameWidth * 1.5, frameWidth * 0.42, hardwareDepth * 1.2]} />
                    {material(node.accentColor, 0.3)}
                  </mesh>
                  <mesh {...common} position={[frameWidth * 0.5 - hingeX, layout.height * 0.47, hardwareZ - hardwareDepth * 0.15]}>
                    <boxGeometry args={[frameWidth * 0.58, layout.height * 0.13, hardwareDepth * 1.3]} />
                    {material(node.accentColor, 0.3)}
                  </mesh>
                  <mesh {...common} position={[-hingeX, layout.height * 0.16, hardwareZ]}>
                    <boxGeometry args={[frameWidth * 0.3, layout.height * 0.22, hardwareDepth]} />
                    {material(node.accentColor, 0.34)}
                  </mesh>
                  {[0.23, 0.51, 0.68].map((heightFactor) => (
                    <group key={`gate-hardware-bolt:${heightFactor}`}>
                      <mesh {...common} position={[-hingeX, layout.height * heightFactor, hardwareZ - hardwareDepth * 0.65]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[frameWidth * 0.09, frameWidth * 0.09, hardwareDepth * 0.45, 8]} />
                        {material(node.accentColor, 0.28)}
                      </mesh>
                    </group>
                  ))}
                </group>
              ) : null}
            </group>
          )
        })}
      </group>
    )
  }

  return null
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
  if (kind === 'environment:traffic-bollard') {
    return <TrafficBollardModel ghost={ghost} layer={layer} node={node as TrafficBollardNode} />
  }
  if (kind === 'environment:road-barrier') {
    return <RoadBarrierModel ghost={ghost} layer={layer} node={node as RoadBarrierNode} />
  }
  if (isResidentialRoadAssetKind(kind)) {
    return <ResidentialRoadAssetModel ghost={ghost} layer={layer} node={node as never} />
  }
  return <FireHydrantModel ghost={ghost} layer={layer} node={node as FireHydrantNode} />
}
