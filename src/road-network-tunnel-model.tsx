"use client";

import { useEffect, useMemo } from "react";
import {
	BufferGeometry,
	DoubleSide,
	Float32BufferAttribute,
} from "three";
import {
	buildRoadTunnelLiningGeometry,
	buildRoadTunnelSpans,
	type RoadTunnelPortal,
} from "./road-network-tunnel";
import type { RoadNetworkNode } from "./schema";
import type { TerrainField } from "./terrain-field-compat";

const NO_RAYCAST = () => undefined;

function TunnelLining({
	baseOffset,
	clearHeight,
	clearWidth,
	liningThickness,
	name,
	points,
}: {
	baseOffset: number;
	clearHeight: number;
	clearWidth: number;
	liningThickness: number;
	name: string;
	points: Array<readonly [number, number, number]>;
}) {
	const data = useMemo(
		() =>
			buildRoadTunnelLiningGeometry(
				points,
				clearWidth,
				clearHeight,
				liningThickness,
				baseOffset,
			),
		[baseOffset, clearHeight, clearWidth, liningThickness, points],
	);
	const geometry = useMemo(() => {
		const result = new BufferGeometry();
		result.setAttribute(
			"position",
			new Float32BufferAttribute(data.positions, 3),
		);
		result.setIndex(data.indices);
		result.computeVertexNormals();
		result.computeBoundingBox();
		result.computeBoundingSphere();
		return result;
	}, [data]);
	useEffect(() => () => geometry.dispose(), [geometry]);
	if (data.positions.length === 0) return null;
	return (
		<mesh
			castShadow
			geometry={geometry}
			name={name}
			raycast={NO_RAYCAST}
			receiveShadow
		>
			<meshStandardMaterial
				color="#a8aba8"
				metalness={0.02}
				roughness={0.9}
				side={DoubleSide}
			/>
		</mesh>
	);
}

function TunnelCutSlope({ portal, side }: { portal: RoadTunnelPortal; side: -1 | 1 }) {
	const geometry = useMemo(() => {
		const result = new BufferGeometry();
		if (portal.cutDepth <= 0.05) return result;
		const normal = [-portal.outward[1], portal.outward[0]] as const;
		const innerLateral = side * (portal.clearWidth / 2);
		const outerLateral =
			side * (portal.clearWidth / 2 + portal.cutDepth * portal.cutSlope);
		const point = (forward: number, lateral: number, y: number) => [
			portal.point[0] + portal.outward[0] * forward + normal[0] * lateral,
			y,
			portal.point[2] + portal.outward[1] * forward + normal[1] * lateral,
		];
		result.setAttribute(
			"position",
			new Float32BufferAttribute(
				[
					...point(0, innerLateral, portal.roadSurfaceY),
					...point(portal.cutLength, innerLateral, portal.roadSurfaceY),
					...point(0, outerLateral, portal.terrainY),
					...point(portal.cutLength, outerLateral, portal.terrainY),
				],
				3,
			),
		);
		result.setIndex([0, 2, 1, 2, 3, 1]);
		result.computeVertexNormals();
		result.computeBoundingBox();
		result.computeBoundingSphere();
		return result;
	}, [portal, side]);
	useEffect(() => () => geometry.dispose(), [geometry]);
	if ((geometry.getAttribute("position")?.count ?? 0) === 0) return null;
	return (
		<mesh
			geometry={geometry}
			name={`road-tunnel-cut-slope:${side < 0 ? "right" : "left"}`}
			raycast={NO_RAYCAST}
			receiveShadow
		>
			<meshStandardMaterial color="#756a58" roughness={1} side={DoubleSide} />
		</mesh>
	);
}

function TunnelPortal({ portal, surfaceThickness }: {
	portal: RoadTunnelPortal;
	surfaceThickness: number;
}) {
	const collarEnd = [
		portal.point[0] + portal.outward[0] * 0.9,
		portal.point[1],
		portal.point[2] + portal.outward[1] * 0.9,
	] as const;
	return (
		<group name={`road-tunnel-portal:${portal.id}`}>
			<group name="road-tunnel-portal-headwall">
				<TunnelLining
					baseOffset={surfaceThickness - 0.08}
					clearHeight={portal.clearHeight}
					clearWidth={portal.clearWidth}
					liningThickness={portal.liningThickness * 1.45}
					name="road-tunnel-portal-collar"
					points={[portal.point, collarEnd]}
				/>
			</group>
			<group
				name="road-tunnel-portal-approach"
				position={[portal.point[0], 0, portal.point[2]]}
				rotation={[0, portal.angle, 0]}
			>
				<mesh
					name="road-tunnel-fill-apron"
					position={[
						0,
						portal.roadSurfaceY - 0.12,
						portal.cutLength / 2,
					]}
					raycast={NO_RAYCAST}
					receiveShadow
				>
					<boxGeometry args={[portal.clearWidth, 0.24, portal.cutLength]} />
					<meshStandardMaterial color="#777b7c" roughness={0.96} />
				</mesh>
			</group>
			<TunnelCutSlope portal={portal} side={-1} />
			<TunnelCutSlope portal={portal} side={1} />
		</group>
	);
}

/** Generated lining, portals, open-cut slopes, and finished approach aprons. */
export function RoadNetworkTunnelStructures({
	node,
	terrain = null,
}: {
	node: RoadNetworkNode;
	terrain?: TerrainField | null;
}) {
	const spans = useMemo(() => buildRoadTunnelSpans(node, terrain), [node, terrain]);
	if (spans.length === 0) return null;
	return (
		<group name="road-tunnel-structures">
			{spans.map((span) => (
				<group key={span.edgeId} name={`road-tunnel-span:${span.edgeId}`}>
					<TunnelLining
						baseOffset={span.surfaceThickness - 0.08}
						clearHeight={span.clearHeight}
						clearWidth={span.clearWidth}
						liningThickness={span.liningThickness}
						name="road-tunnel-lining"
						points={span.points}
					/>
					{span.portals.map((portal) => (
						<TunnelPortal
							key={portal.id}
							portal={portal}
							surfaceThickness={span.surfaceThickness}
						/>
					))}
				</group>
			))}
		</group>
	);
}
