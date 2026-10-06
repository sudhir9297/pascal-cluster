import { Matrix4, type Light, type Mesh, type Scene } from "three";

/** Poll idle scenes at 10 Hz; keep moving geometry/lights at frame rate. */
export class ReflectionSceneTracker {
	private records = new Map<
		string,
		{ matrix: Matrix4; geometry: string; intensity: number; color: number }
	>();
	private seen = new Set<string>();
	private nextPoll = 0;
	private activeUntil = 0;
	reset() {
		this.records.clear();
		this.seen.clear();
		this.nextPoll = 0;
		this.activeUntil = 0;
	}
	poll(scene: Scene, time: number, force = false) {
		if (!force && time < this.nextPoll && time >= this.activeUntil)
			return false;
		this.nextPoll = time + 0.1;
		scene.updateMatrixWorld();
		this.seen.clear();
		let changed = false;
		scene.traverseVisible((object) => {
			const value = object as Mesh & Light;
			if (
				(!value.isMesh && !value.isLight) ||
				object.name === "mirror-reflection" ||
				!object.layers.isEnabled(0)
			)
				return;
			this.seen.add(object.uuid);
			const old = this.records.get(object.uuid),
				geometry = value.geometry?.uuid ?? "",
				intensity = value.intensity ?? 0,
				color = value.isLight ? value.color.getHex() : 0;
			if (!old) {
				this.records.set(object.uuid, {
					matrix: object.matrixWorld.clone(),
					geometry,
					intensity,
					color,
				});
				changed = true;
			} else if (
				!old.matrix.equals(object.matrixWorld) ||
				old.geometry !== geometry ||
				old.intensity !== intensity ||
				old.color !== color
			) {
				old.matrix.copy(object.matrixWorld);
				old.geometry = geometry;
				old.intensity = intensity;
				old.color = color;
				changed = true;
			}
		});
		for (const id of this.records.keys()) {
			if (!this.seen.has(id)) {
				this.records.delete(id);
				changed = true;
			}
		}
		if (changed) this.activeUntil = time + 0.25;
		return changed;
	}
}
