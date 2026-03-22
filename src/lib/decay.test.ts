import { describe, expect, it } from "vitest";
import {
	computeDecayBrightness,
	confidenceToRadius,
	strengthToStroke,
} from "./decay";

describe("computeDecayBrightness", () => {
	const now = new Date("2026-03-22T12:00:00Z");

	it("returns 1.0 for a belief touched right now", () => {
		expect(computeDecayBrightness(now.toISOString(), 90, now)).toBeCloseTo(
			1.0,
			2,
		);
	});

	it("returns ~0.575 at exactly one half-life (90 days)", () => {
		const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
		expect(
			computeDecayBrightness(ninetyDaysAgo.toISOString(), 90, now),
		).toBeCloseTo(0.575, 2);
	});

	it("returns ~0.363 at two half-lives (180 days)", () => {
		const oneEightyDaysAgo = new Date(
			now.getTime() - 180 * 24 * 60 * 60 * 1000,
		);
		expect(
			computeDecayBrightness(oneEightyDaysAgo.toISOString(), 90, now),
		).toBeCloseTo(0.3625, 1);
	});

	it("returns ~0.201 at 365 days", () => {
		const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
		expect(computeDecayBrightness(yearAgo.toISOString(), 90, now)).toBeCloseTo(
			0.201,
			2,
		);
	});

	it("never drops below 0.15", () => {
		const veryOld = new Date(now.getTime() - 10000 * 24 * 60 * 60 * 1000);
		expect(computeDecayBrightness(veryOld.toISOString(), 90, now)).toBeCloseTo(
			0.15,
			2,
		);
	});

	it("handles different half-life values", () => {
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		const result = computeDecayBrightness(thirtyDaysAgo.toISOString(), 30, now);
		expect(result).toBeCloseTo(0.575, 2);
	});
});

describe("confidenceToRadius", () => {
	it("returns 8 for confidence 0", () => {
		expect(confidenceToRadius(0)).toBe(8);
	});

	it("returns 32 for confidence 100", () => {
		expect(confidenceToRadius(100)).toBe(32);
	});

	it("returns 20 for confidence 50", () => {
		expect(confidenceToRadius(50)).toBe(20);
	});
});

describe("strengthToStroke", () => {
	it("returns 1.6 for strength 1", () => {
		expect(strengthToStroke(1)).toBeCloseTo(1.6, 1);
	});

	it("returns 4 for strength 5", () => {
		expect(strengthToStroke(5)).toBe(4);
	});

	it("returns 2.8 for strength 3", () => {
		expect(strengthToStroke(3)).toBeCloseTo(2.8, 1);
	});
});
