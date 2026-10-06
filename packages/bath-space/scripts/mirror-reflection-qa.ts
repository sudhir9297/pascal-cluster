import {
	Scene,
	PerspectiveCamera,
	Color,
	Mesh,
	BoxGeometry,
	MeshStandardMaterial,
	AmbientLight,
	DirectionalLight,
} from "three";
import { WebGPURenderer, RenderPipeline } from "three/webgpu";
import { pass, mrt, output, normalView } from "three/tsl";
import {
	createReflection,
	captureReflection,
	installReflectionSnapshotCapture,
} from "../src/mirror/reflection-material";
import {
	nextReflection,
	reflectionQuality,
} from "../src/mirror/reflection-policy";
import { MirrorNode, mirrorPresets } from "../src/mirror/schema";
import { buildMirrorGeometry } from "../src/mirror/geometry";
async function start() {
	const renderer = new WebGPURenderer({ antialias: true });
	renderer.setSize(1000, 700);
	document.body.append(renderer.domElement);
	await renderer.init();
	const scene = new Scene();
	scene.background = new Color("#dce4eb");
	const camera = new PerspectiveCamera(45, 1000 / 700, 0.1, 100);
	camera.position.set(0.6, 0.5, 7.5);
	camera.lookAt(0, 0, 0);
	const light = new DirectionalLight("#ffffff", 4);
	light.position.set(1, 3, 4);
	scene.add(light, new AmbientLight("#ffffff", 2));
	const entries = mirrorPresets.map((preset, index) => {
		const n = MirrorNode.parse({
			...preset,
			width: 0.85,
			height: 1.05,
			frameWidth: 0.025,
			surface: index === 3 ? "bronze" : index === 5 ? "smoked" : "silver",
			slots: index === 1 ? { glass: "library:chrome" } : undefined,
		});
		const mirror = buildMirrorGeometry(n);
		mirror.position.set(((index % 3) - 1) * 1.2, index < 3 ? 0.6 : -0.65, 0);
		scene.add(mirror);
		const entry = createReflection(n);
		entry.mesh.visible = false;
		mirror.add(entry.mesh);
		scene.add(entry.reflection.target);
		scene.updateMatrixWorld();
		entry.reflection.target.position.set(
			0,
			0,
			n.wallGap + n.depth + n.glassThickness,
		);
		mirror.localToWorld(entry.reflection.target.position);
		return entry;
	});
	let revision = 0,
		last: string | null = null,
		captures = 0;
	const box = new Mesh(
		new BoxGeometry(0.45, 0.7, 0.45),
		new MeshStandardMaterial({ color: "#ca402d", roughness: 0.5 }),
	);
	box.position.set(-0.7, -0.45, 1.5);
	scene.add(box);
	const blue = new Mesh(
		new BoxGeometry(0.3, 0.5, 0.3),
		new MeshStandardMaterial({ color: "#255aab" }),
	);
	blue.position.set(0.6, 0.05, 1);
	scene.add(blue);
	const floor = new Mesh(
		new BoxGeometry(7, 0.05, 7),
		new MeshStandardMaterial({ color: "#b8b4a8" }),
	);
	floor.position.y = -1.25;
	scene.add(floor);
	// An opposite wall behind the viewer is visible only through the mirrors.
	const opposite = new Mesh(
		new BoxGeometry(8, 5, 0.1),
		new MeshStandardMaterial({ color: "#eee7d8" }),
	);
	opposite.position.set(0, 0, 8);
	scene.add(opposite);
	for (let i = 0; i < 4; i++) {
		const band = new Mesh(
			new BoxGeometry(8, 0.35, 0.04),
			new MeshStandardMaterial({ color: i % 2 ? "#2962a3" : "#ba4838" }),
		);
		band.position.set(0, i - 1.5, 7.93);
		scene.add(band);
	}
	const scenePass = pass(scene, camera);
	scenePass.setMRT(mrt({ output, normal: normalView }));
	const pipeline = new RenderPipeline(renderer);
	pipeline.outputNode = scenePass.getTextureNode("output");
	const capturing = { current: false };
	let frame = 0;
	installReflectionSnapshotCapture(
		scene,
		() => entries,
		() => camera,
		() => revision,
		capturing,
		() => {},
	);
	renderer.setAnimationLoop(() => {
		frame++;
		scene.updateMatrixWorld();
		camera.updateMatrixWorld();
		const pending = entries.flatMap((entry, index) => {
			const moving = !entry.camera.equals(camera.matrixWorld);
			const scale = reflectionQuality(moving || entry.revision !== revision);
			return !entry.ready ||
				moving ||
				entry.revision !== revision ||
				entry.scale !== scale
				? [String(index)]
				: [];
		});
		const id = nextReflection(pending, last);
		if (id !== null) {
			const entry = entries[Number(id)]!;
			const scale = reflectionQuality(
				!entry.camera.equals(camera.matrixWorld) || entry.revision !== revision,
			);
			capturing.current = true;
			try {
				captureReflection(entry, scene, camera, renderer, scale);
			} finally {
				capturing.current = false;
			}
			entry.ready = true;
			entry.mesh.visible = true;
			entry.camera.copy(camera.matrixWorld);
			entry.revision = revision;
			entry.scale = scale;
			last = id;
			captures++;
		}
		document.body.dataset.captures = String(captures);
		pipeline.render();
		document.body.dataset.ready = String(frame);
	});
	const button = document.createElement("button");
	button.textContent = "Move reflected object";
	button.onclick = () => {
		box.position.x = box.position.x < 0 ? 0.3 : -0.7;
		revision++;
	};
	document.body.append(button);
	const snapshot = document.createElement("button");
	snapshot.textContent = "Render export camera";
	snapshot.style.left = "230px";
	snapshot.onclick = () => {
		renderer.setAnimationLoop(null);
		const exportCamera = camera.clone();
		exportCamera.position.set(-0.6, 0.5, 7.5);
		exportCamera.lookAt(0, 0, 0);
		exportCamera.updateMatrixWorld();
		renderer.render(scene, exportCamera);
		document.body.dataset.exportReady = "true";
	};
	document.body.append(snapshot);
}
start().catch((error) => {
	document.body.textContent = String(error);
	console.error(error);
});
