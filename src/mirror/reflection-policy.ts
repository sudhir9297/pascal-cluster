export function reflectionQuality(moving: boolean) {
	return moving ? 0.5 : 0.75;
}
export function reflectionBackend(renderer: unknown) {
	const backend = (
		renderer as { backend?: { device?: unknown; isWebGPUBackend?: boolean } }
	).backend;
	return Boolean(backend?.device || backend?.isWebGPUBackend);
}
export function nextReflection(ids: string[], last: string | null) {
	if (!ids.length) return null;
	const index = last === null ? -1 : ids.indexOf(last);
	return ids[(index + 1) % ids.length]!;
}

/** Only outline edits require a new reflection mesh/render target. */
export function reflectionShapeKey(n: import("./schema").MirrorNode) {
	return JSON.stringify([
		n.shape,
		n.width,
		n.height,
		n.frameEnabled ? n.frameWidth : 0,
		n.shape === "rounded" ? n.cornerRadius : 0,
		n.bevelEnabled,
	]);
}
export function reflectionEnabled(shading: string) {
	return shading === "solid" || shading === "rendered";
}

/** Selection, units and editor overlays do not change a room reflection. */
export function reflectionViewChanged(a: ReflectionView, b: ReflectionView) {
	return viewKeys.some((key) => a[key] !== b[key]);
}
const viewKeys = [
	"shading",
	"textures",
	"colorPreset",
	"sceneTheme",
	"shadows",
	"wallMode",
	"levelMode",
	"geometryRevision",
	"transparentBackground",
] as const;
type ReflectionView = Record<(typeof viewKeys)[number], unknown>;
