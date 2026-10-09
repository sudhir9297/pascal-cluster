"use client";
import {
	sceneRegistry,
	useLiveNodeOverrides,
	useScene,
	type AnyNodeId,
} from "@pascal-app/core";
import { useViewer, SCENE_LAYER, resolveMaterialRef } from "@pascal-app/viewer";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
	Color,
	Frustum,
	Matrix4,
	type Mesh,
	type Camera,
	Sphere,
	Vector3,
} from "three";
import { MIRROR } from "./schema";
import { mirrorProjection } from "./geometry";

import {
	reflectionQuality,
	reflectionBackend,
	nextReflection,
	reflectionEnabled,
	reflectionViewChanged,
} from "./reflection-policy";
import {
	createReflection,
	updateReflectionShape,
	setReflectionVisible,
	bindReflectionCamera,
	captureReflection,
	installReflectionSnapshotCapture,
} from "./reflection-material";
import { readMirrorNode } from "./runtime-node";

const surfaceColors = {
	silver: new Color("#edf5f7"),
	bronze: new Color("#c8ac8d"),
	smoked: new Color("#879398"),
};

import { ReflectionSceneTracker } from "./reflection-tracker";

type Entry = ReturnType<typeof createReflection>;
export default function MirrorReflections() {
	const { gl, scene, invalidate } = useThree();
	const entries = useRef(new Map<string, Entry>());
	const tracker = useRef(new ReflectionSceneTracker());
	const scannedRevision = useRef(-1);
	const seen = useRef(new Set<string>());
	const dirty = useRef<string[]>([]);
	const tintInputs = useRef(
		new WeakMap<Entry, { node: object; materials: unknown }>(),
	);
	const liveCamera = useRef<Camera | null>(null);
	const capturing = useRef(false);
	const revision = useRef(0),
		last = useRef<string | null>(null);
	const frustum = useRef(new Frustum()),
		matrix = useRef(new Matrix4()),
		bounds = useRef(new Sphere()),
		position = useRef(new Vector3());
	const dispose = (entry: Entry) => {
		setReflectionVisible(entry, false);
		entry.mesh.removeFromParent();
		entry.reflection.target.removeFromParent();
		const release = () => {
			entry.mesh.geometry.dispose();
			entry.material.dispose();
			entry.reflection.dispose();
		};
		const queue = (
			gl as unknown as {
				backend?: {
					device?: { queue?: { onSubmittedWorkDone?: () => Promise<void> } };
				};
			}
		).backend?.device?.queue;
		if (queue?.onSubmittedWorkDone)
			void queue.onSubmittedWorkDone().then(release, release);
		else release();
	};
	useEffect(() => {
		const unsubscribe = useScene.subscribe((state, previous) => {
			if (
				state.nodes === previous.nodes &&
				state.materials === previous.materials
			)
				return;
			revision.current++;
			invalidate();
		});
		const unsubscribeLive = useLiveNodeOverrides.subscribe(() => {
			revision.current++;
			invalidate();
		});
		const unsubscribeViewer = useViewer.subscribe((state, previous) => {
			if (!reflectionViewChanged(state, previous)) return;
			revision.current++;
			invalidate();
		});
		const releaseSnapshotHook = installReflectionSnapshotCapture(
			scene,
			() => entries.current.values(),
			() => liveCamera.current,
			() => revision.current,
			capturing,
			invalidate,
			gl as unknown as { getRenderObjectFunction?: () => unknown },
		);
		return () => {
			releaseSnapshotHook();
			unsubscribe();
			unsubscribeViewer();
			unsubscribeLive();
			for (const entry of entries.current.values()) dispose(entry);
			entries.current.clear();
		};
	}, [gl, scene, invalidate]);
	useFrame(({ camera, clock }) => {
		liveCamera.current = camera;
		if (!reflectionBackend(gl)) return;
		const mirrorIds = sceneRegistry.byType[MIRROR];
		if (!mirrorIds?.size) {
			for (const entry of entries.current.values()) dispose(entry);
			entries.current.clear();
			tracker.current.reset();
			return;
		}
		if (!reflectionEnabled(useViewer.getState().shading)) {
			for (const entry of entries.current.values())
				setReflectionVisible(entry, false);
			return;
		}
		const force = scannedRevision.current !== revision.current;
		if (tracker.current.poll(scene, clock.elapsedTime, force))
			revision.current++;
		scannedRevision.current = revision.current;
		const active = seen.current;
		active.clear();
		const pending = dirty.current;
		pending.length = 0;
		const sceneState = useScene.getState();
		matrix.current.multiplyMatrices(
			camera.projectionMatrix,
			camera.matrixWorldInverse,
		);
		frustum.current.setFromProjectionMatrix(
			matrix.current,
			camera.coordinateSystem,
			camera.reversedDepth,
		);
		for (const id of mirrorIds) {
			const raw = sceneState.nodes[id as AnyNodeId],
				root = sceneRegistry.nodes.get(id);
			if (!raw || !root) continue;
			const n = readMirrorNode(raw);
			active.add(id);
			let entry = entries.current.get(id);
			if (!entry) {
				entry = createReflection(n);
				entries.current.set(id, entry);
				scene.add(entry.reflection.target);
			} else updateReflectionShape(entry, n);
			if (entry.mesh.parent !== root) {
				root.add(entry.mesh);
				entry.ready = false;
			}
			entry.mesh.position.z = mirrorProjection(n);
			const tintInput = tintInputs.current.get(entry);
			if (
				tintInput?.node !== n ||
				tintInput.materials !== sceneState.materials
			) {
				const finish = n.slots?.glass
					? resolveMaterialRef(n.slots.glass, sceneState.materials, "rendered")
					: null;
				const finishColor = (finish as { color?: Color } | null)?.color;
				entry.tint.value.copy(finishColor ?? surfaceColors[n.surface]);
				tintInputs.current.set(entry, {
					node: n,
					materials: sceneState.materials,
				});
			}
			setReflectionVisible(entry, entry.ready);
			if (entry.ready && entry.liveCamera === camera)
				bindReflectionCamera(entry, camera);
			root.updateWorldMatrix(true, false);
			position.current
				.set(0, 0, mirrorProjection(n))
				.applyMatrix4(root.matrixWorld);
			entry.reflection.target.position.copy(position.current);
			root.getWorldQuaternion(entry.reflection.target.quaternion);
			entry.reflection.target.updateMatrixWorld(true);
			let visible = true;
			for (
				let ancestor: Mesh["parent"] = root;
				ancestor;
				ancestor = ancestor.parent
			) {
				if (!ancestor.visible) {
					visible = false;
					break;
				}
			}
			bounds.current.center.copy(position.current);
			bounds.current.radius = Math.hypot(n.width, n.height) / 2;
			if (!visible || !frustum.current.intersectsSphere(bounds.current))
				continue;
			const moving =
				entry.liveCamera !== camera ||
				!entry.camera.equals(camera.matrixWorld) ||
				!entry.projection.equals(camera.projectionMatrix);
			const scale = reflectionQuality(
				moving || entry.revision !== revision.current,
			);
			if (
				!entry.ready ||
				moving ||
				entry.revision !== revision.current ||
				entry.scale !== scale
			)
				pending.push(id);
		}
		for (const [id, entry] of entries.current) {
			if (active.has(id)) continue;
			dispose(entry);
			entries.current.delete(id);
		}
		const id = nextReflection(pending, last.current);
		if (!id) return;
		const entry = entries.current.get(id)!;
		const moving =
			entry.liveCamera !== camera ||
			!entry.camera.equals(camera.matrixWorld) ||
			!entry.projection.equals(camera.projectionMatrix);
		entry.scale = reflectionQuality(
			moving || entry.revision !== revision.current,
		);
		capturing.current = true;
		try {
			captureReflection(entry, scene, camera, gl, entry.scale);
		} finally {
			capturing.current = false;
		}
		entry.ready = entry.reflection.reflector.hasOutput;
		entry.liveCamera = camera;
		setReflectionVisible(entry, entry.ready);
		entry.revision = revision.current;
		entry.camera.copy(camera.matrixWorld);
		entry.projection.copy(camera.projectionMatrix);
		last.current = id;
		if (pending.length > 1 || entry.scale < 0.75) invalidate();
	}, 0.9);
	return null;
}
