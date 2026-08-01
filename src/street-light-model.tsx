'use client'

import { useEffect, useMemo } from 'react'
import { Object3D, QuadraticBezierCurve3, Vector3 } from 'three'
import type { StreetLightNode } from './schema'
import {
  buildLampHousingGeometry,
  buildLampLensGeometry,
  resolveStreetLightLayout,
} from './street-light-geometry'
import {
  LampBase,
  LampLensMaterial,
  LampLicensePlate,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
} from './roadway-lamp-primitives'

export function StreetLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: StreetLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(
    () => resolveStreetLightLayout(node),
    [node.height, node.armLength],
  )
  const {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTop,
    armEndY,
    socketLength,
    socketRadius,
    fixtureStartX,
    fixtureLength,
  } = layout
  const poleColor = node.poleColor ?? '#30343b'
  const lightColor = node.lightColor ?? '#ffd9a3'
  const lightOn = node.lightOn ?? false
  const socketCenterX = armLength + socketLength / 2 - 0.05
  const lightX = fixtureStartX + fixtureLength * 0.58
  const lightTarget = useMemo(() => new Object3D(), [])
  const housingGeometry = useMemo(() => buildLampHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildLampLensGeometry(layout), [layout])
  const armCurve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(0, poleTop, 0),
        new Vector3(0, armEndY, 0),
        new Vector3(armLength, armEndY, 0),
      ),
    [armLength, armEndY, poleTop],
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
      <LampBase baseRadius={0.25} color={poleColor} ghost={ghost} layer={layer} boltOffset={0.14} baseTopRadius={0.88} />
      <LampPoleSegment bottomRadius={0.18} color={poleColor} ghost={ghost} height={0.36} layer={layer} topRadius={0.135} y={0.04} />
      <LampPoleSegment bottomRadius={poleRadius} color={poleColor} ghost={ghost} height={poleTop} layer={layer} topRadius={armRadius} />
      <mesh castShadow layers={layer} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <tubeGeometry args={[armCurve, 28, armRadius, 12, false]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} />
      </mesh>

      <mesh
        castShadow
        layers={layer}
        position={[socketCenterX, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[socketRadius, socketRadius, socketLength, 16]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[fixtureStartX - 0.02, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[socketRadius * 1.18, socketRadius * 1.18, 0.045, 16]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        geometry={housingGeometry}
        layers={layer}
        position={[fixtureStartX, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        geometry={lensGeometry}
        layers={layer}
        position={[fixtureStartX, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} emissiveIntensity={2.5} />
      </mesh>
      <mesh
        layers={layer}
        position={[fixtureStartX + fixtureLength * 0.24, armEndY + 0.142, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.034, 0.04, 0.055, 16]} />
        <meshStandardMaterial
          color="#737b84"
          depthWrite={!ghost}
          metalness={0.2}
          opacity={ghost ? 0.45 : 1}
          roughness={0.38}
          transparent={ghost}
        />
      </mesh>

      <LampLicensePlate ghost={ghost} height={height} layer={layer} poleRadius={poleRadius} />

      {!ghost && lightOn && (node.intensity ?? 1200) > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[lightX, 0, 0]} />
          <spotLight
            angle={Math.PI * 0.31}
            castShadow={false}
            color={lightColor}
            decay={2}
            distance={Math.max(10, height * 2.5)}
            intensity={node.intensity ?? 1200}
            layers={layer}
            penumbra={0.5}
            position={[lightX, armEndY - 0.18, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}
