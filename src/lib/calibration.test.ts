import { describe, expect, it } from "vitest";
import type { Prediction } from "../types";
import { brierScore, derivePredictionStatus } from "./calibration";

describe("brierScore", () => {
	it("returns 0 for perfect predictions", () => {
		const predictions = [
			{ predicted_confidence: 100, outcome: "correct" as const },
			{ predicted_confidence: 0, outcome: "incorrect" as const },
		];
		expect(brierScore(predictions)).toBeCloseTo(0, 5);
	});

	it("returns 1 for worst-case predictions", () => {
		const predictions = [
			{ predicted_confidence: 100, outcome: "incorrect" as const },
			{ predicted_confidence: 0, outcome: "correct" as const },
		];
		expect(brierScore(predictions)).toBeCloseTo(1, 5);
	});

	it("returns 0.25 for 50/50 predictions", () => {
		const predictions = [
			{ predicted_confidence: 50, outcome: "correct" as const },
			{ predicted_confidence: 50, outcome: "incorrect" as const },
		];
		expect(brierScore(predictions)).toBeCloseTo(0.25, 5);
	});

	it("returns 0 for empty array", () => {
		expect(brierScore([])).toBe(0);
	});

	it("computes correctly for mixed predictions", () => {
		const predictions = [
			{ predicted_confidence: 80, outcome: "correct" as const },
			{ predicted_confidence: 30, outcome: "incorrect" as const },
			{ predicted_confidence: 60, outcome: "correct" as const },
		];
		// (0.8-1)^2 = 0.04, (0.3-0)^2 = 0.09, (0.6-1)^2 = 0.16
		// mean = (0.04 + 0.09 + 0.16) / 3 = 0.29 / 3 ≈ 0.0967
		expect(brierScore(predictions)).toBeCloseTo(0.0967, 3);
	});
});

describe("derivePredictionStatus", () => {
	const basePrediction: Prediction = {
		id: 1,
		belief_id: 1,
		statement: "Test",
		predicted_confidence: 70,
		resolution_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
		outcome: null,
		outcome_notes: null,
		resolved_at: null,
		created_at: new Date().toISOString(),
	};

	it('returns "pending" for future unresolved predictions', () => {
		expect(derivePredictionStatus(basePrediction)).toBe("pending");
	});

	it('returns "overdue" for past unresolved predictions', () => {
		const overdue: Prediction = {
			...basePrediction,
			resolution_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
		};
		expect(derivePredictionStatus(overdue)).toBe("overdue");
	});

	it("returns the outcome directly when resolved", () => {
		expect(
			derivePredictionStatus({ ...basePrediction, outcome: "correct" }),
		).toBe("correct");
		expect(
			derivePredictionStatus({ ...basePrediction, outcome: "incorrect" }),
		).toBe("incorrect");
		expect(
			derivePredictionStatus({ ...basePrediction, outcome: "voided" }),
		).toBe("voided");
	});
});
