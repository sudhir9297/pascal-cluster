'use client'

import { useMemo } from 'react'
import { Object3D } from 'three'
import {
  PATH_GARDEN_LIGHT_DIMENSIONS,
  resolvePathGardenLightLayout,
} from './path-garden-light-geometry'
import {
  LampLensMaterial,
  LampMetalMaterial,
  NO_RAYCAST,
} from './roadway-lamp-primitives'

const HEAD_SIDES = [-1, 1] as const

export function PathGardenLightModel({
  headSpan,
  ghost,
  height,
  intensity,
  layer,
  lightColor,
  lightOn,
  poleColor,
}: {
  headSpan: number
  ghost: boolean
  height: number
  intensity: number
  layer: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const layout = resolvePathGardenLightLayout(height, headSpan)
  const negativeTarget = useMemo(() => new Object3D(), [])
  const positiveTarget = useMemo(() => new Object3D(), [])
  const targets = [negativeTarget, positiveTarget] as const
  const braceLength = Math.hypot(layout.headCenterOffset, layout.headY - layout.braceY)
  const braceAngle = Math.atan2(layout.headCenterOffset, layout.headY - layout.braceY)

  return (
    <group layers={layer} name="catalog-path-garden-light">
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-path-base-plate"
        position={[0, PATH_GARDEN_LIGHT_DIMENSIONS.baseHeight / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[
          PATH_GARDEN_LIGHT_DIMENSIONS.baseDiameter * 0.46,
          PATH_GARDEN_LIGHT_DIMENSIONS.baseDiameter / 2,
          PATH_GARDEN_LIGHT_DIMENSIONS.baseHeight,
          24,
        ]} />
        <LampMetalMaterial color="#242a27" ghost={ghost} metalness={0.76} roughness={0.44} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-path-ground-collar"
        position={[0, PATH_GARDEN_LIGHT_DIMENSIONS.baseHeight + 0.014, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.048, 0.057, 0.032, 24]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.7} roughness={0.48} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-path-tapered-stem"
        position={[0, PATH_GARDEN_LIGHT_DIMENSIONS.baseHeight + layout.stemHeight / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[
          PATH_GARDEN_LIGHT_DIMENSIONS.stemTopRadius,
          PATH_GARDEN_LIGHT_DIMENSIONS.stemBottomRadius,
          layout.stemHeight,
          20,
        ]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.7} roughness={0.48} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-path-service-door"
        position={[0, Math.max(0.2, layout.height * 0.34), PATH_GARDEN_LIGHT_DIMENSIONS.stemBottomRadius]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.042, 0.13, 0.012]} />
        <LampMetalMaterial color="#414944" ghost={ghost} metalness={0.68} roughness={0.5} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-path-head-hub"
        position={[0, layout.stemTopY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[
          PATH_GARDEN_LIGHT_DIMENSIONS.hubRadius,
          PATH_GARDEN_LIGHT_DIMENSIONS.hubRadius * 0.82,
          0.09,
          24,
        ]} />
        <LampMetalMaterial color="#303733" ghost={ghost} metalness={0.78} roughness={0.38} />
      </mesh>

      {HEAD_SIDES.map((side, index) => (
        <group key={side} layers={layer} name="catalog-path-head-side">
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-path-head-brace"
            position={[
              side * layout.headCenterOffset / 2,
              (layout.braceY + layout.headY) / 2,
              0,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[0, 0, -side * braceAngle]}
          >
            <cylinderGeometry args={[0.012, 0.015, braceLength, 12]} />
            <LampMetalMaterial color="#3b433e" ghost={ghost} metalness={0.74} roughness={0.42} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-path-head-housing"
            position={[side * layout.headCenterOffset, layout.headY, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[
              layout.halfHeadLength,
              PATH_GARDEN_LIGHT_DIMENSIONS.headHeight,
              PATH_GARDEN_LIGHT_DIMENSIONS.headDepth,
            ]} />
            <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.76} roughness={0.4} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-path-head-end-cap"
            position={[
              side * (layout.headSpan / 2 - 0.009),
              layout.headY,
              0,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[
              0.018,
              PATH_GARDEN_LIGHT_DIMENSIONS.headHeight + 0.012,
              PATH_GARDEN_LIGHT_DIMENSIONS.headDepth + 0.012,
            ]} />
            <LampMetalMaterial color="#252b28" ghost={ghost} metalness={0.8} roughness={0.34} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-path-head-optic-bezel"
            position={[side * layout.headCenterOffset, layout.bezelY, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[
              layout.halfHeadLength - 0.014,
              PATH_GARDEN_LIGHT_DIMENSIONS.opticBezelThickness,
              PATH_GARDEN_LIGHT_DIMENSIONS.headDepth - 0.012,
            ]} />
            <LampMetalMaterial color="#202622" ghost={ghost} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh
            layers={layer}
            name="catalog-path-head-lens"
            position={[
              side * layout.headCenterOffset,
              layout.lightY,
              0,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[
              layout.halfHeadLength - PATH_GARDEN_LIGHT_DIMENSIONS.lensInset * 2,
              PATH_GARDEN_LIGHT_DIMENSIONS.lensThickness,
              PATH_GARDEN_LIGHT_DIMENSIONS.headDepth - PATH_GARDEN_LIGHT_DIMENSIONS.lensInset * 2,
            ]} />
            <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-path-head-fastener"
            position={[
              side * (PATH_GARDEN_LIGHT_DIMENSIONS.headGap / 2 + 0.02),
              layout.headY + PATH_GARDEN_LIGHT_DIMENSIONS.headHeight / 2 + 0.007,
              0,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.009, 0.009, 0.012, 10]} />
            <LampMetalMaterial color="#151a17" ghost={ghost} metalness={0.88} roughness={0.28} />
          </mesh>
          {!ghost && lightOn && intensity > 0 && (
            <>
              <primitive
                layers={layer}
                object={targets[index]!}
                position={[
                  side * PATH_GARDEN_LIGHT_DIMENSIONS.lightThrowOffset,
                  0,
                  0,
                ]}
              />
              <spotLight
                angle={Math.PI * 0.31}
                color={lightColor}
                decay={2}
                distance={layout.lightDistance}
                intensity={intensity * 0.55}
                layers={layer}
                penumbra={0.68}
                position={[side * layout.headCenterOffset, layout.lightY - 0.012, 0]}
                target={targets[index]!}
              />
            </>
          )}
        </group>
      ))}
    </group>
  )
}
