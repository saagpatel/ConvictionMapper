import { addDays, format } from "date-fns";
import { useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import { ConfidenceSlider } from "../shared/ConfidenceSlider";

type Props = {
	beliefId: number;
	defaultConfidence: number;
	onClose: () => void;
};

export function PredictionForm({
	beliefId,
	defaultConfidence,
	onClose,
}: Props) {
	const addPrediction = useBeliefStore((s) => s.addPrediction);

	const [statement, setStatement] = useState("");
	const [confidence, setConfidence] = useState(defaultConfidence);
	const [resolutionDate, setResolutionDate] = useState(
		format(addDays(new Date(), 90), "yyyy-MM-dd"),
	);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit() {
		if (!statement.trim()) return;
		setSubmitting(true);
		try {
			await addPrediction({
				belief_id: beliefId,
				statement: statement.trim(),
				predicted_confidence: confidence,
				resolution_date: new Date(resolutionDate).toISOString(),
			});
			onClose();
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="bg-surface-2 border border-border rounded-lg p-3 space-y-3">
			<div>
				<label className="block text-xs text-text-secondary mb-1">
					What specifically do you predict?
				</label>
				<textarea
					rows={3}
					value={statement}
					onChange={(e) => setStatement(e.target.value)}
					placeholder="By [date], X will happen because..."
					className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-2 text-sm placeholder:text-text-secondary resize-none outline-none focus:border-accent transition-colors"
				/>
			</div>

			<div>
				<label className="block text-xs text-text-secondary mb-1">
					Confidence
				</label>
				<ConfidenceSlider value={confidence} onChange={setConfidence} />
			</div>

			<div>
				<label className="block text-xs text-text-secondary mb-1">
					Resolution date
				</label>
				<input
					type="date"
					value={resolutionDate}
					onChange={(e) => setResolutionDate(e.target.value)}
					className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
				/>
			</div>

			<div className="flex justify-end gap-2">
				<button
					type="button"
					onClick={onClose}
					className="text-text-secondary hover:text-text-primary text-sm transition-colors px-2 py-1.5"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={handleSubmit}
					disabled={!statement.trim() || submitting}
					className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Add
				</button>
			</div>
		</div>
	);
}
