import { formatDistanceToNow, isPast } from "date-fns";
import type { Prediction, PredictionStatus } from "../types";

/**
 * Derive the display status of a prediction from its data.
 * Resolved predictions return their outcome; unresolved ones are
 * "pending" (future) or "overdue" (past resolution date).
 */
export function derivePredictionStatus(p: Prediction): PredictionStatus {
	if (p.outcome) return p.outcome;
	return isPast(new Date(p.resolution_date)) ? "overdue" : "pending";
}

/**
 * Human-readable countdown or "overdue" label.
 * Examples: "in 3 days", "in 2 months", "overdue by 5 days"
 */
export function formatCountdown(resolutionDate: string): string {
	const date = new Date(resolutionDate);
	if (isPast(date)) {
		return `overdue ${formatDistanceToNow(date, { addSuffix: false })}`;
	}
	return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Pure Brier score computation for testing.
 * Brier score = mean of (predicted_probability - actual_outcome)²
 * where actual = 1 for correct, 0 for incorrect.
 * Range: 0 (perfect) to 1 (worst).
 */
export function brierScore(
	predictions: ReadonlyArray<{
		predicted_confidence: number;
		outcome: "correct" | "incorrect";
	}>,
): number {
	if (predictions.length === 0) return 0;
	const sum = predictions.reduce((acc, p) => {
		const predicted = p.predicted_confidence / 100;
		const actual = p.outcome === "correct" ? 1 : 0;
		return acc + (predicted - actual) ** 2;
	}, 0);
	return sum / predictions.length;
}
