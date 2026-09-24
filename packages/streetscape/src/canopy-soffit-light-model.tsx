'use client'

import { useMemo } from 'react'
import { Object3D, Shape } from 'three'
import type { CanopySoffitLightNode } from './schema'
import {
  CANOPY_SOFFIT_LIGHT_DIMENSIONS,
  canopySoffitOpticOffsets,
  resolveCanopySoffitLightLayout,
} from './canopy-soffit-light-geometry'
import { LampMetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'

const CORNER_SIGNS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

function chamferedSquareShape(size: number, corner: number) {
  const half = size / 2
  const shape = new Shape()
  shape.moveTo(-half + corner, -half)
  shape.lineTo(half - corner, -half)
  shape.lineTo(half, -half + corner)
  shape.lineTo(half, half - corner)
  shape.lineTo(half - corner, half)
  shape.lineTo(-half + corner, half)
  shape.lineTo(-half, half - corner)
  shape.lineTo(-half, -half + corner)
  shape.closePath()
  return shape
}

function ChamferedPlate({
  color,
  depth,
  ghost,
  layer,
  name,
  size,
  topY,
  metalness = 0.76,
  roughness = 0.32,
}: {
  color: string
  depth: number
  ghost: boolean
  layer: number
  name: string
  size: number
  topY: number
  metalness?: number
  roughness?: number
}) {
  const shape = useMemo(
    () => chamferedSquareShape(size, size * CANOPY_SOFFIT_LIGHT_DIMENSIONS.cornerRatio),
    [size],
  )
  const extrude = useMemo(() => ({
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.009, depth * 0.24),
    bevelThickness: Math.min(0.006, depth * 0.18),
    curveSegments: 1,
    depth,
    steps: 1,
  }), [depth])

  return (
    <mesh
      castShadow={!ghost}
      layers={layer}
      name={name}
      position={[0, topY, 0]}
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
      rotation={[Math.PI / 2, 0, 0]}
    >
      <extrudeGeometry args={[shape, extrude]} />
      <LampMetalMaterial
        color={color}
        ghost={ghost}
        metalness={metalness}
        roughness={roughness}
      />
    </mesh>
  )
}

type CanopySoffitLightModelProps = {
  ghost?: boolean
  layer?: number
  node: CanopySoffitLightNode
}

export function CanopySoffitLightModel({
  ghost = false,
  layer = 0,
  node,
}: CanopySoffitLightModelProps) {
  const layout = useMemo(
    () => resolveCanopySoffitLightLayout(
      node.attachTo === 'ceiling' && node.ceilingId ? 0 : node.height,
      node.armLength,
    ),
    [node.armLength, node.attachTo, node.ceilingId, node.height],
  )
  const lightTarget = useMemo(() => new Object3D(), [])
  const opticOffsets = useMemo(
    () => canopySoffitOpticOffsets(layout.fixtureSize),
    [layout.fixtureSize],
  )
  const fixtureColor = node.poleColor ?? '#d5d9d8'
  const lightColor = node.lightColor ?? '#fff3d2'
  const lightOn = node.lightOn ?? false
  const dimensions = CANOPY_SOFFIT_LIGHT_DIMENSIONS
  const housingSize = layout.fixtureSize * dimensions.housingSizeRatio
  const trimSize = layout.fixtureSize
  const gasketSize = layout.fixtureSize * dimensions.gasketSizeRatio
  const faceplateSize = layout.fixtureSize * dimensions.faceplateSizeRatio
  const moduleWidth = layout.fixtureSize * dimensions.opticModuleWidthRatio
  const moduleDepth = layout.fixtureSize * dimensions.opticModuleDepthRatio
  const moduleCenters = [
    -layout.fixtureSize * dimensions.opticModuleCenterXRatio,
    layout.fixtureSize * dimensions.opticModuleCenterXRatio,
  ]
  const fastenerOffset = trimSize * (0.5 - dimensions.trimFastenerInsetRatio)
  const fastenerY = layout.trimTopY - dimensions.trimDepth - 0.002
  const opticCoverY = layout.opticCoverTopY - dimensions.opticCoverDepth / 2
  const sensorZ = layout.fixtureSize * dimensions.sensorZRatio

  return (
    <group layers={layer} name="catalog-canopy-soffit-light">
      <ChamferedPlate
        color="#667178"
        depth={dimensions.housingDepth}
        ghost={ghost}
        layer={layer}
        name="catalog-canopy-recessed-housing"
        roughness={0.38}
        size={housingSize}
        topY={layout.housingTopY}
      />
      <ChamferedPlate
        color={fixtureColor}
        depth={dimensions.trimDepth}
        ghost={ghost}
        layer={layer}
        metalness={0.48}
        name="catalog-canopy-die-cast-trim"
        roughness={0.42}
        size={trimSize}
        topY={layout.trimTopY}
      />
      <ChamferedPlate
        color="#161b1e"
        depth={dimensions.gasketDepth}
        ghost={ghost}
        layer={layer}
        metalness={0.25}
        name="catalog-canopy-weather-gasket"
        roughness={0.58}
        size={gasketSize}
        topY={layout.gasketTopY}
      />
      <ChamferedPlate
        color="#4d585e"
        depth={dimensions.faceplateDepth}
        ghost={ghost}
        layer={layer}
        name="catalog-canopy-optical-faceplate"
        roughness={0.36}
        size={faceplateSize}
        topY={layout.faceplateTopY}
      />

      {moduleCenters.map((moduleX) => (
        <mesh
          key={`module:${moduleX}`}
          layers={layer}
          name="catalog-canopy-optic-cover"
          position={[moduleX, opticCoverY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[moduleWidth, dimensions.opticCoverDepth, moduleDepth]} />
          <meshStandardMaterial
            color={lightOn ? lightColor : '#c7ced0'}
            depthWrite={!ghost}
            emissive={lightOn ? lightColor : '#000000'}
            emissiveIntensity={ghost ? 0.22 : lightOn ? 1.25 : 0}
            metalness={0.02}
            opacity={ghost ? 0.52 : 0.9}
            roughness={0.16}
            transparent
          />
        </mesh>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-canopy-service-rail"
        position={[0, layout.opticY + 0.004, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[layout.fixtureSize * 0.055, 0.009, moduleDepth]} />
        <LampMetalMaterial color="#252c30" ghost={ghost} metalness={0.72} roughness={0.34} />
      </mesh>

      {opticOffsets.map(([opticX, opticZ]) => (
        <mesh
          key={`optic:${opticX}:${opticZ}`}
          layers={layer}
          name="catalog-canopy-optic-cell"
          position={[opticX, layout.opticY, opticZ]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[
            layout.fixtureSize * dimensions.opticRadiusRatio,
            layout.fixtureSize * dimensions.opticRadiusRatio * 0.7,
            0.007,
            16,
          ]} />
          <meshStandardMaterial
            color={lightOn ? '#fffdf4' : '#dce1e2'}
            depthWrite={!ghost}
            emissive={lightOn ? lightColor : '#000000'}
            emissiveIntensity={ghost ? 0.24 : lightOn ? 3.1 : 0}
            opacity={ghost ? 0.56 : 0.98}
            roughness={0.1}
            transparent={ghost}
          />
        </mesh>
      ))}

      <mesh
        layers={layer}
        name="catalog-canopy-control-sensor"
        position={[0, layout.opticY - 0.001, sensorZ]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[
          layout.fixtureSize * dimensions.sensorRadiusRatio,
          layout.fixtureSize * dimensions.sensorRadiusRatio,
          0.008,
          18,
        ]} />
        <meshStandardMaterial
          color="#17262d"
          depthWrite={!ghost}
          emissive={lightOn ? '#2b718b' : '#000000'}
          emissiveIntensity={lightOn ? 0.42 : 0}
          metalness={0.32}
          opacity={ghost ? 0.5 : 1}
          roughness={0.24}
          transparent={ghost}
        />
      </mesh>

      <mesh
        layers={layer}
        name="catalog-canopy-service-tag"
        position={[0, layout.opticY, -sensorZ]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[layout.fixtureSize * 0.11, 0.006, layout.fixtureSize * 0.025]} />
        <meshStandardMaterial color="#b7c0c4" metalness={0.3} roughness={0.42} />
      </mesh>

      {CORNER_SIGNS.map(([xSign, zSign]) => (
        <mesh
          key={`fastener:${xSign}:${zSign}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-canopy-trim-fastener"
          position={[xSign * fastenerOffset, fastenerY, zSign * fastenerOffset]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[layout.fixtureSize * 0.015, layout.fixtureSize * 0.015, 0.007, 12]} />
          <LampMetalMaterial color="#8e979c" ghost={ghost} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {!ghost && lightOn && (node.intensity ?? 1200) > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[0, layout.height - 1.5, 0]} />
          <spotLight
            angle={Math.PI * 0.315}
            color={lightColor}
            decay={2}
            distance={Math.max(10, layout.height * 2.4)}
            intensity={node.intensity ?? 1200}
            layers={layer}
            penumbra={0.7}
            position={[0, layout.opticY - 0.022, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}
