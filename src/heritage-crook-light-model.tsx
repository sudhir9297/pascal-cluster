'use client'

import { useMemo } from 'react'
import { Object3D, Vector2 } from 'three'
import {
  buildHeritageCrookCurves,
  resolveHeritageCrookLightLayout,
} from './heritage-crook-light-geometry'
import { LampBase, LampMetalMaterial as MetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'
import type { HeritageCrookLightNode } from './schema'

export function HeritageCrookLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: HeritageCrookLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolveHeritageCrookLightLayout(node), [
    node.height,
    node.armReach,
  ])
  const {
    height,
    armReach,
    baseRadius,
    poleBottomRadius,
    poleTopRadius,
    straightPoleTopY,
    armEndY,
    armRadius,
    hangerLength,
    lampCenterY,
    lensRadius,
    lensHeight,
  } = layout
  const poleColor = node.poleColor ?? '#24272b'
  const lightColor = node.lightColor ?? '#ffd5a0'
  const lightOn = node.lightOn ?? false
  const lightTarget = useMemo(() => new Object3D(), [])
  const { crookCurve, braceCurve } = useMemo(
    () => buildHeritageCrookCurves(layout),
    [armEndY, armReach, height, straightPoleTopY],
  )
  const lensProfile = useMemo(
    () => [
      new Vector2(0.055, -lensHeight * 0.5),
      new Vector2(lensRadius * 0.72, -lensHeight * 0.37),
      new Vector2(lensRadius, -lensHeight * 0.05),
      new Vector2(lensRadius * 0.86, lensHeight * 0.28),
      new Vector2(lensRadius * 0.5, lensHeight * 0.5),
    ],
    [lensHeight, lensRadius],
  )
  const ribLength = lensHeight * 0.68
  const upperRingY = lampCenterY + lensHeight * 0.3
  const lowerRingY = lampCenterY - lensHeight * 0.34

  return (
    <group layers={layer}>
      <LampBase baseRadius={baseRadius} baseTopRadius={0.9} boltColor="#111418" boltOffset={0.14} boltRadius={0.024} color={poleColor} ghost={ghost} layer={layer} />
      <mesh
        castShadow
        layers={layer}
        position={[0, 0.24, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[poleBottomRadius, baseRadius * 0.72, 0.4, 24]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      {[0.16, 0.33].map((y) => (
        <mesh
          key={y}
          layers={layer}
          position={[0, y, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[poleBottomRadius * 1.08, 0.022, 8, 24]} />
          <MetalMaterial color={poleColor} ghost={ghost} />
        </mesh>
      ))}
      <mesh
        castShadow
        layers={layer}
        position={[0, straightPoleTopY / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry
          args={[poleTopRadius, poleBottomRadius, straightPoleTopY, 24]}
        />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh castShadow layers={layer} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <tubeGeometry args={[crookCurve, 48, armRadius, 12, false]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh castShadow layers={layer} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <tubeGeometry args={[braceCurve, 24, armRadius * 0.38, 8, false]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[armReach, armEndY - hangerLength / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[armRadius * 0.62, armRadius * 0.62, hangerLength, 14]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[armReach, lampCenterY + lensHeight * 0.55, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[lensRadius * 0.38, lensRadius * 0.62, 0.13, 24]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[armReach, lampCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <latheGeometry args={[lensProfile, 32]} />
        <meshStandardMaterial
          color={lightOn ? lightColor : '#7d8285'}
          depthWrite={!ghost}
          emissive={lightOn ? lightColor : '#000000'}
          emissiveIntensity={ghost ? 0.3 : lightOn ? 2.35 : 0}
          opacity={ghost ? 0.45 : lightOn ? 0.82 : 0.92}
          roughness={0.18}
          transparent
        />
      </mesh>
      {[upperRingY, lowerRingY].map((y) => (
        <mesh
          key={y}
          layers={layer}
          position={[armReach, y, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[lensRadius * 0.82, 0.014, 6, 28]} />
          <MetalMaterial color={poleColor} ghost={ghost} />
        </mesh>
      ))}
      {(
        [
          [lensRadius * 0.76, 0],
          [-lensRadius * 0.76, 0],
          [0, lensRadius * 0.76],
          [0, -lensRadius * 0.76],
        ] as const
      ).map(([x, z]) => (
        <mesh
          key={`${x}:${z}`}
          layers={layer}
          position={[armReach + x, lampCenterY - 0.01, z]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.011, 0.011, ribLength, 7]} />
          <MetalMaterial color={poleColor} ghost={ghost} />
        </mesh>
      ))}
      <mesh
        castShadow
        layers={layer}
        position={[armReach, lampCenterY - lensHeight * 0.56, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <coneGeometry args={[0.07, 0.14, 18]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        layers={layer}
        position={[0, Math.min(1, height * 0.21), poleBottomRadius * 0.9 + 0.006]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[poleBottomRadius * 0.86, 0.31, 0.012]} />
        <meshStandardMaterial
          color="#111418"
          depthWrite={!ghost}
          metalness={0.7}
          opacity={ghost ? 0.35 : 1}
          roughness={0.42}
          transparent={ghost}
        />
      </mesh>

      {!ghost && lightOn && (node.intensity ?? 750) > 0 && (
        <>
          <primitive
            layers={layer}
            object={lightTarget}
            position={[armReach, 0, 0]}
          />
          <spotLight
            angle={Math.PI * 0.34}
            castShadow={false}
            color={lightColor}
            decay={2}
            distance={Math.max(8, height * 2.4)}
            intensity={node.intensity ?? 750}
            layers={layer}
            penumbra={0.62}
            position={[armReach, lampCenterY - lensHeight * 0.2, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}
