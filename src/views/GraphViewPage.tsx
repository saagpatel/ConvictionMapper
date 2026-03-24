import { useCallback, useRef } from "react";
import { GraphView } from "../components/graph/GraphView";
import type { UseForceGraphReturn } from "../hooks/use-force-graph";
import { useBeliefStore } from "../store/belief-store";
import { useUIStore } from "../store/ui-store";

export function GraphViewPage() {
	const beliefs = useBeliefStore((s) => s.beliefs);
	const connections = useBeliefStore((s) => s.connections);
	const updateBelief = useBeliefStore((s) => s.updateBelief);
	const selectBelief = useUIStore((s) => s.selectBelief);

	const graphRef = useRef<UseForceGraphReturn | null>(null);

	const handleNodeClick = useCallback(
		(nodeId: number) => {
			selectBelief(nodeId);
		},
		[selectBelief],
	);

	const handleNodeDoubleClick = useCallback((nodeId: number) => {
		graphRef.current?.zoomToNode(nodeId, 1.5);
	}, []);

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
	}, [selectBelief]);

	return (
		<div className="relative flex-1 overflow-hidden">
			<GraphView
				beliefs={beliefs}
				connections={connections}
				connectionDrawSourceId={null}
				onNodeClick={handleNodeClick}
				onNodeClickDuringDraw={() => {}}
				onNodeDoubleClick={handleNodeDoubleClick}
				onNodeRightClick={() => {}}
				onNodeDragEnd={handleNodeDragEnd}
				onZoomChange={() => {}}
				onBackgroundClick={handleBackgroundClick}
				graphRef={graphRef}
			/>
		</div>
	);
}
