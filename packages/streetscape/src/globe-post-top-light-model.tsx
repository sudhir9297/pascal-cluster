'use client'

import { useEffect, useMemo } from 'react'
import {
  buildGlobePostTopRefractorGeometry,
  buildGlobePostTopRibCurves,
  globePostTopRadiusAt,
  GLOBE_POST_TOP_LIGHT_DIMENSIONS,
  GLOBE_POST_TOP_LIGHT_PRISM_LEVELS,
  resolveGlobePostTopLightLayout,
} from './globe-post-top-light-geometry'
import { LampMetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'

const BASE_BOLTS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

const PEDESTAL_FLUTES = Array.from({ length: 12 }, (_, index) => (index * Math.PI * 2) / 12)

export function GlobePostTopLightModel({
  distance,
  ghost = false,
  height,
  intensity,
  layer = 0,
  lightColor,
  lightOn,
  poleColor,
}: {
  distance: number
  ghost?: boolean
  height: number
  intensity: number
  layer?: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const dimensions = GLOBE_POST_TOP_LIGHT_DIMENSIONS
  const layout = resolveGlobePostTopLightLayout(height)
  const refractorGeometry = useMemo(() => buildGlobePostTopRefractorGeometry(), [])
  const ribCurves = useMemo(() => buildGlobePostTopRibCurves(), [])

  useEffect(() => () => refractorGeometry.dispose(), [refractorGeometry])

  return (
    <group layers={layer} name="catalog-globe-post-top-light">
      <group layers={layer} name="catalog-lamp-pole">
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-base-plate"
          position={[0, dimensions.basePlateHeight / 2, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <boxGeometry args={[dimensions.basePlateSize, dimensions.basePlateHeight, dimensions.basePlateSize]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.72} roughness={0.42} />
        </mesh>

        {BASE_BOLTS.map(([x, z]) => (
          <mesh
            key={`${x}:${z}`}
            castShadow={!ghost}
            layers={layer}
            name="catalog-globe-anchor-bolt"
            position={[x * dimensions.baseBoltOffset, dimensions.basePlateHeight + 0.025, z * dimensions.baseBoltOffset]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
            <LampMetalMaterial color="#15191c" ghost={ghost} metalness={0.88} roughness={0.28} />
          </mesh>
        ))}

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-cast-pedestal"
          position={[0, dimensions.pedestalHeight / 2 + dimensions.basePlateHeight, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <cylinderGeometry args={[dimensions.pedestalTopRadius, dimensions.pedestalBottomRadius, dimensions.pedestalHeight, 24]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.66} roughness={0.46} />
        </mesh>

        {PEDESTAL_FLUTES.map((angle) => {
          const radius = dimensions.pedestalTopRadius + 0.016
          return (
            <mesh
              key={angle}
              castShadow={!ghost}
              layers={layer}
              name="catalog-globe-pedestal-flute"
              position={[
                Math.cos(angle) * radius,
                dimensions.basePlateHeight + dimensions.pedestalHeight * 0.53,
                Math.sin(angle) * radius,
              ]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.012, 0.02, dimensions.pedestalHeight * 0.68, 7]} />
              <LampMetalMaterial color="#41474c" ghost={ghost} metalness={0.68} roughness={0.43} />
            </mesh>
          )
        })}

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-pedestal-collar"
          position={[0, dimensions.pedestalHeight + dimensions.basePlateHeight - 0.015, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.155, 0.17, 0.13, 24]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.7} roughness={0.4} />
        </mesh>

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-tapered-shaft"
          position={[0, layout.shaftBottomY + layout.shaftHeight / 2, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <cylinderGeometry args={[dimensions.shaftTopRadius, dimensions.shaftBottomRadius, layout.shaftHeight, 20]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.72} roughness={0.39} />
        </mesh>

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-service-door"
          position={[
            0,
            dimensions.basePlateHeight + dimensions.pedestalHeight * 0.5,
            dimensions.pedestalBottomRadius * 0.88,
          ]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.105, 0.31, 0.018]} />
          <LampMetalMaterial color="#282d31" ghost={ghost} metalness={0.7} roughness={0.45} />
        </mesh>

        {[0.11, 0.205].map((offset) => (
          <mesh
            key={offset}
            castShadow={!ghost}
            layers={layer}
            name="catalog-globe-capital-ring"
            position={[0, layout.height + offset, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[offset < 0.2 ? 0.15 : 0.2, 0.025, 8, 28]} />
            <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.7} roughness={0.39} />
          </mesh>
        ))}

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-decorative-capital"
          position={[0, layout.capitalCenterY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[dimensions.capitalRadius, dimensions.shaftTopRadius, dimensions.capitalHeight, 24]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.7} roughness={0.4} />
        </mesh>

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-globe-cast-fitter"
          position={[0, layout.fitterCenterY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[dimensions.fitterTopRadius, dimensions.fitterBottomRadius, dimensions.fitterHeight, 24]} />
          <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.72} roughness={0.38} />
        </mesh>
      </group>

      <group layers={layer} name="catalog-globe-acorn-refractor" position={[0, layout.globeBottomY, 0]}>
        <mesh
          castShadow={!ghost}
          geometry={refractorGeometry}
          layers={layer}
          name="catalog-globe-prismatic-lens"
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <meshStandardMaterial
            color={lightOn ? lightColor : '#c3cbc9'}
            depthWrite={!ghost}
            emissive={lightOn ? lightColor : '#000000'}
            emissiveIntensity={ghost ? 0.18 : lightOn ? 1.55 : 0}
            metalness={0.02}
            opacity={ghost ? 0.42 : lightOn ? 0.76 : 0.66}
            roughness={0.22}
            transparent
          />
        </mesh>

        <mesh
          layers={layer}
          name="catalog-globe-optical-core"
          position={[0, 0.245, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.062, 0.085, 0.34, 18]} />
          <meshStandardMaterial
            color={lightOn ? lightColor : '#8d9694'}
            depthWrite={!ghost}
            emissive={lightOn ? lightColor : '#000000'}
            emissiveIntensity={ghost ? 0.24 : lightOn ? 2.4 : 0}
            opacity={ghost ? 0.35 : lightOn ? 0.88 : 0.4}
            roughness={0.28}
            transparent
          />
        </mesh>

        {ribCurves.map((curve, index) => (
          <mesh
            key={index}
            layers={layer}
            name="catalog-globe-vertical-prism"
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <tubeGeometry args={[curve, 24, 0.0045, 5, false]} />
            <meshStandardMaterial
              color={lightOn ? '#fff2ce' : '#edf2ef'}
              depthWrite={false}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={lightOn ? 0.42 : 0}
              opacity={ghost ? 0.18 : 0.34}
              roughness={0.18}
              transparent
            />
          </mesh>
        ))}

        {GLOBE_POST_TOP_LIGHT_PRISM_LEVELS.map((y) => (
          <mesh
            key={y}
            layers={layer}
            name="catalog-globe-horizontal-prism"
            position={[0, y, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[globePostTopRadiusAt(y) + 0.004, 0.004, 5, 36]} />
            <meshStandardMaterial
              color={lightOn ? '#fff3d1' : '#edf2ef'}
              depthWrite={false}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={lightOn ? 0.35 : 0}
              opacity={ghost ? 0.18 : 0.32}
              roughness={0.2}
              transparent
            />
          </mesh>
        ))}
      </group>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-globe-finial"
        position={[0, layout.finialCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <sphereGeometry args={[dimensions.finialRadius, 16, 10]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.72} roughness={0.36} />
      </mesh>

      {!ghost && lightOn && intensity > 0 && (
        <pointLight
          color={lightColor}
          decay={2}
          distance={distance}
          intensity={intensity * 0.58}
          layers={layer}
          position={[0, layout.globeCenterY, 0]}
        />
      )}
    </group>
  )
}
