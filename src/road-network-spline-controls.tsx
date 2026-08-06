"use client";

import {
	type AnyNode,
	type AnyNodeId,
	useLiveNodeOverrides,
	useScene,
} from "@pascal-app/core";
import { EDITOR_LAYER, triggerSFX } from "@pascal-app/editor";
import { useViewer } from "@pascal-app/viewer";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { OrthographicCamera, Plane, Ray, Vector2, Vector3 } from "three";
import { sampleRoadEdgePoints } from "./road-network-geometry";
import {
	deleteRoadSplinePoints,
	insertRoadSplinePoint,
	moveRoadSplineEndpoint,
	moveRoadSplinePoint,
	moveRoadSplinePoints,
} from "./road-network-spline-handles";
import type { RoadNetworkNode } from "./schema";
import { type RoadElementSelection, useEnvironmentStore } from "./store";

const HANDLE_SCALE = 0.82;
const HANDLE_COLOR = "#22c55e";
const HANDLE_HOVER_COLOR = "#4ade80";
const HANDLE_SELECTED_COLOR = "#86efac";
const HANDLE_OUTLINE_COLOR = "#14532d";
const ELEVATION_HANDLE_COLOR = "#38bdf8";
const ELEVATION_HANDLE_HOVER_COLOR = "#7dd3fc";
const ELEVATION_HANDLE_OUTLINE_COLOR = "#0c4a6e";
const INSERT_HANDLE_COLOR = "#d1fae5";
const INSERT_HANDLE_HOVER_COLOR = "#ffffff";

type SplineDragMode = "plan" | "elevation";

function closestAxisParameterToRay(
	origin: Vector3,
	direction: Vector3,
	ray: Ray,
): number {
	const originToRay = new Vector3().subVectors(origin, ray.origin);
	const parallel = direction.dot(ray.direction);
	const alongAxis = direction.dot(originToRay);
	const alongRay = ray.direction.dot(originToRay);
	const denominator = 1 - parallel * parallel;
	if (Math.abs(denominator) < 1e-6) return -alongAxis;
	const axisParameter = (parallel * alongRay - alongAxis) / denominator;
	const rayParameter = alongRay + parallel * axisParameter;
	return rayParameter < 0 ? -alongAxis : axisParameter;
}

function swallowNextClick() {
	const swallow = (event: Event) => {
		event.stopPropagation();
		event.preventDefault();
	};
	window.addEventListener("click", swallow, { capture: true, once: true });
	window.setTimeout(
		() => window.removeEventListener("click", swallow, { capture: true }),
		300,
	);
}

function RoadSplinePointControl({
	controlKey,
	controlSelection,
	movePoint,
	node,
	planDraggable = true,
	point,
	selected,
	toggleSelection,
}: {
	controlKey: string;
	controlSelection: Omit<RoadElementSelection, "networkId">;
	movePoint: (
		point: readonly [number, number, number],
	) =>
		| Partial<Pick<RoadNetworkNode, "edges" | "graphNodes" | "junctions">>
		| null;
	node: RoadNetworkNode;
	planDraggable?: boolean;
	point: readonly [number, number, number];
	selected: boolean;
	toggleSelection?: () => void;
}) {
	const [hovered, setHovered] = useState(false);
	const [elevationHovered, setElevationHovered] = useState(false);
	const cleanupRef = useRef<(() => void) | null>(null);
	const { camera, gl, raycaster } = useThree();
	const zoom = camera instanceof OrthographicCamera ? 1 / camera.zoom : 1;
	const color = selected
		? HANDLE_SELECTED_COLOR
		: hovered
			? HANDLE_HOVER_COLOR
			: HANDLE_COLOR;

	useEffect(() => () => cleanupRef.current?.(), []);

	const beginDrag = (event: ThreeEvent<PointerEvent>, mode: SplineDragMode) => {
		if (event.button !== 0) return;
		event.stopPropagation();
		const nativeEvent = event.nativeEvent as PointerEvent;
		if ((nativeEvent.ctrlKey || nativeEvent.metaKey) && toggleSelection) {
			toggleSelection();
			return;
		}
		setHovered(false);
		setElevationHovered(false);
		if (!selected) {
			useEnvironmentStore.getState().setRoadElementSelection({
				networkId: node.id,
				...controlSelection,
			});
		}
		if (mode !== "elevation" && !planDraggable) return;

		const nodeId = node.id as AnyNodeId;
		const originalPoint = new Vector3(...point);
		const plane =
			mode !== "elevation" ? new Plane(new Vector3(0, 1, 0), -point[1]) : null;
		const initialIntersection = plane
			? event.ray.intersectPlane(plane, new Vector3())
			: null;
		if (mode === "plan" && !initialIntersection) return;
		const verticalAxis = new Vector3(0, 1, 0);
		const initialAxisParameter =
			mode === "elevation"
				? closestAxisParameterToRay(originalPoint, verticalAxis, event.ray)
				: 0;
		const pointer = new Vector2();
		const moveRay = new Ray();
		let lastPatch: Partial<
			Pick<RoadNetworkNode, "edges" | "graphNodes" | "junctions">
		> | null = null;
		let historyPaused = true;

		useViewer.getState().setInputDragging(true);
		useScene.temporal.getState().pause();
		document.body.style.cursor =
			mode === "elevation" ? "ns-resize" : "grabbing";
		triggerSFX("sfx:item-pick");

		const resumeHistory = () => {
			if (!historyPaused) return;
			historyPaused = false;
			useScene.temporal.getState().resume();
		};
		const clearPreview = () => {
			useLiveNodeOverrides.getState().clear(nodeId);
			useScene.getState().markDirty(nodeId);
		};
		const cleanup = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onCancel);
			window.removeEventListener("blur", onCancel);
			document.body.style.cursor = "";
			useViewer.getState().setInputDragging(false);
			cleanupRef.current = null;
		};
		const onMove = (moveEvent: PointerEvent) => {
			const rect = gl.domElement.getBoundingClientRect();
			pointer.set(
				((moveEvent.clientX - rect.left) / rect.width) * 2 - 1,
				-((moveEvent.clientY - rect.top) / rect.height) * 2 + 1,
			);
			raycaster.setFromCamera(pointer, camera);
			moveRay.copy(raycaster.ray);
			const nextPoint = originalPoint.clone();
			if (mode === "elevation") {
				const currentParameter = closestAxisParameterToRay(
					originalPoint,
					verticalAxis,
					moveRay,
				);
				nextPoint.y += currentParameter - initialAxisParameter;
			} else {
				const intersection = moveRay.intersectPlane(plane!, new Vector3());
				if (!intersection || !initialIntersection) return;
				nextPoint.add(intersection.sub(initialIntersection));
			}
			const patch = movePoint([nextPoint.x, nextPoint.y, nextPoint.z]);
			if (!patch) return;
			lastPatch = patch;
			useLiveNodeOverrides.getState().set(nodeId, patch);
			useScene.getState().markDirty(nodeId);
		};
		const onUp = () => {
			resumeHistory();
			if (lastPatch) {
				useScene.getState().updateNode(nodeId, lastPatch as Partial<AnyNode>);
				triggerSFX("sfx:item-place");
			}
			clearPreview();
			swallowNextClick();
			cleanup();
		};
		const onCancel = () => {
			resumeHistory();
			clearPreview();
			cleanup();
		};

		cleanupRef.current = onCancel;
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onCancel);
		window.addEventListener("blur", onCancel);
	};

	return (
		<group
			layers={EDITOR_LAYER}
			position={[point[0], point[1] + 0.35, point[2]]}
			scale={zoom * HANDLE_SCALE * (hovered || selected ? 1.12 : 1)}
		>
			<mesh renderOrder={1010}>
				<sphereGeometry args={[0.24, 20, 14]} />
				<meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
			</mesh>
			<mesh renderOrder={1011} rotation={[Math.PI / 2, 0, 0]}>
				<torusGeometry args={[0.245, 0.035, 8, 28]} />
				<meshBasicMaterial
					color={HANDLE_OUTLINE_COLOR}
					depthTest={false}
					depthWrite={false}
				/>
			</mesh>
			<mesh
				name={`road-control-hit:${controlKey}`}
				onPointerDown={(event) => beginDrag(event, "plan")}
				onPointerEnter={() => {
					if (!cleanupRef.current) document.body.style.cursor = "grab";
					setHovered(true);
				}}
				onPointerLeave={() => {
					if (!cleanupRef.current) document.body.style.cursor = "";
					setHovered(false);
				}}
			>
				<boxGeometry args={[0.7, 0.14, 0.7]} />
				<meshBasicMaterial depthWrite={false} opacity={0} transparent />
			</mesh>
			{selected ? (
				<group name={`road-elevation-control:${controlKey}`}>
					<mesh renderOrder={1010}>
						<cylinderGeometry args={[0.035, 0.035, 1.45, 10]} />
						<meshBasicMaterial
							color={ELEVATION_HANDLE_COLOR}
							depthTest={false}
							depthWrite={false}
						/>
					</mesh>
					{[-0.72, 0.72].map((offset) => (
						<group key={offset} position={[0, offset, 0]}>
							<mesh renderOrder={1011}>
								<sphereGeometry args={[0.15, 18, 12]} />
								<meshBasicMaterial
									color={
										elevationHovered
											? ELEVATION_HANDLE_HOVER_COLOR
											: ELEVATION_HANDLE_COLOR
									}
									depthTest={false}
									depthWrite={false}
								/>
							</mesh>
							<mesh renderOrder={1012} rotation={[Math.PI / 2, 0, 0]}>
								<torusGeometry args={[0.153, 0.025, 8, 24]} />
								<meshBasicMaterial
									color={ELEVATION_HANDLE_OUTLINE_COLOR}
									depthTest={false}
									depthWrite={false}
								/>
							</mesh>
							<mesh
								name={`road-elevation-hit:${controlKey}:${offset}`}
								onPointerDown={(event) => beginDrag(event, "elevation")}
								onPointerEnter={() => {
									if (!cleanupRef.current)
										document.body.style.cursor = "ns-resize";
									setElevationHovered(true);
								}}
								onPointerLeave={() => {
									if (!cleanupRef.current) document.body.style.cursor = "";
									setElevationHovered(false);
								}}
							>
								<sphereGeometry args={[0.3, 12, 8]} />
								<meshBasicMaterial depthWrite={false} opacity={0} transparent />
							</mesh>
						</group>
					))}
				</group>
			) : null}
		</group>
	);
}

function RoadSplineInsertControl({
	edgeId,
	insertionIndex,
	node,
	point,
}: {
	edgeId: string;
	insertionIndex: number;
	node: RoadNetworkNode;
	point: readonly [number, number, number];
}) {
	const [hovered, setHovered] = useState(false);
	const { camera } = useThree();
	const zoom = camera instanceof OrthographicCamera ? 1 / camera.zoom : 1;

	const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
		if (event.button !== 0) return;
		event.stopPropagation();
		const patch = insertRoadSplinePoint(node, edgeId, insertionIndex, point);
		if (!patch) return;
		useScene
			.getState()
			.updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>);
		useEnvironmentStore.getState().setRoadElementSelection({
			networkId: node.id,
			kind: "control",
			id: edgeId,
			index: insertionIndex,
		});
		triggerSFX("sfx:item-place");
	};

	return (
		<group
			layers={EDITOR_LAYER}
			position={[point[0], point[1] + 0.24, point[2]]}
			scale={zoom * 0.72 * (hovered ? 1.18 : 1)}
		>
			<mesh renderOrder={1009}>
				<sphereGeometry args={[0.16, 16, 10]} />
				<meshBasicMaterial
					color={hovered ? INSERT_HANDLE_HOVER_COLOR : INSERT_HANDLE_COLOR}
					depthTest={false}
					depthWrite={false}
					opacity={hovered ? 0.95 : 0.66}
					transparent
				/>
			</mesh>
			<mesh renderOrder={1010}>
				<boxGeometry args={[0.19, 0.035, 0.045]} />
				<meshBasicMaterial
					color={HANDLE_OUTLINE_COLOR}
					depthTest={false}
					depthWrite={false}
				/>
			</mesh>
			<mesh renderOrder={1010}>
				<boxGeometry args={[0.045, 0.035, 0.19]} />
				<meshBasicMaterial
					color={HANDLE_OUTLINE_COLOR}
					depthTest={false}
					depthWrite={false}
				/>
			</mesh>
			<mesh
				name={`road-insert-point-hit:${edgeId}:${insertionIndex}`}
				onPointerDown={onPointerDown}
				onPointerEnter={() => {
					document.body.style.cursor = "copy";
					setHovered(true);
				}}
				onPointerLeave={() => {
					document.body.style.cursor = "";
					setHovered(false);
				}}
			>
				<sphereGeometry args={[0.3, 12, 8]} />
				<meshBasicMaterial depthWrite={false} opacity={0} transparent />
			</mesh>
		</group>
	);
}

/** Selection-only 3D handles for reshaping a committed spline road. */
export function RoadNetworkSplineControls({
	elementSelection,
	node,
}: {
	elementSelection: RoadElementSelection | null;
	node: RoadNetworkNode;
}) {
	useEffect(() => {
		const onDeleteKey = (event: KeyboardEvent) => {
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}
			if (event.key !== "Delete" && event.key !== "Backspace") return;
			if (
				elementSelection?.networkId !== node.id ||
				elementSelection.kind !== "control"
			)
				return;
			const indices =
				elementSelection.indices ??
				(elementSelection.index === undefined ? [] : [elementSelection.index]);
			const patch = deleteRoadSplinePoints(node, elementSelection.id, indices);
			if (!patch) return;
			event.preventDefault();
			useScene
				.getState()
				.updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>);
			useEnvironmentStore.getState().setRoadElementSelection({
				networkId: node.id,
				kind: "spline",
				id: node.id,
			});
			triggerSFX("sfx:item-delete");
		};
		window.addEventListener("keydown", onDeleteKey);
		return () => window.removeEventListener("keydown", onDeleteKey);
	}, [elementSelection, node]);

	const alignmentControls = Object.values(node.edges).flatMap((edge) =>
		edge.alignment.map((point, index) => {
			const selectionMatches =
				elementSelection?.kind === "control" && elementSelection.id === edge.id;
			const selectedIndices = selectionMatches
				? (elementSelection.indices ??
					(elementSelection.index === undefined
						? []
						: [elementSelection.index]))
				: [];
		const selected = selectedIndices.includes(index);
		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: authored alignment points have no IDs, and remounting one during its drag would cancel the gesture.
			<RoadSplinePointControl
					controlKey={`point:${edge.id}:${index}`}
					controlSelection={{ kind: "control", id: edge.id, index }}
					key={`${edge.id}:${index}`}
					movePoint={(nextPoint) => {
						if (selected && selectedIndices.length > 1) {
							return moveRoadSplinePoints(node, edge.id, selectedIndices, [
								nextPoint[0] - point[0],
								nextPoint[1] - point[1],
								nextPoint[2] - point[2],
							]);
						}
						return moveRoadSplinePoint(node, edge.id, index, nextPoint);
					}}
					node={node}
					point={point}
					selected={selected}
					toggleSelection={() => {
						const current = useEnvironmentStore.getState().roadElementSelection;
						const currentIndices =
							current?.networkId === node.id &&
							current.kind === "control" &&
							current.id === edge.id
								? (current.indices ??
									(current.index === undefined ? [] : [current.index]))
								: [];
						const nextIndices = currentIndices.includes(index)
							? currentIndices.filter((candidate) => candidate !== index)
							: [...currentIndices, index].sort((left, right) => left - right);
						useEnvironmentStore.getState().setRoadElementSelection(
							nextIndices.length === 0
								? { networkId: node.id, kind: "spline", id: node.id }
								: {
										networkId: node.id,
										kind: "control",
										id: edge.id,
										index: nextIndices[0],
										indices: nextIndices,
									},
						);
					}}
				/>
			);
		}),
	);
	const insertionControls = Object.values(node.edges).flatMap((edge) => {
		if (edge.alignment.length === 0) return [];
		const samples = sampleRoadEdgePoints(
			node,
			edge,
			Math.max(32, (edge.alignment.length + 1) * 16),
		);
		return Array.from(
			{ length: edge.alignment.length + 1 },
			(_, insertionIndex) => {
				const t = (insertionIndex + 0.5) / (edge.alignment.length + 1);
				const point = samples[Math.round(t * (samples.length - 1))];
				return point ? (
					<RoadSplineInsertControl
						edgeId={edge.id}
						insertionIndex={insertionIndex}
						key={`insert:${edge.id}:${point[0]}:${point[1]}:${point[2]}`}
						node={node}
						point={point}
					/>
				) : null;
			},
		);
	});
	const splineEndpointIds = Array.from(
		new Set(
			Object.values(node.edges).flatMap((edge) =>
				edge.alignment.length > 0 ? [edge.startNodeId, edge.endNodeId] : [],
			),
		),
	);
	const endpointControls = splineEndpointIds.flatMap((graphNodeId) => {
		const graphNode = node.graphNodes[graphNodeId];
		if (!graphNode) return [];
		return [
			<RoadSplinePointControl
				controlKey={`endpoint:${graphNodeId}`}
				controlSelection={{ kind: "endpoint", id: graphNodeId }}
				key={`endpoint:${graphNodeId}`}
				movePoint={(nextPoint) =>
					moveRoadSplineEndpoint(node, graphNodeId, nextPoint)
				}
				node={node}
				planDraggable={false}
				point={graphNode.position}
				selected={
					elementSelection?.kind === "endpoint" &&
					elementSelection.id === graphNodeId
				}
			/>,
		];
	});
	return [...insertionControls, ...alignmentControls, ...endpointControls];
}
