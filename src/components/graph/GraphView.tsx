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
	onZoomChange: (transform: unknown) => void;
	onTick?: () => void;
	onBackgroundClick: () => void;
	graphRef?: React.MutableRefObject<UseForceGraphReturn | null>;
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
				setSize({
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				});
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

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

	// Expose graph handles to parent
	useEffect(() => {
		if (graphRef) {
			graphRef.current = graph;
		}
	}, [graph, graphRef]);

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
