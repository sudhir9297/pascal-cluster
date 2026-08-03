'use client'

import { useEffect, useMemo } from 'react'
import { Object3D } from 'three'
import type { TunnelLuminaireNode } from './schema'
import {
  buildTunnelLuminaireHousingGeometry,
  resolveTunnelLuminaireLayout,
  TUNNEL_LUMINAIRE_DIMENSIONS,
  TUNNEL_LUMINAIRE_TOP_FIN_OFFSETS,
} from './tunnel-luminaire-geometry'
import { LampMetalMaterial, NO_RAYCAST } from './roadway-lamp-primitives'

const CONNECTOR_COLORS = ['#11171b', '#257ca3'] as const

export function TunnelLuminaireModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: TunnelLuminaireNode
}) {
  const layout = resolveTunnelLuminaireLayout(
    node.armLength,
    node.attachTo === 'ceiling' && node.ceilingId ? 0 : node.height,
  )
  const dimensions = TUNNEL_LUMINAIRE_DIMENSIONS
  const housingGeometry = useMemo(
    () => buildTunnelLuminaireHousingGeometry(layout.length),
    [layout.length],
  )
  const lightTarget = useMemo(() => new Object3D(), [])
  const bodyColor = node.poleColor ?? '#7a8388'
  const lightColor = node.lightColor ?? '#e9f2ff'
  const lightOn = node.lightOn ?? false
  const intensity = node.intensity ?? 1800
  const distance = Math.max(8, node.height * 2.3)
  const undersideY = -layout.bodyHeight / 2 - dimensions.opticDepth / 2

  useEffect(() => () => housingGeometry.dispose(), [housingGeometry])

  return (
    <group layers={layer} name="catalog-tunnel-luminaire">
      <group layers={layer} position={[0, layout.fixtureCenterY, 0]}>
        <mesh
          castShadow={!ghost}
          geometry={housingGeometry}
          layers={layer}
          name="catalog-tunnel-housing"
          raycast={ghost ? NO_RAYCAST : undefined}
          receiveShadow
        >
          <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.76} roughness={0.3} />
        </mesh>

        {TUNNEL_LUMINAIRE_TOP_FIN_OFFSETS.map((z) => (
          <mesh
            key={z}
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-heat-sink-fin"
            position={[0, layout.bodyHeight / 2 + dimensions.topFinHeight / 2 - 0.002, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry
              args={[
                layout.length - dimensions.endCapLength * 2,
                dimensions.topFinHeight,
                dimensions.topFinWidth,
              ]}
            />
            <LampMetalMaterial color="#555e63" ghost={ghost} metalness={0.82} roughness={0.34} />
          </mesh>
        ))}

        {([-1, 1] as const).map((side) => (
          <mesh
            key={side}
            castShadow={!ghost}
            layers={layer}
            name="catalog-tunnel-end-cap"
            position={[side * (layout.length / 2 + dimensions.endCapLength / 2), 0, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry
              args={[
                dimensions.endCapLength,
                layout.bodyHeight * 0.94,
                layout.bodyWidth * 0.92,
              ]}
            />
            <LampMetalMaterial color="#31393e" ghost={ghost} metalness={0.68} roughness={0.38} />
          </mesh>
        ))}

        <mesh
          castShadow={!ghost}
          layers={layer}
          name="catalog-tunnel-centre-rail"
          position={[0, undersideY - 0.001, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[layout.opticLength, dimensions.opticDepth, dimensions.centreRailWidth]} />
          <LampMetalMaterial color="#3f484d" ghost={ghost} metalness={0.78} roughness={0.3} />
        </mesh>

        {layout.opticStripOffsets.map((z) => (
          <mesh
            key={z}
            layers={layer}
            name="catalog-tunnel-optic-window"
            position={[0, undersideY - 0.002, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[layout.opticLength, dimensions.opticDepth, layout.opticStripWidth]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#c6cdd0'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.25 : lightOn ? 1.7 : 0}
              metalness={0.02}
              opacity={ghost ? 0.52 : 0.88}
              roughness={0.13}
              transparent
            />
          </mesh>
        ))}

        {layout.moduleCenters.flatMap((x) =>
          layout.opticStripOffsets.map((z) => (
            <mesh
              key={`${x}:${z}`}
              layers={layer}
              name="catalog-tunnel-optic-cell"
              position={[x, undersideY - dimensions.opticDepth * 0.62, z]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.012, 0.014, 0.006, 12]} />
              <meshStandardMaterial
                color={lightOn ? '#ffffff' : '#dce2e4'}
                depthWrite={!ghost}
                emissive={lightOn ? lightColor : '#000000'}
                emissiveIntensity={ghost ? 0.32 : lightOn ? 4 : 0}
                metalness={0.02}
                opacity={ghost ? 0.56 : 0.98}
                roughness={0.08}
                transparent={ghost}
              />
            </mesh>
          )),
        )}

        {layout.mountingClipCenters.map((x) => (
          <group key={x} layers={layer} position={[x, 0, 0]}>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-tunnel-mounting-clip"
              position={[0, layout.bodyHeight / 2 + dimensions.mountingClipHeight / 2, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry
                args={[
                  dimensions.mountingClipLength,
                  dimensions.mountingClipHeight,
                  dimensions.mountingClipWidth,
                ]}
              />
              <LampMetalMaterial color="#667076" ghost={ghost} metalness={0.84} roughness={0.27} />
            </mesh>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-tunnel-mounting-stud"
              position={[
                0,
                layout.bodyHeight / 2 +
                  dimensions.mountingClipHeight +
                  dimensions.mountingStudHeight / 2,
                0,
              ]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.014, 0.014, dimensions.mountingStudHeight, 12]} />
              <LampMetalMaterial color="#3a4247" ghost={ghost} metalness={0.86} roughness={0.25} />
            </mesh>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-tunnel-ceiling-plate"
              position={[
                0,
                layout.bodyHeight / 2 +
                  dimensions.mountingClipHeight +
                  dimensions.mountingStudHeight +
                  0.006,
                0,
              ]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <boxGeometry args={[dimensions.mountingPlateSize, 0.012, dimensions.mountingPlateSize]} />
              <LampMetalMaterial color="#596267" ghost={ghost} metalness={0.82} roughness={0.3} />
            </mesh>
          </group>
        ))}

        {CONNECTOR_COLORS.map((color, index) => (
          <mesh
            key={color}
            castShadow={!ghost}
            layers={layer}
            name={index === 0 ? 'catalog-tunnel-cable-gland' : 'catalog-tunnel-connector-ring'}
            position={[
              -layout.length / 2 - dimensions.endCapLength -
                dimensions.connectorLength * (index === 0 ? 0.42 : 0.78),
              0.008,
              0,
            ]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[
                dimensions.connectorRadius * (index === 0 ? 1 : 0.82),
                dimensions.connectorRadius * (index === 0 ? 1 : 0.82),
                dimensions.connectorLength * (index === 0 ? 0.58 : 0.2),
                12,
              ]}
            />
            <LampMetalMaterial color={color} ghost={ghost} metalness={index === 0 ? 0.42 : 0.65} roughness={0.36} />
          </mesh>
        ))}

        {!ghost && lightOn && intensity > 0 && (
          <>
            <primitive layers={layer} object={lightTarget} position={[0, -2, 0]} />
            <spotLight
              angle={Math.PI * 0.34}
              color={lightColor}
              decay={2}
              distance={distance}
              intensity={intensity}
              layers={layer}
              penumbra={0.62}
              position={[0, undersideY - 0.02, 0]}
              target={lightTarget}
            />
          </>
        )}
      </group>
    </group>
  )
}
