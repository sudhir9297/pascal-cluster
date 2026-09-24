'use client'

import { useMemo } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import { resolveFloodlightPoleLayout } from './floodlight-pole-geometry'
import { LampLensMaterial, LampMetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'

const OPTIC_COLUMNS = [-0.23, -0.075, 0.075, 0.23] as const
const OPTIC_ROWS = [-0.135, 0, 0.135] as const
const HEAT_SINK_FINS = [-0.31, -0.18, -0.05, 0.08, 0.21] as const
const BASE_BOLTS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

function RodBetween({
  color,
  from,
  ghost,
  layer,
  name,
  radius,
  to,
}: {
  color: string
  from: [number, number, number]
  ghost: boolean
  layer: number
  name: string
  radius: number
  to: [number, number, number]
}) {
  const start = new Vector3(...from)
  const end = new Vector3(...to)
  const direction = end.clone().sub(start)
  const length = direction.length()
  const midpoint = start.clone().add(end).multiplyScalar(0.5)
  const quaternion = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction.normalize(),
  )

  return (
    <mesh
      castShadow={!ghost}
      layers={layer}
      name={name}
      position={midpoint}
      quaternion={quaternion}
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
    >
      <cylinderGeometry args={[radius, radius, length, 14]} />
      <LampMetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.31} />
    </mesh>
  )
}

function FloodlightProjector({
  distance,
  ghost,
  intensity,
  layer,
  lightColor,
  lightOn,
  poleColor,
}: {
  distance: number
  ghost: boolean
  intensity: number
  layer: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const lightTarget = useMemo(() => new Object3D(), [])

  return (
    <>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-floodlight-housing"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <boxGeometry args={[0.82, 0.29, 0.68]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.78} roughness={0.33} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-floodlight-driver-box"
        position={[-0.43, 0.015, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.22, 0.34, 0.54]} />
        <LampMetalMaterial color="#293036" ghost={ghost} metalness={0.76} roughness={0.36} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-floodlight-front-bezel"
        position={[0.13, -0.17, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.76, 0.065, 0.57]} />
        <LampMetalMaterial color="#59636b" ghost={ghost} metalness={0.68} roughness={0.28} />
      </mesh>
      <mesh
        layers={layer}
        name="catalog-floodlight-optic-window"
        position={[0.13, -0.21, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.7, 0.024, 0.46]} />
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} emissiveIntensity={2.8} />
      </mesh>
      {OPTIC_COLUMNS.flatMap((x) =>
        OPTIC_ROWS.map((z) => (
          <mesh
            key={`${x}:${z}`}
            layers={layer}
            name="catalog-floodlight-optic-cell"
            position={[x + 0.13, -0.229, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.043, 0.048, 0.018, 12]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#d6d9d8'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.3 : lightOn ? 3 : 0}
              metalness={0.08}
              opacity={ghost ? 0.55 : 0.96}
              roughness={0.14}
              transparent={ghost}
            />
          </mesh>
        )),
      )}
      {HEAT_SINK_FINS.map((x) => (
        <mesh
          key={x}
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-heat-sink-fin"
          position={[x, 0.19, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.045, 0.11, 0.54]} />
          <LampMetalMaterial color="#20272c" ghost={ghost} metalness={0.8} roughness={0.38} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-floodlight-glare-visor"
        position={[0.48, -0.11, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, -0.18]}
      >
        <boxGeometry args={[0.19, 0.045, 0.72]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.32} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-yoke-pivot"
          position={[-0.1, 0, side * 0.375]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.072, 0.072, 0.07, 16]} />
          <LampMetalMaterial color="#151a1e" ghost={ghost} metalness={0.88} roughness={0.25} />
        </mesh>
      ))}
      {!ghost && lightOn && intensity > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[1.5, -4, 0]} />
          <spotLight
            angle={Math.PI * 0.3}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={intensity}
            layers={layer}
            penumbra={0.48}
            position={[0.16, -0.23, 0]}
            target={lightTarget}
          />
        </>
      )}
    </>
  )
}

export function FloodlightPoleModel({
  armLength,
  distance,
  ghost = false,
  height,
  intensity,
  layer = 0,
  lightColor,
  lightOn,
  poleColor,
}: {
  armLength: number
  distance: number
  ghost?: boolean
  height: number
  intensity: number
  layer?: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const layout = resolveFloodlightPoleLayout(height, armLength)
  const halfBase = layout.basePlateSize / 2

  return (
    <group layers={layer} name="catalog-floodlight-pole">
      <group layers={layer} name="catalog-lamp-pole">
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-base-plate"
          position={[0, layout.basePlateHeight / 2, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <boxGeometry args={[layout.basePlateSize, layout.basePlateHeight, layout.basePlateSize]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.32} />
        </mesh>
        {BASE_BOLTS.map(([x, z]) => (
          <mesh
            key={`${x}:${z}`}
            castShadow={!ghost}
            layers={layer}
            name="catalog-floodlight-anchor-bolt"
            position={[x * layout.baseBoltOffset, layout.basePlateHeight + 0.035, z * layout.baseBoltOffset]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.03, 0.03, 0.07, 8]} />
            <LampMetalMaterial color="#151a1e" ghost={ghost} metalness={0.9} roughness={0.24} />
          </mesh>
        ))}
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-pole-shaft"
          position={[0, layout.shaftTopY / 2, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
          rotation={[0, Math.PI / 8, 0]}
        >
          <cylinderGeometry args={[layout.shaftTopRadius, layout.shaftBottomRadius, layout.shaftTopY, 8]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.34} />
        </mesh>
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-access-door"
          position={[0, Math.min(1.05, layout.height * 0.2), layout.shaftBottomRadius + 0.008]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.11, 0.38, 0.015]} />
          <LampMetalMaterial color="#252c31" ghost={ghost} metalness={0.74} roughness={0.38} />
        </mesh>
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-pole-cap"
          position={[0, layout.shaftTopY + 0.025, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[layout.shaftTopRadius * 1.08, layout.shaftTopRadius * 1.14, 0.05, 16]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.84} roughness={0.29} />
        </mesh>
      </group>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-floodlight-outreach-arm"
        position={[layout.armLength / 2, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[layout.armRadius, layout.armRadius * 1.12, layout.armLength, 16]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.31} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-floodlight-arm-collar"
        position={[layout.armLength, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.17, 16]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.84} roughness={0.29} />
      </mesh>
      <RodBetween
        color={poleColor}
        from={[0, layout.armY - 0.32, 0]}
        ghost={ghost}
        layer={layer}
        name="catalog-floodlight-arm-brace"
        radius={0.035}
        to={[layout.armLength * 0.7, layout.armY, 0]}
      />

      <group
        layers={layer}
        name="catalog-floodlight-yoke"
        position={[layout.headCenterX, layout.headCenterY, 0]}
        rotation={[0, 0, layout.headTilt]}
      >
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            castShadow={!ghost}
            layers={layer}
            name="catalog-floodlight-yoke-arm"
            position={[-0.25, 0.13, side * 0.375]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[0, 0, -0.23]}
          >
            <boxGeometry args={[0.62, 0.065, 0.055]} />
            <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.84} roughness={0.3} />
          </mesh>
        ))}
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-floodlight-yoke-crossbar"
          position={[-0.52, 0.2, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.08, 0.08, 0.8]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.84} roughness={0.3} />
        </mesh>
        <FloodlightProjector
          distance={distance}
          ghost={ghost}
          intensity={intensity}
          layer={layer}
          lightColor={lightColor}
          lightOn={lightOn}
          poleColor={poleColor}
        />
      </group>

      <RodBetween
        color={poleColor}
        from={[layout.armLength, layout.armY, -halfBase * 0.04]}
        ghost={ghost}
        layer={layer}
        name="catalog-floodlight-yoke-stem"
        radius={0.045}
        to={[layout.headCenterX - 0.32, layout.headCenterY + 0.06, -halfBase * 0.04]}
      />
    </group>
  )
}
