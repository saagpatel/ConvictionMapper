import type { CalibrationBucket } from "../../types";

type Props = {
	buckets: CalibrationBucket[];
};

const CHART_W = 280;
const CHART_H = 220;
const MARGIN_LEFT = 40;
const MARGIN_BOTTOM = 30;

const plotW = CHART_W - MARGIN_LEFT;
const plotH = CHART_H - MARGIN_BOTTOM;

function xPos(confidence: number): number {
	// confidence is 0–100, mapped to plot width
	return MARGIN_LEFT + (confidence / 100) * plotW;
}

function yPos(rate: number): number {
	// rate is 0–1, y increases downward so flip it
	return plotH - rate * plotH;
}

export function CalibrationChart({ buckets }: Props) {
	const activeBuckets = buckets.filter((b) => b.total > 0);

	const maxCount = Math.max(...activeBuckets.map((b) => b.total), 1);

	const circleRadius = (count: number) =>
		4 + Math.min(6, (count / maxCount) * 6);

	const xLabels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
	const yLabels = [
		{ label: "100%", rate: 1 },
		{ label: "75%", rate: 0.75 },
		{ label: "50%", rate: 0.5 },
		{ label: "25%", rate: 0.25 },
		{ label: "0%", rate: 0 },
	];

	if (activeBuckets.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-text-secondary text-xs text-center px-4"
				style={{ width: CHART_W, height: CHART_H }}
			>
				Resolve at least 5 predictions to see calibration
			</div>
		);
	}

	// Build polyline points for the user data line
	const linePoints = activeBuckets
		.map((b) => {
			const midpoint = (b.range_start + b.range_end) / 2;
			return `${xPos(midpoint)},${yPos(b.actual_rate)}`;
		})
		.join(" ");

	return (
		<svg width={CHART_W} height={CHART_H} className="overflow-visible">
			{/* Y-axis grid lines */}
			{yLabels.map(({ rate }) => (
				<line
					key={rate}
					x1={MARGIN_LEFT}
					y1={yPos(rate)}
					x2={CHART_W}
					y2={yPos(rate)}
					stroke="var(--border)"
					strokeOpacity={0.3}
					strokeWidth={1}
				/>
			))}

			{/* X-axis grid lines at 25% confidence intervals */}
			{[25, 50, 75, 100].map((conf) => (
				<line
					key={conf}
					x1={xPos(conf)}
					y1={0}
					x2={xPos(conf)}
					y2={plotH}
					stroke="var(--border)"
					strokeOpacity={0.3}
					strokeWidth={1}
				/>
			))}

			{/* Diagonal perfect calibration line */}
			<line
				x1={xPos(0)}
				y1={yPos(0)}
				x2={xPos(100)}
				y2={yPos(1)}
				stroke="var(--text-secondary)"
				strokeWidth={1}
				strokeDasharray="4,4"
				opacity={0.5}
			/>

			{/* User data line */}
			{activeBuckets.length > 1 && (
				<polyline
					points={linePoints}
					stroke="var(--accent)"
					strokeWidth={2}
					fill="none"
				/>
			)}

			{/* User data circles */}
			{activeBuckets.map((b) => {
				const midpoint = (b.range_start + b.range_end) / 2;
				const cx = xPos(midpoint);
				const cy = yPos(b.actual_rate);
				const r = circleRadius(b.total);
				return (
					<circle
						key={b.range_start}
						cx={cx}
						cy={cy}
						r={r}
						fill="var(--accent)"
					/>
				);
			})}

			{/* Y-axis labels */}
			{yLabels.map(({ label, rate }) => (
				<text
					key={rate}
					x={MARGIN_LEFT - 4}
					y={yPos(rate)}
					textAnchor="end"
					dominantBaseline="middle"
					fontSize={9}
					fill="var(--text-secondary)"
				>
					{label}
				</text>
			))}

			{/* X-axis labels */}
			{xLabels.map((conf) => (
				<text
					key={conf}
					x={xPos(conf)}
					y={plotH + 16}
					textAnchor="middle"
					fontSize={9}
					fill="var(--text-secondary)"
				>
					{conf}
				</text>
			))}

			{/* Axis lines */}
			<line
				x1={MARGIN_LEFT}
				y1={0}
				x2={MARGIN_LEFT}
				y2={plotH}
				stroke="var(--border)"
				strokeWidth={1}
			/>
			<line
				x1={MARGIN_LEFT}
				y1={plotH}
				x2={CHART_W}
				y2={plotH}
				stroke="var(--border)"
				strokeWidth={1}
			/>
		</svg>
	);
}
