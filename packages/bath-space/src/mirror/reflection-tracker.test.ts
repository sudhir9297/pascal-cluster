import { expect, test, spyOn } from "bun:test";
import {
	BoxGeometry,
	Group,
	Mesh,
	MeshBasicMaterial,
	PointLight,
	Scene,
} from "three";
import { ReflectionSceneTracker } from "./reflection-tracker";

test("idle tracking skips frame scans and moving objects resume frame-rate updates", () => {
	const scene = new Scene(),
		mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial()),
		tracker = new ReflectionSceneTracker();
	scene.add(mesh);
	const traverse = spyOn(scene, "traverseVisible");
	expect(tracker.poll(scene, 0)).toBe(true);
	expect(tracker.poll(scene, 1)).toBe(false);
	const count = traverse.mock.calls.length;
	expect(tracker.poll(scene, 1.05)).toBe(false);
	expect(traverse.mock.calls.length).toBe(count);
	mesh.position.x = 1;
	expect(tracker.poll(scene, 1.11)).toBe(true);
	mesh.position.x = 2;
	expect(tracker.poll(scene, 1.12)).toBe(true);
	traverse.mockRestore();
	mesh.geometry.dispose();
	mesh.material.dispose();
});
test("tracking detects ancestor visibility and light changes while ignoring editor layers", () => {
	const scene = new Scene(),
		group = new Group(),
		light = new PointLight(),
		overlay = new Mesh(new BoxGeometry(), new MeshBasicMaterial()),
		tracker = new ReflectionSceneTracker();
	group.add(light);
	scene.add(group, overlay);
	overlay.layers.set(1);
	expect(tracker.poll(scene, 0)).toBe(true);
	overlay.position.x = 3;
	expect(tracker.poll(scene, 1)).toBe(false);
	light.intensity = 2;
	expect(tracker.poll(scene, 2)).toBe(true);
	light.color.set("#ff0000");
	expect(tracker.poll(scene, 2.01)).toBe(true);
	group.visible = false;
	expect(tracker.poll(scene, 2.02)).toBe(true);
	expect(tracker.poll(scene, 3)).toBe(false);
	group.visible = true;
	expect(tracker.poll(scene, 3.01, true)).toBe(true);
	overlay.geometry.dispose();
	overlay.material.dispose();
});
