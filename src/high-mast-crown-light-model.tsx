'use client'

import { useEffect, useMemo } from 'react'
import { Color, Object3D, Quaternion, Vector3 } from 'three'
import {
  buildHighMastCrownHousingGeometry,
  buildHighMastCrownLensGeometry,
  highMastCrownAngles,
  resolveHighMastCrownLightLayout,
  type HighMastCrownLightLayout,
} from './high-mast-crown-light-geometry'
import {
  LampBase,
  LampLensMaterial,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
} from './roadway-lamp-primitives'
import type { HighMastCrownLightNode } from './schema'

const GUIDE_ANGLES = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3] as const
const OPTIC_COLUMNS = [-0.12, 0.08, 0.28] as const
const OPTIC_ROWS = [-0.115, 0.115] as const
const HEAT_SINK_FINS = [-0.18, -0.04, 0.1, 0.24] as const

function CrownStrut({
  color,
  from,
  ghost,
  layer,
  name,
  radius,
  to,
}: {
  color: string
  from: Vector3
  ghost: boolean
  layer: number
  name: string
  radius: number
  to: Vector3
}) {
  const { length, midpoint, quaternion } = useMemo(() => {
    const direction = to.clone().sub(from)
    return {
      length: direction.length(),
      midpoint: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    }
  }, [from.x, from.y, from.z, to.x, to.y, to.z])

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
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <LampMetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.32} />
    </mesh>
  )
}

function HighMastLuminaire({
  bodyColor,
  distance,
  ghost,
  intensity,
  layer,
  layout,
  lightColor,
  lightOn,
}: {
  bodyColor: string
  distance: number
  ghost: boolean
  intensity: number
  layer: number
  layout: HighMastCrownLightLayout
  lightColor: string
  lightOn: boolean
}) {
  const housingGeometry = useMemo(
    () => buildHighMastCrownHousingGeometry(layout),
    [layout],
  )
  const lensGeometry = useMemo(
    () => buildHighMastCrownLensGeometry(layout),
    [layout],
  )
  const lightTarget = useMemo(() => new Object3D(), [])

  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <group layers={layer} name="high-mast-crown-luminaire" rotation={[0, 0, -0.12]}>
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="high-mast-crown-luminaire-housing"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.76} roughness={0.33} />
      </mesh>
      <mesh
        geometry={lensGeometry}
        layers={layer}
        name="high-mast-crown-optic-window"
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
      </mesh>
      {OPTIC_COLUMNS.flatMap((x) =>
        OPTIC_ROWS.map((z) => (
          <mesh
            key={`${x}:${z}`}
            layers={layer}
            name="high-mast-crown-optic-cell"
            position={[x, -0.154, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.043, 0.048, 0.02, 12]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#d5d9dc'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.25 : lightOn ? 2.8 : 0}
              opacity={ghost ? 0.55 : 0.98}
              roughness={0.16}
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
          name="high-mast-crown-heat-sink-fin"
          position={[x, 0.135, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.035, 0.055, 0.39]} />
          <LampMetalMaterial color="#485057" ghost={ghost} metalness={0.82} roughness={0.3} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="high-mast-crown-service-cover"
        position={[-0.28, 0.03, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.2, 0.13, 0.34]} />
        <LampMetalMaterial color="#646d73" ghost={ghost} metalness={0.74} roughness={0.34} />
      </mesh>
      {!ghost && lightOn && intensity > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[1.45, -5.2, 0]} />
          <spotLight
            angle={Math.PI * 0.28}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={intensity}
            layers={layer}
            penumbra={0.58}
            position={[0.08, -0.17, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}

export function HighMastCrownLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: HighMastCrownLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(
    () => resolveHighMastCrownLightLayout(node),
    [node.height, node.armLength],
  )
  const poleColor = node.poleColor ?? '#667178'
  const bodyColor = useMemo(
    () => `#${new Color(poleColor).lerp(new Color('#a4abad'), 0.28).getHexString()}`,
    [poleColor],
  )
  const lightColor = node.lightColor ?? '#f4f0dc'
  const lightOn = node.lightOn ?? false
  const angles = useMemo(() => highMastCrownAngles(), [])
  const distance = Math.max(30, layout.height * 3.2)
  const intensityPerHead = (node.intensity ?? 7200) / angles.length

  return (
    <group layers={layer} name="catalog-high-mast-crown-light-assembly">
      <LampBase
        baseHeight={0.13}
        baseRadius={0.43}
        baseTopRadius={0.86}
        boltOffset={0.27}
        boltRadius={0.035}
        color={poleColor}
        ghost={ghost}
        layer={layer}
      />
      <LampPoleSegment
        bottomRadius={layout.poleBottomRadius}
        color={poleColor}
        ghost={ghost}
        height={layout.height}
        layer={layer}
        topRadius={layout.poleTopRadius}
      />
      <LampPoleSegment
        bottomRadius={layout.poleBottomRadius * 1.14}
        color={poleColor}
        ghost={ghost}
        height={0.72}
        layer={layer}
        topRadius={layout.poleBottomRadius}
        y={0.08}
      />
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="high-mast-crown-service-door"
        position={[0, 1.35, layout.poleBottomRadius + 0.015]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.3, 0.68, 0.035]} />
        <LampMetalMaterial color="#4b545a" ghost={ghost} metalness={0.72} roughness={0.38} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="high-mast-crown-carrier-ring"
        position={[0, layout.carrierY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[layout.carrierRingRadius, layout.mountingTubeRadius, 14, 72]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>

      {GUIDE_ANGLES.map((angle) => {
        const innerRadius = layout.poleTopRadius * 1.12
        const outerRadius = layout.carrierRingRadius
        const ringPoint = new Vector3(
          Math.cos(angle) * outerRadius,
          layout.carrierY,
          Math.sin(angle) * outerRadius,
        )
        const innerPoint = new Vector3(
          Math.cos(angle) * innerRadius,
          layout.carrierY,
          Math.sin(angle) * innerRadius,
        )
        const latchPoint = new Vector3(
          Math.cos(angle) * 0.24,
          layout.headFrameY - 0.06,
          Math.sin(angle) * 0.24,
        )
        return (
          <group key={angle} name="high-mast-crown-centering-system">
            <CrownStrut
              color={poleColor}
              from={innerPoint}
              ghost={ghost}
              layer={layer}
              name="high-mast-crown-centering-spoke"
              radius={layout.mountingTubeRadius * 0.72}
              to={ringPoint}
            />
            <CrownStrut
              color="#343b40"
              from={ringPoint}
              ghost={ghost}
              layer={layer}
              name="high-mast-crown-hoisting-cable"
              radius={0.012}
              to={latchPoint}
            />
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="high-mast-crown-guide-roller"
              position={innerPoint}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[Math.PI / 2, angle, 0]}
            >
              <cylinderGeometry args={[0.075, 0.075, 0.045, 16]} />
              <LampMetalMaterial color="#3c444a" ghost={ghost} metalness={0.84} roughness={0.28} />
            </mesh>
          </group>
        )
      })}

      <group layers={layer} name="high-mast-crown-head-frame">
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="high-mast-crown-head-frame-hub"
          position={[0, layout.height + 0.04, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.24, layout.poleTopRadius * 1.08, 0.18, 20]} />
          <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.82} roughness={0.3} />
        </mesh>
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="high-mast-crown-weather-cap"
          position={[0, layout.headFrameY + 0.08, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <coneGeometry args={[0.29, 0.16, 20]} />
          <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.8} roughness={0.32} />
        </mesh>
        {GUIDE_ANGLES.map((angle) => (
          <mesh
            key={angle}
            castShadow={!ghost}
            layers={layer}
            name="high-mast-crown-latching-barrel"
            position={[
              Math.cos(angle) * 0.24,
              layout.headFrameY - 0.06,
              Math.sin(angle) * 0.24,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.055, 0.055, 0.24, 14]} />
            <LampMetalMaterial color="#3f484e" ghost={ghost} metalness={0.86} roughness={0.27} />
          </mesh>
        ))}
      </group>

      {angles.map((angle) => {
        const pipeStart = layout.carrierRingRadius
        const pipeEnd = layout.fixtureCenterRadius - layout.fixtureLength * 0.37
        return (
          <group key={angle} layers={layer} rotation={[0, -angle, 0]}>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="high-mast-crown-radial-arm"
              position={[(pipeStart + pipeEnd) / 2, layout.carrierY, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
              receiveShadow
              rotation={[0, 0, -Math.PI / 2]}
            >
              <cylinderGeometry args={[
                layout.mountingTubeRadius,
                layout.mountingTubeRadius,
                pipeEnd - pipeStart,
                14,
              ]} />
              <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.31} />
            </mesh>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="high-mast-crown-tilt-yoke"
              position={[layout.fixtureCenterRadius - layout.fixtureLength * 0.42, layout.carrierY - 0.02, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.075, 0.075, layout.fixtureWidth * 0.92, 14]} />
              <LampMetalMaterial color="#3d454b" ghost={ghost} metalness={0.84} roughness={0.29} />
            </mesh>
            <group position={[layout.fixtureCenterRadius, layout.carrierY - 0.06, 0]}>
              <HighMastLuminaire
                bodyColor={bodyColor}
                distance={distance}
                ghost={ghost}
                intensity={intensityPerHead}
                layer={layer}
                layout={layout}
                lightColor={lightColor}
                lightOn={lightOn}
              />
            </group>
          </group>
        )
      })}
    </group>
  )
}
