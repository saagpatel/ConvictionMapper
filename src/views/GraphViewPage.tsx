import { addYears } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContextMenu } from "../components/graph/ContextMenu";
import { DecayDemoBanner } from "../components/graph/DecayDemoBanner";
import { GraphView } from "../components/graph/GraphView";
import { Minimap } from "../components/graph/Minimap";
import { RelationshipSelector } from "../components/graph/RelationshipSelector";
import { TimeTravelPanel } from "../components/graph/TimeTravelPanel";
import type { UseForceGraphReturn } from "../hooks/use-force-graph";
import { getBeliefsAtDate } from "../lib/tauri-commands";
import { useBeliefStore } from "../store/belief-store";
import { useSettingsStore } from "../store/settings-store";
import { useUIStore } from "../store/ui-store";

// ---------------------------------------------------------------------------
// Local state types
// ---------------------------------------------------------------------------

type ContextMenuState =
	| { open: false }
	| { open: true; nodeId: number; x: number; y: number };

type ConnectionDrawState =
	| { active: false }
	| { active: true; sourceNodeId: number; phase: "drawing" }
	| {
			active: true;
			sourceNodeId: number;
			phase: "selecting";
			targetNodeId: number;
	  };

export function GraphViewPage() {
	const beliefs = useBeliefStore((s) => s.beliefs);
	const connections = useBeliefStore((s) => s.connections);
	const predictionCounts = useBeliefStore((s) => s.predictionCounts);
	const updateBelief = useBeliefStore((s) => s.updateBelief);
	const removeBelief = useBeliefStore((s) => s.removeBelief);
	const createConnection = useBeliefStore((s) => s.createConnection);
	const selectBelief = useUIStore((s) => s.selectBelief);
	const decayDemoMode = useSettingsStore((s) => s.decayDemoMode);
	const domainColors = useSettingsStore((s) => s.domainColors);

	const graphRef = useRef<UseForceGraphReturn | null>(null);
	const [graphReady, setGraphReady] = useState(false);
	const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		open: false,
	});
	const [drawState, setDrawState] = useState<ConnectionDrawState>({
		active: false,
	});

	// ------ Time-travel state ------
	const [timeTravelDate, setTimeTravelDate] = useState<Date | null>(null);
	const [confidenceOverrides, setConfidenceOverrides] = useState<
		Map<number, number>
	>(new Map());

	// Fetch historical confidence when time-travel date changes
	useEffect(() => {
		if (!timeTravelDate) {
			setConfidenceOverrides(new Map());
			return;
		}
		getBeliefsAtDate(timeTravelDate.toISOString())
			.then((snapshots) => {
				const map = new Map<number, number>();
				for (const s of snapshots) {
					map.set(s.belief_id, s.confidence);
				}
				setConfidenceOverrides(map);
			})
			.catch(() => {
				setConfidenceOverrides(new Map());
			});
	}, [timeTravelDate]);

	// Compute nowOverride: time-travel date > decay demo > live
	const nowOverride = useMemo(() => {
		if (timeTravelDate) return timeTravelDate;
		if (decayDemoMode) return addYears(new Date(), 1);
		return undefined;
	}, [timeTravelDate, decayDemoMode]);

	// Earliest belief date for time-travel slider range
	const minDate = useMemo(() => {
		if (beliefs.length === 0) return new Date().toISOString();
		return beliefs.reduce(
			(min, b) => (b.created_at < min ? b.created_at : min),
			beliefs[0].created_at,
		);
	}, [beliefs]);

	// ------ Keyboard shortcuts ------

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.metaKey && e.key === "0") {
				e.preventDefault();
				graphRef.current?.resetZoom();
			}
			if (e.key === "Escape") {
				if (drawState.active) {
					setDrawState({ active: false });
				}
				if (contextMenu.open) {
					setContextMenu({ open: false });
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [drawState.active, contextMenu.open]);

	// ------ Node event handlers ------

	const handleNodeClick = useCallback(
		(nodeId: number) => {
			selectBelief(nodeId);
		},
		[selectBelief],
	);

	const handleNodeClickDuringDraw = useCallback(
		(targetNodeId: number) => {
			if (!drawState.active) return;
			setDrawState({
				active: true,
				sourceNodeId: drawState.sourceNodeId,
				phase: "selecting",
				targetNodeId,
			});
		},
		[drawState],
	);

	const handleNodeDoubleClick = useCallback((nodeId: number) => {
		graphRef.current?.zoomToNode(nodeId, 1.5);
	}, []);

	const handleNodeRightClick = useCallback(
		(nodeId: number, pos: { x: number; y: number }) => {
			setContextMenu({ open: true, nodeId, x: pos.x, y: pos.y });
		},
		[],
	);

	const handleNodeDragEnd = useCallback(
		async (nodeId: number, x: number, y: number) => {
			const belief = beliefs.find((b) => b.id === nodeId);
			if (!belief) return;
			await updateBelief({
				id: belief.id,
				title: belief.title,
				description: belief.description ?? undefined,
				confidence: belief.confidence,
				domain: belief.domain,
				half_life: belief.half_life,
				pos_x: x,
				pos_y: y,
			});
		},
		[beliefs, updateBelief],
	);

	const handleBackgroundClick = useCallback(() => {
		selectBelief(null);
		setContextMenu({ open: false });
		if (drawState.active && drawState.phase === "drawing") {
			setDrawState({ active: false });
		}
	}, [selectBelief, drawState]);

	// ------ Context menu actions ------

	const handleContextEdit = useCallback(
		(nodeId: number) => {
			selectBelief(nodeId);
			setContextMenu({ open: false });
		},
		[selectBelief],
	);

	const handleContextConnect = useCallback((nodeId: number) => {
		setDrawState({ active: true, sourceNodeId: nodeId, phase: "drawing" });
		setContextMenu({ open: false });
	}, []);

	const handleContextTouch = useCallback(
		async (nodeId: number) => {
			const belief = beliefs.find((b) => b.id === nodeId);
			if (!belief) return;
			await updateBelief({
				id: belief.id,
				title: belief.title,
				description: belief.description ?? undefined,
				confidence: belief.confidence,
				domain: belief.domain,
				half_life: belief.half_life,
				pos_x: belief.pos_x ?? undefined,
				pos_y: belief.pos_y ?? undefined,
				last_touched: new Date().toISOString(),
			});
			setContextMenu({ open: false });
		},
		[beliefs, updateBelief],
	);

	const handleContextDelete = useCallback(
		async (nodeId: number) => {
			await removeBelief(nodeId);
			setContextMenu({ open: false });
		},
		[removeBelief],
	);

	const handleConnectionComplete = useCallback(
		async (payload: {
			from_belief_id: number;
			to_belief_id: number;
			relationship: string;
			strength: number;
		}) => {
			try {
				await createConnection(
					payload as Parameters<typeof createConnection>[0],
				);
			} catch {
				// UNIQUE constraint
			}
			setDrawState({ active: false });
		},
		[createConnection],
	);

	return (
		<div
			className={`relative flex-1 overflow-hidden ${drawState.active && drawState.phase === "drawing" ? "cursor-crosshair" : ""}`}
		>
			<GraphView
				beliefs={beliefs}
				connections={connections}
				connectionDrawSourceId={
					drawState.active ? drawState.sourceNodeId : null
				}
				onNodeClick={handleNodeClick}
				onNodeClickDuringDraw={handleNodeClickDuringDraw}
				onNodeDoubleClick={handleNodeDoubleClick}
				onNodeRightClick={handleNodeRightClick}
				onNodeDragEnd={handleNodeDragEnd}
				onZoomChange={() => {}}
				onBackgroundClick={handleBackgroundClick}
				graphRef={graphRef}
				onReady={() => setGraphReady(true)}
				onResize={(w, h) => setGraphSize({ width: w, height: h })}
				nowOverride={nowOverride}
				confidenceOverrides={
					confidenceOverrides.size > 0 ? confidenceOverrides : undefined
				}
				domainColors={domainColors}
				predictionCounts={predictionCounts}
			/>

			{/* Decay demo banner */}
			{decayDemoMode && !timeTravelDate && (
				<DecayDemoBanner
					onExit={() => useSettingsStore.getState().setDecayDemoMode(false)}
				/>
			)}

			{/* Time-travel panel */}
			<TimeTravelPanel
				minDate={minDate}
				currentDate={timeTravelDate}
				onDateChange={setTimeTravelDate}
			/>

			{/* Minimap */}
			{graphReady && graphRef.current && (
				<Minimap
					nodesRef={graphRef.current.nodesRef}
					zoomTransformRef={graphRef.current.zoomTransformRef}
					graphWidth={graphSize.width}
					graphHeight={graphSize.height}
					onPanTo={(x, y) => graphRef.current?.panTo(x, y)}
					domainColors={domainColors}
				/>
			)}

			{contextMenu.open && (
				<ContextMenu
					nodeId={contextMenu.nodeId}
					x={contextMenu.x}
					y={contextMenu.y}
					onEdit={handleContextEdit}
					onConnect={handleContextConnect}
					onTouch={handleContextTouch}
					onDelete={handleContextDelete}
					onClose={() => setContextMenu({ open: false })}
				/>
			)}

			{drawState.active && drawState.phase === "selecting" && (
				<RelationshipSelector
					sourceNodeId={drawState.sourceNodeId}
					targetNodeId={drawState.targetNodeId}
					beliefs={beliefs.map((b) => ({ id: b.id, title: b.title }))}
					onComplete={handleConnectionComplete}
					onCancel={() => setDrawState({ active: false })}
				/>
			)}
		</div>
	);
}
