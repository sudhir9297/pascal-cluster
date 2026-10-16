import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Catalog cards render below 170 CSS pixels. 512 pixels also covers high-density screens.
export const thumbnailSize = 512;

export async function optimizeThumbnail(
	file: string,
): Promise<{ before: number; after: number }> {
	const original = await readFile(file);
	const metadata = await sharp(original).metadata();
	if (!metadata.width || !metadata.height)
		throw new Error(`Missing image dimensions: ${file}`);
	if (Math.max(metadata.width, metadata.height) <= thumbnailSize) {
		return { before: original.length, after: original.length };
	}
	const optimized = await sharp(original)
		.resize(thumbnailSize, thumbnailSize, {
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality: 90, alphaQuality: 100, effort: 6 })
		.toBuffer();
	await writeFile(file, optimized);
	return { before: original.length, after: optimized.length };
}

async function optimizeCatalog(): Promise<void> {
	const source = fileURLToPath(new URL("../src/", import.meta.url));
	let before = 0;
	let after = 0;
	let count = 0;
	const files: string[] = [];
	for (const kind of await readdir(source, { withFileTypes: true })) {
		if (!kind.isDirectory()) continue;
		const directory = path.join(source, kind.name, "assets");
		let entries: string[];
		try {
			entries = await readdir(directory);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
			continue;
		}
		for (const name of entries.sort()) {
			if (!name.endsWith(".webp")) continue;
			files.push(path.join(directory, name));
		}
	}
	for (let start = 0; start < files.length; start += 4) {
		const results = await Promise.all(
			files.slice(start, start + 4).map(optimizeThumbnail),
		);
		for (const sizes of results) {
			before += sizes.before;
			after += sizes.after;
			count++;
		}
	}
	console.log(
		`${count} catalog thumbnails: ${(before / 1024 / 1024).toFixed(2)} MiB → ${(after / 1024 / 1024).toFixed(2)} MiB`,
	);
}

if (import.meta.main) await optimizeCatalog();
