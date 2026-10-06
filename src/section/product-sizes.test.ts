import { expect, test } from "bun:test";
import { withProductSizes, productSizeReferences } from "./product-sizes";
import { sectionDimension, sectionFieldPatch } from "./fields";
import { boundedDimensionValue } from "./model";
const drawing = { width: 1, depth: 1, height: 1, plan: "", section: "" };
test("references stay inside host limits and Custom retains continuous sizing", () => {
	const model = withProductSizes(
		{ type: "bath-space:shower-divider" },
		{
			drawing,
			dimensions: [
				sectionDimension("width", "Width", 0.8, 0.75, 1.05, 0.001, "plan", "x"),
			],
		},
		{ width: 0.8 },
	);
	const field = model.dimensions[0]!;
	expect(field.snapValues).toEqual([0.76, 0.8, 0.9, 1]);
	expect(boundedDimensionValue(field, 0.846)).toBe(0.8);
	expect(
		boundedDimensionValue({ ...field, snapValues: undefined }, 0.846),
	).toBe(0.846);
	expect(model.sizeOptions?.map((o) => o.patch.width)).toEqual([
		0.76, 0.8, 0.9, 1,
	]);
});
test("installation heights, angles and counts are never given product snap stops", () => {
	const model = withProductSizes(
		{ type: "bath-space:shower-assembly" },
		{
			drawing,
			dimensions: [
				sectionDimension("mountingHeight", "Height", 1, 0, 5, 0.01),
				{ ...sectionDimension("jets", "Jets", 2, 0, 4, 1), unit: "" },
			],
		},
		{ mountingHeight: 1, jets: 2 },
	);
	expect(model.dimensions.every((f) => !f.snapValues)).toBe(true);
});
test("defaults remain explicitly identified and preserve custom dimension patches", () => {
	const field = {
		...sectionDimension("height", "Height", 0.6, 0.4, 1, 0.001),
		patch: (height: number) => ({ height: height - 0.1 }),
	};
	const model = withProductSizes(
		{ type: "bath-space:bath-deck" },
		{ drawing, dimensions: [field] },
		{ height: 0.55 },
	);
	expect(model.dimensions[0]!.presets?.[0]?.source).toBe("model-default");
	expect(model.sizeOptions?.[0]?.patch.height).toBeCloseTo(0.45);
	expect(sectionFieldPatch(model.dimensions[0]!, 0.7).height).toBeCloseTo(0.6);
});
test("all added item kinds supply a fixed/default choice without inventing unsupported dimensions", () => {
	for (const [type, reference] of Object.entries(productSizeReferences)) {
		const model = withProductSizes(
			{ type },
			{
				drawing,
				dimensions: [
					sectionDimension("width", "Width", 0.6, 0.01, 3, 0.001, "plan", "x"),
				],
			},
			{ width: 0.6 },
		);
		expect(model.sizeOptions?.length).toBeGreaterThan(0);
		expect(model.dimensions[0]!.snapValues?.every(Number.isFinite)).toBe(true);
		expect(reference.source.length).toBeGreaterThan(0);
	}
});
test("round mirrors and walk-in baths use their own dimensions and existing basin policies are preserved", () => {
	const field = sectionDimension(
		"width",
		"Width",
		0.6,
		0.3,
		2,
		0.001,
		"plan",
		"x",
	);
	expect(
		withProductSizes(
			{ type: "bath-space:mirror", shape: "round" },
			{ drawing, dimensions: [field] },
		).dimensions[0]!.snapValues,
	).toEqual([0.6, 0.8, 1]);
	expect(
		withProductSizes(
			{ type: "bath-space:bathtub", shape: "walk-in" },
			{ drawing, dimensions: [field] },
		).dimensions[0]!.snapValues,
	).toEqual([0.7112, 0.8128]);
	const basin = { drawing, dimensions: [{ ...field, snapValues: [0.4, 0.5] }] };
	expect(withProductSizes({ type: "bath-space:countertop-basin" }, basin)).toBe(
		basin,
	);
});

test("real models and style variants expose bounded choices that serialize without moving their mounting datum", async () => {
	const cases = [
		["mirror", "MirrorNode", "mirror/section", "mirrorSection"],
		["towel-rail", "TowelRailNode", "towel-rail/section", "accessorySection"],
		["wall-light", "WallLightNode", "wall-light/section", "accessorySection"],
		[
			"toilet-paper-holder",
			"ToiletPaperHolderNode",
			"toilet-paper-holder/section",
			"holderSection",
		],
		[
			"wall-hung-toilet",
			"WallHungToiletNode",
			"wall-hung-toilet/section",
			"toiletSection",
		],
		[
			"floor-standing-toilet",
			"FloorStandingToiletNode",
			"floor-standing-toilet/section",
			"toiletSection",
		],
		[
			"flush-control",
			"WallFlushPlateNode",
			"flush-control/section",
			"flushControlSection",
		],
		[
			"flush-control",
			"CisternFlushControlNode",
			"flush-control/section",
			"flushControlSection",
		],
		["taps", "TapNode", "section/tap-section", "tapSection"],
		[
			"shower-head",
			"ShowerHeadNode",
			"section/shower-head-section",
			"showerHeadSection",
		],
		[
			"hand-shower",
			"HandShowerNode",
			"section/hand-shower-section",
			"handShowerSection",
		],
		[
			"shower-arm",
			"ShowerArmNode",
			"section/shower-arm-section",
			"showerArmSection",
		],
		[
			"shower-hose",
			"ShowerHoseNode",
			"shower-hose/section",
			"showerHoseSection",
		],
		[
			"shower-mount",
			"ShowerMountNode",
			"shower-mount/section",
			"showerMountSection",
		],
		["body-jet", "BodyJetNode", "body-jet/section", "bodyJetSection"],
		["wall-spout", "WallSpoutNode", "wall-spout/section", "wallSpoutSection"],
		[
			"shower-control",
			"ShowerControlNode",
			"shower-control/section",
			"showerControlSection",
		],
		[
			"shower-valve",
			"ShowerValveNode",
			"shower-valve/section",
			"showerValveSection",
		],
		[
			"shower-connector",
			"ShowerConnectorNode",
			"shower-connector/section",
			"showerConnectorSection",
		],
		[
			"shower-flange",
			"ShowerFlangeNode",
			"shower-flange/section",
			"showerFlangeSection",
		],
		[
			"shower-assembly",
			"ShowerAssemblyNode",
			"shower-assembly/section",
			"showerAssemblySection",
		],
		[
			"bath-shower",
			"BathShowerNode",
			"shower-assembly/section",
			"showerAssemblySection",
		],
		[
			"shower-divider",
			"ShowerDividerNode",
			"shower-divider/section",
			"showerDividerSection",
		],
		[
			"bath-screen",
			"BathScreenNode",
			"bath-screen/section",
			"bathScreenSection",
		],
		["bath-deck", "BathDeckNode", "bath-deck/section", "bathDeckSection"],
		["bathtub", "BathtubNode", "bathtub/section", "bathSection"],
	];
	for (const [folder, schemaName, sectionPath, sectionName] of cases) {
		const schema = (await import(`../${folder}/schema`))[schemaName!];
		const section = (await import(`../${sectionPath}`))[sectionName!];
		const variants: Record<string, unknown>[] = [{}];
		for (const key of ["shape", "style", "family", "layout", "plateShape"]) {
			let field = schema.shape[key];
			while (field?.unwrap) field = field.unwrap();
			if (field?.options)
				for (const option of field.options) variants.push({ [key]: option });
		}
		for (const variant of variants) {
			const n = schema.parse(variant);
			const model = withProductSizes(n, section(n), n);
			expect(
				model.sizeOptions?.length,
				`${folder} ${JSON.stringify(variant)}`,
			).toBeGreaterThan(0);
			for (const field of model.dimensions) {
				for (const value of field.snapValues ?? []) {
					expect(value).toBeGreaterThanOrEqual(field.min);
					expect(value).toBeLessThanOrEqual(field.max);
					const edited = schema.parse({
						...n,
						...sectionFieldPatch(field, value),
					});
					expect(edited.position).toEqual(n.position);
					expect(edited.mountingHeight).toEqual(n.mountingHeight);
				}
			}
		}
	}
});
