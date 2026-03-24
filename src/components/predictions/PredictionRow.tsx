import { useState } from "react";
import { derivePredictionStatus, formatCountdown } from "../../lib/calibration";
import type {
	PredictionOutcome,
	PredictionStatus,
	PredictionWithBelief,
} from "../../types";
import { StatusBadge } from "../shared/StatusBadge";

type Props = {
	prediction: PredictionWithBelief;
	onResolve?: (id: number, outcome: PredictionOutcome, notes?: string) => void;
	onBeliefClick?: (beliefId: number) => void;
};

export function PredictionRow({ prediction, onResolve, onBeliefClick }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [selectedOutcome, setSelectedOutcome] =
		useState<PredictionOutcome | null>(null);
	const [notes, setNotes] = useState("");

	const status: PredictionStatus = derivePredictionStatus(prediction);
	const isOverdue = status === "overdue";
	const canResolve = isOverdue && onResolve != null;

	function handleConfirm() {
		if (!selectedOutcome || !onResolve) return;
		onResolve(prediction.id, selectedOutcome, notes.trim() || undefined);
		setExpanded(false);
		setSelectedOutcome(null);
		setNotes("");
	}

	const outcomeButtons: {
		value: PredictionOutcome;
		label: string;
		className: string;
	}[] = [
		{
			value: "correct",
			label: "Correct",
			className:
				selectedOutcome === "correct"
					? "bg-emerald-500/30 text-emerald-300 border-emerald-500"
					: "bg-surface-2 text-text-secondary border-border hover:border-emerald-500/50 hover:text-emerald-400",
		},
		{
			value: "incorrect",
			label: "Incorrect",
			className:
				selectedOutcome === "incorrect"
					? "bg-red-500/30 text-red-300 border-red-500"
					: "bg-surface-2 text-text-secondary border-border hover:border-red-500/50 hover:text-red-400",
		},
		{
			value: "voided",
			label: "Void",
			className:
				selectedOutcome === "voided"
					? "bg-surface-2 text-text-primary border-border"
					: "bg-surface-2 text-text-secondary border-border hover:text-text-primary",
		},
	];

	return (
		<div className="border-b border-border last:border-0">
			<div className="flex items-center gap-3 px-4 py-3">
				<StatusBadge status={status} />

				<span className="flex-1 text-sm text-text-primary truncate min-w-0">
					{prediction.statement}
				</span>

				<button
					type="button"
					onClick={() => onBeliefClick?.(prediction.belief_id)}
					className="text-xs text-accent hover:underline shrink-0 max-w-[120px] truncate"
					title={prediction.belief_title}
				>
					{prediction.belief_title}
				</button>

				<span className="text-xs bg-surface-2 text-text-secondary px-2 py-0.5 rounded-full tabular-nums shrink-0">
					{prediction.predicted_confidence}%
				</span>

				<span className="text-xs text-text-secondary shrink-0 w-32 text-right">
					{formatCountdown(prediction.resolution_date)}
				</span>

				{canResolve && (
					<button
						type="button"
						onClick={() => setExpanded((e) => !e)}
						className="text-xs text-amber-400 hover:text-amber-300 shrink-0 transition-colors duration-150"
					>
						{expanded ? "Cancel" : "Resolve"}
					</button>
				)}
			</div>

			{expanded && canResolve && (
				<div className="px-4 pb-3 flex flex-col gap-2 bg-surface-1/50">
					<div className="flex items-center gap-2">
						{outcomeButtons.map((btn) => (
							<button
								key={btn.value}
								type="button"
								onClick={() => setSelectedOutcome(btn.value)}
								className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors duration-150 ${btn.className}`}
							>
								{btn.label}
							</button>
						))}
					</div>

					<input
						type="text"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Notes (optional)"
						className="w-full bg-surface-2 border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
					/>

					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleConfirm}
							disabled={!selectedOutcome}
							className="px-4 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-colors duration-150"
						>
							Confirm
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
