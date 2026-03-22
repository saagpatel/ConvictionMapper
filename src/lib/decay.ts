export function computeDecayBrightness(
	lastTouched: string,
	halfLifeDays: number,
	nowOverride?: Date,
): number {
	const now = nowOverride ?? new Date();
	const last = new Date(lastTouched);
	const days = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
	const k = Math.LN2 / halfLifeDays;
	const brightness = 0.15 + 0.85 * Math.exp(-k * days);
	return Math.max(0.15, Math.min(1.0, brightness));
}

export function confidenceToRadius(confidence: number): number {
	return 8 + (confidence / 100) * 24;
}

export function strengthToStroke(strength: number): number {
	return 1 + (strength / 5) * 3;
}
