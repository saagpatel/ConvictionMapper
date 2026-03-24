import { useEffect, useState } from "react";
import { getCalibrationStats } from "../../lib/tauri-commands";
import type { CalibrationStats } from "../../types";
import { CalibrationChart } from "./CalibrationChart";

export function CalibrationDashboard() {
	const [stats, setStats] = useState<CalibrationStats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getCalibrationStats()
			.then(setStats)
			.catch((err) => {
				console.error("Failed to load calibration stats:", err);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<p className="text-text-secondary text-sm">Loading calibration data…</p>
			</div>
		);
	}

	if (!stats || stats.total_predictions === 0) {
		return (
			<div className="flex items-center justify-center py-16">
				<p className="text-text-secondary text-sm">
					Make predictions to see your calibration data
				</p>
			</div>
		);
	}

	const brierLabel = stats.brier_score.toFixed(3);
	const accuracyLabel =
		stats.resolved_count > 0 ? `${(stats.accuracy * 100).toFixed(1)}%` : "—";

	const statCards: { value: string; label: string; hint?: string }[] = [
		{ value: String(stats.total_predictions), label: "Total" },
		{ value: String(stats.resolved_count), label: "Resolved" },
		{
			value: stats.resolved_count > 0 ? brierLabel : "—",
			label: "Brier Score",
			hint: "lower is better",
		},
		{ value: accuracyLabel, label: "Accuracy" },
	];

	return (
		<div className="flex flex-col gap-6 p-4">
			{/* Stat cards */}
			<div className="grid grid-cols-2 gap-3">
				{statCards.map(({ value, label, hint }) => (
					<div
						key={label}
						className="bg-surface-2 rounded-lg p-4 flex flex-col gap-1"
					>
						<span className="text-2xl font-light text-text-primary tabular-nums">
							{value}
						</span>
						<span className="text-xs text-text-secondary uppercase tracking-wider">
							{label}
						</span>
						{hint && (
							<span className="text-xs text-text-secondary opacity-60">
								{hint}
							</span>
						)}
					</div>
				))}
			</div>

			{/* Calibration chart */}
			<div className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
					Calibration Curve
				</h3>
				<div className="bg-surface-2 rounded-lg p-4 flex items-center justify-center">
					<CalibrationChart buckets={stats.buckets} />
				</div>
			</div>

			{/* Per-domain breakdown */}
			{stats.by_domain.length > 0 && (
				<div className="flex flex-col gap-2">
					<h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
						By Domain
					</h3>
					<div className="bg-surface-2 rounded-lg overflow-hidden">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border">
									<th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
										Domain
									</th>
									<th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
										Predictions
									</th>
									<th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
										Accuracy
									</th>
									<th className="px-4 py-2.5 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
										Brier
									</th>
								</tr>
							</thead>
							<tbody>
								{stats.by_domain.map((d) => (
									<tr
										key={d.domain}
										className="border-b border-border last:border-0"
									>
										<td className="px-4 py-2.5 text-text-primary">
											{d.domain}
										</td>
										<td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">
											{d.total}
										</td>
										<td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">
											{d.total > 0 ? `${(d.accuracy * 100).toFixed(1)}%` : "—"}
										</td>
										<td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">
											{d.total > 0 ? d.brier_score.toFixed(3) : "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
