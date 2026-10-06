import { useLiveNodeOverrides } from "@pascal-app/core";
import { MirrorNode } from "./schema";

/** Saved nodes and live override records are immutable; parse once per revision. */
const cache = new WeakMap<object, { override: unknown; node: MirrorNode }>();
export function readMirrorNode(raw: { id: string }) {
	const override = useLiveNodeOverrides.getState().get(raw.id);
	const previous = cache.get(raw);
	if (previous && previous.override === override) return previous.node;
	const node = MirrorNode.parse(override ? { ...raw, ...override } : raw);
	cache.set(raw, { override, node });
	return node;
}
