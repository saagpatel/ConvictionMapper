import type * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import {
	type UseForceGraphReturn,
	useForceGraph,
} from "../../hooks/use-force-graph";
import type { Belief, Connection } from "../../types";

type Props = {
	beliefs: Belief[];
	connections: Connection[];
	connectionDrawSourceId: number | null;
	onNodeClick: (nodeId: number) => void;
	onNodeClickDuringDraw: (nodeId: number) => void;
	onNodeDoubleClick: (nodeId: number) => void;
	onNodeRightClick: (nodeId: number, pos: { x: number; y: number }) => void;
	onNodeDragEnd: (nodeId: number, x: number, y: number) => void;
	onZoomChange: (transform: d3.ZoomTransform) => void;
	onTick?: () => void;
	onBackgroundClick: () => void;
	graphRef?: React.MutableRefObject<UseForceGraphReturn | null>;
	onReady?: () => void;
	onResize?: (width: number, height: number) => void;
};

export function GraphView({
	beliefs,
	connections,
	connectionDrawSourceId,
	onNodeClick,
	onNodeClickDuringDraw,
	onNodeDoubleClick,
	onNodeRightClick,
	onNodeDragEnd,
	onZoomChange,
	onTick,
	onBackgroundClick,
	graphRef,
	onReady,
	onResize,
}: Props) {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });

	// Track container size
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				const w = entry.contentRect.width;
				const h = entry.contentRect.height;
				setSize({ width: w, height: h });
				onResize?.(w, h);
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [onResize]);

	const graph = useForceGraph({
		svgRef,
		beliefs,
		connections,
		width: size.width,
		height: size.height,
		connectionDrawSourceId,
		onNodeClick,
		onNodeClickDuringDraw,
		onNodeDoubleClick,
		onNodeRightClick,
		onNodeDragEnd,
		onZoomChange,
		onTick,
		onBackgroundClick,
	});

	// Expose graph handles to parent + signal ready
	useEffect(() => {
		if (graphRef) {
			graphRef.current = graph;
		}
		if (graph.simulationRef.current) {
			onReady?.();
		}
	}, [graph, graphRef, onReady]);

	return (
		<div ref={containerRef} className="w-full h-full">
			{size.width > 0 && size.height > 0 && (
				<svg
					ref={svgRef}
					width={size.width}
					height={size.height}
					className="w-full h-full"
					style={{ background: "var(--bg-primary)" }}
				/>
			)}
		</div>
	);
}
