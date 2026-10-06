import { expect, test } from "bun:test";
import {
	nextReflection,
	reflectionBackend,
	reflectionQuality,
	reflectionEnabled,
	reflectionViewChanged,
} from "./reflection-policy";
test("reflection scheduling rotates through dirty mirrors without starvation", () => {
	let last: string | null = null;
	const order = [];
	for (let i = 0; i < 6; i++) {
		last = nextReflection(["a", "b", "c"], last);
		order.push(last);
	}
	expect(order).toEqual(["a", "b", "c", "a", "b", "c"]);
	expect(nextReflection([], last)).toBeNull();
	expect(nextReflection(["a", "c"], "removed")).toBe("a");
});
test("reflection quality and backend preserve a safe fallback", () => {
	expect(reflectionQuality(true)).toBe(0.5);
	expect(reflectionQuality(false)).toBe(0.75);
	expect(
		reflectionBackend({
			isWebGPURenderer: true,
			backend: { isWebGLBackend: true },
		}),
	).toBe(false);
	expect(reflectionBackend({ backend: { device: {} } })).toBe(true);
});

test("editor-only changes do not invalidate room reflections", () => {
	const view = {
		shading: "rendered",
		textures: true,
		colorPreset: "default",
		sceneTheme: "studio",
		shadows: true,
		wallMode: "full",
		levelMode: "stacked",
		geometryRevision: 0,
		transparentBackground: false,
		selection: ["a"],
		unit: "metric",
	};
	expect(
		reflectionViewChanged(view, {
			...view,
			selection: ["b"],
			unit: "imperial",
		}),
	).toBe(false);
	expect(reflectionViewChanged(view, { ...view, geometryRevision: 1 })).toBe(
		true,
	);
	expect(reflectionViewChanged(view, { ...view, sceneTheme: "night" })).toBe(
		true,
	);
});

test("mirrors reflect in the editor default solid display mode", () => {
	expect(reflectionEnabled("solid")).toBe(true);
	expect(reflectionEnabled("rendered")).toBe(true);
});
