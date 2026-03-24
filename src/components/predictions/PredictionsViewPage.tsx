import { useEffect, useState } from "react";
import { derivePredictionStatus } from "../../lib/calibration";
import { getAllPredictions } from "../../lib/tauri-commands";
import { useBeliefStore } from "../../store/belief-store";
import { useUIStore } from "../../store/ui-store";
import type { PredictionOutcome, PredictionWithBelief } from "../../types";
import { CalibrationDashboard } from "./CalibrationDashboard";
import { PredictionRow } from "./PredictionRow";

type Tab = "upcoming" | "overdue" | "resolved" | "calibration";

export function PredictionsViewPage() {
	const [activeTab, setActiveTab] = useState<Tab>("upcoming");
	const [predictions, setPredictions] = useState<PredictionWithBelief[]>([]);
	const [loading, setLoading] = useState(true);

	const resolvePrediction = useBeliefStore((s) => s.resolvePrediction);
	const selectBelief = useUIStore((s) => s.selectBelief);

	async function loadPredictions() {
		try {
			const all = await getAllPredictions();
			setPredictions(all);
		} catch (err) {
			console.error("Failed to load predictions:", err);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		loadPredictions();
	}, []);

	async function handleResolve(
		id: number,
		outcome: PredictionOutcome,
		notes?: string,
	) {
		try {
			await resolvePrediction({ id, outcome, outcome_notes: notes });
			await loadPredictions();
		} catch (err) {
			console.error("Failed to resolve prediction:", err);
		}
	}

	const upcoming = predictions.filter(
		(p) => derivePredictionStatus(p) === "pending",
	);
	const overdue = predictions.filter(
		(p) => derivePredictionStatus(p) === "overdue",
	);
	const resolved = predictions.filter((p) => {
		const s = derivePredictionStatus(p);
		return s === "correct" || s === "incorrect" || s === "voided";
	});

	const tabs: {
		key: Tab;
		label: string;
		count?: number;
		amber?: boolean;
	}[] = [
		{ key: "upcoming", label: "Upcoming", count: upcoming.length },
		{
			key: "overdue",
			label: "Overdue",
			count: overdue.length,
			amber: overdue.length > 0,
		},
		{ key: "resolved", label: "Resolved", count: resolved.length },
		{ key: "calibration", label: "Calibration" },
	];

	function listForTab() {
		if (activeTab === "upcoming") return upcoming;
		if (activeTab === "overdue") return overdue;
		if (activeTab === "resolved") return resolved;
		return [];
	}

	function emptyMessageForTab() {
		if (activeTab === "upcoming") return "No upcoming predictions";
		if (activeTab === "overdue") return "No overdue predictions";
		if (activeTab === "resolved") return "No resolved predictions yet";
		return "";
	}

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-text-secondary text-sm">Loading predictions…</p>
			</div>
		);
	}

	const currentList = listForTab();

	return (
		<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
			{/* Tab bar */}
			<div className="flex items-center gap-0 border-b border-border bg-surface-1 px-4">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setActiveTab(tab.key)}
						className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors duration-150 border-b-2 -mb-px ${
							activeTab === tab.key
								? "text-accent border-accent"
								: "text-text-secondary border-transparent hover:text-text-primary"
						}`}
					>
						{tab.label}
						{tab.count !== undefined && (
							<span
								className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium ${
									tab.amber && activeTab !== tab.key
										? "bg-amber-500/20 text-amber-400"
										: "bg-surface-2 text-text-secondary"
								}`}
							>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Tab content */}
			<div className="flex-1 overflow-y-auto">
				{activeTab === "calibration" ? (
					<CalibrationDashboard />
				) : currentList.length === 0 ? (
					<div className="flex items-center justify-center py-16">
						<p className="text-text-secondary text-sm">
							{emptyMessageForTab()}
						</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{currentList.map((prediction) => (
							<PredictionRow
								key={prediction.id}
								prediction={prediction}
								onResolve={activeTab === "overdue" ? handleResolve : undefined}
								onBeliefClick={selectBelief}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
