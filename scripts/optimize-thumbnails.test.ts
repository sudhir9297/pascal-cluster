import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { optimizeThumbnail, thumbnailSize } from "./optimize-thumbnails";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
	);
});

test("shipped catalog thumbnails fit the sidebar image budget", async () => {
	const root = fileURLToPath(new URL("../", import.meta.url));
	let count = 0;
	for await (const relative of new Bun.Glob("src/*/assets/*.webp").scan(root)) {
		const metadata = await sharp(path.join(root, relative)).metadata();
		expect(metadata.width).toBeGreaterThan(0);
		expect(metadata.height).toBeGreaterThan(0);
		expect(metadata.width).toBeLessThanOrEqual(thumbnailSize);
		expect(metadata.height).toBeLessThanOrEqual(thumbnailSize);
		count++;
	}
	expect(count).toBeGreaterThan(0);
});

test("fits a transparent thumbnail without cropping and leaves repeat runs unchanged", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "bath-thumbnail-"));
	roots.push(root);
	const file = path.join(root, "thumbnail.webp");
	await sharp({
		create: { width: 1600, height: 800, channels: 4, background: "#ffffff80" },
	})
		.webp({ lossless: true })
		.toFile(file);

	await optimizeThumbnail(file);

	const first = await readFile(file);
	const metadata = await sharp(first).metadata();
	expect(metadata.width).toBe(thumbnailSize);
	expect(metadata.height).toBe(thumbnailSize / 2);
	expect(metadata.hasAlpha).toBe(true);
	const { data } = await sharp(first)
		.raw()
		.toBuffer({ resolveWithObject: true });
	expect(data[3]).toBe(128);
	await optimizeThumbnail(file);
	expect(await readFile(file)).toEqual(first);
});
