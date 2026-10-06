import type { SectionModel } from "./fields";
import { sectionFieldPatch } from "./fields";

/** Manufacturer dimensions are metres, not installation heights or plumbing thread sizes. */
type Node = {
	type?: string;
	shape?: string;
	style?: string;
	family?: string;
	layout?: string;
	plateShape?: string;
};
type References = { source: string; fields: Record<string, readonly number[]> };
const hansgrohe =
	"https://assets.hansgrohe.com/celum/web/UK_hansgrohe_Bathroom_Sales_Manual_2022.pdf";
const roca = "https://publications.eu.roca.com/42322/1217821/index-266.html";
export const productSizeReferences: Record<string, References> = {
	"bath-space:mirror": {
		source: "https://www.roca.ro/produse/oglinda-6080cm-812441000",
		fields: { width: [0.6, 0.8, 1], height: [0.8, 0.9], depth: [0.019] },
	},
	"bath-space:towel-rail": {
		source: roca,
		fields: { width: [0.3, 0.4, 0.45, 0.6, 0.75] },
	},
	"bath-space:wall-light": {
		source: "https://www.uk.roca.com/products/mirror-wooden-frame-812382...",
		fields: { width: [0.3], depth: [0.079] },
	},
	"bath-space:toilet-paper-holder": {
		source:
			"https://www.roca.cn/en-GB/products/toilet-roll-holder-without-cover-817890..0?sku=A817890C00",
		fields: { width: [0.182] },
	},
	"bath-space:wall-hung-toilet": {
		source:
			"https://www.duravit.co.uk/file/8a8a818d9227d0b10192290806020627.com-en.0/d-code_2024.pdf",
		fields: { width: [0.37], depth: [0.54] },
	},
	"bath-space:floor-standing-toilet": {
		source:
			"https://www.duravit.co.uk/file/8a8a818d9227d0b10192290806020627.com-en.0/d-code_2024.pdf",
		fields: { width: [0.355, 0.37] },
	},
	"bath-space:wall-flush-plate": {
		source:
			"https://geberit-country-sg.prod.platform.web.geberit.com/_assets/local-media/brochures/geberit-nsea-covert-affairs-a4-brochure-44pp-r8.pdf",
		fields: { width: [0.246], height: [0.164], thickness: [0.012] },
	},
	"bath-space:cistern-flush-control": { source: hansgrohe, fields: {} },
	"bath-space:tap": {
		source: hansgrohe,
		fields: { reach: [0.127, 0.165, 0.225], wallSpacing: [0.15] },
	},
	"bath-space:shower-head": {
		source:
			"https://assets.hansgrohe.com/celum/web/AXOR%20Sales%20Book_2022_en-oP%20AX%20VHB.pdf",
		fields: { width: [0.18, 0.24, 0.25, 0.3], depth: [0.25, 0.3] },
	},
	"bath-space:hand-shower": {
		source:
			"https://www.hansgrohe.com/articledetail-croma-100-hand-shower-vario-28535000",
		fields: { headWidth: [0.1] },
	},
	"bath-space:shower-arm": {
		source: hansgrohe,
		fields: {
			length: [0.1, 0.3, 0.35, 0.39],
			tubeSize: [0.022],
			flangeSize: [0.12],
		},
	},
	"bath-space:shower-hose": {
		source:
			"https://www.hansgrohe.com.sg/bathroom/products/showers/accessories",
		fields: { length: [1.25, 1.6, 2] },
	},
	"bath-space:shower-mount": {
		source:
			"https://www.hansgrohe.com.sg/bathroom/products/showers/accessories",
		fields: { railLength: [0.65, 0.9, 1.1, 1.5] },
	},
	"bath-space:body-jet": {
		source:
			"https://pro.grohe.com/en_pj/rainshower-aqua-body-spray-round-2-spray-26744BE0.html",
		fields: { width: [0.075, 0.127], height: [0.075, 0.127] },
	},
	"bath-space:wall-spout": {
		source:
			"https://pro.hansgrohe.be/fr/articledetail-metropol-mitigeur-lavabo-mural-encastre-avec-bec-16-5-cm-32525000",
		fields: { length: [0.165, 0.225] },
	},
	"bath-space:shower-control": {
		source:
			"https://www.hansgrohe.com/articledetail-crometta-s-showerpipe-240-1jet-with-thermostat-27267000?HGxH430=1",
		fields: { inletSpacing: [0.15] },
	},
	"bath-space:shower-valve": {
		source:
			"https://pro.hansgrohe.com/your-selling-points/innovative-technologies/ibox",
		fields: { mountingDepth: [0.08, 0.108] },
	},
	"bath-space:shower-connector": {
		source:
			"https://www.grohe-mena.com/en_cy/grohtherm-special-shower-safety-mixer-34667000.html",
		fields: {},
	},
	"bath-space:shower-flange": { source: hansgrohe, fields: { width: [0.12] } },
	"bath-space:shower-assembly": {
		source:
			"https://www.hansgrohe.com/articledetail-crometta-s-showerpipe-240-1jet-with-thermostat-27267000?HGxH430=1",
		fields: { armLength: [0.35, 0.39], tubeSize: [0.022] },
	},
	"bath-space:bath-shower": {
		source: hansgrohe,
		fields: { armLength: [0.35, 0.39], tubeSize: [0.022] },
	},
	"bath-space:shower-divider": {
		source:
			"https://www.merlynshowering.com/products/wetrooms/8mm-wetroom-panel.html",
		fields: {
			width: [0.3, 0.4, 0.5, 0.6, 0.7, 0.76, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6],
			height: [2],
			thickness: [0.008],
		},
	},
	"bath-space:bath-screen": {
		source:
			"https://www.merlynshowering.ie/amfile/file/download/file/1787/product/9126/",
		fields: { width: [0.8], height: [1.5], thickness: [0.008] },
	},
	// A deck is built around its bath; factory bath sizes do not define its outside dimensions.
	"bath-space:bath-deck": { source: "model-default", fields: {} },
	"bath-space:bathtub": {
		source: "https://br.kohler.com/product-detail/25164BR",
		fields: { length: [1.7], width: [0.75], height: [0.61] },
	},
};

/** Add references without changing existing basin/vanity policies or dimension geometry. */
export function withProductSizes(
	node: Node,
	model: SectionModel,
	defaults?: Record<string, unknown>,
): SectionModel {
	const catalog = productSizeReferences[node.type ?? ""];
	if (!catalog) return model;
	let fields = catalog.fields;
	let source = catalog.source;
	if (node.type === "bath-space:mirror" && node.shape === "round")
		fields = { width: [0.6, 0.8, 1] };
	if (node.type === "bath-space:bathtub" && node.shape === "walk-in")
		fields = {
			length: [1.3208, 1.524],
			width: [0.7112, 0.8128],
			height: [0.9906],
			seatHeight: [0.4318],
			thresholdHeight: [0.0762],
			doorWidth: [0.43815],
		};
	if (
		node.type === "bath-space:bathtub" &&
		["alcove", "drop-in", "undermount"].includes(node.shape ?? "")
	) {
		fields = { length: [1.5, 1.6, 1.7, 1.8], width: [0.7, 0.75] };
		source = "https://publications.eu.roca.com/42322/441856/index-23.html";
	}
	if (node.type === "bath-space:bathtub" && node.shape === "corner")
		fields = {};
	if (node.type === "bath-space:shower-connector" && node.style === "extension")
		fields = { length: [0.03] };
	// Avoid presenting a rectangular flush plate size for round cistern buttons.
	if (
		node.type === "bath-space:wall-flush-plate" &&
		["round", "square"].includes(node.shape ?? "")
	)
		fields = {};
	if (node.type === "bath-space:body-jet") {
		const round =
			node.style?.startsWith("round") || node.style === "massage-dome";
		fields = round
			? { width: [0.075] }
			: node.style?.startsWith("square")
				? { width: [0.075, 0.127], height: [0.075, 0.127] }
				: {};
		if (!round)
			source =
				"https://cdn.cloud.grohe.com/Literature/Brochures/en_CY/GROHE_SPA_Brochure_en_CY/original/GROHE_SPA_Brochure_en_CY.pdf";
	}
	if (node.type === "bath-space:hand-shower" && node.style !== "round")
		fields = {};
	if (
		node.type === "bath-space:shower-head" &&
		["square-rain", "soft-square", "rectangular"].includes(node.style ?? "")
	)
		fields = { width: [0.25, 0.3], depth: [0.25, 0.3] };
	if (node.type === "bath-space:shower-head" && node.style === "bell")
		fields = { width: [0.18] };
	if (node.type === "bath-space:towel-rail")
		fields = {
			width: node.shape === "double" ? [0.4] : [0.3, 0.45, 0.6, 0.75],
		};
	const dimensions = model.dimensions.map((field) => {
		if (field.presets?.length || field.snapValues?.length) return field;
		if (
			field.unit === "" ||
			field.unit === "°" ||
			field.unit === "rad" ||
			/mountingHeight|tankBottom|paperLength|offset|clearance|bow|insertion|slide|opening|angle/i.test(
				field.key,
			)
		)
			return field;
		const valid = (value: unknown): value is number =>
			typeof value === "number" &&
			Number.isFinite(value) &&
			value >= field.min &&
			value <= field.max;
		const values = (fields[field.key] ?? []).filter(valid);
		const authored = defaults?.[field.key];
		const presets = values.map((value) => ({
			value,
			label: `${Number((value * 1000).toFixed(2))} mm`,
			source:
				node.shape === "walk-in"
					? "https://www.kohlerwalkinbath.com/library/pdf/KWIB-specs-page.pdf"
					: source,
		}));
		if (
			valid(authored) &&
			!values.some((value) => Math.abs(value - authored) < 1e-6)
		)
			presets.push({
				value: authored,
				label: `${Number((authored * 1000).toFixed(2))} mm`,
				source: "model-default",
			});
		presets.sort((a, b) => a.value - b.value);
		return presets.length
			? { ...field, presets, snapValues: presets.map((p) => p.value) }
			: field;
	});
	const primary =
		dimensions.find(
			(field) => field.presets?.length && field.handle !== false,
		) ?? dimensions.find((field) => field.presets?.length);
	const sizeOptions =
		model.sizeOptions ??
		primary?.presets?.map((reference) => ({
			label: reference.label,
			patch: sectionFieldPatch(primary, reference.value) as Record<
				string,
				number
			>,
			source: reference.source,
		}));
	return { ...model, dimensions, sizeOptions };
}
