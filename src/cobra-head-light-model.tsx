'use client'

import { useEffect, useMemo } from 'react'
import { Object3D, QuadraticBezierCurve3, Vector3 } from 'three'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
  resolveCobraHeadLightLayout,
} from './cobra-head-light-geometry'
import {
  LampBase,
  LampLicensePlate,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
} from './roadway-lamp-primitives'
import type { CobraHeadLightNode } from './schema'

export function CobraHeadLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: CobraHeadLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(
    () => resolveCobraHeadLightLayout(node),
    [node.height, node.armLength],
  )
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const intensity = node.intensity ?? 1400
  const lightTargets = useMemo(() => [new Object3D(), new Object3D()], [])
  const housingGeometry = useMemo(() => buildCobraHeadHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildCobraHeadLensGeometry(layout), [layout])
  const armCurve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(0, layout.poleTopY, 0),
        new Vector3(0, layout.armY, 0),
        new Vector3(layout.armLength, layout.armY, 0),
      ),
    [layout.armLength, layout.armY, layout.poleTopY],
  )

  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  const housingX = layout.fixtureStartX
  const lightX = housingX + layout.fixtureLength * 0.57
  const lensY = layout.armY - 0.15

  return (
    <group layers={layer}>
      <LampBase
        baseRadius={0.26}
        baseTopRadius={0.86}
        boltOffset={0.155}
        color={poleColor}
        ghost={ghost}
        layer={layer}
      />
      <LampPoleSegment
        bottomRadius={0.18}
        color={poleColor}
        ghost={ghost}
        height={0.38}
        layer={layer}
        topRadius={0.145}
        y={0.04}
      />
      <LampPoleSegment
        bottomRadius={layout.poleRadius * 1.28}
        color={poleColor}
        ghost={ghost}
        height={layout.poleTopY - 0.22}
        layer={layer}
        topRadius={layout.poleRadius}
        y={0.22}
      />
      <mesh
        castShadow
        layers={layer}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[armCurve, 32, layout.armRadius, 16, false]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.78} roughness={0.3} />
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
          opacity={ghost ? 0.5 : 1}
          roughness={0.38}
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
          clearcoat={0.3}
          color={lightOn ? lightColor : '#aab3b5'}
          depthWrite={!ghost}
          emissive={lightOn ? lightColor : '#111518'}
          emissiveIntensity={ghost ? 0.25 : lightOn ? 1.9 : 0.08}
          flatShading
          metalness={0.02}
          opacity={ghost ? 0.4 : 1}
          roughness={0.3}
          transparent={ghost}
        />
      </mesh>

      {/* Photocell socket is the signature top detail on traditional roadway heads. */}
      <mesh
        layers={layer}
        position={[housingX + layout.fixtureLength * 0.31, layout.armY + 0.145, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.046, 0.052, 0.02, 20]} />
        <meshStandardMaterial
          color="#181d20"
          depthWrite={!ghost}
          metalness={0.6}
          opacity={ghost ? 0.38 : 1}
          roughness={0.42}
          transparent={ghost}
        />
      </mesh>
      <mesh
        layers={layer}
        position={[housingX + layout.fixtureLength * 0.31, layout.armY + 0.164, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.036, 0.04, 0.022, 20]} />
        <meshPhysicalMaterial
          clearcoat={0.65}
          color="#24343a"
          depthWrite={!ghost}
          metalness={0.08}
          opacity={ghost ? 0.42 : 0.88}
          roughness={0.2}
          transparent
        />
      </mesh>

      <LampLicensePlate
        ghost={ghost}
        height={layout.height}
        layer={layer}
        poleRadius={layout.poleRadius}
      />

      {!ghost && lightOn && intensity > 0 && (
        <>
          {lightTargets.map((target, index) => {
            const side = index === 0 ? -1 : 1
            return (
              <group key={side}>
                <primitive
                  layers={layer}
                  object={target}
                  position={[lightX + layout.fixtureLength * 0.12, 0, side * layout.height * 0.2]}
                />
                <spotLight
                  angle={Math.PI * 0.27}
                  castShadow={false}
                  color={lightColor}
                  decay={2}
                  distance={Math.max(14, layout.height * 2.8)}
                  intensity={intensity * 0.62}
                  layers={layer}
                  penumbra={0.68}
                  position={[lightX, lensY, side * 0.08]}
                  target={target}
                />
              </group>
            )
          })}
          <pointLight
            color={lightColor}
            decay={2}
            distance={1.1}
            intensity={Math.min(18, intensity * 0.012)}
            layers={layer}
            position={[lightX, lensY - 0.06, 0]}
          />
        </>
      )}
    </group>
  )
}
