import { invoke } from "@tauri-apps/api/core";
import type {
	Belief,
	BeliefPayload,
	BeliefUpdate,
	Connection,
	ConnectionPayload,
	Evidence,
	EvidencePayload,
	UpdatePayload,
} from "../types";

export async function getBeliefs(): Promise<Belief[]> {
	return invoke<Belief[]>("get_beliefs");
}

export async function upsertBelief(payload: BeliefPayload): Promise<Belief> {
	return invoke<Belief>("upsert_belief", { payload });
}

export async function deleteBelief(id: number): Promise<void> {
	return invoke<void>("delete_belief", { id });
}

export async function getEvidence(beliefId: number): Promise<Evidence[]> {
	return invoke<Evidence[]>("get_evidence", { belief_id: beliefId });
}

export async function upsertEvidence(
	payload: EvidencePayload,
): Promise<Evidence> {
	return invoke<Evidence>("upsert_evidence", { payload });
}

export async function deleteEvidence(id: number): Promise<void> {
	return invoke<void>("delete_evidence", { id });
}

export async function getConnections(): Promise<Connection[]> {
	return invoke<Connection[]>("get_connections");
}

export async function upsertConnection(
	payload: ConnectionPayload,
): Promise<Connection> {
	return invoke<Connection>("upsert_connection", { payload });
}

export async function deleteConnection(id: number): Promise<void> {
	return invoke<void>("delete_connection", { id });
}

export async function logUpdate(payload: UpdatePayload): Promise<BeliefUpdate> {
	return invoke<BeliefUpdate>("log_update", { payload });
}

export async function getUpdates(beliefId: number): Promise<BeliefUpdate[]> {
	return invoke<BeliefUpdate[]>("get_updates", { belief_id: beliefId });
}

export async function getSetting(key: string): Promise<string> {
	return invoke<string>("get_setting", { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
	return invoke<void>("set_setting", { key, value });
}

export async function exportDatabase(destPath: string): Promise<void> {
	return invoke<void>("export_database", { dest_path: destPath });
}
