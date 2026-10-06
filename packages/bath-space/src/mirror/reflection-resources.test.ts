import { PerspectiveCamera } from "three";
import { expect, test } from "bun:test";
import { MirrorNode, mirrorPresets } from "./schema";
import {
	createReflection,
	updateReflectionShape,
	bindReflectionCamera,
} from "./reflection-material";
import { reflectionEnabled } from "./reflection-policy";

test("all mirror profiles retain a reflection with assigned surface finishes", () => {
	for (const preset of mirrorPresets) {
		const n = MirrorNode.parse({
			...preset,
			slots: { glass: "library:chrome", frame: "library:brass" },
		});
		const entry = createReflection(n);
		expect(reflectionEnabled("rendered")).toBe(true);
		expect(entry.material.colorNode).toBeDefined();
		expect(surfaceArea(entry.mesh.geometry)).toBeGreaterThan(0.1);
		expect(entry.mesh.position.z).toBeCloseTo(
			n.wallGap + n.depth + n.glassThickness,
		);
		entry.mesh.geometry.dispose();
		entry.material.dispose();
		entry.reflection.dispose();
	}
});
test("finish and light edits reuse resources; resizing replaces only the outline", () => {
	const n = MirrorNode.parse({}),
		entry = createReflection(n),
		reflector = entry.reflection,
		material = entry.material,
		geometry = entry.mesh.geometry;
	expect(
		updateReflectionShape(
			entry,
			MirrorNode.parse({
				...n,
				surface: "bronze",
				backlight: true,
				brightness: 75,
				frameProfile: "rounded",
				slots: { frame: "library:brass", glass: "library:chrome" },
			}),
		),
	).toBe(false);
	expect(entry.mesh.geometry).toBe(geometry);
	expect(
		updateReflectionShape(entry, MirrorNode.parse({ ...n, width: 1.2 })),
	).toBe(true);
	expect(entry.mesh.geometry).not.toBe(geometry);
	expect(entry.reflection).toBe(reflector);
	expect(entry.material).toBe(material);
	expect(entry.ready).toBe(false);
	entry.mesh.geometry.dispose();
	entry.material.dispose();
	entry.reflection.dispose();
});

function surfaceArea(geometry: import("three").BufferGeometry) {
	const positions = geometry.getAttribute("position"),
		indices = geometry.index!;
	let area = 0;
	for (let i = 0; i < indices.count; i += 3) {
		const a = indices.getX(i),
			b = indices.getX(i + 1),
			c = indices.getX(i + 2);
		area +=
			Math.abs(
				(positions.getX(b) - positions.getX(a)) *
					(positions.getY(c) - positions.getY(a)) -
					(positions.getX(c) - positions.getX(a)) *
						(positions.getY(b) - positions.getY(a)),
			) / 2;
	}
	return area;
}

test("rectangular reflection triangulates the full glass surface", () => {
	const n = MirrorNode.parse({ width: 0.85, height: 1.05, frameWidth: 0.025 }),
		entry = createReflection(n);
	expect(entry.mesh.geometry.index?.count).toBe(6);
	expect(surfaceArea(entry.mesh.geometry)).toBeCloseTo(
		(0.85 - 0.05 - 0.0016) * (1.05 - 0.05 - 0.0016),
		5,
	);
	entry.mesh.geometry.dispose();
	entry.material.dispose();
	entry.reflection.dispose();
});

test("cached reflections rebind the correct camera texture without rendering", () => {
	const entry = createReflection(MirrorNode.parse({})),
		a = new PerspectiveCamera(),
		b = new PerspectiveCamera();
	const targetA = entry.reflection.reflector.getRenderTarget(
		entry.reflection.reflector.getVirtualCamera(a),
	);
	const targetB = entry.reflection.reflector.getRenderTarget(
		entry.reflection.reflector.getVirtualCamera(b),
	);
	bindReflectionCamera(entry, a);
	expect(entry.reflection.value).toBe(targetA.texture);
	bindReflectionCamera(entry, b);
	expect(entry.reflection.value).toBe(targetB.texture);
	bindReflectionCamera(entry, a);
	expect(entry.reflection.value).toBe(targetA.texture);
	entry.mesh.geometry.dispose();
	entry.material.dispose();
	entry.reflection.dispose();
});

test("only one mirror front is visible and glass retains no competing cap", async () => {
	const { buildMirrorGeometry, mirrorProjection } = await import("./geometry");
	const { setReflectionVisible } = await import("./reflection-material");
	for (const preset of mirrorPresets) {
		for (const bevelEnabled of [false, true]) {
			const n = MirrorNode.parse({ ...preset, bevelEnabled }),
				root = buildMirrorGeometry(n),
				entry = createReflection(n);
			root.add(entry.mesh);
			const glass = root.getObjectByName(
				"mirror-glass",
			) as import("three").Mesh;
			const fallback = root.getObjectByName("mirror-surface")!;
			const positions = glass.geometry.getAttribute("position"),
				index = glass.geometry.index!;
			let front = -Infinity;
			for (let i = 0; i < positions.count; i++)
				front = Math.max(front, positions.getZ(i));
			for (let i = 0; i < index.count; i += 3) {
				expect(
					[0, 1, 2].every(
						(offset) =>
							Math.abs(positions.getZ(index.getX(i + offset)) - front) < 1e-7,
					),
				).toBe(false);
			}
			expect(fallback.position.z).toBeCloseTo(mirrorProjection(n));
			expect(entry.mesh.position.z).toBeCloseTo(fallback.position.z);
			setReflectionVisible(entry, true);
			expect(fallback.visible).toBe(false);
			expect(entry.mesh.visible).toBe(true);
			setReflectionVisible(entry, false);
			expect(fallback.visible).toBe(true);
			expect(entry.mesh.visible).toBe(false);
			root.traverse((object) => {
				if (
					object instanceof (glass.constructor as typeof import("three").Mesh)
				)
					object.geometry.dispose();
			});
			entry.material.dispose();
			entry.reflection.dispose();
		}
	}
});

test("capture excludes its own mirror body and restores visibility after failure", async () => {
	const { buildMirrorGeometry } = await import("./geometry");
	const { captureReflection } = await import("./reflection-material");
	const { Scene } = await import("three");
	const n = MirrorNode.parse({}),
		root = buildMirrorGeometry(n),
		entry = createReflection(n),
		scene = new Scene(),
		camera = new PerspectiveCamera();
	scene.add(root);
	root.add(entry.mesh);
	entry.reflection.reflector.updateBefore = () => {
		expect(root.visible).toBe(false);
		throw new Error("capture failed");
	};
	expect(() => captureReflection(entry, scene, camera, {}, 0.5)).toThrow(
		"capture failed",
	);
	expect(root.visible).toBe(true);
	entry.mesh.geometry.dispose();
	entry.material.dispose();
	entry.reflection.dispose();
});
