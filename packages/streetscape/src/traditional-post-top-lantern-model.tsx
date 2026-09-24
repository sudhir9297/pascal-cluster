'use client'

import { useMemo } from 'react'
import { Quaternion, Vector2, Vector3 } from 'three'
import { LampMetalMaterial as MetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'
import type { TraditionalPostTopLanternNode } from './schema'
import {
  resolveTraditionalPostTopLanternLayout,
  TRADITIONAL_LANTERN_DIMENSIONS,
  TRADITIONAL_LANTERN_INTERIOR,
} from './traditional-post-top-lantern-geometry'

type SharedProps = {
  color: string
  ghost: boolean
  layer: number
}

function SquareRail({
  color,
  ghost,
  layer,
  width,
  y,
  thickness = 0.045,
}: SharedProps & { width: number; y: number; thickness?: number }) {
  const offset = width / 2 - thickness / 2
  return (
    <group layers={layer} name="traditional-lantern-square-rail">
      {[-1, 1].map((sign) => (
        <mesh
          key={`x:${sign}`}
          castShadow={!ghost}
          layers={layer}
          position={[sign * offset, y, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[thickness, thickness, width]} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.28} />
        </mesh>
      ))}
      {[-1, 1].map((sign) => (
        <mesh
          key={`z:${sign}`}
          castShadow={!ghost}
          layers={layer}
          position={[0, y, sign * offset]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[width, thickness, thickness]} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.28} />
        </mesh>
      ))}
    </group>
  )
}

function CornerMullion({
  bottom,
  color,
  ghost,
  layer,
  top,
}: SharedProps & { bottom: [number, number, number]; top: [number, number, number] }) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const start = new Vector3(...bottom)
    const end = new Vector3(...top)
    const direction = end.clone().sub(start)
    return {
      length: direction.length(),
      midpoint: start.clone().add(end).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    }
  }, [bottom[0], bottom[1], bottom[2], top[0], top[1], top[2]])

  return (
    <mesh
      castShadow={!ghost}
      layers={layer}
      name="traditional-lantern-corner-mullion"
      position={midpoint}
      quaternion={quaternion}
      raycast={ghost ? NO_RAYCAST : undefined}
    >
      <boxGeometry args={[0.048, length, 0.048]} />
      <MetalMaterial color={color} ghost={ghost} metalness={0.86} roughness={0.26} />
    </mesh>
  )
}

export function TraditionalLanternHead({
  color,
  ghost,
  layer,
  lightColor,
  lightOn,
}: SharedProps & { lightColor: string; lightOn: boolean }) {
  const dimensions = TRADITIONAL_LANTERN_DIMENSIONS
  const chamberBottomY = 0.2
  const chamberTopY = chamberBottomY + dimensions.chamberHeight
  const bottomHalf = dimensions.glassBottomWidth / 2
  const topHalf = dimensions.glassTopWidth / 2
  const squareRadius = (width: number) => width / Math.sqrt(2)
  const corners = [-1, 1].flatMap((xSign) =>
    [-1, 1].map((zSign) => ({ xSign, zSign })),
  )
  const bulbProfile = useMemo(
    () => [
      new Vector2(0, 0),
      new Vector2(0.031, 0),
      new Vector2(0.032, 0.038),
      new Vector2(0.046, 0.058),
      new Vector2(0.075, 0.09),
      new Vector2(0.09, 0.135),
      new Vector2(0.085, 0.175),
      new Vector2(0.064, 0.212),
      new Vector2(0.026, 0.238),
      new Vector2(0, 0.245),
    ],
    [],
  )

  return (
    <group layers={layer} name="traditional-lantern-head">
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-frog-collar"
        position={[0, 0.08, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.135, 0.095, 0.16, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-lower-tray"
        position={[0, chamberBottomY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, Math.PI / 4, 0]}
      >
        <cylinderGeometry args={[squareRadius(0.62), squareRadius(0.54), 0.09, 4]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.27} />
      </mesh>

      <mesh
        layers={layer}
        name="traditional-lantern-glazing"
        position={[0, (chamberBottomY + chamberTopY) / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, Math.PI / 4, 0]}
      >
        <cylinderGeometry
          args={[
            squareRadius(dimensions.glassTopWidth),
            squareRadius(dimensions.glassBottomWidth),
            dimensions.chamberHeight,
            4,
          ]}
        />
        <meshPhysicalMaterial
          color={lightOn ? lightColor : '#9aa5aa'}
          depthWrite={false}
          emissive={lightOn ? lightColor : '#000000'}
          emissiveIntensity={ghost ? 0.22 : lightOn ? 0.65 : 0}
          metalness={0.02}
          opacity={ghost ? 0.28 : lightOn ? 0.3 : 0.18}
          roughness={0.08}
          side={2}
          transparent
        />
      </mesh>

      <SquareRail color={color} ghost={ghost} layer={layer} width={dimensions.glassBottomWidth + 0.04} y={chamberBottomY + 0.03} />
      <SquareRail color={color} ghost={ghost} layer={layer} width={dimensions.glassTopWidth + 0.04} y={chamberTopY - 0.02} />

      {corners.map(({ xSign, zSign }) => (
        <CornerMullion
          key={`${xSign}:${zSign}`}
          bottom={[xSign * bottomHalf, chamberBottomY + 0.02, zSign * bottomHalf]}
          color={color}
          ghost={ghost}
          layer={layer}
          top={[xSign * topHalf, chamberTopY - 0.01, zSign * topHalf]}
        />
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-roof-eave"
        position={[0, chamberTopY + 0.045, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[dimensions.roofWidth, 0.09, dimensions.roofWidth]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.31} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-pitched-roof"
        position={[0, chamberTopY + 0.2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[squareRadius(dimensions.roofWidth * 0.94), 0.26, 4]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>

      {corners.map(({ xSign, zSign }) => (
        <group
          key={`roof:${xSign}:${zSign}`}
          layers={layer}
          position={[
            xSign * (dimensions.roofWidth / 2 - 0.055),
            chamberTopY + 0.115,
            zSign * (dimensions.roofWidth / 2 - 0.055),
          ]}
        >
          <mesh castShadow={!ghost} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
            <coneGeometry args={[0.045, 0.15, 8]} />
            <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.27} />
          </mesh>
        </group>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-finial-base"
        position={[0, chamberTopY + 0.36, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.085, 0.11, 0.08, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.27} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-finial-ball"
        position={[0, chamberTopY + 0.435, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <sphereGeometry args={[0.075, 16, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.26} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-finial-spire"
        position={[0, chamberTopY + 0.54, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <coneGeometry args={[0.055, 0.22, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.26} />
      </mesh>

      <mesh
        layers={layer}
        name="traditional-lantern-lamp-holder"
        position={[0, chamberBottomY + TRADITIONAL_LANTERN_INTERIOR.holderCenterOffset, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.055, 0.07, TRADITIONAL_LANTERN_INTERIOR.holderHeight, 16]} />
        <MetalMaterial color="#8b6a3f" ghost={ghost} metalness={0.76} roughness={0.3} />
      </mesh>
      <mesh
        layers={layer}
        name="traditional-lantern-lamp-holder-rim"
        position={[0, chamberBottomY + TRADITIONAL_LANTERN_INTERIOR.holderRimCenterOffset, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.064, 0.064, TRADITIONAL_LANTERN_INTERIOR.holderRimHeight, 18]} />
        <MetalMaterial color="#6f5435" ghost={ghost} metalness={0.82} roughness={0.25} />
      </mesh>
      <mesh
        layers={layer}
        name="traditional-lantern-bulb-connector"
        position={[0, chamberBottomY + TRADITIONAL_LANTERN_INTERIOR.bulbConnectorCenterOffset, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.035, 0.035, TRADITIONAL_LANTERN_INTERIOR.bulbConnectorHeight, 18]} />
        <MetalMaterial color="#a78352" ghost={ghost} metalness={0.72} roughness={0.25} />
      </mesh>
      {[0.175, 0.195, 0.215].map((offset) => (
        <mesh
          key={offset}
          layers={layer}
          name="traditional-lantern-bulb-thread"
          position={[0, chamberBottomY + offset, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.035, 0.004, 6, 18]} />
          <MetalMaterial color="#d0aa6a" ghost={ghost} metalness={0.78} roughness={0.22} />
        </mesh>
      ))}
      <mesh
        layers={layer}
        name="traditional-lantern-bulb-filament-stem"
        position={[0, chamberBottomY + TRADITIONAL_LANTERN_INTERIOR.bulbGlassBaseOffset + 0.065, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
        <meshStandardMaterial
          color={lightOn ? lightColor : '#65594a'}
          emissive={lightOn ? lightColor : '#000000'}
          emissiveIntensity={lightOn ? 1.4 : 0}
          opacity={ghost ? 0.45 : 1}
          transparent={ghost}
        />
      </mesh>
      <mesh
        layers={layer}
        name="traditional-lantern-bulb"
        position={[0, chamberBottomY + TRADITIONAL_LANTERN_INTERIOR.bulbGlassBaseOffset, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <latheGeometry args={[bulbProfile, 24]} />
        <meshPhysicalMaterial
          color={lightOn ? lightColor : '#d8d3c7'}
          depthWrite={!ghost && !lightOn}
          emissive={lightOn ? lightColor : '#000000'}
          emissiveIntensity={ghost ? 0.35 : lightOn ? 3.2 : 0}
          metalness={0.02}
          opacity={ghost ? 0.45 : lightOn ? 0.88 : 0.64}
          roughness={0.16}
          thickness={0.025}
          transmission={ghost ? 0 : lightOn ? 0.08 : 0.24}
          transparent
        />
      </mesh>
    </group>
  )
}

export function TraditionalPostTopLanternModel({
  distance,
  ghost = false,
  layer = 0,
  node,
}: {
  distance: number
  ghost?: boolean
  layer?: number
  node: TraditionalPostTopLanternNode
}) {
  const layout = useMemo(
    () => resolveTraditionalPostTopLanternLayout(node),
    [node.height],
  )
  const color = node.poleColor ?? '#25282d'
  const lightColor = node.lightColor ?? '#ffd9a3'
  const lightOn = node.lightOn ?? false

  return (
    <group layers={layer} name="catalog-traditional-post-top-lantern">
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-base-plinth"
        position={[0, 0.055, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <boxGeometry args={[TRADITIONAL_LANTERN_DIMENSIONS.baseWidth, 0.11, TRADITIONAL_LANTERN_DIMENSIONS.baseWidth]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.34} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-stepped-base"
        position={[0, 0.2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[0.2, 0.235, 0.22, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.36} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="traditional-lantern-decorative-base"
        position={[0, 0.36, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[0.145, 0.2, 0.18, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-lamp-pole"
        position={[0, layout.shaftStartY + layout.shaftHeight / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            TRADITIONAL_LANTERN_DIMENSIONS.poleTopRadius,
            TRADITIONAL_LANTERN_DIMENSIONS.poleBottomRadius,
            layout.shaftHeight,
            16,
          ]}
        />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>

      {[0.48, 0.56, Math.max(0.72, layout.supportHeight - 0.18)].map((y, index) => (
        <mesh
          key={y}
          castShadow={!ghost}
          layers={layer}
          name="traditional-lantern-pole-band"
          position={[0, y, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[index === 2 ? 0.105 : 0.15 - index * 0.012, 0.018, 8, 24]} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.84} roughness={0.28} />
        </mesh>
      ))}

      <group layers={layer} position={[0, layout.supportHeight, 0]}>
        <TraditionalLanternHead
          color={color}
          ghost={ghost}
          layer={layer}
          lightColor={lightColor}
          lightOn={lightOn}
        />
      </group>

      {!ghost && lightOn && (node.intensity ?? 650) > 0 && (
        <pointLight
          color={lightColor}
          decay={2}
          distance={distance}
          intensity={(node.intensity ?? 650) * 0.62}
          layers={layer}
          position={[0, layout.lightY, 0]}
        />
      )}
    </group>
  )
}
