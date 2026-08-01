'use client'

import { useMemo } from 'react'
import { Object3D } from 'three'
import { resolvePostTopLightLayout } from './post-top-light-geometry'
import { LampBase, LampMetalMaterial as MetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'
import type { PedestrianPostLightNode } from './schema'

export function PostTopLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: PedestrianPostLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolvePostTopLightLayout(node), [node.height])
  const {
    height,
    baseRadius,
    poleBottomRadius,
    poleTopRadius,
    poleTopY,
    neckTopY,
    headRadius,
    capHeight,
    capCenterY,
    lensRadius,
    lensThickness,
    lensY,
  } = layout
  const poleColor = node.poleColor ?? '#30343b'
  const lightColor = node.lightColor ?? '#ffd9a3'
  const lightOn = node.lightOn ?? false
  const lightTarget = useMemo(() => new Object3D(), [])

  return (
    <group layers={layer}>
      <LampBase baseRadius={baseRadius} baseTopRadius={0.9} boltOffset={0.13} boltRadius={0.024} color={poleColor} ghost={ghost} layer={layer} />
      <mesh
        castShadow
        layers={layer}
        position={[0, 0.2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[poleBottomRadius, baseRadius * 0.72, 0.32, 24]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[0, poleTopY / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[poleTopRadius, poleBottomRadius, poleTopY, 24]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[0, (poleTopY + neckTopY) / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry
          args={[poleTopRadius * 0.88, poleTopRadius * 1.22, neckTopY - poleTopY, 20]}
        />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        layers={layer}
        position={[0, height - 0.185, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[lensRadius * 0.38, poleTopRadius, 0.08, 28]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>

      <mesh
        castShadow
        layers={layer}
        position={[0, capCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[headRadius * 0.56, headRadius, capHeight, 36]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        layers={layer}
        position={[0, lensY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[lensRadius, lensRadius, lensThickness, 36]} />
        <meshStandardMaterial
          color={lightOn ? lightColor : '#747b82'}
          depthWrite={!ghost}
          emissive={lightOn ? lightColor : '#000000'}
          emissiveIntensity={ghost ? 0.3 : lightOn ? 2.2 : 0}
          opacity={ghost ? 0.55 : 0.94}
          roughness={0.2}
          transparent
        />
      </mesh>
      <mesh
        layers={layer}
        position={[0, lensY - lensThickness * 0.05, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[lensRadius * 0.92, 0.025, 8, 36]} />
        <MetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        layers={layer}
        position={[0, height + 0.018, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.035, 0.043, 0.036, 18]} />
        <meshStandardMaterial
          color="#71808a"
          depthWrite={!ghost}
          opacity={ghost ? 0.45 : 1}
          roughness={0.38}
          transparent={ghost}
        />
      </mesh>

      <mesh
        layers={layer}
        position={[0, Math.min(0.95, height * 0.22), poleBottomRadius * 0.9 + 0.006]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[poleBottomRadius * 0.85, 0.3, 0.012]} />
        <meshStandardMaterial
          color="#16191d"
          depthWrite={!ghost}
          metalness={0.65}
          opacity={ghost ? 0.35 : 1}
          roughness={0.45}
          transparent={ghost}
        />
      </mesh>

      {!ghost && lightOn && (node.intensity ?? 650) > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[0, 0, 0]} />
          <spotLight
            angle={Math.PI * 0.39}
            castShadow={false}
            color={lightColor}
            decay={2}
            distance={Math.max(7, height * 2.4)}
            intensity={node.intensity ?? 650}
            layers={layer}
            penumbra={0.72}
            position={[0, lensY - 0.03, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}
