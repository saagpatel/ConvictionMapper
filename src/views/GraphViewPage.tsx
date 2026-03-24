import { useCallback, useEffect, useRef, useState } from "react";
import { ContextMenu } from "../components/graph/ContextMenu";
import { GraphView } from "../components/graph/GraphView";
import { Minimap } from "../components/graph/Minimap";
import { RelationshipSelector } from "../components/graph/RelationshipSelector";
import type { UseForceGraphReturn } from "../hooks/use-force-graph";
import { useBeliefStore } from "../store/belief-store";
import { useUIStore } from "../store/ui-store";

// ---------------------------------------------------------------------------
// Local state types (transient, view-specific — not in Zustand)
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
	const updateBelief = useBeliefStore((s) => s.updateBelief);
	const removeBelief = useBeliefStore((s) => s.removeBelief);
	const createConnection = useBeliefStore((s) => s.createConnection);
	const selectBelief = useUIStore((s) => s.selectBelief);

	const graphRef = useRef<UseForceGraphReturn | null>(null);
	const [graphReady, setGraphReady] = useState(false);
	const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });
	const [contextMenu, setContextMenu] = useState<ContextMenuState>({
		open: false,
	});
	const [drawState, setDrawState] = useState<ConnectionDrawState>({
		active: false,
	});

	// ------ Keyboard shortcuts: ⌘0 reset zoom, Escape cancel ------

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
				sourceNodeId: drawState.active ? drawState.sourceNodeId : 0,
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

	// ------ Connection draw completion ------

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
				// UNIQUE constraint — silently handled
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
			/>

			{graphReady && graphRef.current && (
				<Minimap
					nodesRef={graphRef.current.nodesRef}
					zoomTransformRef={graphRef.current.zoomTransformRef}
					graphWidth={graphSize.width}
					graphHeight={graphSize.height}
					onPanTo={(x, y) => graphRef.current?.panTo(x, y)}
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
