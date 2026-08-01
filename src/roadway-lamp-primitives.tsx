'use client'

import type { BufferGeometry, Object3D } from 'three'
import type { CobraHeadLightLayout } from './cobra-head-light-geometry'

export const NO_RAYCAST = () => {}

export type RoadwayHeadLayout = Pick<
  CobraHeadLightLayout,
  'armLength' | 'armRadius' | 'armY' | 'socketLength' | 'socketRadius' | 'fixtureStartX' | 'fixtureLength'
>

export const DEFAULT_BASE_BOLTS = [
  [-0.15, -0.15],
  [-0.15, 0.15],
  [0.15, -0.15],
  [0.15, 0.15],
] as const

export function LampMetalMaterial({
  color,
  ghost,
  metalness = 0.72,
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
      depthWrite={!ghost}
      metalness={metalness}
      opacity={ghost ? 0.5 : 1}
      roughness={roughness}
      transparent={ghost}
    />
  )
}

export function LampLensMaterial({
  color,
  ghost,
  lightOn,
  emissiveIntensity = 2.4,
}: {
  color: string
  ghost: boolean
  lightOn: boolean
  emissiveIntensity?: number
}) {
  return (
    <meshStandardMaterial
      color={lightOn ? color : '#767b82'}
      depthWrite={!ghost}
      emissive={lightOn ? color : '#000000'}
      emissiveIntensity={ghost ? 0.3 : lightOn ? emissiveIntensity : 0}
      opacity={ghost ? 0.55 : 0.92}
      roughness={0.19}
      transparent
    />
  )
}

export function LampBase({
  baseRadius,
  boltRadius = 0.026,
  color,
  ghost,
  layer,
  boltOffset = 0.15,
  baseHeight = 0.08,
  baseTopRadius = 0.9,
  boltColor = '#171a1f',
}: {
  baseRadius: number
  boltRadius?: number
  color: string
  ghost: boolean
  layer: number
  boltOffset?: number
  baseHeight?: number
  baseTopRadius?: number
  boltColor?: string
}) {
  const bolts = DEFAULT_BASE_BOLTS.map(([x, z]) => [x * boltOffset / 0.15, z * boltOffset / 0.15] as const)
  return (
    <>
      <mesh
        castShadow
        layers={layer}
        position={[0, baseHeight / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[baseRadius * baseTopRadius, baseRadius, baseHeight, 24]} />
        <LampMetalMaterial color={color} ghost={ghost} />
      </mesh>
      {bolts.map(([x, z]) => (
        <mesh key={`${x}:${z}`} layers={layer} position={[x, baseHeight + 0.025, z]} raycast={ghost ? NO_RAYCAST : undefined}>
          <cylinderGeometry args={[boltRadius, boltRadius, 0.05, 8]} />
          <LampMetalMaterial color={boltColor} ghost={ghost} />
        </mesh>
      ))}
    </>
  )
}

export function LampPoleSegment({
  bottomRadius,
  color,
  ghost,
  height,
  layer,
  topRadius,
  y = 0,
}: {
  bottomRadius: number
  color: string
  ghost: boolean
  height: number
  layer: number
  topRadius: number
  y?: number
}) {
  return (
    <mesh
      castShadow
      layers={layer}
      position={[0, y + height / 2, 0]}
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
    >
      <cylinderGeometry args={[topRadius, bottomRadius, height, 20]} />
      <LampMetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

export function LampStraightArm({
  color,
  ghost,
  layer,
  length,
  radius,
  y,
  angle = 0,
}: {
  color: string
  ghost: boolean
  layer: number
  length: number
  radius: number
  y: number
  angle?: number
}) {
  return (
    <mesh
      castShadow
      layers={layer}
      position={[Math.cos(angle) * length / 2, y, Math.sin(angle) * length / 2]}
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
      rotation={[0, 0, -Math.PI / 2]}
    >
      <cylinderGeometry args={[radius, radius, length, 20]} />
      <LampMetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

export function RoadwayHead({
  color,
  fixtureGeometry,
  ghost,
  intensity,
  layer,
  lensGeometry,
  lightColor,
  lightOn,
  lightTarget,
  layout,
  distance,
  angle = 0.3,
  includeArm = true,
}: {
  color: string
  fixtureGeometry: BufferGeometry
  ghost: boolean
  intensity: number
  layer: number
  lensGeometry: BufferGeometry
  lightColor: string
  lightOn: boolean
  lightTarget: Object3D
  layout: RoadwayHeadLayout
  distance: number
  angle?: number
  includeArm?: boolean
}) {
  const fixtureLightX = layout.fixtureStartX + layout.fixtureLength * 0.55
  return (
    <group layers={layer}>
      {includeArm && (
        <LampStraightArm
          color={color}
          ghost={ghost}
          layer={layer}
          length={layout.armLength}
          radius={layout.armRadius}
          y={layout.armY}
        />
      )}
      <mesh
        castShadow
        layers={layer}
        position={[layout.armLength + layout.socketLength / 2 - 0.04, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[layout.socketRadius, layout.socketRadius, layout.socketLength, 16]} />
        <LampMetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[layout.fixtureStartX - 0.03, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[layout.socketRadius * 1.2, layout.socketRadius * 1.2, 0.05, 16]} />
        <LampMetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        geometry={fixtureGeometry}
        layers={layer}
        position={[layout.fixtureStartX, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh geometry={lensGeometry} layers={layer} position={[layout.fixtureStartX, layout.armY, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
      </mesh>
      <mesh layers={layer} position={[layout.fixtureStartX + layout.fixtureLength * 0.22, layout.armY + 0.17, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.035, 0.045, 0.06, 16]} />
        <meshStandardMaterial color="#737b84" depthWrite={!ghost} metalness={0.2} opacity={ghost ? 0.45 : 1} roughness={0.38} transparent={ghost} />
      </mesh>
      {!ghost && lightOn && intensity > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[fixtureLightX, 0, 0]} />
          <spotLight
            angle={Math.PI * angle}
            castShadow={false}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={intensity}
            layers={layer}
            penumbra={0.52}
            position={[fixtureLightX, layout.armY - 0.2, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}

export function LampLicensePlate({
  color = '#16191d',
  ghost,
  height,
  layer,
  poleRadius,
}: {
  color?: string
  ghost: boolean
  height: number
  layer: number
  poleRadius: number
}) {
  return (
    <mesh layers={layer} position={[0, Math.min(1.2, height * 0.17), poleRadius * 0.9 + 0.006]} raycast={ghost ? NO_RAYCAST : undefined}>
      <boxGeometry args={[poleRadius * 0.9, 0.36, 0.012]} />
      <meshStandardMaterial color={color} depthWrite={!ghost} metalness={0.65} opacity={ghost ? 0.35 : 1} roughness={0.45} transparent={ghost} />
    </mesh>
  )
}
