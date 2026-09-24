'use client'

import { useMemo } from 'react'
import {
  BOLLARD_LIGHT_DIMENSIONS,
  resolveBollardLightLayout,
} from './bollard-light-geometry'
import type { CatalogLampNode } from './catalog-lamp-config'
import {
  LampLensMaterial,
  LampMetalMaterial,
  NO_RAYCAST,
} from './roadway-lamp-primitives'

const OPTIC_SUPPORT_ANGLES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5] as const
const ANCHOR_POSITIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

type BollardLightModelProps = {
  ghost?: boolean
  layer?: number
  node: Pick<CatalogLampNode, 'height' | 'intensity' | 'lightColor' | 'lightOn' | 'poleColor'>
}

export function BollardLightModel({
  ghost = false,
  layer = 0,
  node,
}: BollardLightModelProps) {
  const layout = useMemo(() => resolveBollardLightLayout(node.height ?? 0.72), [node.height])
  const bodyColor = node.poleColor ?? '#30363a'
  const lightColor = node.lightColor ?? '#ffe2b8'
  const lightOn = node.lightOn ?? false
  const serviceDoorY = BOLLARD_LIGHT_DIMENSIONS.basePlateHeight + layout.shaftHeight * 0.46

  return (
    <group layers={layer} name="catalog-bollard-light">
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-bollard-base-plate"
        position={[0, BOLLARD_LIGHT_DIMENSIONS.basePlateHeight / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            BOLLARD_LIGHT_DIMENSIONS.basePlateRadius * 0.92,
            BOLLARD_LIGHT_DIMENSIONS.basePlateRadius,
            BOLLARD_LIGHT_DIMENSIONS.basePlateHeight,
            32,
          ]}
        />
        <LampMetalMaterial color="#24292d" ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>

      {ANCHOR_POSITIONS.map(([xSign, zSign]) => (
        <mesh
          key={`${xSign}:${zSign}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-bollard-anchor-bolt"
          position={[
            xSign * BOLLARD_LIGHT_DIMENSIONS.anchorOffset / Math.SQRT2,
            BOLLARD_LIGHT_DIMENSIONS.basePlateHeight + 0.009,
            zSign * BOLLARD_LIGHT_DIMENSIONS.anchorOffset / Math.SQRT2,
          ]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry
            args={[
              BOLLARD_LIGHT_DIMENSIONS.anchorRadius,
              BOLLARD_LIGHT_DIMENSIONS.anchorRadius,
              0.018,
              10,
            ]}
          />
          <LampMetalMaterial color="#747d82" ghost={ghost} metalness={0.9} roughness={0.22} />
        </mesh>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-bollard-tapered-body"
        position={[0, layout.shaftCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry
          args={[
            BOLLARD_LIGHT_DIMENSIONS.shaftTopRadius,
            BOLLARD_LIGHT_DIMENSIONS.shaftBottomRadius,
            layout.shaftHeight,
            32,
          ]}
        />
        <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.72} roughness={0.4} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-bollard-base-collar"
        position={[0, BOLLARD_LIGHT_DIMENSIONS.basePlateHeight + 0.025, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[BOLLARD_LIGHT_DIMENSIONS.shaftBottomRadius, 0.008, 8, 32]} />
        <LampMetalMaterial color="#1e2326" ghost={ghost} metalness={0.78} roughness={0.34} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-bollard-service-door"
        position={[BOLLARD_LIGHT_DIMENSIONS.shaftBottomRadius + 0.001, serviceDoorY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry
          args={[
            0.008,
            Math.min(BOLLARD_LIGHT_DIMENSIONS.serviceDoorHeight, layout.shaftHeight * 0.48),
            BOLLARD_LIGHT_DIMENSIONS.serviceDoorWidth,
          ]}
        />
        <LampMetalMaterial color="#252b2f" ghost={ghost} metalness={0.75} roughness={0.42} />
      </mesh>

      {[-1, 1].map((ySign) => (
        <mesh
          key={ySign}
          castShadow={!ghost}
          layers={layer}
          name="catalog-bollard-service-fastener"
          position={[
            BOLLARD_LIGHT_DIMENSIONS.shaftBottomRadius + 0.008,
            serviceDoorY + ySign * Math.min(0.07, layout.shaftHeight * 0.16),
            0,
          ]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.008, 0.008, 0.008, 10]} />
          <LampMetalMaterial color="#8b9499" ghost={ghost} metalness={0.92} roughness={0.2} />
        </mesh>
      ))}

      <mesh
        layers={layer}
        name="catalog-bollard-optic-diffuser"
        position={[0, layout.opticCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry
          args={[
            BOLLARD_LIGHT_DIMENSIONS.opticRadius,
            BOLLARD_LIGHT_DIMENSIONS.opticRadius,
            BOLLARD_LIGHT_DIMENSIONS.opticHeight,
            32,
            1,
            true,
          ]}
        />
        <LampLensMaterial
          color={lightColor}
          emissiveIntensity={lightOn ? 1.15 : 0}
          ghost={ghost}
          lightOn={lightOn}
        />
      </mesh>

      <mesh
        layers={layer}
        name="catalog-bollard-led-core"
        position={[0, layout.opticCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry
          args={[
            BOLLARD_LIGHT_DIMENSIONS.emitterRadius,
            BOLLARD_LIGHT_DIMENSIONS.emitterRadius,
            BOLLARD_LIGHT_DIMENSIONS.opticHeight * 0.72,
            20,
          ]}
        />
        <meshStandardMaterial
          color={lightOn ? '#fff9e9' : '#aab2b6'}
          depthWrite={!ghost}
          emissive={lightOn ? lightColor : '#000000'}
          emissiveIntensity={ghost ? 0.25 : lightOn ? 2.8 : 0}
          opacity={ghost ? 0.5 : 0.96}
          roughness={0.14}
          transparent={ghost}
        />
      </mesh>

      {OPTIC_SUPPORT_ANGLES.map((angle) => (
        <mesh
          key={angle}
          castShadow={!ghost}
          layers={layer}
          name="catalog-bollard-optic-support"
          position={[
            Math.cos(angle) * BOLLARD_LIGHT_DIMENSIONS.opticRadius * 0.86,
            layout.opticCenterY,
            Math.sin(angle) * BOLLARD_LIGHT_DIMENSIONS.opticRadius * 0.86,
          ]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.006, 0.006, BOLLARD_LIGHT_DIMENSIONS.opticHeight, 8]} />
          <LampMetalMaterial color="#22282c" ghost={ghost} metalness={0.76} roughness={0.36} />
        </mesh>
      ))}

      {layout.louverY.map((y, index) => (
        <mesh
          key={y}
          castShadow={!ghost}
          layers={layer}
          name="catalog-bollard-glare-louvre"
          position={[0, y, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry
            args={[
              BOLLARD_LIGHT_DIMENSIONS.louverRadius,
              BOLLARD_LIGHT_DIMENSIONS.louverRadius * 0.98,
              BOLLARD_LIGHT_DIMENSIONS.louverThickness,
              32,
            ]}
          />
          <LampMetalMaterial
            color={index === 1 ? '#30383d' : bodyColor}
            ghost={ghost}
            metalness={0.76}
            roughness={0.38}
          />
        </mesh>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-bollard-cap"
        position={[0, layout.capCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry
          args={[
            BOLLARD_LIGHT_DIMENSIONS.capRadius * 0.94,
            BOLLARD_LIGHT_DIMENSIONS.capRadius,
            BOLLARD_LIGHT_DIMENSIONS.capHeight,
            32,
          ]}
        />
        <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.76} roughness={0.34} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-bollard-cap-reveal"
        position={[0, layout.height - BOLLARD_LIGHT_DIMENSIONS.capHeight + 0.002, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[BOLLARD_LIGHT_DIMENSIONS.opticRadius, 0.007, 8, 32]} />
        <LampMetalMaterial color="#171b1e" ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>

      {!ghost && lightOn && (node.intensity ?? 180) > 0 && (
        <pointLight
          color={lightColor}
          decay={2}
          distance={Math.max(3.5, layout.height * 5)}
          intensity={(node.intensity ?? 180) * 0.42}
          layers={layer}
          name="catalog-bollard-ground-light"
          position={[0, layout.opticCenterY, 0]}
        />
      )}
    </group>
  )
}
