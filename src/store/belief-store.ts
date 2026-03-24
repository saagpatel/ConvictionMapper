import { create } from "zustand";
import {
	deleteBelief,
	deleteConnection,
	deleteEvidence,
	deletePrediction,
	getBeliefs,
	getConnections,
	getEvidence,
	getEvidenceCounts,
	getPredictionCounts,
	getPredictions,
	logUpdate,
	resolvePrediction as resolvePredictionCmd,
	upsertBelief,
	upsertConnection,
	upsertEvidence,
	upsertPrediction,
} from "../lib/tauri-commands";
import type {
	Belief,
	BeliefPayload,
	Connection,
	ConnectionPayload,
	Evidence,
	EvidencePayload,
	Prediction,
	PredictionCount,
	PredictionPayload,
	ResolvePredictionPayload,
} from "../types";

interface BeliefState {
	beliefs: Belief[];
	connections: Connection[];
	evidenceCounts: Record<number, number>;
	evidenceCache: Record<number, Evidence[]>;
	predictionCounts: Record<number, PredictionCount>;
	predictionCache: Record<number, Prediction[]>;
	loaded: boolean;

	loadAll: () => Promise<void>;

	createBelief: (payload: BeliefPayload) => Promise<Belief>;
	updateBelief: (payload: BeliefPayload) => Promise<Belief>;
	removeBelief: (id: number) => Promise<void>;

	changeConfidence: (
		beliefId: number,
		oldConf: number,
		newConf: number,
		trigger?: string,
	) => Promise<Belief>;

	loadEvidence: (beliefId: number) => Promise<Evidence[]>;
	addEvidence: (payload: EvidencePayload) => Promise<Evidence>;
	removeEvidence: (id: number, beliefId: number) => Promise<void>;

	loadPredictions: (beliefId: number) => Promise<Prediction[]>;
	addPrediction: (payload: PredictionPayload) => Promise<Prediction>;
	removePrediction: (id: number, beliefId: number) => Promise<void>;
	resolvePrediction: (payload: ResolvePredictionPayload) => Promise<Prediction>;

	createConnection: (payload: ConnectionPayload) => Promise<Connection>;
	removeConnection: (id: number) => Promise<void>;
}

export const useBeliefStore = create<BeliefState>((set, get) => ({
	beliefs: [],
	connections: [],
	evidenceCounts: {},
	evidenceCache: {},
	predictionCounts: {},
	predictionCache: {},
	loaded: false,

	loadAll: async () => {
		const [beliefs, connections, evCounts, predCounts] = await Promise.all([
			getBeliefs(),
			getConnections(),
			getEvidenceCounts(),
			getPredictionCounts(),
		]);

		const evidenceCounts: Record<number, number> = {};
		for (const { belief_id, count } of evCounts) {
			evidenceCounts[belief_id] = count;
		}

		const predictionCounts: Record<number, PredictionCount> = {};
		for (const pc of predCounts) {
			predictionCounts[pc.belief_id] = pc;
		}

		set({
			beliefs,
			connections,
			evidenceCounts,
			predictionCounts,
			loaded: true,
		});
	},

	createBelief: async (payload) => {
		const belief = await upsertBelief(payload);
		await logUpdate({
			belief_id: belief.id,
			old_confidence: null,
			new_confidence: belief.confidence,
		});
		set((state) => ({
			beliefs: [belief, ...state.beliefs],
			evidenceCounts: { ...state.evidenceCounts, [belief.id]: 0 },
		}));
		return belief;
	},

	updateBelief: async (payload) => {
		const belief = await upsertBelief(payload);
		set((state) => ({
			beliefs: state.beliefs.map((b) => (b.id === belief.id ? belief : b)),
		}));
		return belief;
	},

	removeBelief: async (id) => {
		await deleteBelief(id);
		set((state) => ({
			beliefs: state.beliefs.filter((b) => b.id !== id),
			connections: state.connections.filter(
				(c) => c.from_belief_id !== id && c.to_belief_id !== id,
			),
			evidenceCounts: (() => {
				const counts = { ...state.evidenceCounts };
				delete counts[id];
				return counts;
			})(),
			evidenceCache: (() => {
				const cache = { ...state.evidenceCache };
				delete cache[id];
				return cache;
			})(),
			predictionCounts: (() => {
				const counts = { ...state.predictionCounts };
				delete counts[id];
				return counts;
			})(),
			predictionCache: (() => {
				const cache = { ...state.predictionCache };
				delete cache[id];
				return cache;
			})(),
		}));
	},

	changeConfidence: async (beliefId, oldConf, newConf, trigger) => {
		const belief = get().beliefs.find((b) => b.id === beliefId);
		if (!belief) throw new Error(`Belief ${beliefId} not found`);

		const updated = await upsertBelief({
			id: belief.id,
			title: belief.title,
			description: belief.description ?? undefined,
			confidence: newConf,
			domain: belief.domain,
			half_life: belief.half_life,
			pos_x: belief.pos_x ?? undefined,
			pos_y: belief.pos_y ?? undefined,
		});

		await logUpdate({
			belief_id: beliefId,
			old_confidence: oldConf,
			new_confidence: newConf,
			trigger_description: trigger,
		});

		set((state) => ({
			beliefs: state.beliefs.map((b) => (b.id === beliefId ? updated : b)),
		}));
		return updated;
	},

	loadEvidence: async (beliefId) => {
		const evidence = await getEvidence(beliefId);
		set((state) => ({
			evidenceCache: { ...state.evidenceCache, [beliefId]: evidence },
		}));
		return evidence;
	},

	addEvidence: async (payload) => {
		const evidence = await upsertEvidence(payload);
		set((state) => ({
			evidenceCache: {
				...state.evidenceCache,
				[payload.belief_id]: [
					evidence,
					...(state.evidenceCache[payload.belief_id] ?? []),
				],
			},
			evidenceCounts: {
				...state.evidenceCounts,
				[payload.belief_id]: (state.evidenceCounts[payload.belief_id] ?? 0) + 1,
			},
		}));
		return evidence;
	},

	removeEvidence: async (id, beliefId) => {
		await deleteEvidence(id);
		set((state) => ({
			evidenceCache: {
				...state.evidenceCache,
				[beliefId]: (state.evidenceCache[beliefId] ?? []).filter(
					(e) => e.id !== id,
				),
			},
			evidenceCounts: {
				...state.evidenceCounts,
				[beliefId]: Math.max(0, (state.evidenceCounts[beliefId] ?? 0) - 1),
			},
		}));
	},

	loadPredictions: async (beliefId) => {
		const predictions = await getPredictions(beliefId);
		set((state) => ({
			predictionCache: { ...state.predictionCache, [beliefId]: predictions },
		}));
		return predictions;
	},

	addPrediction: async (payload) => {
		const prediction = await upsertPrediction(payload);
		set((state) => {
			const existing = state.predictionCounts[payload.belief_id];
			return {
				predictionCache: {
					...state.predictionCache,
					[payload.belief_id]: [
						...(state.predictionCache[payload.belief_id] ?? []),
						prediction,
					],
				},
				predictionCounts: {
					...state.predictionCounts,
					[payload.belief_id]: {
						belief_id: payload.belief_id,
						total: (existing?.total ?? 0) + 1,
						pending: (existing?.pending ?? 0) + 1,
						overdue: existing?.overdue ?? 0,
					},
				},
			};
		});
		return prediction;
	},

	removePrediction: async (id, beliefId) => {
		await deletePrediction(id);
		set((state) => {
			const removed = (state.predictionCache[beliefId] ?? []).find(
				(p) => p.id === id,
			);
			const existing = state.predictionCounts[beliefId];
			const wasPending = removed && !removed.outcome;
			return {
				predictionCache: {
					...state.predictionCache,
					[beliefId]: (state.predictionCache[beliefId] ?? []).filter(
						(p) => p.id !== id,
					),
				},
				predictionCounts: existing
					? {
							...state.predictionCounts,
							[beliefId]: {
								...existing,
								total: Math.max(0, existing.total - 1),
								pending: wasPending
									? Math.max(0, existing.pending - 1)
									: existing.pending,
								overdue: wasPending
									? existing.overdue
									: Math.max(0, existing.overdue - 1),
							},
						}
					: state.predictionCounts,
			};
		});
	},

	resolvePrediction: async (payload) => {
		const resolved = await resolvePredictionCmd(payload);
		set((state) => {
			// Find which belief this prediction belongs to
			const beliefId = resolved.belief_id;
			const existing = state.predictionCounts[beliefId];
			return {
				predictionCache: {
					...state.predictionCache,
					[beliefId]: (state.predictionCache[beliefId] ?? []).map((p) =>
						p.id === resolved.id ? resolved : p,
					),
				},
				predictionCounts: existing
					? {
							...state.predictionCounts,
							[beliefId]: {
								...existing,
								pending: Math.max(0, existing.pending - 1),
								overdue: Math.max(0, existing.overdue - 1),
							},
						}
					: state.predictionCounts,
			};
		});
		return resolved;
	},

	createConnection: async (payload) => {
		const connection = await upsertConnection(payload);
		set((state) => ({
			connections: [connection, ...state.connections],
		}));
		return connection;
	},

	removeConnection: async (id) => {
		await deleteConnection(id);
		set((state) => ({
			connections: state.connections.filter((c) => c.id !== id),
		}));
	},
}));
