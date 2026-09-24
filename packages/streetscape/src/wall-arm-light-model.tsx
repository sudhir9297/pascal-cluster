'use client'

import { useEffect, useMemo } from 'react'
import { DoubleSide, Object3D, QuadraticBezierCurve3, Vector3 } from 'three'
import { LampLensMaterial, LampMetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'
import type { WallArmLightNode } from './schema'
import {
  buildWallArmHousingGeometry,
  buildWallArmLensGeometry,
  buildWallArmUpperSparGeometry,
  resolveWallArmLightLayout,
  WALL_ARM_LIGHT_DIMENSIONS,
  WALL_ARM_LIGHT_OPTIC_CELL_X_OFFSETS,
  WALL_ARM_LIGHT_OPTIC_CELL_Z_OFFSETS,
  WALL_ARM_LIGHT_OPTIC_MODULE_CENTERS,
} from './wall-arm-light-geometry'

const MOUNT_BOLTS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

function WallArmLedHead({
  distance,
  ghost,
  intensity,
  layer,
  lightColor,
  lightOn,
}: {
  distance: number
  ghost: boolean
  intensity: number
  layer: number
  lightColor: string
  lightOn: boolean
}) {
  const housingGeometry = useMemo(() => buildWallArmHousingGeometry(), [])
  const lensGeometry = useMemo(() => buildWallArmLensGeometry(), [])
  const lightTarget = useMemo(() => new Object3D(), [])
  const dimensions = WALL_ARM_LIGHT_DIMENSIONS
  const frameCenterX = (dimensions.lensStartX + dimensions.lensEndX) / 2
  const frameLength = dimensions.lensEndX - dimensions.lensStartX
  const frameY = -dimensions.headHeight / 2 - dimensions.opticFrameHeight / 2
  const frameSideZ = (dimensions.lensWidth + dimensions.opticFrameThickness) / 2
  const moduleY = -dimensions.headHeight / 2 - 0.002
  const cellY = -dimensions.headHeight / 2 - dimensions.lensDrop

  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <group layers={layer} name="catalog-wall-arm-head">
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="catalog-wall-arm-housing"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial
          color="#465158"
          ghost={ghost}
          metalness={0.78}
          roughness={0.34}
          side={DoubleSide}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`bezel-side:${side}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-arm-optic-bezel"
          position={[frameCenterX, frameY, side * frameSideZ]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry
            args={[
              frameLength + dimensions.opticFrameThickness,
              dimensions.opticFrameHeight,
              dimensions.opticFrameThickness,
            ]}
          />
          <LampMetalMaterial color="#30393f" ghost={ghost} metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      {[dimensions.lensStartX, dimensions.lensEndX].map((x) => (
        <mesh
          key={`bezel-end:${x}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-arm-optic-bezel"
          position={[x, frameY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry
            args={[
              dimensions.opticFrameThickness,
              dimensions.opticFrameHeight,
              dimensions.lensWidth + dimensions.opticFrameThickness * 2,
            ]}
          />
          <LampMetalMaterial color="#30393f" ghost={ghost} metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      <mesh
        layers={layer}
        name="catalog-wall-arm-optic-window"
        geometry={lensGeometry}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <LampLensMaterial
          color={lightColor}
          ghost={ghost}
          lightOn={lightOn}
          emissiveIntensity={2.8}
          side={DoubleSide}
        />
      </mesh>
      {WALL_ARM_LIGHT_OPTIC_MODULE_CENTERS.map((moduleX) => (
        <mesh
          key={moduleX}
          layers={layer}
          name="catalog-wall-arm-optic-module"
          position={[moduleX, moduleY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.17, 0.004, 0.21]} />
          <meshStandardMaterial
            color={lightOn ? '#f2f5f4' : '#879196'}
            depthWrite={!ghost}
            emissive={lightOn ? lightColor : '#000000'}
            emissiveIntensity={ghost ? 0.16 : lightOn ? 0.65 : 0}
            metalness={0.05}
            opacity={ghost ? 0.52 : 0.96}
            roughness={0.16}
            transparent={ghost}
          />
        </mesh>
      ))}
      {WALL_ARM_LIGHT_OPTIC_MODULE_CENTERS.flatMap((moduleX) =>
        WALL_ARM_LIGHT_OPTIC_CELL_X_OFFSETS.flatMap((offsetX) =>
          WALL_ARM_LIGHT_OPTIC_CELL_Z_OFFSETS.map((cellZ) => (
            <mesh
              key={`${moduleX}:${offsetX}:${cellZ}`}
              layers={layer}
              name="catalog-wall-arm-optic-cell"
              position={[moduleX + offsetX, cellY, cellZ]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.018, 0.021, 0.004, 16]} />
              <meshStandardMaterial
                color={lightOn ? lightColor : '#c4cccf'}
                depthWrite={!ghost}
                emissive={lightOn ? lightColor : '#000000'}
                emissiveIntensity={ghost ? 0.25 : lightOn ? 3.2 : 0}
                metalness={0.02}
                opacity={ghost ? 0.56 : 0.98}
                roughness={0.1}
                transparent={ghost}
              />
            </mesh>
          )),
        ),
      )}
      {!ghost && lightOn && intensity > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[0.28, -4, 0]} />
          <spotLight
            angle={Math.PI * 0.34}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={intensity}
            layers={layer}
            penumbra={0.48}
            position={[0.32, -0.085, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}

export function WallArmLightModel({
  distance,
  ghost = false,
  layer = 0,
  node,
}: {
  distance: number
  ghost?: boolean
  layer?: number
  node: WallArmLightNode
}) {
  const dimensions = WALL_ARM_LIGHT_DIMENSIONS
  const layout = resolveWallArmLightLayout(node.armLength)
  const upperSparGeometry = useMemo(() => buildWallArmUpperSparGeometry(layout.armLength), [layout.armLength])
  const lowerTieCurve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(dimensions.lowerTieStartX, dimensions.lowerTieStartY, 0),
        new Vector3(layout.armLength * 0.46, dimensions.lowerTieControlY, 0),
        new Vector3(layout.armLength - 0.055, dimensions.lowerTieEndY, 0),
      ),
    [dimensions, layout.armLength],
  )
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const intensity = node.intensity ?? 1100

  useEffect(() => () => upperSparGeometry.dispose(), [upperSparGeometry])

  return (
    <group layers={layer} name="catalog-wall-arm-lamp" position={[0, node.height ?? 6, 0]}>
      <group layers={layer} name="catalog-lamp-pole">
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-arm-mount-plate"
          position={[dimensions.mountPlateDepth / 2, 0, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <boxGeometry args={[dimensions.mountPlateDepth, dimensions.mountPlateHeight, dimensions.mountPlateWidth]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.31} />
        </mesh>
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-arm-mount-pad"
          position={[dimensions.mountPlateDepth + dimensions.mountPadDepth / 2, 0, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[dimensions.mountPadDepth, dimensions.mountPadHeight, dimensions.mountPadWidth]} />
          <LampMetalMaterial color="#4b555c" ghost={ghost} metalness={0.8} roughness={0.33} />
        </mesh>
        {MOUNT_BOLTS.map(([vertical, lateral]) => (
          <mesh
            key={`${vertical}:${lateral}`}
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-arm-mount-bolt"
            position={[
              dimensions.mountBoltX,
              vertical * dimensions.mountBoltY,
              lateral * dimensions.mountBoltZ,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[dimensions.mountBoltRadius, dimensions.mountBoltRadius, 0.028, 10]} />
            <LampMetalMaterial color="#151a1e" ghost={ghost} metalness={0.9} roughness={0.24} />
          </mesh>
        ))}
      </group>
      <mesh
        castShadow={!ghost}
        geometry={upperSparGeometry}
        layers={layer}
        name="catalog-wall-arm-tapered-spar"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-arm-curved-tie"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[lowerTieCurve, 28, dimensions.lowerTieRadius, 10, false]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.32} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-arm-head-joint"
        position={[layout.armLength - 0.055, dimensions.lowerTieEndY + 0.035, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[dimensions.jointRadius, dimensions.jointRadius, 0.085, 18]} />
        <LampMetalMaterial color="#30383d" ghost={ghost} metalness={0.84} roughness={0.28} />
      </mesh>
      <group layers={layer} position={[layout.headOriginX, 0.045, 0]} rotation={[0, 0, -0.02]}>
        <WallArmLedHead
          distance={distance}
          ghost={ghost}
          intensity={intensity}
          layer={layer}
          lightColor={lightColor}
          lightOn={lightOn}
        />
      </group>
    </group>
  )
}
