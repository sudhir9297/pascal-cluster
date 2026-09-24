import type { RoadInsertionPreview } from "./road-network-topology";
import {
	type RoadValidationIssue,
	validateRoadGraph,
} from "./road-network-validation";

export type RoadDraftInvalidState = {
	code: "duplicate" | "too-short" | RoadValidationIssue["code"];
	message: string;
	title: "Cannot place road";
};

function blockingIssueAction(issue: RoadValidationIssue): string {
	switch (issue.code) {
		case "duplicate-edge":
			return "That connection already exists. Choose a different endpoint or extend from an open end.";
		case "short-edge":
		case "self-edge":
			return "Move the endpoint farther from the previous point.";
		case "missing-endpoint":
			return "Repair or remove the broken road edge before adding another road.";
		case "non-finite-alignment":
		case "non-finite-position":
			return "Reset the malformed road point before continuing.";
		case "invalid-vertical-profile":
			return "Fix the road profile stations before adding another segment.";
		default:
			return `Resolve “${issue.message}” before adding this road.`;
	}
}

/** The exact pre-commit rejection state shared by preview and click guards. */
export function roadDraftInvalidState(
	preview: RoadInsertionPreview,
): RoadDraftInvalidState | null {
	if (preview.operation === "too-short") {
		return {
			code: "too-short",
			message: "Move the cursor at least 0.05 m away from the previous point.",
			title: "Cannot place road",
		};
	}
	if (preview.operation === "duplicate") {
		return {
			code: "duplicate",
			message:
				"That road segment already exists. Choose a different endpoint or extend from an open end.",
			title: "Cannot place road",
		};
	}

	const issue = validateRoadGraph(preview.result.graph).find(
		(candidate) => candidate.severity === "error",
	);
	return issue
		? {
				code: issue.code,
				message: blockingIssueAction(issue),
				title: "Cannot place road",
			}
		: null;
}
