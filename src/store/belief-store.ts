import { create } from "zustand";
import {
	deleteBelief,
	deleteConnection,
	deleteEvidence,
	getBeliefs,
	getConnections,
	getEvidence,
	getEvidenceCounts,
	logUpdate,
	upsertBelief,
	upsertConnection,
	upsertEvidence,
} from "../lib/tauri-commands";
import type {
	Belief,
	BeliefPayload,
	Connection,
	ConnectionPayload,
	Evidence,
	EvidencePayload,
} from "../types";

interface BeliefState {
	beliefs: Belief[];
	connections: Connection[];
	evidenceCounts: Record<number, number>;
	evidenceCache: Record<number, Evidence[]>;
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

	createConnection: (payload: ConnectionPayload) => Promise<Connection>;
	removeConnection: (id: number) => Promise<void>;
}

export const useBeliefStore = create<BeliefState>((set, get) => ({
	beliefs: [],
	connections: [],
	evidenceCounts: {},
	evidenceCache: {},
	loaded: false,

	loadAll: async () => {
		const [beliefs, connections, counts] = await Promise.all([
			getBeliefs(),
			getConnections(),
			getEvidenceCounts(),
		]);

		const evidenceCounts: Record<number, number> = {};
		for (const { belief_id, count } of counts) {
			evidenceCounts[belief_id] = count;
		}

		set({ beliefs, connections, evidenceCounts, loaded: true });
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
