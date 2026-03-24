import type * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";
import { DOMAIN_COLORS } from "../../lib/graph-layout";
import type { GraphNode } from "../../types";

type Props = {
	nodesRef: React.RefObject<GraphNode[]>;
	zoomTransformRef: React.RefObject<d3.ZoomTransform>;
	graphWidth: number;
	graphHeight: number;
	onPanTo: (x: number, y: number) => void;
};

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 120;
const CANVAS_PADDING = 10;
const NODE_RADIUS = 2;

export function Minimap({
	nodesRef,
	zoomTransformRef,
	graphWidth,
	graphHeight,
	onPanTo,
}: Props) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const frameRef = useRef<number | null>(null);
	const frameCountRef = useRef(0);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const nodes = nodesRef.current;
		if (!nodes || nodes.length === 0) {
			// Clear to background if no nodes
			ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
			ctx.fillStyle = "rgba(20,23,32,0.8)";
			ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
			return;
		}

		// Compute bounding box of all nodes with 50px padding
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const node of nodes) {
			const nx = node.x ?? 0;
			const ny = node.y ?? 0;
			if (nx < minX) minX = nx;
			if (ny < minY) minY = ny;
			if (nx > maxX) maxX = nx;
			if (ny > maxY) maxY = ny;
		}

		minX -= 50;
		minY -= 50;
		maxX += 50;
		maxY += 50;

		const bbWidth = maxX - minX;
		const bbHeight = maxY - minY;

		// Uniform scale to fit bounding box into canvas with padding
		const drawableW = MINIMAP_WIDTH - CANVAS_PADDING * 2;
		const drawableH = MINIMAP_HEIGHT - CANVAS_PADDING * 2;
		const scale =
			bbWidth > 0 && bbHeight > 0
				? Math.min(drawableW / bbWidth, drawableH / bbHeight)
				: 1;

		// Offset to center the scaled bounding box inside the drawable area
		const scaledW = bbWidth * scale;
		const scaledH = bbHeight * scale;
		const offsetX = CANVAS_PADDING + (drawableW - scaledW) / 2;
		const offsetY = CANVAS_PADDING + (drawableH - scaledH) / 2;

		// Helper: graph coords → canvas coords
		function toCanvas(gx: number, gy: number): [number, number] {
			return [offsetX + (gx - minX) * scale, offsetY + (gy - minY) * scale];
		}

		// Clear
		ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

		// Background
		ctx.fillStyle = "rgba(20,23,32,0.8)";
		ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

		// Draw nodes
		for (const node of nodes) {
			const [cx, cy] = toCanvas(node.x ?? 0, node.y ?? 0);
			const color = DOMAIN_COLORS[node.domain] ?? "#6B7280";

			ctx.beginPath();
			ctx.arc(cx, cy, NODE_RADIUS, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.fill();
		}

		// Draw viewport rectangle
		const transform = zoomTransformRef.current;
		if (transform && graphWidth > 0 && graphHeight > 0) {
			const k = transform.k;
			// Graph-space coordinates of the visible viewport corners
			const vpLeft = -transform.x / k;
			const vpTop = -transform.y / k;
			const vpRight = (graphWidth - transform.x) / k;
			const vpBottom = (graphHeight - transform.y) / k;

			const [x1, y1] = toCanvas(vpLeft, vpTop);
			const [x2, y2] = toCanvas(vpRight, vpBottom);

			ctx.beginPath();
			ctx.rect(x1, y1, x2 - x1, y2 - y1);
			ctx.strokeStyle = "#14B8A6";
			ctx.lineWidth = 1;
			ctx.stroke();
		}
	}, [nodesRef, zoomTransformRef, graphWidth, graphHeight]);

	// RAF loop at ~30fps (skip every other frame)
	useEffect(() => {
		let running = true;

		function loop() {
			if (!running) return;
			frameCountRef.current += 1;
			if (frameCountRef.current % 2 === 0) {
				draw();
			}
			frameRef.current = requestAnimationFrame(loop);
		}

		frameRef.current = requestAnimationFrame(loop);

		return () => {
			running = false;
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current);
			}
		};
	}, [draw]);

	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const nodes = nodesRef.current;
			if (!nodes || nodes.length === 0) return;

			const rect = canvas.getBoundingClientRect();
			const canvasX = event.clientX - rect.left;
			const canvasY = event.clientY - rect.top;

			// Recompute the same bounding box + scale as in draw()
			let minX = Infinity;
			let minY = Infinity;
			let maxX = -Infinity;
			let maxY = -Infinity;

			for (const node of nodes) {
				const nx = node.x ?? 0;
				const ny = node.y ?? 0;
				if (nx < minX) minX = nx;
				if (ny < minY) minY = ny;
				if (nx > maxX) maxX = nx;
				if (ny > maxY) maxY = ny;
			}

			minX -= 50;
			minY -= 50;
			maxX += 50;
			maxY += 50;

			const bbWidth = maxX - minX;
			const bbHeight = maxY - minY;

			const drawableW = MINIMAP_WIDTH - CANVAS_PADDING * 2;
			const drawableH = MINIMAP_HEIGHT - CANVAS_PADDING * 2;
			const scale =
				bbWidth > 0 && bbHeight > 0
					? Math.min(drawableW / bbWidth, drawableH / bbHeight)
					: 1;

			const scaledW = bbWidth * scale;
			const scaledH = bbHeight * scale;
			const offsetX = CANVAS_PADDING + (drawableW - scaledW) / 2;
			const offsetY = CANVAS_PADDING + (drawableH - scaledH) / 2;

			// Reverse canvas → graph coords
			const graphX = (canvasX - offsetX) / scale + minX;
			const graphY = (canvasY - offsetY) / scale + minY;

			onPanTo(graphX, graphY);
		},
		[nodesRef, onPanTo],
	);

	return (
		<div className="fixed bottom-4 right-4 z-20">
			<canvas
				ref={canvasRef}
				width={MINIMAP_WIDTH}
				height={MINIMAP_HEIGHT}
				className="rounded-lg border border-border cursor-crosshair"
				onClick={handleClick}
			/>
		</div>
	);
}
