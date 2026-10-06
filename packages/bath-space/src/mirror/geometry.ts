import type { GeometryContext } from "@pascal-app/core";
import { createDefaultMaterial, resolveMaterialRef } from "@pascal-app/viewer";
import {
	ExtrudeGeometry,
	ShapeGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
	Path,
	Shape,
	type BufferGeometry,
} from "three";
import { MirrorNode } from "./schema";

export function mirrorOutline(
	n: MirrorNode,
	width = n.width,
	height = n.height,
): Shape {
	const shape = new Shape(),
		x = width / 2,
		y = height / 2;
	if (n.shape === "round" || n.shape === "oval") {
		shape.absellipse(0, 0, x, y, 0, Math.PI * 2, false, 0);
	} else if (n.shape === "arch") {
		const cap = Math.min(x, height / 2);
		shape.moveTo(-x, -y);
		shape.lineTo(x, -y);
		shape.lineTo(x, y - cap);
		shape.absellipse(0, y - cap, x, cap, 0, Math.PI, false, 0);
		shape.lineTo(-x, -y);
	} else if (n.shape === "rectangle") {
		shape.moveTo(-x, -y);
		shape.lineTo(x, -y);
		shape.lineTo(x, y);
		shape.lineTo(-x, y);
	} else {
		const r =
			n.shape === "pill"
				? Math.min(x, y)
				: n.shape === "rounded"
					? Math.min(n.cornerRadius, x, y)
					: 0;
		shape.moveTo(-x + r, -y);
		shape.lineTo(x - r, -y);
		shape.quadraticCurveTo(x, -y, x, -y + r);
		shape.lineTo(x, y - r);
		shape.quadraticCurveTo(x, y, x - r, y);
		shape.lineTo(-x + r, y);
		shape.quadraticCurveTo(-x, y, -x, y - r);
		shape.lineTo(-x, -y + r);
		shape.quadraticCurveTo(-x, -y, -x + r, -y);
	}
	shape.closePath();
	return shape;
}
export const mirrorProjection = (n: MirrorNode) =>
	n.wallGap + n.depth + n.glassThickness;

export function buildMirrorGeometry(raw: MirrorNode, ctx?: GeometryContext) {
	const n = MirrorNode.parse(raw),
		root = new Group();
	const materials = new Map<string, ReturnType<typeof createDefaultMaterial>>();
	const colors = { silver: "#c9dbe0", bronze: "#bda58c", smoked: "#69747d" };
	const material = (slot: "frame" | "glass" | "backing") => {
		if (materials.has(slot)) return materials.get(slot)!;
		const ref = n.slots?.[slot],
			resolved = ref
				? resolveMaterialRef(ref, ctx?.materials, "rendered")
				: null;
		const result =
			resolved ??
			createDefaultMaterial(
				slot === "glass"
					? colors[n.surface]
					: slot === "frame"
						? "#393c40"
						: "#686b70",
				slot === "glass" ? 0.035 : 0.35,
				"rendered",
			);
		if (!resolved && slot === "glass" && "metalness" in result)
			result.metalness = 1;
		materials.set(slot, result);
		return result;
	};
	const add = (
		name: string,
		geometry: BufferGeometry,
		slot: "frame" | "glass" | "backing",
		z: number,
	) => {
		const mesh = new Mesh(geometry, material(slot));
		mesh.name = name;
		mesh.position.z = z;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.userData = { slotId: slot, __fromGeometry: true };
		root.add(mesh);
		return mesh;
	};
	const extrude = (shape: Shape, depth: number, bevel = 0) =>
		new ExtrudeGeometry(shape, {
			depth: depth - 2 * bevel,
			steps: 1,
			curveSegments: 48,
			bevelEnabled: bevel > 0,
			bevelSize: bevel,
			bevelThickness: bevel,
			bevelSegments: 3,
		});
	add("mirror-backing", extrude(mirrorOutline(n), 0.003), "backing", n.wallGap);
	const frame = n.frameEnabled ? n.frameWidth : 0;
	if (frame > 0) {
		const bevel =
			n.frameProfile === "rounded"
				? Math.min(0.002, frame / 4, n.depth / 4)
				: 0;
		const outline = mirrorOutline(n, n.width - 2 * bevel, n.height - 2 * bevel);
		const hole = mirrorOutline(
			n,
			n.width - 2 * frame + 2 * bevel,
			n.height - 2 * frame + 2 * bevel,
		);
		outline.holes.push(new Path(hole.getPoints(96)));
		add(
			"mirror-frame",
			extrude(outline, n.depth, bevel),
			"frame",
			n.wallGap + bevel,
		);
	}
	const bevel = n.bevelEnabled ? 0.0008 : 0;
	const glassOutline = mirrorOutline(
		n,
		n.width - 2 * frame - 2 * bevel,
		n.height - 2 * frame - 2 * bevel,
	);
	const glass = extrude(glassOutline, n.glassThickness, bevel);
	removeGlassFront(glass);
	add("mirror-glass", glass, "glass", n.wallGap + n.depth + bevel);
	// One replaceable front face; the extrusion retains only the rear and bevel/edges.
	const surface = add(
		"mirror-surface",
		new ShapeGeometry(glassOutline, 48),
		"glass",
		mirrorProjection(n),
	);
	surface.castShadow = false;

	if (n.backlight) {
		const outline = mirrorOutline(n, n.width - 0.012, n.height - 0.012);
		outline.holes.push(
			new Path(
				mirrorOutline(n, n.width - 0.028, n.height - 0.028).getPoints(96),
			),
		);
		const color = { warm: "#ffd7a0", neutral: "#fff1d9", cool: "#e0efff" }[
			n.temperature
		];
		const light = new Mesh(
			extrude(outline, 0.002),
			new MeshStandardMaterial({
				color,
				emissive: color,
				emissiveIntensity: n.brightness / 25,
			}),
		);
		light.name = "mirror-backlight";
		light.position.z = Math.max(0, n.wallGap - 0.002);
		light.userData = { __fromGeometry: true };
		root.add(light);
	}
	return root;
}
export const mirrorGeometryKey = (n: MirrorNode) =>
	JSON.stringify([
		n.shape,
		n.width,
		n.height,
		n.depth,
		n.frameWidth,
		n.frameEnabled,
		n.frameProfile,
		n.cornerRadius,
		n.glassThickness,
		n.wallGap,
		n.bevelEnabled,
		n.surface,
		n.backlight,
		n.brightness,
		n.temperature,
		n.slots,
	]);

/** Remove the flat front cap without removing rear glass or its bevelled edges. */
export function removeGlassFront(geometry: BufferGeometry) {
	const positions = geometry.getAttribute("position");
	let front = -Infinity;
	for (let i = 0; i < positions.count; i++)
		front = Math.max(front, positions.getZ(i));
	const original = geometry.index;
	const count = original?.count ?? positions.count;
	const indices: number[] = [];
	for (let i = 0; i < count; i += 3) {
		const triangle = [0, 1, 2].map((offset) =>
			original ? original.getX(i + offset) : i + offset,
		);
		if (
			triangle.every((index) => Math.abs(positions.getZ(index) - front) < 1e-7)
		)
			continue;
		indices.push(...triangle);
	}
	geometry.setIndex(indices);
	geometry.clearGroups();
	return geometry;
}
