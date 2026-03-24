export type EvidenceType =
	| "observation"
	| "data"
	| "argument"
	| "authority"
	| "experience";
export type RelationshipType =
	| "supports"
	| "contradicts"
	| "depends_on"
	| "related";
export type Domain =
	| "Geopolitics"
	| "Personal Finance"
	| "Technology"
	| "Science & Health"
	| "Society"
	| "Personal/Values"
	| "Career"
	| "Philosophy"
	| "General"
	| (string & {});

export interface Belief {
	id: number;
	title: string;
	description: string | null;
	confidence: number;
	domain: Domain;
	half_life: number;
	created_at: string;
	last_touched: string;
	pos_x: number | null;
	pos_y: number | null;
}

export interface BeliefWithDecay extends Belief {
	decay_brightness: number;
}

export interface Evidence {
	id: number;
	belief_id: number;
	type: EvidenceType;
	content: string;
	source_url: string | null;
	strength: number;
	added_at: string;
}

export interface Connection {
	id: number;
	from_belief_id: number;
	to_belief_id: number;
	relationship: RelationshipType;
	strength: number;
	created_at: string;
}

export interface BeliefUpdate {
	id: number;
	belief_id: number;
	old_confidence: number | null;
	new_confidence: number;
	trigger_description: string | null;
	created_at: string;
}

export interface GraphNode extends BeliefWithDecay {
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
	fx?: number | null;
	fy?: number | null;
}

export interface GraphLink {
	source: number;
	target: number;
	relationship: RelationshipType;
	strength: number;
}

export interface BeliefPayload {
	id?: number;
	title: string;
	description?: string;
	confidence: number;
	domain: Domain;
	half_life?: number;
	pos_x?: number;
	pos_y?: number;
	last_touched?: string;
}

export interface QuickAddPayload {
	title: string;
	confidence: number;
	domain: Domain;
}

export interface EvidencePayload {
	id?: number;
	belief_id: number;
	type: EvidenceType;
	content: string;
	source_url?: string;
	strength: number;
}

export interface ConnectionPayload {
	id?: number;
	from_belief_id: number;
	to_belief_id: number;
	relationship: RelationshipType;
	strength: number;
}

export interface UpdatePayload {
	belief_id: number;
	old_confidence: number | null;
	new_confidence: number;
	trigger_description?: string;
}

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------

export type PredictionOutcome = "correct" | "incorrect" | "voided";
export type PredictionStatus =
	| "pending"
	| "overdue"
	| "correct"
	| "incorrect"
	| "voided";

export interface Prediction {
	id: number;
	belief_id: number;
	statement: string;
	predicted_confidence: number;
	resolution_date: string;
	outcome: PredictionOutcome | null;
	outcome_notes: string | null;
	resolved_at: string | null;
	created_at: string;
}

export interface PredictionWithBelief extends Prediction {
	belief_title: string;
	belief_domain: string;
}

export interface PredictionPayload {
	id?: number;
	belief_id: number;
	statement: string;
	predicted_confidence: number;
	resolution_date: string;
}

export interface ResolvePredictionPayload {
	id: number;
	outcome: PredictionOutcome;
	outcome_notes?: string;
}

export interface PredictionCount {
	belief_id: number;
	total: number;
	pending: number;
	overdue: number;
}

export interface CalibrationBucket {
	range_start: number;
	range_end: number;
	total: number;
	correct: number;
	actual_rate: number;
}

export interface DomainCalibration {
	domain: string;
	brier_score: number;
	total: number;
	correct: number;
	accuracy: number;
}

export interface CalibrationStats {
	total_predictions: number;
	resolved_count: number;
	voided_count: number;
	brier_score: number;
	accuracy: number;
	buckets: CalibrationBucket[];
	by_domain: DomainCalibration[];
}
