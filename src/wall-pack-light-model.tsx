'use client'

import { useEffect, useMemo } from 'react'
import { DoubleSide, Object3D } from 'three'
import {
  buildWallPackHousingGeometry,
  resolveWallPackLightLayout,
  WALL_PACK_LIGHT_DIMENSIONS,
  WALL_PACK_LIGHT_OPTIC_COLUMNS,
  WALL_PACK_LIGHT_OPTIC_ROWS,
} from './wall-pack-light-geometry'
import {
  LampLensMaterial,
  LampMetalMaterial,
  NO_RAYCAST,
} from './roadway-lamp-primitives'

const MOUNTING_BOLTS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

export function WallPackLightModel({
  depth,
  distance,
  ghost,
  intensity,
  layer,
  lightColor,
  lightOn,
  poleColor,
}: {
  depth: number
  distance: number
  ghost: boolean
  intensity: number
  layer: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const layout = resolveWallPackLightLayout(depth)
  const housingGeometry = useMemo(() => buildWallPackHousingGeometry(layout.depth), [layout.depth])
  const lightTarget = useMemo(() => new Object3D(), [])
  const finZs = useMemo(
    () => Array.from(
      { length: WALL_PACK_LIGHT_DIMENSIONS.heatSinkFinCount },
      (_, index) => -0.18 + index * 0.09,
    ),
    [],
  )

  useEffect(() => () => housingGeometry.dispose(), [housingGeometry])

  return (
    <group layers={layer} name="catalog-wall-pack-light" position={[0, 0, 0]}>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-pack-backplate"
        position={[0, 0, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <boxGeometry args={[
          WALL_PACK_LIGHT_DIMENSIONS.backPlateDepth,
          WALL_PACK_LIGHT_DIMENSIONS.backPlateHeight,
          WALL_PACK_LIGHT_DIMENSIONS.backPlateWidth,
        ]} />
        <LampMetalMaterial color="#282d30" ghost={ghost} metalness={0.72} roughness={0.46} side={DoubleSide} />
      </mesh>
      {MOUNTING_BOLTS.map(([xSign, ySign]) => (
        <mesh
          key={`${xSign}:${ySign}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-pack-mounting-bolt"
          position={[0.025, ySign * 0.127, xSign * 0.205]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.012, 0.012, 0.014, 12]} />
          <LampMetalMaterial color="#111517" ghost={ghost} metalness={0.88} roughness={0.25} side={DoubleSide} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="catalog-wall-pack-housing"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.68} roughness={0.43} side={DoubleSide} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-pack-optic-bezel"
        position={[layout.opticCenterX, layout.opticCenterY - 0.004, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, layout.opticAngle]}
      >
        <boxGeometry args={[
          layout.opticDepth + 0.035,
          0.024,
          WALL_PACK_LIGHT_DIMENSIONS.opticWidth + 0.055,
        ]} />
        <LampMetalMaterial color="#171c1f" ghost={ghost} metalness={0.58} roughness={0.38} side={DoubleSide} />
      </mesh>
      <mesh
        layers={layer}
        name="catalog-wall-pack-optic-window"
        position={[layout.opticCenterX, layout.opticCenterY - 0.019, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, layout.opticAngle]}
      >
        <boxGeometry args={[
          layout.opticDepth,
          WALL_PACK_LIGHT_DIMENSIONS.opticThickness,
          WALL_PACK_LIGHT_DIMENSIONS.opticWidth,
        ]} />
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} emissiveIntensity={2.8} side={DoubleSide} />
      </mesh>
      {WALL_PACK_LIGHT_OPTIC_COLUMNS.flatMap((z) =>
        WALL_PACK_LIGHT_OPTIC_ROWS.map((row) => {
          const localX = (row - 0.5) * layout.opticDepth * 0.72
          return (
            <mesh
              key={`${z}:${row}`}
              layers={layer}
              name="catalog-wall-pack-optic-cell"
              position={[
                layout.opticCenterX + localX * Math.cos(layout.opticAngle),
                layout.opticCenterY - 0.031 + localX * Math.sin(layout.opticAngle),
                z,
              ]}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[0, 0, layout.opticAngle]}
            >
              <cylinderGeometry args={[0.021, 0.025, 0.012, 14]} />
              <meshStandardMaterial
                color={lightOn ? lightColor : '#d7dcda'}
                depthWrite={!ghost}
                emissive={lightOn ? lightColor : '#000000'}
                emissiveIntensity={ghost ? 0.25 : lightOn ? 3.2 : 0}
                metalness={0.04}
                opacity={ghost ? 0.55 : 0.97}
                roughness={0.13}
                side={DoubleSide}
                transparent={ghost}
              />
            </mesh>
          )
        }),
      )}
      {finZs.map((z) => (
        <mesh
          key={z}
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-pack-heat-sink-fin"
          position={[layout.topCenterX, layout.topCenterY + 0.012, z]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[0, 0, layout.topAngle]}
        >
          <boxGeometry args={[layout.topDepth, 0.024, 0.018]} />
          <LampMetalMaterial color="#30373a" ghost={ghost} metalness={0.74} roughness={0.42} side={DoubleSide} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-pack-photocell"
        position={[0.068, 0.17, -0.205]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[
          WALL_PACK_LIGHT_DIMENSIONS.photocellRadius,
          WALL_PACK_LIGHT_DIMENSIONS.photocellRadius * 1.08,
          WALL_PACK_LIGHT_DIMENSIONS.photocellHeight,
          16,
        ]} />
        <LampMetalMaterial color="#182126" ghost={ghost} metalness={0.35} roughness={0.26} side={DoubleSide} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-pack-side-fastener"
          position={[layout.depth * 0.45, -0.015, side * 0.272]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[
            WALL_PACK_LIGHT_DIMENSIONS.sideFastenerRadius,
            WALL_PACK_LIGHT_DIMENSIONS.sideFastenerRadius,
            0.012,
            12,
          ]} />
          <LampMetalMaterial color="#151a1d" ghost={ghost} metalness={0.9} roughness={0.22} side={DoubleSide} />
        </mesh>
      ))}
      {!ghost && lightOn && intensity > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[2.5, -3.6, 0]} />
          <spotLight
            angle={Math.PI * 0.29}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={intensity}
            layers={layer}
            penumbra={0.62}
            position={[layout.opticCenterX, layout.opticCenterY - 0.04, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}
