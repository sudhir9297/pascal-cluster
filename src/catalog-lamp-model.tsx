'use client'

import { useEffect, useMemo } from 'react'
import { Object3D, QuadraticBezierCurve3, Vector3 } from 'three'
import {
  resolveCatalogLampProjection,
  type CatalogLampNode,
  type CatalogLampProjection,
} from './catalog-lamp-config'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
  type CobraHeadLightLayout,
} from './cobra-head-light-geometry'
import { LampLensMaterial as LensMaterial, LampMetalMaterial as MetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'
import { RoadwayHead } from './roadway-lamp-primitives'
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
import { HighMastCrownLightModel } from './high-mast-crown-light-model'
import { SolarStreetLightModel } from './solar-street-light-model'
import type { HighMastCrownLightNode } from './schema'

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
  length,
}: {
  projection: CatalogLampProjection | 'suspended'
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
  length?: number
}) {
  const lightTarget = useMemo(() => new Object3D(), [])
  const isGlobe = projection === 'globe'
  const isLantern = projection === 'lantern' || projection === 'candelabra'
  const isCanopy = projection === 'canopy'
  const isFlood = projection === 'floodlight' || projection === 'shoebox' || projection === 'tunnel' || isCanopy
  const isSuspended = projection === 'suspended'
  const fixtureBodyColor = bodyColor ?? color
  const tunnelLength = Math.max(1.4, length ?? 2.2)
  const suspendedTrimRails: Array<[number, number, number, number, number, number]> = [
    [0, -0.235, -0.27, 1.18, 0.045, 0.045],
    [0, -0.235, 0.27, 1.18, 0.045, 0.045],
    [-0.59, -0.235, 0, 0.045, 0.045, 0.5],
    [0.59, -0.235, 0, 0.045, 0.045, 0.5],
  ]
  const boxSize: [number, number, number] = projection === 'tunnel'
    ? [tunnelLength, 0.22, 0.42]
    : projection === 'shoebox'
      ? [1.25, 0.36, 0.72]
      : [0.82, 0.32, 0.52]

  return (
    <group layers={layer} position={position} rotation={rotation}>
      {isGlobe ? (
        <>
          <mesh castShadow={!ghost} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
            <sphereGeometry args={[0.28, 20, 14]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#8b9094'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.2 : lightOn ? 1.8 : 0}
              opacity={ghost ? 0.55 : 0.9}
              roughness={0.2}
              transparent
            />
          </mesh>
          <mesh layers={layer} position={[0, -0.3, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.09, 0.13, 0.12, 16]} />
            <MetalMaterial color={color} ghost={ghost} />
          </mesh>
        </>
      ) : isLantern ? (
        <>
          <mesh castShadow={!ghost} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.22, 0.28, 0.56, 8]} />
            <LensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} position={[0, 0.36, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <coneGeometry args={[0.38, 0.26, 8]} />
            <MetalMaterial color={color} ghost={ghost} />
          </mesh>
          <mesh layers={layer} position={[0, -0.36, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <coneGeometry args={[0.24, 0.1, 8]} />
            <MetalMaterial color={color} ghost={ghost} />
          </mesh>
        </>
      ) : projection === 'path' ? (
        <>
          <mesh castShadow={!ghost} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.13, 0.16, 0.16, 16]} />
            <LensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} position={[0, 0.12, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <coneGeometry args={[0.23, 0.12, 20]} />
            <MetalMaterial color={color} ghost={ghost} />
          </mesh>
        </>
      ) : projection === 'bollard' ? (
        <>
          <mesh castShadow={!ghost} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.15, 0.19, 0.7, 20]} />
            <MetalMaterial color={color} ghost={ghost} />
          </mesh>
          <mesh layers={layer} position={[0, 0.29, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 20]} />
            <LensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
          </mesh>
        </>
      ) : projection === 'shoebox' ? (
        <ShoeboxFixtureHead
          bodyColor={fixtureBodyColor}
          color={color}
          ghost={ghost}
          layer={layer}
          lightColor={lightColor}
          lightOn={lightOn}
        />
      ) : projection === 'wall-pack' ? (
        <>
          {/* Compact bulkhead housing: a shallow shell, raised lid, and a
              recessed diffuser make this read as a direct-mount wall light,
              rather than a generic roadway shoebox. */}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-pack-housing"
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[0.95, 0.44, 0.34]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} metalness={0.76} roughness={0.3} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-pack-top-lid"
            position={[0, 0.25, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[0.88, 0.08, 0.3]} />
            <MetalMaterial color="#616b73" ghost={ghost} metalness={0.8} roughness={0.27} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-pack-face"
            position={[0, -0.01, 0.18]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[0.82, 0.29, 0.04]} />
            <MetalMaterial color="#69747c" ghost={ghost} metalness={0.6} roughness={0.26} />
          </mesh>
          <mesh
            layers={layer}
            name="catalog-wall-pack-diffuser"
            position={[0, -0.06, 0.205]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[0.66, 0.17, 0.025]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#b8c1c6'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.25 : lightOn ? 2.2 : 0}
              opacity={ghost ? 0.58 : 0.95}
              roughness={0.2}
              transparent
            />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-pack-neck"
            position={[0, -0.19, -0.16]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[0.24, 0.14, 0.18]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} metalness={0.82} roughness={0.28} />
          </mesh>
        </>
      ) : projection === 'tunnel' ? (
        <>
          {/* A tunnel luminaire is a compact linear body with a recessed
              reflector. The proud diffuser remains visible when the light is
              off, while the metal rails make the underside read from below. */}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-housing"
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[tunnelLength, 0.28, 0.62]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} metalness={0.78} roughness={0.31} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-top-panel"
            position={[0, 0.18, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[tunnelLength * 0.72, 0.08, 0.48]} />
            <MetalMaterial color="#626d76" ghost={ghost} metalness={0.82} roughness={0.27} />
          </mesh>
          {[-1, 1].map((direction) => (
            <mesh
              key={direction}
              castShadow={!ghost}
              layers={layer}
              name="catalog-tunnel-end-cap"
              position={[direction * (tunnelLength / 2 - 0.06), 0, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry args={[0.1, 0.25, 0.66]} />
              <MetalMaterial color="#626d76" ghost={ghost} metalness={0.84} roughness={0.28} />
            </mesh>
          ))}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-reflector"
            position={[0, -0.18, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[tunnelLength - 0.16, 0.09, 0.54]} />
            <MetalMaterial color="#8f9aa3" ghost={ghost} metalness={0.58} roughness={0.24} />
          </mesh>
          <mesh
            layers={layer}
            name="catalog-tunnel-diffuser"
            position={[0, -0.24, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[Math.max(1.1, tunnelLength - 0.42), 0.035, 0.36]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#c0cad1'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.3 : lightOn ? 2.2 : 0}
              opacity={ghost ? 0.56 : 0.96}
              roughness={0.2}
              transparent
            />
          </mesh>
          {([
            [0, -0.215, -0.255, tunnelLength - 0.28, 0.045, 0.045],
            [0, -0.215, 0.255, tunnelLength - 0.28, 0.045, 0.045],
            [-(tunnelLength / 2 - 0.17), -0.215, 0, 0.045, 0.045, 0.48],
            [tunnelLength / 2 - 0.17, -0.215, 0, 0.045, 0.045, 0.48],
          ] as Array<[number, number, number, number, number, number]>).map(([x, y, z, sx, sy, sz], index) => (
            <mesh
              key={index}
              castShadow={!ghost}
              layers={layer}
              name="catalog-tunnel-trim"
              position={[x, y, z]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry args={[sx, sy, sz]} />
              <MetalMaterial color="#626d76" ghost={ghost} metalness={0.76} roughness={0.27} />
            </mesh>
          ))}
          {[-0.32, 0.32].map((x) => (
            <mesh
              key={x}
              castShadow={!ghost}
              layers={layer}
              name="catalog-tunnel-mount"
              position={[x, 0.23, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.055, 0.055, 0.08, 12]} />
              <MetalMaterial color="#343a40" ghost={ghost} metalness={0.86} roughness={0.24} />
            </mesh>
          ))}
        </>
      ) : projection === 'canopy' ? (
        <>
          {/* A canopy/soffit fixture uses a shallow architectural housing with
              a recessed, broad downlight.  Each underside layer is separated
              in Y so the lens remains stable in the editor (no z-fighting). */}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-canopy-housing"
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[Math.max(0.9, (length ?? 1) * 1.1), 0.34, 1.02]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} metalness={0.72} roughness={0.34} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-canopy-top-plate"
            position={[0, 0.22, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[Math.max(0.76, (length ?? 1) * 0.9), 0.08, 0.84]} />
            <MetalMaterial color="#69747b" ghost={ghost} metalness={0.82} roughness={0.28} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-canopy-recess"
            position={[0, -0.19, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[Math.max(0.7, (length ?? 1) * 0.82), 0.055, 0.78]} />
            <MetalMaterial color="#242b30" ghost={ghost} metalness={0.46} roughness={0.4} />
          </mesh>
          <mesh
            layers={layer}
            name="catalog-canopy-diffuser"
            position={[0, -0.235, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[Math.max(0.58, (length ?? 1) * 0.7), 0.035, 0.58]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#c7d0d4'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.3 : lightOn ? 2.4 : 0}
              opacity={ghost ? 0.56 : 0.96}
              roughness={0.2}
              transparent
            />
          </mesh>
          {([
            [0, -0.205, -0.39, Math.max(0.72, (length ?? 1) * 0.84), 0.055, 0.055],
            [0, -0.205, 0.39, Math.max(0.72, (length ?? 1) * 0.84), 0.055, 0.055],
            [-(Math.max(0.72, (length ?? 1) * 0.84) / 2), -0.205, 0, 0.055, 0.055, 0.84],
            [Math.max(0.72, (length ?? 1) * 0.84) / 2, -0.205, 0, 0.055, 0.055, 0.84],
          ] as Array<[number, number, number, number, number, number]>).map(([x, y, z, sx, sy, sz], index) => (
            <mesh
              key={index}
              castShadow={!ghost}
              layers={layer}
              name="catalog-canopy-trim"
              position={[x, y, z]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry args={[sx, sy, sz]} />
              <MetalMaterial color="#5c6870" ghost={ghost} metalness={0.76} roughness={0.3} />
            </mesh>
          ))}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-canopy-mount"
            position={[0, 0.27, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} metalness={0.84} roughness={0.28} />
          </mesh>
        </>
      ) : isSuspended ? (
        <>
          {/* A linear pendant has a shallow shell, a lower reflector, and a
              proud diffuser. Keeping those layers separate makes the light
              read as a real luminaire even when it is switched off. */}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-suspended-housing"
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[1.5, 0.32, 0.68]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-suspended-top-panel"
            position={[0, 0.2, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[1.1, 0.08, 0.5]} />
            <MetalMaterial color="#626d76" ghost={ghost} metalness={0.68} roughness={0.3} />
          </mesh>
          {[-0.77, 0.77].map((x) => (
            <mesh
              key={x}
              castShadow={!ghost}
              layers={layer}
              name="catalog-suspended-end-cap"
              position={[x, 0, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry args={[0.08, 0.27, 0.72]} />
              <MetalMaterial color="#626d76" ghost={ghost} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-suspended-reflector"
            position={[0, -0.19, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[1.28, 0.1, 0.58]} />
            <MetalMaterial color="#818c94" ghost={ghost} metalness={0.55} roughness={0.26} />
          </mesh>
          <mesh
            layers={layer}
            name="catalog-suspended-diffuser"
            position={[0, -0.255, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[1.08, 0.035, 0.4]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#b2bbc1'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.3 : lightOn ? 2.6 : 0}
              opacity={ghost ? 0.58 : 0.96}
              roughness={0.22}
              transparent
            />
          </mesh>
          {/* Raised perimeter rails keep the diffuser visibly recessed in the
              reflector instead of appearing as a flat block. */}
          {suspendedTrimRails.map(([x, y, z, sx, sy, sz], index) => (
            <mesh
              key={index}
              castShadow={!ghost}
              layers={layer}
              name="catalog-suspended-trim"
              position={[x, y, z]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry args={[sx, sy, sz]} />
              <MetalMaterial color="#626d76" ghost={ghost} metalness={0.72} roughness={0.28} />
            </mesh>
          ))}
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-suspended-mount"
            position={[0, 0.25, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.1, 0.1, 0.1, 16]} />
            <MetalMaterial color={fixtureBodyColor} ghost={ghost} />
          </mesh>
        </>
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
      {!ghost && lightOn && intensity > 0 && !isGlobe && projection !== 'wall-pack' && (
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
            position={[projection === 'shoebox' ? 0.4 : 0, -0.16, 0]}
            target={lightTarget}
          />
        </>
      )}
      {!ghost && lightOn && intensity > 0 && isGlobe && (
        <pointLight color={lightColor} decay={2} distance={distance} intensity={intensity * 0.45} layers={layer} />
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

function CatenaryCable({
  color,
  ghost,
  height,
  layer,
  sag,
  span,
}: {
  color: string
  ghost: boolean
  height: number
  layer: number
  sag: number
  span: number
}) {
  const curve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(-span / 2, height, 0),
        new Vector3(0, height - sag, 0),
        new Vector3(span / 2, height, 0),
      ),
    [height, sag, span],
  )

  return (
    <mesh
      castShadow={!ghost}
      layers={layer}
      name="catalog-catenary-span"
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
    >
      <tubeGeometry args={[curve, 32, 0.035, 8, false]} />
      <MetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

function SuspendedHanger({
  color,
  fixtureY,
  ghost,
  height,
  layer,
  sag,
  fixtureTopOffset = 0.18,
}: {
  color: string
  fixtureY: number
  ghost: boolean
  height: number
  layer: number
  sag: number
  fixtureTopOffset?: number
}) {
  // The midpoint is shared with CatenaryCable: a quadratic curve's midpoint is
  // halfway between the endpoint height and the control-point height. Keep the
  // upper connector deliberately oversized so it still reads as attached when
  // viewed from an oblique angle (and not as a rod floating just below the wire).
  const fixtureTopY = fixtureY + fixtureTopOffset - 0.06
  const cableCenterY = height - sag / 2
  const cableAttachY = cableCenterY + 0.12
  const hangerLength = Math.max(0.2, cableAttachY - fixtureTopY)
  return (
    <>
      <mesh
        castShadow={!ghost}
        layers={layer}
        position={[0, fixtureTopY + hangerLength / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.045, 0.045, hangerLength, 12]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        position={[0, fixtureTopY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.08, 16]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, fixtureTopY, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <boxGeometry args={[0.78, 0.06, 0.14]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
      {/* A short horizontal sleeve physically straddles the cable and the rod. */}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-cable-clamp"
        position={[0, cableCenterY, 0]}
        rotation={[0, 0, Math.PI / 2]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.075, 0.075, 0.18, 12]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} position={[0, cableCenterY + 0.02, 0]} rotation={[0, Math.PI / 2, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <torusGeometry args={[0.07, 0.018, 8, 16]} />
        <MetalMaterial color={color} ghost={ghost} />
      </mesh>
    </>
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

/**
 * A wall-arm outreach bracket is a shallow curved tube rather than a straight
 * rod.  The lower diagonal brace and collars make the attachment read clearly
 * at small thumbnail sizes, while keeping the arm parameter-driven.
 */
function WallArmBracket({ length, y, color, ghost, layer }: { length: number; y: number; color: string; ghost: boolean; layer: number }) {
  const span = Math.max(0.5, length)
  const curve = useMemo(
    () =>
      new QuadraticBezierCurve3(
        new Vector3(0.11, y - 0.08, 0),
        new Vector3(span * 0.44, y + 0.24, 0),
        new Vector3(span, y + 0.1, 0),
      ),
    [span, y],
  )
  const braceEndX = span * 0.58
  const braceStartY = y - 0.38
  const braceEndY = y + 0.02
  const braceDx = braceEndX - 0.11
  const braceDy = braceEndY - braceStartY
  const braceLength = Math.sqrt(braceDx * braceDx + braceDy * braceDy)

  return (
    <>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-arm-curved-bracket"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[curve, 24, 0.07, 12, false]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-arm-support-brace"
        position={[(0.11 + braceEndX) / 2, (braceStartY + braceEndY) / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, Math.atan2(braceDx, braceDy)]}
      >
        <cylinderGeometry args={[0.045, 0.05, braceLength, 14]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.75} roughness={0.32} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-arm-base-collar"
        position={[0.11, y - 0.08, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.11, 0.11, 0.16, 16]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-wall-arm-head-collar"
        position={[span, y + 0.1, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.16, 16]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.28} />
      </mesh>
    </>
  )
}

function WallArmHead({
  position,
  rotation,
  color,
  lightColor,
  lightOn,
  ghost,
  layer,
  intensity,
  distance,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
  lightColor: string
  lightOn: boolean
  ghost: boolean
  layer: number
  intensity: number
  distance: number
}) {
  const lightTarget = useMemo(() => new Object3D(), [])
  const layout = useMemo<CobraHeadLightLayout>(
    () => ({
      height: 0,
      armLength: 0.06,
      poleRadius: 0.06,
      armRadius: 0.05,
      poleTopY: 0,
      armY: 0,
      socketLength: 0.18,
      socketRadius: 0.07,
      fixtureStartX: 0.16,
      fixtureLength: 0.98,
      fixtureWidth: 0.48,
      fixtureTopY: 0.16,
    }),
    [],
  )
  const housingGeometry = useMemo(() => buildCobraHeadHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildCobraHeadLensGeometry(layout), [layout])
  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <group layers={layer} name="catalog-wall-arm-head" position={position} rotation={rotation}>
      <RoadwayHead
        angle={0.32}
        color={color}
        distance={distance}
        fixtureGeometry={housingGeometry}
        ghost={ghost}
        includeArm={false}
        intensity={intensity}
        layer={layer}
        lensGeometry={lensGeometry}
        lightColor={lightColor}
        lightOn={lightOn}
        lightTarget={lightTarget}
        layout={layout}
      />
    </group>
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
  const isWall = projection === 'wall-arm' || projection === 'wall-pack'
  const isOverhead = projection === 'catenary' || projection === 'tunnel' || projection === 'canopy'
  const distance = Math.max(8, height * 2.3)

  if (projection === 'catenary') {
    const span = armLength
    const halfSpan = span / 2
    const cableSag = Math.min(0.7, Math.max(0.38, span * 0.1))
    const fixtureY = Math.max(0.08, height - 1.2)
    return (
      <group layers={layer} name="catalog-catenary-lamp">
        <Pole color={poleColor} ghost={ghost} height={height} layer={layer} position={[-halfSpan, 0, 0]} radius={0.095} />
        <Pole color={poleColor} ghost={ghost} height={height} layer={layer} position={[halfSpan, 0, 0]} radius={0.095} />
        <CatenaryCable color={poleColor} ghost={ghost} height={height} layer={layer} sag={cableSag} span={span} />
        {[-halfSpan, halfSpan].map((x) => (
          <mesh key={x} castShadow={!ghost} layers={layer} position={[x, height + 0.05, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.11, 0.11, 0.1, 16]} />
            <MetalMaterial color={poleColor} ghost={ghost} />
          </mesh>
        ))}
        <SuspendedHanger color={poleColor} fixtureY={fixtureY} fixtureTopOffset={0.25} ghost={ghost} height={height} layer={layer} sag={cableSag} />
        <Fixture projection="suspended" position={[0, fixtureY, 0]} rotation={[0, 0, 0]} color={poleColor} bodyColor="#4a5258" lightColor={lightColor} lightOn={lightOn} ghost={ghost} layer={layer} intensity={node.intensity ?? 1300} distance={distance} />
      </group>
    )
  }

  if (isWall) {
    if (projection === 'wall-arm') {
      const armY = height + 0.22
      const headY = armY + 0.1
      return (
        <group layers={layer} name="catalog-wall-arm-lamp">
          {/* Keep the shared structural pole so the variant remains grounded in
              the placement brush, then make the facade attachment explicit. */}
          <Pole color={poleColor} ghost={ghost} height={height} layer={layer} radius={0.11} />
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-arm-mount-plate"
            position={[0, height, -0.01]}
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[0.18, 0.96, 0.76]} />
            <MetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-wall-arm-mount-pad"
            position={[0.11, height, -0.01]}
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[0.08, 0.74, 0.58]} />
            <MetalMaterial color="#596169" ghost={ghost} metalness={0.84} roughness={0.28} />
          </mesh>
          {[-0.31, 0.31].flatMap((yOffset) => [-0.22, 0.22].map((zOffset) => [yOffset, zOffset] as const)).map(([yOffset, zOffset]) => (
            <mesh
              key={`${yOffset}:${zOffset}`}
              castShadow={!ghost}
              layers={layer}
              name="catalog-wall-arm-mount-bolt"
              position={[0.17, height + yOffset, zOffset]}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.042, 0.042, 0.055, 12]} />
              <MetalMaterial color="#171a1f" ghost={ghost} metalness={0.88} roughness={0.24} />
            </mesh>
          ))}
          <WallArmBracket color={poleColor} ghost={ghost} layer={layer} length={armLength} y={armY} />
          <WallArmHead
            // Lift the head one shade above the support so its cobra silhouette
            // remains readable in the editor's dark material preview.
            color="#59636b"
            distance={distance}
            ghost={ghost}
            intensity={node.intensity ?? 1100}
            layer={layer}
            lightColor={lightColor}
            lightOn={lightOn}
            position={[armLength, headY, 0]}
            rotation={[0, 0, -0.14]}
          />
        </group>
      )
    }

    return (
      <group layers={layer} name="catalog-wall-pack-lamp">
        <Pole color={poleColor} ghost={ghost} height={height} layer={layer} radius={0.11} />
        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-wall-pack-mount-plate"
          position={[0, height, -0.24]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <boxGeometry args={[0.78, 0.62, 0.12]} />
          <MetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.28} />
        </mesh>
        <Fixture
          projection="wall-pack"
          position={[0, height + 0.02, 0]}
          bodyColor="#4a5258"
          color={poleColor}
          lightColor={lightColor}
          lightOn={lightOn}
          ghost={ghost}
          layer={layer}
          intensity={node.intensity ?? 900}
          distance={distance}
        />
      </group>
    )
  }

  // Civic and path-scale heads are post-top fixtures. Keeping them on the
  // shared roadway arm path makes globes and lanterns float off to the side,
  // while bollards become implausibly tall. Give each profile a grounded
  // support and let the existing fixture geometry own the head details.
  if (projection === 'globe' || projection === 'lantern' || projection === 'path') {
    const isPath = projection === 'path'
    const supportHeight = isPath
      ? Math.max(0.65, Math.min(3, height * 0.25))
      : height
    const headOffset = isPath ? 0.08 : projection === 'globe' ? 0.3 : 0.41
    return (
      <group layers={layer} name={`catalog-${projection}-post-top`}>
        <Pole
          color={poleColor}
          ghost={ghost}
          height={supportHeight}
          layer={layer}
          radius={isPath ? 0.065 : 0.1}
        />
        <Fixture
          projection={projection}
          position={[0, supportHeight + headOffset, 0]}
          color={poleColor}
          lightColor={lightColor}
          lightOn={lightOn}
          ghost={ghost}
          layer={layer}
          intensity={node.intensity ?? 1200}
          distance={distance}
        />
      </group>
    )
  }

  if (projection === 'bollard') {
    const supportHeight = Math.max(0.45, Math.min(2.1, height * 0.15))
    return (
      <group layers={layer} name="catalog-bollard-light">
        <mesh
          castShadow={!ghost}
          layers={layer}
          position={[0, supportHeight / 2, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <cylinderGeometry args={[0.19, 0.23, supportHeight, 20]} />
          <MetalMaterial color={poleColor} ghost={ghost} />
        </mesh>
        <mesh
          castShadow={!ghost}
          layers={layer}
          position={[0, supportHeight + 0.04, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.2, 0.2, 0.08, 20]} />
          <MetalMaterial color={poleColor} ghost={ghost} />
        </mesh>
        <mesh
          layers={layer}
          position={[0, supportHeight + 0.11, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[0.16, 0.16, 0.12, 20]} />
          <LensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} />
        </mesh>
        {!ghost && lightOn && (node.intensity ?? 180) > 0 && (
          <pointLight
            color={lightColor}
            decay={2}
            distance={Math.max(4, supportHeight * 5)}
            intensity={(node.intensity ?? 180) * 0.5}
            layers={layer}
            position={[0, supportHeight + 0.11, 0]}
          />
        )}
      </group>
    )
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

  if (isOverhead) {
    if (projection === 'tunnel') {
      const soffitSpan = Math.max(2, armLength + 0.5)
      return (
        <group layers={layer} name="catalog-tunnel-luminaire">
          <Pole color={poleColor} ghost={ghost} height={height} layer={layer} radius={0.11} />
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-soffit"
            position={[0, height + 0.02, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[soffitSpan, 0.28, 1]} />
            <MetalMaterial color="#4d565d" ghost={ghost} metalness={0.66} roughness={0.34} />
          </mesh>
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-soffit-recess"
            position={[0, height - 0.125, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[Math.max(1.7, armLength + 0.2), 0.045, 0.68]} />
            <MetalMaterial color="#68737b" ghost={ghost} metalness={0.58} roughness={0.3} />
          </mesh>
          <Fixture
            projection="tunnel"
            // Leave a small service gap below the soffit. The top panel and
            // two mounting standoffs bridge that gap, so the housing cannot
            // disappear into the slab or read as a floating box.
            position={[0, height - 0.34, 0]}
            length={armLength}
            color={poleColor}
            bodyColor="#30373d"
            lightColor={lightColor}
            lightOn={lightOn}
            ghost={ghost}
            layer={layer}
            intensity={node.intensity ?? 1400}
            distance={distance}
          />
        </group>
      )
    }

    if (projection === 'canopy') {
      const canopySpan = Math.max(0.9, armLength * 1.1)
      return (
        <group layers={layer} name="catalog-canopy-soffit-light">
          {/* The pole is intentional: the shared placement brush is ground
              based, so this support keeps the canopy fixture visibly attached
              instead of leaving an overhead object floating in space. */}
          <Pole color={poleColor} ghost={ghost} height={height} layer={layer} radius={0.11} />
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="catalog-canopy-support-plate"
            position={[0, height + 0.015, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
            receiveShadow
          >
            <boxGeometry args={[canopySpan + 0.2, 0.12, 1.14]} />
            <MetalMaterial color="#4c565d" ghost={ghost} metalness={0.7} roughness={0.34} />
          </mesh>
          <Fixture
            projection="canopy"
            position={[0, height - 0.17, 0]}
            length={canopySpan}
            color={poleColor}
            bodyColor="#3e484f"
            lightColor={lightColor}
            lightOn={lightOn}
            ghost={ghost}
            layer={layer}
            intensity={node.intensity ?? 1200}
            distance={distance}
          />
        </group>
      )
    }

    return (
      <group layers={layer}>
        <Pole color={poleColor} ghost={ghost} height={height} layer={layer} />
        <mesh castShadow={!ghost} layers={layer} position={[0, height, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
          <boxGeometry args={[armLength, 0.22, 1.5]} />
          <MetalMaterial color={poleColor} ghost={ghost} />
        </mesh>
        <Fixture projection={projection === 'tunnel' ? 'tunnel' : 'shoebox'} position={[0, height - 0.18, 0]} color={poleColor} lightColor={lightColor} lightOn={lightOn} ghost={ghost} layer={layer} intensity={node.intensity ?? 1400} distance={distance} />
      </group>
    )
  }

  if (projection === 'candelabra') {
    const count = 3
    return (
      <group layers={layer}>
        <Pole color={poleColor} ghost={ghost} height={height} layer={layer} radius={0.12} />
        {Array.from({ length: count }, (_, index) => {
          const angle = (index * Math.PI * 2) / count
          return (
            <group key={angle} rotation={[0, angle, 0]}>
              <Arm color={poleColor} ghost={ghost} layer={layer} length={armLength} y={fixtureY} />
              <Fixture projection="lantern" position={[armLength, fixtureY, 0]} color={poleColor} lightColor={lightColor} lightOn={lightOn} ghost={ghost} layer={layer} intensity={node.intensity ?? 1800} distance={distance} />
            </group>
          )
        })}
      </group>
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
