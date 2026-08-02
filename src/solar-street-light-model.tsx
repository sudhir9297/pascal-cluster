'use client'

import { useEffect, useMemo } from 'react'
import { Object3D, QuadraticBezierCurve3, Vector3 } from 'three'
import {
  buildSolarStreetLightPanelGeometry,
  buildSolarStreetLightHousingGeometry,
  createSolarStreetLightPanelTexture,
  resolveSolarStreetLightLayout,
  SOLAR_OPTIC_COLUMNS,
  SOLAR_OPTIC_ROWS,
  SOLAR_STREET_LIGHT_DIMENSIONS,
} from './solar-street-light-geometry'
import { LampMetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'

const BASE_BOLT_OFFSETS = [-0.155, 0.155] as const

function SolarLuminaireHead({
  distance,
  ghost,
  intensity,
  layer,
  lightColor,
  lightOn,
  poleColor,
}: {
  distance: number
  ghost: boolean
  intensity: number
  layer: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const housingGeometry = useMemo(() => buildSolarStreetLightHousingGeometry(), [])
  const panelGeometry = useMemo(() => buildSolarStreetLightPanelGeometry(), [])
  const panelTexture = useMemo(() => createSolarStreetLightPanelTexture(), [])
  const lightTarget = useMemo(() => new Object3D(), [])
  const panelLength = SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX - SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX
  const panelCenterX = (SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX + SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX) / 2
  const opticCellWidth = (SOLAR_STREET_LIGHT_DIMENSIONS.opticLength - 0.045) / SOLAR_OPTIC_COLUMNS
  const opticCellDepth = (SOLAR_STREET_LIGHT_DIMENSIONS.opticWidth - 0.045) / SOLAR_OPTIC_ROWS

  useEffect(
    () => () => {
      housingGeometry.dispose()
      panelGeometry.dispose()
      panelTexture?.dispose()
    },
    [housingGeometry, panelGeometry, panelTexture],
  )

  return (
    <group layers={layer} name="catalog-solar-integrated-head">
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="catalog-solar-die-cast-housing"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.78} roughness={0.34} />
      </mesh>

      <group layers={layer} name="catalog-solar-panel" position={[panelCenterX, 0.122, 0]} rotation={[0, 0, -0.035]}>
        <mesh castShadow={!ghost} layers={layer} name="catalog-solar-panel-frame" raycast={ghost ? NO_RAYCAST : undefined}>
          <boxGeometry args={[panelLength + 0.035, 0.032, SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth + 0.035]} />
          <LampMetalMaterial color="#818b91" ghost={ghost} metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh
          castShadow={!ghost}
          geometry={panelGeometry}
          layers={layer}
          name="catalog-solar-panel-surface"
          position={[0, 0.019, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <meshStandardMaterial
            color={panelTexture ? '#ffffff' : '#0c0c1f'}
            depthWrite={!ghost}
            map={panelTexture ?? undefined}
            metalness={0.35}
            opacity={ghost ? 0.5 : 1}
            roughness={0.22}
            transparent={ghost}
          />
        </mesh>
      </group>

      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-battery-door" position={[0.13, -0.126, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <boxGeometry args={[0.36, 0.018, 0.34]} />
        <LampMetalMaterial color="#353d42" ghost={ghost} metalness={0.76} roughness={0.38} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-battery-latch" position={[0.25, -0.142, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.014, 0.014, 0.01, 10]} />
        <LampMetalMaterial color="#14191c" ghost={ghost} metalness={0.9} roughness={0.22} />
      </mesh>

      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-optic-bezel" position={[SOLAR_STREET_LIGHT_DIMENSIONS.opticCenterX, -0.112, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <boxGeometry args={[SOLAR_STREET_LIGHT_DIMENSIONS.opticLength + 0.04, 0.028, SOLAR_STREET_LIGHT_DIMENSIONS.opticWidth + 0.04]} />
        <LampMetalMaterial color="#d0d7da" ghost={ghost} metalness={0.34} roughness={0.24} />
      </mesh>
      <mesh layers={layer} name="catalog-solar-optic-window" position={[SOLAR_STREET_LIGHT_DIMENSIONS.opticCenterX, -0.131, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <boxGeometry args={[SOLAR_STREET_LIGHT_DIMENSIONS.opticLength, 0.014, SOLAR_STREET_LIGHT_DIMENSIONS.opticWidth]} />
        <meshStandardMaterial color={lightOn ? lightColor : '#e8edef'} depthWrite={!ghost} emissive={lightOn ? lightColor : '#000000'} emissiveIntensity={ghost ? 0.2 : lightOn ? 1.2 : 0} opacity={ghost ? 0.54 : 0.98} roughness={0.12} transparent={ghost} />
      </mesh>
      {Array.from({ length: SOLAR_OPTIC_COLUMNS }, (_, column) =>
        Array.from({ length: SOLAR_OPTIC_ROWS }, (_, row) => {
          const x = SOLAR_STREET_LIGHT_DIMENSIONS.opticCenterX - SOLAR_STREET_LIGHT_DIMENSIONS.opticLength / 2 + 0.0225 + opticCellWidth * (column + 0.5)
          const z = -SOLAR_STREET_LIGHT_DIMENSIONS.opticWidth / 2 + 0.0225 + opticCellDepth * (row + 0.5)
          return (
            <mesh key={`${column}:${row}`} layers={layer} name="catalog-solar-optic-cell" position={[x, -0.15, z]} raycast={ghost ? NO_RAYCAST : undefined}>
              <cylinderGeometry args={[0.015, 0.019, 0.011, 14]} />
              <meshStandardMaterial color={lightOn ? lightColor : '#f5f7f7'} depthWrite={!ghost} emissive={lightOn ? lightColor : '#000000'} emissiveIntensity={ghost ? 0.22 : lightOn ? 3 : 0} opacity={ghost ? 0.56 : 0.98} roughness={0.08} transparent={ghost} />
            </mesh>
          )
        }),
      )}

      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-motion-sensor" position={[-0.015, -0.145, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <sphereGeometry args={[0.035, 16, 10]} />
        <meshStandardMaterial color="#313a40" depthWrite={!ghost} metalness={0.08} opacity={ghost ? 0.5 : 0.92} roughness={0.3} transparent={ghost} />
      </mesh>

      {!ghost && lightOn && intensity > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[SOLAR_STREET_LIGHT_DIMENSIONS.opticCenterX, -1.2, 0]} />
          <spotLight angle={Math.PI * 0.31} color={lightColor} decay={2} distance={distance} intensity={intensity} layers={layer} penumbra={0.56} position={[SOLAR_STREET_LIGHT_DIMENSIONS.opticCenterX, -0.19, 0]} target={lightTarget} />
        </>
      )}
    </group>
  )
}

export function SolarStreetLightModel({
  armLength,
  distance,
  ghost,
  height,
  intensity,
  layer,
  lightColor,
  lightOn,
  poleColor,
}: {
  armLength: number
  distance: number
  ghost: boolean
  height: number
  intensity: number
  layer: number
  lightColor: string
  lightOn: boolean
  poleColor: string
}) {
  const layout = resolveSolarStreetLightLayout(height, armLength)
  const armCurve = useMemo(
    () => new QuadraticBezierCurve3(
      new Vector3(0, layout.armStartY, 0),
      new Vector3(layout.armControlX, layout.armControlY, 0),
      new Vector3(layout.headX, layout.headY - 0.055, 0),
    ),
    [layout.armControlX, layout.armControlY, layout.armStartY, layout.headX, layout.headY],
  )

  return (
    <group layers={layer} name="catalog-solar-street-light">
      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-pole" position={[0, layout.height / 2, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[SOLAR_STREET_LIGHT_DIMENSIONS.poleTopRadius, SOLAR_STREET_LIGHT_DIMENSIONS.poleBottomRadius, layout.height, 20]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.8} roughness={0.36} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-base-plate" position={[0, 0.045, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <boxGeometry args={[SOLAR_STREET_LIGHT_DIMENSIONS.basePlateSize, 0.09, SOLAR_STREET_LIGHT_DIMENSIONS.basePlateSize]} />
        <LampMetalMaterial color="#30383d" ghost={ghost} metalness={0.84} roughness={0.34} />
      </mesh>
      {BASE_BOLT_OFFSETS.flatMap((x) => BASE_BOLT_OFFSETS.map((z) => (
        <group key={`${x}:${z}`} layers={layer} position={[x, 0.104, z]}>
          <mesh castShadow={!ghost} layers={layer} name="catalog-solar-anchor-washer" raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.041, 0.041, 0.012, 16]} />
            <LampMetalMaterial color="#768087" ghost={ghost} metalness={0.9} roughness={0.24} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} name="catalog-solar-anchor-nut" position={[0, 0.026, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.029, 0.029, 0.04, 6]} />
            <LampMetalMaterial color="#22282c" ghost={ghost} metalness={0.88} roughness={0.27} />
          </mesh>
        </group>
      ))) }
      <mesh castShadow={!ghost} layers={layer} name="catalog-solar-service-door" position={[0, Math.min(1.05, layout.height * 0.23), 0.126]} raycast={ghost ? NO_RAYCAST : undefined}>
        <boxGeometry args={[0.145, 0.44, 0.018]} />
        <LampMetalMaterial color="#454e53" ghost={ghost} metalness={0.76} roughness={0.39} />
      </mesh>
      <group layers={layer} name="catalog-solar-side">
          <mesh castShadow={!ghost} layers={layer} name="catalog-solar-upswept-arm" raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
            <tubeGeometry args={[armCurve, 32, SOLAR_STREET_LIGHT_DIMENSIONS.armRadius, 12, false]} />
            <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.82} roughness={0.33} />
          </mesh>
          <mesh castShadow={!ghost} layers={layer} name="catalog-solar-spigot-adapter" position={[layout.headX - 0.08, layout.headY - 0.055, 0]} raycast={ghost ? NO_RAYCAST : undefined} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.073, 0.073, 0.28, 16]} />
            <LampMetalMaterial color="#3b4449" ghost={ghost} metalness={0.84} roughness={0.31} />
          </mesh>
          <group layers={layer} position={[layout.headX, layout.headY, 0]}>
            <SolarLuminaireHead distance={distance} ghost={ghost} intensity={intensity} layer={layer} lightColor={lightColor} lightOn={lightOn} poleColor={poleColor} />
          </group>
      </group>
    </group>
  )
}
