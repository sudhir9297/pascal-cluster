'use client'

import { useEffect, useMemo } from 'react'
import {
  type BufferGeometry,
  Object3D,
  QuadraticBezierCurve3,
  Vector3,
} from 'three'
import {
  buildTwinArmMedianHousingGeometry,
  buildTwinArmMedianLensGeometry,
  resolveTwinArmMedianLightLayout,
  type TwinArmMedianLightLayout,
} from './twin-arm-median-light-geometry'
import {
  LampBase,
  LampLicensePlate,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
} from './roadway-lamp-primitives'
import type { TwinArmMedianLightNode } from './schema'

const LED_COLUMNS = [0.34, 0.47, 0.6, 0.73] as const
const LED_ROWS = [-0.067, 0.067] as const

function MedianArm({
  armCurve,
  ghost,
  housingGeometry,
  intensity,
  layer,
  layout,
  lensGeometry,
  lightColor,
  lightOn,
  lightTargets,
  poleColor,
}: {
  armCurve: QuadraticBezierCurve3
  ghost: boolean
  housingGeometry: BufferGeometry
  intensity: number
  layer: number
  layout: TwinArmMedianLightLayout
  lensGeometry: BufferGeometry
  lightColor: string
  lightOn: boolean
  lightTargets: [Object3D, Object3D]
  poleColor: string
}) {
  const housingX = layout.fixtureStartX
  const lightX = housingX + layout.fixtureLength * 0.56
  const lensY = layout.armY - 0.092

  return (
    <group layers={layer}>
      <mesh
        castShadow
        layers={layer}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[armCurve, 30, layout.armRadius, 14, false]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.3} />
      </mesh>

      <mesh
        castShadow
        geometry={housingGeometry}
        layers={layer}
        position={[housingX, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <meshStandardMaterial
          color={poleColor}
          depthWrite={!ghost}
          metalness={0.72}
          opacity={ghost ? 0.48 : 1}
          roughness={0.4}
          transparent={ghost}
        />
      </mesh>

      <mesh
        geometry={lensGeometry}
        layers={layer}
        position={[housingX, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <meshPhysicalMaterial
          clearcoat={0.32}
          color={lightOn ? lightColor : '#aeb7b9'}
          depthWrite={!ghost}
          emissive={lightOn ? lightColor : '#0b0e10'}
          emissiveIntensity={ghost ? 0.22 : lightOn ? 1.8 : 0.05}
          metalness={0.02}
          opacity={ghost ? 0.38 : lightOn ? 0.9 : 0.78}
          roughness={0.24}
          transparent
        />
      </mesh>

      {/* A flush two-row optic array reads as engineered hardware, not a floating sheet. */}
      {LED_ROWS.flatMap((row) =>
        LED_COLUMNS.map((fraction) => (
          <mesh
            key={`${row}:${fraction}`}
            layers={layer}
            position={[
              housingX + layout.fixtureLength * fraction,
              lensY - 0.002,
              row,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.027, 16]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#e0e4e2'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={lightOn ? 1 : 0}
              opacity={ghost ? 0.28 : 0.68}
              roughness={0.18}
              transparent
            />
          </mesh>
        )),
      )}

      {!ghost && lightOn && intensity > 0 && (
        <>
          {lightTargets.map((target, index) => {
            const roadDirection = index === 0 ? -1 : 1
            return (
              <group key={roadDirection}>
                <primitive
                  layers={layer}
                  object={target}
                  position={[lightX + layout.fixtureLength * 0.2, 0, roadDirection * layout.height * 0.22]}
                />
                <spotLight
                  angle={Math.PI * 0.25}
                  castShadow={false}
                  color={lightColor}
                  decay={2}
                  distance={Math.max(15, layout.height * 3)}
                  intensity={intensity * 0.48}
                  layers={layer}
                  penumbra={0.7}
                  position={[lightX, lensY, roadDirection * 0.055]}
                  target={target}
                />
              </group>
            )
          })}
          <pointLight
            color={lightColor}
            decay={2}
            distance={0.9}
            intensity={Math.min(14, intensity * 0.01)}
            layers={layer}
            position={[lightX, lensY - 0.04, 0]}
          />
        </>
      )}
    </group>
  )
}

export function TwinArmMedianLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: TwinArmMedianLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(
    () => resolveTwinArmMedianLightLayout(node),
    [node.height, node.armLength],
  )
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const intensity = node.intensity ?? 1400
  const housingGeometry = useMemo(
    () => buildTwinArmMedianHousingGeometry(layout),
    [layout],
  )
  const lensGeometry = useMemo(
    () => buildTwinArmMedianLensGeometry(layout),
    [layout],
  )
  const armCurve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(0, layout.poleTopY, 0),
        new Vector3(0, layout.armY + 0.08, 0),
        new Vector3(layout.armLength, layout.armY, 0),
      ),
    [layout.armLength, layout.armY, layout.poleTopY],
  )
  const lightTargets = useMemo(
    () => [
      [new Object3D(), new Object3D()] as [Object3D, Object3D],
      [new Object3D(), new Object3D()] as [Object3D, Object3D],
    ],
    [],
  )

  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <group layers={layer}>
      <LampBase
        baseRadius={0.3}
        baseTopRadius={0.84}
        boltOffset={0.175}
        color={poleColor}
        ghost={ghost}
        layer={layer}
      />
      <LampPoleSegment
        bottomRadius={0.21}
        color={poleColor}
        ghost={ghost}
        height={0.42}
        layer={layer}
        topRadius={0.16}
        y={0.04}
      />
      <LampPoleSegment
        bottomRadius={layout.poleRadius * 1.34}
        color={poleColor}
        ghost={ghost}
        height={layout.poleTopY - 0.24}
        layer={layer}
        topRadius={layout.poleRadius}
        y={0.24}
      />

      {/* The crown collar visually resolves both arms into one engineered top assembly. */}
      <mesh
        castShadow
        layers={layer}
        position={[0, layout.crownY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <sphereGeometry args={[layout.poleRadius * 1.18, 20, 14]} />
        <LampMetalMaterial color="#2b3135" ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>
      <mesh
        layers={layer}
        position={[0, layout.poleTopY - 0.015, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[layout.poleRadius * 1.22, layout.poleRadius * 1.08, 0.06, 20]} />
        <LampMetalMaterial color="#242a2e" ghost={ghost} metalness={0.84} roughness={0.29} />
      </mesh>

      {[1, -1].map((side, index) => (
        <group key={side} layers={layer} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
          <MedianArm
            armCurve={armCurve}
            ghost={ghost}
            housingGeometry={housingGeometry}
            intensity={intensity}
            layer={layer}
            layout={layout}
            lensGeometry={lensGeometry}
            lightColor={lightColor}
            lightOn={lightOn}
            lightTargets={lightTargets[index]!}
            poleColor={poleColor}
          />
        </group>
      ))}

      <LampLicensePlate
        ghost={ghost}
        height={layout.height}
        layer={layer}
        poleRadius={layout.poleRadius}
      />
    </group>
  )
}
