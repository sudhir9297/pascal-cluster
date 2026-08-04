/** Stable editor terrain heightfield wire format, kept local for core 0.9.x hosts. */
export type TerrainField = {
	readonly origin: readonly [number, number];
	readonly spacing: number;
	readonly cols: number;
	readonly rows: number;
	readonly step: number;
	readonly heights: Int16Array;
};

export type TerrainData = {
	type: "heightfield";
	origin: [number, number];
	spacing: number;
	cols: number;
	rows: number;
	step: number;
	heights: string;
};

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeBase64(bytes: Uint8Array): string {
	let output = "";
	for (let index = 0; index < bytes.length; index += 3) {
		const first = bytes[index] ?? 0;
		const second = bytes[index + 1] ?? 0;
		const third = bytes[index + 2] ?? 0;
		const remaining = bytes.length - index;
		output += BASE64[first >> 2];
		output += BASE64[((first & 3) << 4) | (second >> 4)];
		output += remaining > 1 ? BASE64[((second & 15) << 2) | (third >> 6)] : "=";
		output += remaining > 2 ? BASE64[third & 63] : "=";
	}
	return output;
}

function decodeBase64(text: string): Uint8Array | null {
	const lookup = new Int8Array(128).fill(-1);
	for (let index = 0; index < BASE64.length; index++) {
		lookup[BASE64.charCodeAt(index)] = index;
	}
	let clean = "";
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		if (code === 61) break;
		if (code > 127 || lookup[code] === -1) return null;
		clean += text[index];
	}
	if (clean.length % 4 === 1) return null;
	const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
	let outputIndex = 0;
	for (let index = 0; index < clean.length; index += 4) {
		const first = lookup[clean.charCodeAt(index)] ?? 0;
		const second = lookup[clean.charCodeAt(index + 1)] ?? 0;
		const third =
			index + 2 < clean.length ? (lookup[clean.charCodeAt(index + 2)] ?? 0) : 0;
		const fourth =
			index + 3 < clean.length ? (lookup[clean.charCodeAt(index + 3)] ?? 0) : 0;
		if (outputIndex < bytes.length)
			bytes[outputIndex++] = (first << 2) | (second >> 4);
		if (outputIndex < bytes.length)
			bytes[outputIndex++] = ((second & 15) << 4) | (third >> 2);
		if (outputIndex < bytes.length)
			bytes[outputIndex++] = ((third & 3) << 6) | fourth;
	}
	return bytes;
}

export function createTerrainField(options?: {
	origin?: readonly [number, number];
	spacing?: number;
	cols?: number;
	rows?: number;
	step?: number;
}): TerrainField {
	const cols = options?.cols ?? 65;
	const rows = options?.rows ?? 65;
	return {
		origin: options?.origin ?? [0, 0],
		spacing: options?.spacing ?? 0.5,
		cols,
		rows,
		step: options?.step ?? 0.01,
		heights: new Int16Array(cols * rows),
	};
}

export function quantize(field: TerrainField, metres: number): number {
	if (!Number.isFinite(metres)) return 0;
	return Math.max(-32768, Math.min(32767, Math.round(metres / field.step)));
}

function sampleHeight(field: TerrainField, col: number, row: number): number {
	const safeCol = Math.max(0, Math.min(field.cols - 1, Math.trunc(col)));
	const safeRow = Math.max(0, Math.min(field.rows - 1, Math.trunc(row)));
	return (field.heights[safeRow * field.cols + safeCol] ?? 0) * field.step;
}

/** Uses the same diagonal and interpolation as the rendered terrain mesh. */
export function surfaceHeightAt(
	field: TerrainField,
	x: number,
	z: number,
): number {
	if (field.cols < 2 || field.rows < 2) return sampleHeight(field, 0, 0);
	const u = Math.min(
		field.cols - 1,
		Math.max(0, (x - field.origin[0]) / field.spacing),
	);
	const v = Math.min(
		field.rows - 1,
		Math.max(0, (z - field.origin[1]) / field.spacing),
	);
	const col = Math.min(field.cols - 2, Math.floor(u));
	const row = Math.min(field.rows - 2, Math.floor(v));
	const tc = u - col;
	const tr = v - row;
	const h00 = sampleHeight(field, col, row);
	const h10 = sampleHeight(field, col + 1, row);
	const h01 = sampleHeight(field, col, row + 1);
	const h11 = sampleHeight(field, col + 1, row + 1);
	return tc + tr <= 1
		? h00 + (h10 - h00) * tc + (h01 - h00) * tr
		: h11 + (h01 - h11) * (1 - tc) + (h10 - h11) * (1 - tr);
}

export function encodeTerrainField(field: TerrainField): TerrainData {
	const bytes = new Uint8Array(field.heights.length * 2);
	const view = new DataView(bytes.buffer);
	for (let index = 0; index < field.heights.length; index++) {
		view.setInt16(index * 2, field.heights[index] ?? 0, true);
	}
	return {
		type: "heightfield",
		origin: [field.origin[0], field.origin[1]],
		spacing: field.spacing,
		cols: field.cols,
		rows: field.rows,
		step: field.step,
		heights: encodeBase64(bytes),
	};
}

export function decodeTerrainField(data: unknown): TerrainField | null {
	if (!data || typeof data !== "object") return null;
	const value = data as Partial<TerrainData>;
	if (
		value.type !== "heightfield" ||
		!Number.isInteger(value.cols) ||
		!Number.isInteger(value.rows)
	)
		return null;
	const cols = value.cols as number;
	const rows = value.rows as number;
	if (
		cols < 1 ||
		rows < 1 ||
		cols > 257 ||
		rows > 257 ||
		typeof value.heights !== "string"
	)
		return null;
	if (
		!Number.isFinite(value.spacing) ||
		(value.spacing ?? 0) <= 0 ||
		!Number.isFinite(value.step) ||
		(value.step ?? 0) <= 0
	)
		return null;
	if (
		!Array.isArray(value.origin) ||
		value.origin.length !== 2 ||
		!value.origin.every(Number.isFinite)
	)
		return null;
	const bytes = decodeBase64(value.heights);
	if (!bytes || bytes.byteLength !== cols * rows * 2) return null;
	const heights = new Int16Array(cols * rows);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	for (let index = 0; index < heights.length; index++)
		heights[index] = view.getInt16(index * 2, true);
	return {
		origin: [value.origin[0], value.origin[1]],
		spacing: value.spacing as number,
		cols,
		rows,
		step: value.step as number,
		heights,
	};
}

export function isDatumField(field: TerrainField): boolean {
	return field.heights.every((height) => height === 0);
}
