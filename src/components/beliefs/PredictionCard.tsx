import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { derivePredictionStatus, formatCountdown } from "../../lib/calibration";
import { useBeliefStore } from "../../store/belief-store";
import type { Prediction, PredictionOutcome } from "../../types";
import { StatusBadge } from "../shared/StatusBadge";

type Props = {
	prediction: Prediction;
	beliefId: number;
};

type ResolveOutcome = PredictionOutcome | null;

export function PredictionCard({ prediction, beliefId }: Props) {
	const resolvePrediction = useBeliefStore((s) => s.resolvePrediction);
	const removePrediction = useBeliefStore((s) => s.removePrediction);

	const [expanded, setExpanded] = useState(false);
	const [pendingOutcome, setPendingOutcome] = useState<ResolveOutcome>(null);
	const [outcomeNotes, setOutcomeNotes] = useState("");
	const [resolving, setResolving] = useState(false);

	const status = derivePredictionStatus(prediction);
	const isResolvable = status === "pending" || status === "overdue";

	async function handleResolve() {
		if (!pendingOutcome) return;
		setResolving(true);
		try {
			await resolvePrediction({
				id: prediction.id,
				outcome: pendingOutcome,
				outcome_notes: outcomeNotes.trim() || undefined,
			});
			setPendingOutcome(null);
			setOutcomeNotes("");
		} finally {
			setResolving(false);
		}
	}

	function handleDelete() {
		if (window.confirm("Remove this prediction?")) {
			removePrediction(prediction.id, beliefId);
		}
	}

	return (
		<div className="bg-surface-2 rounded-lg border border-border overflow-hidden">
			{/* Collapsed row */}
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="w-full flex items-start gap-2 p-2.5 text-left hover:bg-surface-1/50 transition-colors"
			>
				<StatusBadge status={status} />
				<span className="flex-1 text-sm text-text-primary line-clamp-2 min-w-0">
					{prediction.statement}
				</span>
				<div className="flex items-center gap-1.5 shrink-0 ml-1">
					<span className="text-xs font-medium text-accent tabular-nums">
						{prediction.predicted_confidence}%
					</span>
					<span className="text-xs text-text-secondary">
						{formatCountdown(prediction.resolution_date)}
					</span>
					{expanded ? (
						<ChevronUp size={14} className="text-text-secondary" />
					) : (
						<ChevronDown size={14} className="text-text-secondary" />
					)}
				</div>
			</button>

			{/* Expanded content */}
			{expanded && (
				<div className="px-2.5 pb-2.5 space-y-3 border-t border-border pt-2.5">
					{/* Full statement */}
					<p className="text-sm text-text-primary">{prediction.statement}</p>

					{isResolvable && (
						<div className="space-y-2">
							{pendingOutcome === null ? (
								/* Outcome selector */
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setPendingOutcome("correct")}
										className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
									>
										Correct
									</button>
									<button
										type="button"
										onClick={() => setPendingOutcome("incorrect")}
										className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
									>
										Incorrect
									</button>
									<button
										type="button"
										onClick={() => setPendingOutcome("voided")}
										className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-surface-1 text-text-secondary hover:bg-surface-2 transition-colors"
									>
										Void
									</button>
								</div>
							) : (
								/* Confirm panel */
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<StatusBadge
											status={
												pendingOutcome === "voided" ? "voided" : pendingOutcome
											}
										/>
										<button
											type="button"
											onClick={() => {
												setPendingOutcome(null);
												setOutcomeNotes("");
											}}
											className="text-xs text-text-secondary hover:text-text-primary transition-colors"
										>
											Change
										</button>
									</div>
									<textarea
										rows={2}
										value={outcomeNotes}
										onChange={(e) => setOutcomeNotes(e.target.value)}
										placeholder="Optional notes..."
										className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm placeholder:text-text-secondary resize-none outline-none focus:border-accent transition-colors"
									/>
									<div className="flex justify-end gap-2">
										<button
											type="button"
											onClick={() => {
												setPendingOutcome(null);
												setOutcomeNotes("");
											}}
											className="text-text-secondary hover:text-text-primary text-xs transition-colors px-2 py-1"
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={handleResolve}
											disabled={resolving}
											className="bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Confirm
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Resolved info */}
					{!isResolvable && prediction.outcome && (
						<div className="space-y-1">
							{prediction.outcome_notes && (
								<p className="text-sm text-text-secondary">
									{prediction.outcome_notes}
								</p>
							)}
							{prediction.resolved_at && (
								<p className="text-xs text-text-secondary">
									Resolved{" "}
									{format(parseISO(prediction.resolved_at), "MMM d, yyyy")}
								</p>
							)}
						</div>
					)}

					{/* Delete */}
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleDelete}
							className="text-text-secondary hover:text-danger transition-colors"
							aria-label="Delete prediction"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
