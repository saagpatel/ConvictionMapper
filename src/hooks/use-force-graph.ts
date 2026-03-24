import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";
import {
	computeDecayBrightness,
	confidenceToRadius,
	strengthToStroke,
} from "../lib/decay";
import { EDGE_COLORS, FORCE_CONFIG } from "../lib/graph-layout";
import type { Belief, Connection, GraphLink, GraphNode } from "../types";

// D3 forceLink mutates source/target from IDs to node objects at runtime.
// These helpers safely extract the node from either form.
function linkSourceNode(d: GraphLink): GraphNode {
	return d.source as unknown as GraphNode;
}
function linkTargetNode(d: GraphLink): GraphNode {
	return d.target as unknown as GraphNode;
}
function linkKey(d: GraphLink): string {
	const s =
		typeof d.source === "number"
			? d.source
			: (d.source as unknown as GraphNode).id;
	const t =
		typeof d.target === "number"
			? d.target
			: (d.target as unknown as GraphNode).id;
	return `${s}-${t}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NodeEventHandler = (nodeId: number) => void;
type NodePositionHandler = (nodeId: number, x: number, y: number) => void;
type NodeContextMenuHandler = (
	nodeId: number,
	pos: { x: number; y: number },
) => void;
type ZoomChangeHandler = (transform: d3.ZoomTransform) => void;

export type UseForceGraphOptions = {
	svgRef: React.RefObject<SVGSVGElement | null>;
	beliefs: Belief[];
	connections: Connection[];
	width: number;
	height: number;
	connectionDrawSourceId: number | null;
	onNodeClick: NodeEventHandler;
	onNodeClickDuringDraw: NodeEventHandler;
	onNodeDoubleClick: NodeEventHandler;
	onNodeRightClick: NodeContextMenuHandler;
	onNodeDragEnd: NodePositionHandler;
	onZoomChange: ZoomChangeHandler;
	onTick?: () => void;
	onBackgroundClick: () => void;
	nowOverride?: Date;
	confidenceOverrides?: Map<number, number>;
	domainColors: Record<string, string>;
};

export type UseForceGraphReturn = {
	simulationRef: React.MutableRefObject<d3.Simulation<
		GraphNode,
		GraphLink
	> | null>;
	zoomTransformRef: React.MutableRefObject<d3.ZoomTransform>;
	nodesRef: React.MutableRefObject<GraphNode[]>;
	linksRef: React.MutableRefObject<GraphLink[]>;
	restart: (alpha?: number) => void;
	freeze: () => void;
	resume: (alpha?: number) => void;
	zoomToNode: (nodeId: number, scale?: number) => void;
	resetZoom: () => void;
	panTo: (x: number, y: number) => void;
};

// ---------------------------------------------------------------------------
// Cluster force — pure function
// ---------------------------------------------------------------------------

function applyClusterForce(
	nodes: GraphNode[],
	strength: number,
	alpha: number,
) {
	const centroids = new Map<string, { x: number; y: number; count: number }>();

	for (const node of nodes) {
		const c = centroids.get(node.domain) ?? { x: 0, y: 0, count: 0 };
		c.x += node.x ?? 0;
		c.y += node.y ?? 0;
		c.count += 1;
		centroids.set(node.domain, c);
	}

	for (const c of centroids.values()) {
		c.x /= c.count;
		c.y /= c.count;
	}

	for (const node of nodes) {
		const c = centroids.get(node.domain);
		if (c && c.count > 1) {
			node.vx = (node.vx ?? 0) + (c.x - (node.x ?? 0)) * strength * alpha;
			node.vy = (node.vy ?? 0) + (c.y - (node.y ?? 0)) * strength * alpha;
		}
	}
}

// ---------------------------------------------------------------------------
// Build GraphNode / GraphLink from store data
// ---------------------------------------------------------------------------

function beliefsToNodes(
	beliefs: Belief[],
	nowOverride?: Date,
	confidenceOverrides?: Map<number, number>,
): GraphNode[] {
	return beliefs.map((b) => {
		const conf = confidenceOverrides?.get(b.id) ?? b.confidence;
		return {
			...b,
			confidence: conf,
			decay_brightness: computeDecayBrightness(
				b.last_touched,
				b.half_life,
				nowOverride,
			),
			x: b.pos_x ?? undefined,
			y: b.pos_y ?? undefined,
			fx: b.pos_x ?? undefined,
			fy: b.pos_y ?? undefined,
		};
	});
}

function connectionsToLinks(connections: Connection[]): GraphLink[] {
	return connections.map((c) => ({
		source: c.from_belief_id,
		target: c.to_belief_id,
		relationship: c.relationship as GraphLink["relationship"],
		strength: c.strength,
	}));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useForceGraph(
	options: UseForceGraphOptions,
): UseForceGraphReturn {
	const { svgRef, beliefs, connections, width, height } = options;

	// Refs for mutable state that outlives renders
	const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(
		null,
	);
	const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
	const nodesRef = useRef<GraphNode[]>([]);
	const linksRef = useRef<GraphLink[]>([]);
	const zoomBehaviorRef = useRef<d3.ZoomBehavior<
		SVGSVGElement,
		unknown
	> | null>(null);
	const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const initialPinsReleasedRef = useRef(false);
	const updateDataRef = useRef<
		((beliefs: Belief[], connections: Connection[]) => void) | null
	>(null);

	// Stable callback refs to avoid re-creating D3 bindings
	const callbacksRef = useRef(options);
	callbacksRef.current = options;

	// ------------------------------------------------------------------
	// Initialize simulation + SVG structure (once)
	// ------------------------------------------------------------------

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg || width === 0 || height === 0) return;

		const svgSel = d3.select(svg);
		svgSel.selectAll("*").remove(); // clean slate (StrictMode double-mount)

		// SVG groups
		const zoomGroup = svgSel.append("g").attr("class", "zoom-group");
		const linksGroup = zoomGroup.append("g").attr("class", "links-group");
		const nodesGroup = zoomGroup.append("g").attr("class", "nodes-group");
		const labelsGroup = zoomGroup.append("g").attr("class", "labels-group");

		// Initial data
		const nodes = beliefsToNodes(
			beliefs,
			callbacksRef.current.nowOverride,
			callbacksRef.current.confidenceOverrides,
		);
		const links = connectionsToLinks(connections);
		nodesRef.current = nodes;
		linksRef.current = links;

		// ------- Simulation -------
		const sim = d3
			.forceSimulation<GraphNode>(nodes)
			.force(
				"charge",
				d3.forceManyBody().strength(FORCE_CONFIG.manyBodyStrength),
			)
			.force(
				"link",
				d3
					.forceLink<GraphNode, GraphLink>(links)
					.id((d) => d.id)
					.distance(
						(l) =>
							FORCE_CONFIG.linkDistanceBase +
							FORCE_CONFIG.linkDistanceScale * (6 - l.strength),
					),
			)
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force("cluster", () => {
				applyClusterForce(
					nodesRef.current,
					FORCE_CONFIG.clusterStrength,
					sim.alpha(),
				);
			})
			.alphaDecay(FORCE_CONFIG.alphaDecayRate)
			.velocityDecay(FORCE_CONFIG.velocityDecay);

		simulationRef.current = sim;

		// ------- D3 selections (enter/update/exit managed manually) -------

		let linkSel = linksGroup
			.selectAll<SVGLineElement, GraphLink>("line")
			.data(links, (d) => linkKey(d))
			.join("line")
			.attr("stroke", (d) => EDGE_COLORS[d.relationship] ?? "#6B7280")
			.attr("stroke-width", (d) => strengthToStroke(d.strength))
			.attr("stroke-opacity", 0.6);

		let nodeSel = nodesGroup
			.selectAll<SVGCircleElement, GraphNode>("circle")
			.data(nodes, (d) => String(d.id))
			.join("circle")
			.attr("r", (d) => confidenceToRadius(d.confidence))
			.attr(
				"fill",
				(d) => callbacksRef.current.domainColors[d.domain] ?? "#6B7280",
			)
			.attr("fill-opacity", (d) => d.decay_brightness)
			.attr("stroke", "var(--bg-primary)")
			.attr("stroke-width", 1.5)
			.attr("cursor", "pointer");

		let labelSel = labelsGroup
			.selectAll<SVGTextElement, GraphNode>("text")
			.data(nodes, (d) => String(d.id))
			.join("text")
			.text((d) => (d.title.length > 20 ? `${d.title.slice(0, 20)}…` : d.title))
			.attr("text-anchor", "middle")
			.attr("fill", "var(--text-secondary)")
			.attr("font-size", 10)
			.attr("pointer-events", "none");

		// ------- Tick -------

		sim.on("tick", () => {
			linkSel
				.attr("x1", (d) => linkSourceNode(d).x ?? 0)
				.attr("y1", (d) => linkSourceNode(d).y ?? 0)
				.attr("x2", (d) => linkTargetNode(d).x ?? 0)
				.attr("y2", (d) => linkTargetNode(d).y ?? 0);

			nodeSel.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);

			labelSel
				.attr("x", (d) => d.x ?? 0)
				.attr("y", (d) => (d.y ?? 0) + confidenceToRadius(d.confidence) + 14);

			callbacksRef.current.onTick?.();

			// Release initial position pins
			if (!initialPinsReleasedRef.current && sim.alpha() < 0.5) {
				for (const n of nodesRef.current) {
					if (n.fx !== null && n.fy !== null) {
						n.fx = null;
						n.fy = null;
					}
				}
				initialPinsReleasedRef.current = true;
			}

			// Idle stop
			if (sim.alpha() < 0.01) {
				sim.stop();
			}
		});

		// ------- Drag -------

		const dragBehavior = d3
			.drag<SVGCircleElement, GraphNode>()
			.on("start", (event, d) => {
				if (!event.active) sim.alphaTarget(0.3).restart();
				d.fx = d.x;
				d.fy = d.y;
			})
			.on("drag", (event, d) => {
				d.fx = event.x;
				d.fy = event.y;
			})
			.on("end", (event, d) => {
				if (!event.active) sim.alphaTarget(0);
				const finalX = d.x ?? 0;
				const finalY = d.y ?? 0;
				d.fx = null;
				d.fy = null;
				callbacksRef.current.onNodeDragEnd(d.id, finalX, finalY);
			});

		nodeSel.call(dragBehavior);

		// ------- Node events -------

		nodeSel.on("click", (event, d) => {
			event.stopPropagation();
			if (callbacksRef.current.connectionDrawSourceId != null) {
				callbacksRef.current.onNodeClickDuringDraw(d.id);
			} else {
				callbacksRef.current.onNodeClick(d.id);
			}
		});

		nodeSel.on("dblclick", (event, d) => {
			event.stopPropagation();
			event.preventDefault();
			callbacksRef.current.onNodeDoubleClick(d.id);
		});

		nodeSel.on("contextmenu", (event, d) => {
			event.preventDefault();
			event.stopPropagation();
			callbacksRef.current.onNodeRightClick(d.id, {
				x: event.clientX,
				y: event.clientY,
			});
		});

		// Background click
		svgSel.on("click", () => {
			callbacksRef.current.onBackgroundClick();
		});

		// ------- Zoom -------

		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.2, 4.0])
			.on("zoom", (event) => {
				zoomGroup.attr("transform", event.transform.toString());
				zoomTransformRef.current = event.transform;
				callbacksRef.current.onZoomChange(event.transform);
			});

		svgSel.call(zoom);
		// Prevent default double-click zoom on SVG background
		svgSel.on("dblclick.zoom", null);
		zoomBehaviorRef.current = zoom;

		// ------- Idle timer on interaction -------

		function resetIdleTimer() {
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
			idleTimerRef.current = setTimeout(() => {
				sim.stop();
			}, FORCE_CONFIG.idleFreezeSecs * 1000);
		}

		svgSel.on("mousedown.idle", () => {
			if (sim.alpha() < 0.01) {
				sim.alpha(0.1).restart();
			}
			resetIdleTimer();
		});

		svgSel.on("wheel.idle", () => {
			if (sim.alpha() < 0.01) {
				sim.alpha(0.1).restart();
			}
			resetIdleTimer();
		});

		// ------- Data update function (called from effect below) -------

		function updateData(newBeliefs: Belief[], newConnections: Connection[]) {
			const prevMap = new Map(nodesRef.current.map((n) => [n.id, n]));

			// Determine added / removed / updated
			const updatedNodes: GraphNode[] = [];
			let hasNew = false;

			for (const b of newBeliefs) {
				const existing = prevMap.get(b.id);
				const overrideConf =
					callbacksRef.current.confidenceOverrides?.get(b.id) ?? b.confidence;
				const nowOvr = callbacksRef.current.nowOverride;
				if (existing) {
					// Update in-place
					existing.confidence = overrideConf;
					existing.domain = b.domain;
					existing.half_life = b.half_life;
					existing.last_touched = b.last_touched;
					existing.title = b.title;
					existing.description = b.description;
					existing.decay_brightness = computeDecayBrightness(
						b.last_touched,
						b.half_life,
						nowOvr,
					);
					updatedNodes.push(existing);
				} else {
					// New node
					hasNew = true;
					const node: GraphNode = {
						...b,
						confidence: overrideConf,
						decay_brightness: computeDecayBrightness(
							b.last_touched,
							b.half_life,
							nowOvr,
						),
						x: width / 2 + (Math.random() - 0.5) * 50,
						y: height / 2 + (Math.random() - 0.5) * 50,
					};
					updatedNodes.push(node);
				}
			}

			// Pin existing when adding new
			if (hasNew) {
				for (const n of updatedNodes) {
					if (prevMap.has(n.id)) {
						n.fx = n.x;
						n.fy = n.y;
					}
				}
				setTimeout(() => {
					for (const n of nodesRef.current) {
						n.fx = null;
						n.fy = null;
					}
					sim.alpha(0.1).restart();
				}, 1000);
			}

			nodesRef.current = updatedNodes;

			const newLinks = connectionsToLinks(newConnections);
			linksRef.current = newLinks;

			// Update simulation
			sim.nodes(updatedNodes);
			const linkForce = sim.force("link") as d3.ForceLink<GraphNode, GraphLink>;
			if (linkForce) linkForce.links(newLinks);

			// Update D3 selections
			linkSel = linksGroup
				.selectAll<SVGLineElement, GraphLink>("line")
				.data(newLinks, (d) => linkKey(d))
				.join("line")
				.attr("stroke", (d) => EDGE_COLORS[d.relationship] ?? "#6B7280")
				.attr("stroke-width", (d) => strengthToStroke(d.strength))
				.attr("stroke-opacity", 0.6);

			nodeSel = nodesGroup
				.selectAll<SVGCircleElement, GraphNode>("circle")
				.data(updatedNodes, (d) => String(d.id))
				.join("circle")
				.attr("r", (d) => confidenceToRadius(d.confidence))
				.attr(
					"fill",
					(d) => callbacksRef.current.domainColors[d.domain] ?? "#6B7280",
				)
				.attr("fill-opacity", (d) => d.decay_brightness)
				.attr("stroke", "var(--bg-primary)")
				.attr("stroke-width", 1.5)
				.attr("cursor", "pointer");

			nodeSel.call(dragBehavior);

			nodeSel.on("click", (event, d) => {
				event.stopPropagation();
				if (callbacksRef.current.connectionDrawSourceId != null) {
					callbacksRef.current.onNodeClickDuringDraw(d.id);
				} else {
					callbacksRef.current.onNodeClick(d.id);
				}
			});

			nodeSel.on("dblclick", (event, d) => {
				event.stopPropagation();
				event.preventDefault();
				callbacksRef.current.onNodeDoubleClick(d.id);
			});

			nodeSel.on("contextmenu", (event, d) => {
				event.preventDefault();
				event.stopPropagation();
				callbacksRef.current.onNodeRightClick(d.id, {
					x: event.clientX,
					y: event.clientY,
				});
			});

			labelSel = labelsGroup
				.selectAll<SVGTextElement, GraphNode>("text")
				.data(updatedNodes, (d) => String(d.id))
				.join("text")
				.text((d) =>
					d.title.length > 20 ? `${d.title.slice(0, 20)}…` : d.title,
				)
				.attr("text-anchor", "middle")
				.attr("fill", "var(--text-secondary)")
				.attr("font-size", 10)
				.attr("pointer-events", "none");

			sim.alpha(0.3).restart();
		}

		// Store updateData for the data-sync effect
		updateDataRef.current = updateData;

		// Cleanup
		return () => {
			sim.stop();
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
			svgSel.selectAll("*").remove();
			svgSel.on(".zoom", null);
			svgSel.on(".idle", null);
			svgSel.on("click", null);
			simulationRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [svgRef, width, height]);

	// ------- Data sync effect -------

	useEffect(() => {
		if (updateDataRef.current && simulationRef.current) {
			updateDataRef.current(beliefs, connections);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [beliefs, connections]);

	// ------- Imperative handles -------

	const restart = useCallback((alpha = 0.3) => {
		simulationRef.current?.alpha(alpha).restart();
	}, []);

	const freeze = useCallback(() => {
		simulationRef.current?.stop();
	}, []);

	const resume = useCallback((alpha = 0.1) => {
		simulationRef.current?.alpha(alpha).restart();
	}, []);

	const zoomToNode = useCallback(
		(nodeId: number, scale = 1.5) => {
			const svg = svgRef.current;
			const zoomBehavior = zoomBehaviorRef.current;
			if (!svg || !zoomBehavior) return;

			const node = nodesRef.current.find((n) => n.id === nodeId);
			if (!node || node.x == null || node.y == null) return;

			const svgSel = d3.select(svg);
			const transform = d3.zoomIdentity
				.translate(width / 2, height / 2)
				.scale(scale)
				.translate(-node.x, -node.y);

			svgSel.transition().duration(500).call(zoomBehavior.transform, transform);
		},
		[svgRef, width, height],
	);

	const resetZoom = useCallback(() => {
		const svg = svgRef.current;
		const zoomBehavior = zoomBehaviorRef.current;
		if (!svg || !zoomBehavior) return;

		d3.select(svg)
			.transition()
			.duration(300)
			.call(zoomBehavior.transform, d3.zoomIdentity);
	}, [svgRef]);

	const panTo = useCallback(
		(x: number, y: number) => {
			const svg = svgRef.current;
			const zoomBehavior = zoomBehaviorRef.current;
			if (!svg || !zoomBehavior) return;

			const currentTransform = zoomTransformRef.current;
			const transform = d3.zoomIdentity
				.translate(width / 2, height / 2)
				.scale(currentTransform.k)
				.translate(-x, -y);

			d3.select(svg)
				.transition()
				.duration(300)
				.call(zoomBehavior.transform, transform);
		},
		[svgRef, width, height],
	);

	return {
		simulationRef,
		zoomTransformRef,
		nodesRef,
		linksRef,
		restart,
		freeze,
		resume,
		zoomToNode,
		resetZoom,
		panTo,
	};
}
