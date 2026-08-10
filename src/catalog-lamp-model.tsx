'use client'

import { useEffect, useMemo } from 'react'
import { Object3D } from 'three'
import { BollardLightModel } from './bollard-light-model'
import { CatenarySuspendedLightModel } from './catenary-suspended-light-model'
import { CanopySoffitLightModel } from './canopy-soffit-light-model'
import {
  resolveCatalogLampProjection,
  type CatalogLampNode,
  type CatalogLampProjection,
} from './catalog-lamp-config'
import { LampLensMaterial as LensMaterial, LampMetalMaterial as MetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'
import {
  buildShoeboxAreaLightArmGeometry,
  buildShoeboxAreaLightHousingGeometry,
  buildShoeboxAreaLightLensGeometry,
  SHOEBOX_AREA_LIGHT_HEAT_SINK_Z,
  SHOEBOX_AREA_LIGHT_OPTIC_CELL_X_OFFSETS,
  SHOEBOX_AREA_LIGHT_OPTIC_CELL_Z_OFFSETS,
  SHOEBOX_AREA_LIGHT_OPTIC_MODULE_CENTERS,
} from './shoebox-area-light-geometry'
import { FloodlightPoleModel } from './floodlight-pole-model'
import { GlobePostTopLightModel } from './globe-post-top-light-model'
import { HighMastCrownLightModel } from './high-mast-crown-light-model'
import { PathGardenLightModel } from './path-garden-light-model'
import { SolarStreetLightModel } from './solar-street-light-model'
import { DecorativeCandelabraLightModel } from './decorative-candelabra-light-model'
import { WallPackLightModel } from './wall-pack-light-model'
import { TunnelLuminaireModel } from './tunnel-luminaire-model'
import type {
  DecorativeCandelabraLightNode,
  CanopySoffitLightNode,
  HighMastCrownLightNode,
  TunnelLuminaireNode,
  TraditionalPostTopLanternNode,
  WallArmLightNode,
} from './schema'
import {
  TraditionalLanternHead,
  TraditionalPostTopLanternModel,
} from './traditional-post-top-lantern-model'
import { WallArmLightModel } from './wall-arm-light-model'

function ShoeboxFixtureHead({
  bodyColor,
  color,
  ghost,
  layer,
  lightColor,
  lightOn,
}: {
  bodyColor: string
  color: string
  ghost: boolean
  layer: number
  lightColor: string
  lightOn: boolean
}) {
  const housingGeometry = useMemo(() => buildShoeboxAreaLightHousingGeometry(), [])
  const lensGeometry = useMemo(() => buildShoeboxAreaLightLensGeometry(), [])

  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <>
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="catalog-shoebox-area-housing"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <MetalMaterial color={bodyColor || color} ghost={ghost} metalness={0.76} roughness={0.34} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-service-door"
        position={[-0.005, -0.048, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.19, 0.014, 0.18]} />
        <MetalMaterial color="#343b40" ghost={ghost} metalness={0.78} roughness={0.35} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-service-latch"
        position={[0.045, -0.059, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.013, 0.013, 0.009, 10]} />
        <MetalMaterial color="#15191c" ghost={ghost} metalness={0.88} roughness={0.24} />
      </mesh>
      <mesh
        geometry={lensGeometry}
        layers={layer}
        name="catalog-shoebox-optic-window"
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <LensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
      </mesh>
      {SHOEBOX_AREA_LIGHT_OPTIC_MODULE_CENTERS.map((x) => (
        <mesh
          key={`module:${x}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-shoebox-optic-module"
          position={[x, -0.072, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.166, 0.014, 0.258]} />
          <meshStandardMaterial
            color={lightOn ? '#eef4f5' : '#aeb9bf'}
            depthWrite={!ghost}
            emissive={lightOn ? lightColor : '#000000'}
            emissiveIntensity={ghost ? 0.12 : lightOn ? 0.5 : 0}
            metalness={0.05}
            opacity={ghost ? 0.5 : 0.96}
            roughness={0.18}
            transparent={ghost}
          />
        </mesh>
      ))}
      {SHOEBOX_AREA_LIGHT_OPTIC_MODULE_CENTERS.flatMap((moduleX) =>
        SHOEBOX_AREA_LIGHT_OPTIC_CELL_X_OFFSETS.flatMap((offsetX) =>
          SHOEBOX_AREA_LIGHT_OPTIC_CELL_Z_OFFSETS.map((z) => (
          <mesh
            key={`${moduleX}:${offsetX}:${z}`}
            layers={layer}
            name="catalog-shoebox-optic-cell"
            position={[moduleX + offsetX, -0.087, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.021, 0.026, 0.012, 16]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#e6ebed'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.24 : lightOn ? 3 : 0}
              metalness={0.02}
              opacity={ghost ? 0.56 : 0.98}
              roughness={0.1}
              transparent={ghost}
            />
          </mesh>
          )),
        ),
      )}
      {SHOEBOX_AREA_LIGHT_HEAT_SINK_Z.map((z) => (
        <mesh
          key={z}
          castShadow={!ghost}
          layers={layer}
          name="catalog-shoebox-heat-sink-fin"
          position={[0.42, 0.06, z]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.49, 0.024, 0.012]} />
          <MetalMaterial color="#2f363b" ghost={ghost} metalness={0.82} roughness={0.34} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-driver-cover"
        position={[0.015, 0.052, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.18, 0.026, 0.19]} />
        <MetalMaterial color="#41494f" ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-photocell"
        position={[0.015, 0.09, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.027, 0.031, 0.05, 16]} />
        <MetalMaterial color="#20262a" ghost={ghost} metalness={0.48} roughness={0.42} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-photocell-gasket"
        position={[0.015, 0.069, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.032, 0.006, 8, 18]} />
        <MetalMaterial color="#101315" ghost={ghost} metalness={0.3} roughness={0.55} />
      </mesh>
    </>
  )
}

function Fixture({
  projection,
  position,
  rotation = [0, 0, 0],
  color,
  lightColor,
  lightOn,
  ghost,
  layer,
  intensity,
  distance,
  bodyColor,
}: {
  projection: CatalogLampProjection
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  lightColor: string
  lightOn: boolean
  ghost: boolean
  layer: number
  intensity: number
  distance: number
  bodyColor?: string
}) {
  const lightTarget = useMemo(() => new Object3D(), [])
  const isLantern = projection === 'lantern' || projection === 'candelabra'
  const isFlood = projection === 'floodlight' || projection === 'shoebox'
  const fixtureBodyColor = bodyColor ?? color
  const boxSize: [number, number, number] = projection === 'shoebox'
    ? [1.25, 0.36, 0.72]
    : [0.82, 0.32, 0.52]

  return (
    <group layers={layer} position={position} rotation={rotation}>
      {isLantern ? (
        <TraditionalLanternHead
          color={color}
          ghost={ghost}
          layer={layer}
          lightColor={lightColor}
          lightOn={lightOn}
        />
      ) : projection === 'shoebox' ? (
        <ShoeboxFixtureHead
          bodyColor={fixtureBodyColor}
          color={color}
          ghost={ghost}
          layer={layer}
          lightColor={lightColor}
          lightOn={lightOn}
        />
      ) : (
        <>
          <mesh castShadow={!ghost} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
            <boxGeometry args={boxSize} />
            <MetalMaterial color={color} ghost={ghost} />
          </mesh>
          <mesh layers={layer} position={[0, -boxSize[1] / 2 - 0.015, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <boxGeometry args={[boxSize[0] * 0.76, 0.04, boxSize[2] * 0.72]} />
            <LensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
          </mesh>
        </>
      )}
      {!ghost && lightOn && intensity > 0 && projection !== 'wall-pack' && (
        <>
          <primitive layers={layer} object={lightTarget} position={[projection === 'shoebox' ? 0.4 : 0, -0.8, 0]} />
          <spotLight
            angle={isFlood ? Math.PI * 0.28 : Math.PI * 0.34}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={intensity}
            layers={layer}
            penumbra={0.55}
            position={[projection === 'shoebox' ? 0.4 : 0, isLantern ? 0.5 : -0.16, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}

function Pole({
  height,
  color,
  ghost,
  layer,
  radius = 0.1,
  position = [0, 0, 0],
}: {
  height: number
  color: string
  ghost: boolean
  layer: number
  radius?: number
  position?: [number, number, number]
}) {
  return (
    <group layers={layer} name="catalog-lamp-pole" position={position}>
      <mesh castShadow={!ghost} layers={layer} position={[0, height / 2, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[radius * 0.82, radius, height, 20]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, 0.04, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[radius * 1.9, radius * 2.1, 0.08, 20]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
    </group>
  )
}

function AreaPole({ height, color, ghost, layer }: { height: number; color: string; ghost: boolean; layer: number }) {
  const boltOffsets = [-0.16, 0.16] as const
  return (
    <group layers={layer} name="catalog-shoebox-square-pole">
      <mesh
        castShadow={!ghost}
        layers={layer}
        position={[0, height / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, Math.PI / 4, 0]}
      >
        <cylinderGeometry args={[0.105, 0.155, height, 4]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.36} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-base-plate"
        position={[0, 0.045, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <boxGeometry args={[0.46, 0.09, 0.46]} />
        <MetalMaterial color="#30373c" ghost={ghost} metalness={0.84} roughness={0.34} />
      </mesh>
      {boltOffsets.flatMap((x) =>
        boltOffsets.map((z) => (
          <group key={`${x}:${z}`} layers={layer} position={[x, 0.105, z]}>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-shoebox-anchor-washer"
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.043, 0.043, 0.012, 16]} />
              <MetalMaterial color="#6d757b" ghost={ghost} metalness={0.9} roughness={0.24} />
            </mesh>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-shoebox-anchor-nut"
              position={[0, 0.026, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.031, 0.031, 0.04, 6]} />
              <MetalMaterial color="#22282c" ghost={ghost} metalness={0.88} roughness={0.27} />
            </mesh>
          </group>
        )),
      )}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-access-door"
        position={[0, Math.min(1.05, height * 0.23), 0.137]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.14, 0.42, 0.018]} />
        <MetalMaterial color="#3b4348" ghost={ghost} metalness={0.78} roughness={0.38} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-access-door-lock"
        position={[0.035, Math.min(1.05, height * 0.23), 0.151]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.013, 0.013, 0.012, 10]} />
        <MetalMaterial color="#171b1e" ghost={ghost} metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-pole-top-collar"
        position={[0, height - 0.02, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.23, 0.2, 0.23]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.32} />
      </mesh>
    </group>
  )
}

function AreaPoleArm({
  color,
  ghost,
  layer,
  length,
  y,
}: {
  color: string
  ghost: boolean
  layer: number
  length: number
  y: number
}) {
  const span = Math.max(0.35, length)
  const armGeometry = useMemo(() => buildShoeboxAreaLightArmGeometry(span), [span])
  const braceEndX = Math.min(span * 0.68, 0.46)
  const braceStart: [number, number] = [0.07, y - 0.15]
  const braceEnd: [number, number] = [braceEndX, y - 0.045]
  const braceLength = Math.hypot(braceEnd[0] - braceStart[0], braceEnd[1] - braceStart[1])
  const braceAngle = Math.atan2(braceEnd[1] - braceStart[1], braceEnd[0] - braceStart[0])

  useEffect(() => () => armGeometry.dispose(), [armGeometry])

  return (
    <group layers={layer} name="catalog-shoebox-integrated-arm">
      <mesh
        castShadow={!ghost}
        geometry={armGeometry}
        layers={layer}
        name="catalog-shoebox-tapered-arm"
        position={[0, y, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.32} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-arm-mount"
        position={[0.07, y - 0.055, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.15, 0.22, 0.245]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.32} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-arm-lower-brace"
        position={[(braceStart[0] + braceEnd[0]) / 2, (braceStart[1] + braceEnd[1]) / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, braceAngle]}
      >
        <boxGeometry args={[braceLength, 0.05, 0.075]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-shoebox-head-adapter"
        position={[span, y, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.18, 0.13, 0.19]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.3} />
      </mesh>
    </group>
  )
}

function Arm({ length, y, color, ghost, layer, angle = 0 }: { length: number; y: number; color: string; ghost: boolean; layer: number; angle?: number }) {
  return (
    <mesh castShadow={!ghost} layers={layer} position={[Math.cos(angle) * length / 2, y, Math.sin(angle) * length / 2]} rotation={[0, 0, -Math.PI / 2]} raycast={ghost ? NO_RAYCAST : undefined}>
      <cylinderGeometry args={[0.065, 0.08, length, 16]} />
      <MetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

export function CatalogLampModel({ node, ghost = false, layer = 0 }: { node: CatalogLampNode; ghost?: boolean; layer?: number }) {
  const projection = resolveCatalogLampProjection(node.type as string, node.visualStyle) ?? 'shoebox'
  const height = node.height ?? 4
  const armLength = node.armLength ?? 1
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const fixtureY = Math.max(0.25, height - 0.5)
  const distance = Math.max(8, height * 2.3)

  if (projection === 'lantern' && node.type === 'streetscape:traditional-post-top-lantern') {
    return (
      <TraditionalPostTopLanternModel
        distance={distance}
        ghost={ghost}
        layer={layer}
        node={node as TraditionalPostTopLanternNode}
      />
    )
  }

  if (projection === 'wall-pack') {
    return (
      <WallPackLightModel
        depth={armLength}
        distance={distance}
        ghost={ghost}
        intensity={node.intensity ?? 700}
        layer={layer}
        lightColor={lightColor}
        lightOn={lightOn}
        poleColor={poleColor}
      />
    )
  }

  if (projection === 'catenary') {
    return (
      <CatenarySuspendedLightModel
        distance={distance}
        ghost={ghost}
        layer={layer}
        node={node}
      />
    )
  }

  if (projection === 'canopy') {
    return <CanopySoffitLightModel ghost={ghost} layer={layer} node={node as CanopySoffitLightNode} />
  }

  if (projection === 'tunnel') {
    return (
      <TunnelLuminaireModel
        ghost={ghost}
        layer={layer}
        node={node as TunnelLuminaireNode}
      />
    )
  }

  if (projection === 'wall-arm') {
    return (
      <WallArmLightModel
        distance={distance}
        ghost={ghost}
        layer={layer}
        node={node as WallArmLightNode}
      />
    )
  }

  if (projection === 'globe') {
    return (
      <GlobePostTopLightModel
        distance={distance}
        ghost={ghost}
        height={height}
        intensity={node.intensity ?? 520}
        layer={layer}
        lightColor={lightColor}
        lightOn={lightOn}
        poleColor={poleColor}
      />
    )
  }

  if (projection === 'path') {
    return (
      <PathGardenLightModel
        headSpan={armLength}
        ghost={ghost}
        height={height}
        intensity={node.intensity ?? 240}
        layer={layer}
        lightColor={lightColor}
        lightOn={lightOn}
        poleColor={poleColor}
      />
    )
  }

  if (projection === 'bollard') {
    return <BollardLightModel ghost={ghost} layer={layer} node={node} />
  }

  if (projection === 'shoebox') {
    const headY = height + 0.02
    return (
      <group layers={layer} name="catalog-shoebox-area-light">
        <AreaPole color={poleColor} ghost={ghost} height={height} layer={layer} />
        <group layers={layer} name="catalog-shoebox-area-side">
          <AreaPoleArm color={poleColor} ghost={ghost} layer={layer} length={armLength} y={headY} />
          <Fixture
            bodyColor={poleColor}
            color={poleColor}
            distance={distance}
            ghost={ghost}
            intensity={node.intensity ?? 2200}
            layer={layer}
            lightColor={lightColor}
            lightOn={lightOn}
            position={[armLength, headY, 0]}
            projection="shoebox"
          />
        </group>
      </group>
    )
  }

  if (projection === 'floodlight') {
    return (
      <FloodlightPoleModel
        armLength={armLength}
        distance={distance}
        ghost={ghost}
        height={height}
        intensity={node.intensity ?? 2800}
        layer={layer}
        lightColor={lightColor}
        lightOn={lightOn}
        poleColor={poleColor}
      />
    )
  }

  if (projection === 'high-mast') {
    return (
      <HighMastCrownLightModel
        ghost={ghost}
        layer={layer}
        node={node as HighMastCrownLightNode}
      />
    )
  }

  if (projection === 'candelabra') {
    return (
      <DecorativeCandelabraLightModel
        ghost={ghost}
        layer={layer}
        node={node as DecorativeCandelabraLightNode}
      />
    )
  }

  if (projection === 'solar') {
    return (
      <SolarStreetLightModel
        armLength={armLength}
        distance={distance}
        ghost={ghost}
        height={height}
        intensity={node.intensity ?? 1000}
        layer={layer}
        lightColor={lightColor}
        lightOn={lightOn}
        poleColor={poleColor}
      />
    )
  }

  // Default single-arm fixture covers the remaining roadway-style heads.
  return (
    <group layers={layer}>
      <Pole color={poleColor} ghost={ghost} height={height} layer={layer} radius={0.11} />
      <Arm color={poleColor} ghost={ghost} layer={layer} length={armLength} y={fixtureY} />
      <Fixture projection={projection} position={[armLength, fixtureY, 0]} color={poleColor} lightColor={lightColor} lightOn={lightOn} ghost={ghost} layer={layer} intensity={node.intensity ?? 1200} distance={distance} />
    </group>
  )
}
