import type { ParametricDescriptor } from "@pascal-app/core";
import { RoadCrossSectionInspector } from "./road-network-cross-section-inspector";
import { RoadJunctionInspector } from "./road-network-junction-inspector";
import { RoadLaneGraphInspector } from "./road-network-lanes";
import { RoadLaneMovementInspector } from "./road-lane-movements";
import { RoadSignalPlanInspector } from "./road-signal-phasing";
import { RoadChannelizationInspector } from "./road-channelization";
import { RoadDividedJunctionInspector } from "./road-divided-junctions";
import { RoadSweptPathInspector } from "./road-swept-path";
import { RoadActiveModeInspector } from "./road-active-modes";
import { RoadTrafficSimulationInspector } from "./road-traffic-simulation";
import { RoadsideDecorationInspector } from "./roadside-decoration-rules";
import { RoadPerformanceBudgetInspector } from "./road-network-performance";
import { RoadScaleDiagnosticsInspector } from "./road-network-scale";
import { RoadStylePresetLibrary } from "./road-network-preset-library";
import { RoadSplinePointEditor } from "./road-network-spline-inspector";
import { RoadTerrainEditor } from "./road-network-terrain-inspector";
import { RoadTunnelEditor } from "./road-network-tunnel-inspector";
import { RoadVerticalProfileEditor } from "./road-network-vertical-profile-inspector";
import type { RoadNetworkNode } from "./schema";

export const roadNetworkParametrics: ParametricDescriptor<RoadNetworkNode> = {
	groups: [
		{
			label: "Network",
			fields: [
				{
					key: "regionalPack",
					kind: "enum",
					options: ["right-driving", "left-driving"],
					display: "select",
				},
				{
					key: "presetLibrary",
					kind: "custom",
					component: RoadStylePresetLibrary,
				},
				{ key: "applyStyleToAll", kind: "boolean" },
				{
					key: "snapTolerance",
					kind: "number",
					unit: "m",
					min: 0.05,
					max: 5,
					step: 0.05,
				},
			],
		},
		{
			label: "Directed lanes",
			fields: [
				{
					key: "laneGraph",
					kind: "custom",
					component: RoadLaneGraphInspector,
				},
			],
		},
		{
			label: "Lane movements",
			fields: [
				{
					key: "laneMovementsEditor",
					kind: "custom",
					component: RoadLaneMovementInspector,
				},
			],
		},
		{
			label: "Signal timing",
			fields: [
				{
					key: "signalPlanEditor",
					kind: "custom",
					component: RoadSignalPlanInspector,
				},
			],
		},
		{
			label: "Channelization",
			fields: [
				{
					key: "channelizationEditor",
					kind: "custom",
					component: RoadChannelizationInspector,
				},
			],
		},
		{
			label: "Divided junctions",
			fields: [
				{
					key: "dividedJunctionEditor",
					kind: "custom",
					component: RoadDividedJunctionInspector,
				},
			],
		},
		{
			label: "Vehicle checks",
			fields: [
				{
					key: "sweptPathEditor",
					kind: "custom",
					component: RoadSweptPathInspector,
				},
			],
		},
		{
			label: "Walking and cycling",
			fields: [
				{
					key: "activeModeEditor",
					kind: "custom",
					component: RoadActiveModeInspector,
				},
			],
		},
		{
			label: "Traffic simulation",
			fields: [
				{
					key: "trafficSimulationEditor",
					kind: "custom",
					component: RoadTrafficSimulationInspector,
				},
			],
		},
		{
			label: "Roadside rules",
			fields: [
				{
					key: "roadsideDecorationEditor",
					kind: "custom",
					component: RoadsideDecorationInspector,
				},
			],
		},
		{
			label: "Performance budget",
			fields: [
				{
					key: "performanceBudget",
					kind: "custom",
					component: RoadPerformanceBudgetInspector,
				},
			],
		},
		{
			label: "Scale diagnostics",
			fields: [
				{
					key: "scaleDiagnostics",
					kind: "custom",
					component: RoadScaleDiagnosticsInspector,
				},
			],
		},
		{
			label: "Terrain relationship",
			fields: [
				{
					key: "terrainOffset",
					kind: "number",
					unit: "m",
					min: -10,
					max: 10,
					step: 0.01,
				},
				{
					key: "terrainFalloff",
					kind: "number",
					unit: "m",
					min: 0,
					max: 50,
					step: 0.1,
				},
				{
					key: "embankmentSlope",
					kind: "number",
					min: 0.5,
					max: 8,
					step: 0.1,
				},
				{
					key: "excavationSlope",
					kind: "number",
					min: 0.25,
					max: 8,
					step: 0.1,
				},
				{
					key: "terrainEditor",
					kind: "custom",
					component: RoadTerrainEditor,
				},
			],
		},
		{
			label: "Cross-section",
			fields: [
				{
					key: "crossSectionEditor",
					kind: "custom",
					component: RoadCrossSectionInspector,
				},
			],
		},
		{
			label: "Vertical profile",
			fields: [
				{
					key: "maxRoadGrade",
					kind: "number",
					min: 0.01,
					max: 1,
					step: 0.01,
				},
				{
					key: "verticalProfileEditor",
					kind: "custom",
					component: RoadVerticalProfileEditor,
				},
			],
		},
		{
			label: "Bridge structure",
			fields: [
				{
					key: "bridgeDeckThickness",
					kind: "number",
					unit: "m",
					min: 0.2,
					max: 3,
					step: 0.05,
				},
				{
					key: "bridgeBarrierHeight",
					kind: "number",
					unit: "m",
					min: 0.5,
					max: 2,
					step: 0.05,
				},
				{
					key: "bridgePierSpacing",
					kind: "number",
					unit: "m",
					min: 4,
					max: 80,
					step: 1,
				},
				{
					key: "bridgePierDiameter",
					kind: "number",
					unit: "m",
					min: 0.4,
					max: 4,
					step: 0.1,
				},
				{
					key: "bridgeMinimumClearance",
					kind: "number",
					unit: "m",
					min: 1,
					max: 12,
					step: 0.1,
				},
			],
		},
		{
			label: "Tunnel structure",
			fields: [
				{
					key: "tunnelClearHeight",
					kind: "number",
					unit: "m",
					min: 3,
					max: 15,
					step: 0.1,
				},
				{
					key: "tunnelSideClearance",
					kind: "number",
					unit: "m",
					min: 0.25,
					max: 8,
					step: 0.05,
				},
				{
					key: "tunnelLiningThickness",
					kind: "number",
					unit: "m",
					min: 0.15,
					max: 2,
					step: 0.05,
				},
				{
					key: "tunnelPortalCutLength",
					kind: "number",
					unit: "m",
					min: 1,
					max: 40,
					step: 0.5,
				},
				{
					key: "tunnelCutSlope",
					kind: "number",
					min: 0.25,
					max: 5,
					step: 0.05,
				},
				{
					key: "tunnelEditor",
					kind: "custom",
					component: RoadTunnelEditor,
				},
			],
		},
		{
			label: "Selected spline point",
			fields: [
				{
					key: "splinePointEditor",
					kind: "custom",
					component: RoadSplinePointEditor,
				},
			],
		},
		{
			label: "Selected junction",
			fields: [
				{
					key: "junctionEditor",
					kind: "custom",
					component: RoadJunctionInspector,
				},
			],
		},
	],
};
