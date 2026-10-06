import { expect, test } from "bun:test";
import { useLiveNodeOverrides } from "@pascal-app/core";
import { MirrorNode } from "./schema";
import { readMirrorNode } from "./runtime-node";
test("runtime node cache reuses static parsing and refreshes live dimensions", () => {
	const raw = MirrorNode.parse({ shape: "round" });
	const node = readMirrorNode(raw);
	expect(readMirrorNode(raw)).toBe(node);
	try {
		useLiveNodeOverrides.getState().set(raw.id, { width: 1.2 });
		const live = readMirrorNode(raw);
		expect(live.width).toBe(1.2);
		expect(live.height).toBe(1.2);
		expect(readMirrorNode(raw)).toBe(live);
	} finally {
		useLiveNodeOverrides.getState().clear(raw.id);
	}
	expect(readMirrorNode(raw).width).toBe(raw.width);
});
