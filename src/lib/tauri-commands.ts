import { invoke } from "@tauri-apps/api/core";
import type {
	Belief,
	BeliefPayload,
	BeliefUpdate,
	CalibrationStats,
	Connection,
	ConnectionPayload,
	Evidence,
	EvidencePayload,
	Prediction,
	PredictionCount,
	PredictionPayload,
	PredictionWithBelief,
	ResolvePredictionPayload,
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

export async function getEvidenceCounts(): Promise<
	Array<{ belief_id: number; count: number }>
> {
	return invoke("get_evidence_counts");
}

export async function importDatabase(srcPath: string): Promise<void> {
	return invoke<void>("import_database", { src_path: srcPath });
}

export async function clearAllData(): Promise<void> {
	return invoke<void>("clear_all_data");
}

export async function getBeliefsAtDate(
	before: string,
): Promise<Array<{ belief_id: number; confidence: number }>> {
	return invoke("get_beliefs_at_date", { before });
}

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------

export async function getPredictions(beliefId: number): Promise<Prediction[]> {
	return invoke<Prediction[]>("get_predictions", { belief_id: beliefId });
}

export async function getAllPredictions(): Promise<PredictionWithBelief[]> {
	return invoke<PredictionWithBelief[]>("get_all_predictions");
}

export async function upsertPrediction(
	payload: PredictionPayload,
): Promise<Prediction> {
	return invoke<Prediction>("upsert_prediction", { payload });
}

export async function deletePrediction(id: number): Promise<void> {
	return invoke<void>("delete_prediction", { id });
}

export async function resolvePrediction(
	payload: ResolvePredictionPayload,
): Promise<Prediction> {
	return invoke<Prediction>("resolve_prediction", { payload });
}

export async function getPredictionCounts(): Promise<PredictionCount[]> {
	return invoke<PredictionCount[]>("get_prediction_counts");
}

export async function getCalibrationStats(): Promise<CalibrationStats> {
	return invoke<CalibrationStats>("get_calibration_stats");
}
