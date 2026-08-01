'use client'

import { useEffect, useMemo } from 'react'
import type { RoadSplineNode } from './schema'
import { createRoadSurfaceTexture } from './road-surface-texture'
import { buildRoadSplineGeometry } from './road-spline-geometry'
import { buildRoadMarkingGeometries } from './road-spline-markings'
import { roadSurfaceRenderOrder } from './road-surface-render-order'

const NO_RAYCAST = () => {}

export function RoadSplineModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: RoadSplineNode
  ghost?: boolean
  layer?: number
}) {
  const geometry = useMemo(
    () => buildRoadSplineGeometry(node),
    [node.pathMode, node.points, node.textureScale, node.thickness, node.width],
  )
  const texture = useMemo(() => createRoadSurfaceTexture(), [])
  const surfaceRenderOrder = useMemo(() => roadSurfaceRenderOrder(node.id), [node.id])
  const markings = useMemo(
    () => buildRoadMarkingGeometries(node),
    [
      node.centerLineColor,
      node.centerLineStyle,
      node.edgeLines,
      node.laneCount,
      node.laneLineColor,
      node.junctions,
      node.pathMode,
      node.points,
      node.thickness,
      node.width,
    ],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => markings.forEach(({ geometry: markingGeometry }) => markingGeometry.dispose()), [markings])

  return (
    <>
      <mesh
        // Road strips can overlap at T/plus junctions and share mitered corners.
        // Keeping them out of the shadow map prevents coplanar shadow acne from
        // appearing as black triangular hatching on the asphalt.
        castShadow={false}
        geometry={geometry}
        layers={layer}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow={false}
        renderOrder={surfaceRenderOrder}
      >
        <meshStandardMaterial
          color={node.surfaceColor}
          depthWrite={!ghost}
          map={texture}
          opacity={ghost ? 0.48 : 1}
          roughness={0.92}
          transparent={ghost}
        />
      </mesh>
      {markings.map(({ color, geometry: markingGeometry, id }) => (
        <mesh
          castShadow={false}
          geometry={markingGeometry}
          key={id}
          layers={layer}
          raycast={NO_RAYCAST}
        >
          <meshStandardMaterial
            color={color}
            depthWrite={!ghost}
            opacity={ghost ? 0.55 : 1}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
            roughness={0.72}
            transparent={ghost}
          />
        </mesh>
      ))}
    </>
  )
}
