import { Color, Matrix4, Mesh, ShapeGeometry } from "three";
import { MeshBasicNodeMaterial, NodeUpdateType } from "three/webgpu";
import {
	uniform,
	mix,
	normalView,
	positionViewDirection,
	reflector,
} from "three/tsl";
import { type MirrorNode } from "./schema";
import { mirrorOutline, mirrorProjection } from "./geometry";
import { reflectionShapeKey } from "./reflection-policy";

export function createReflection(n: MirrorNode) {
	const reflection = reflector({ resolutionScale: 0.5, bounces: false });
	reflection.reflector.updateBeforeType = NodeUpdateType.NONE;
	const tint = uniform(
		new Color(
			{ silver: "#edf5f7", bronze: "#c8ac8d", smoked: "#879398" }[n.surface],
		),
	);
	const edge = normalView
		.dot(positionViewDirection)
		.abs()
		.oneMinus()
		.pow(3)
		.mul(0.05);
	const material = new MeshBasicNodeMaterial();
	material.colorNode = mix(
		mix(reflection.rgb.mul(tint), tint, 0.018),
		tint,
		edge,
	);
	const geometry = reflectionGeometry(n);
	const mesh = new Mesh(geometry, material);
	mesh.name = "mirror-reflection";
	mesh.position.z = mirrorProjection(n);
	// Picking and painting continue to use the authored glass slot underneath.
	mesh.raycast = () => {};
	mesh.layers.set(0);
	return {
		reflection,
		material,
		mesh,
		key: reflectionShapeKey(n),
		tint,
		camera: new Matrix4(),
		projection: new Matrix4(),
		ready: false,
		textureCamera: null as import("three").Camera | null,
		liveCamera: null as import("three").Camera | null,
		scale: 0,
		revision: -1,
	};
}

// Capture outside the main render pass; the reflector restores its render target/MRT.
export function captureReflection(
	entry: ReturnType<typeof createReflection>,
	scene: import("three").Scene,
	camera: import("three").Camera,
	renderer: unknown,
	scale: number,
) {
	entry.reflection.reflector.resolutionScale = scale;
	entry.reflection.reflector.getVirtualCamera(camera).layers.set(0);
	const owner = entry.mesh.parent?.getObjectByName("mirror-glass")
		? entry.mesh.parent
		: entry.mesh;
	const visible = owner.visible;
	owner.visible = false;
	try {
		entry.reflection.reflector.updateBefore({
			scene,
			camera,
			renderer,
			material: entry.material,
		} as never);
		entry.textureCamera = camera;
	} finally {
		owner.visible = visible;
	}
}

/** Refresh separate export cameras before their main command encoder starts. */
export function installReflectionSnapshotCapture(
	scene: import("three").Scene,
	entries: () => Iterable<ReturnType<typeof createReflection>>,
	liveCamera: () => import("three").Camera | null,
	revision: () => number,
	capturing: { current: boolean },
	invalidate: () => void,
) {
	const previousBeforeRender = scene.onBeforeRender;
	const snapshots = new WeakMap<
		import("three").Camera,
		{ world: Matrix4; projection: Matrix4; revision: number }
	>();
	const beforeRender: typeof scene.onBeforeRender = (...args) => {
		previousBeforeRender.apply(scene, args);
		const [renderer, , camera] = args;
		// Nested reflection renders and the live viewport already have their capture.
		if (
			capturing.current ||
			camera === liveCamera() ||
			!(renderer as unknown as { backend?: { device?: unknown } }).backend
				?.device
		)
			return;
		const previous = snapshots.get(camera),
			version = revision();
		if (
			previous &&
			previous.revision === version &&
			previous.world.equals(camera.matrixWorld) &&
			previous.projection.equals(camera.projectionMatrix)
		) {
			for (const entry of entries())
				if (entry.mesh.visible && entry.mesh.parent)
					bindReflectionCamera(entry, camera);
			invalidate();
			return;
		}
		capturing.current = true;
		try {
			for (const entry of entries()) {
				if (!entry.mesh.visible || !entry.mesh.parent) continue;
				captureReflection(entry, scene, camera, renderer, 1);
			}
			snapshots.set(camera, {
				world: camera.matrixWorld.clone(),
				projection: camera.projectionMatrix.clone(),
				revision: version,
			});
		} finally {
			capturing.current = false;
		}
		invalidate();
	};
	scene.onBeforeRender = beforeRender;
	return () => {
		if (scene.onBeforeRender === beforeRender)
			scene.onBeforeRender = previousBeforeRender;
	};
}

function reflectionGeometry(n: MirrorNode) {
	const inset = n.frameEnabled ? n.frameWidth : 0;
	return new ShapeGeometry(
		mirrorOutline(
			n,
			n.width - 2 * inset - (n.bevelEnabled ? 0.0016 : 0),
			n.height - 2 * inset - (n.bevelEnabled ? 0.0016 : 0),
		),
		96,
	);
}

/** Resizing replaces only the outline; retain the reflector and its GPU targets. */
export function updateReflectionShape(
	entry: ReturnType<typeof createReflection>,
	n: MirrorNode,
) {
	const key = reflectionShapeKey(n);
	if (entry.key === key) return false;
	const previous = entry.mesh.geometry;
	entry.mesh.geometry = reflectionGeometry(n);
	previous.dispose();
	entry.key = key;
	entry.ready = false;
	return true;
}

/** Rebind an already captured camera texture without another scene render. */
export function bindReflectionCamera(
	entry: ReturnType<typeof createReflection>,
	camera: import("three").Camera,
) {
	if (entry.textureCamera === camera) return;
	const virtual = entry.reflection.reflector.getVirtualCamera(camera);
	entry.reflection.value =
		entry.reflection.reflector.getRenderTarget(virtual).texture;
	entry.textureCamera = camera;
}

/** Switch between the authored fallback and live face, never draw both. */
export function setReflectionVisible(
	entry: ReturnType<typeof createReflection>,
	visible: boolean,
) {
	const fallback = entry.mesh.parent?.getObjectByName("mirror-surface");
	if (fallback) fallback.visible = !visible;
	entry.mesh.visible = visible;
}
