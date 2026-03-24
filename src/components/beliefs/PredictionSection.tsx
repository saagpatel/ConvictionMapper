import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import { PredictionCard } from "./PredictionCard";
import { PredictionForm } from "./PredictionForm";

type Props = {
	beliefId: number;
	beliefConfidence: number;
};

export function PredictionSection({ beliefId, beliefConfidence }: Props) {
	const loadPredictions = useBeliefStore((s) => s.loadPredictions);
	const predictionCache = useBeliefStore((s) => s.predictionCache);
	const predictionCounts = useBeliefStore((s) => s.predictionCounts);

	const [showForm, setShowForm] = useState(false);

	useEffect(() => {
		loadPredictions(beliefId);
	}, [beliefId, loadPredictions]);

	const predictions = predictionCache[beliefId] ?? [];
	const countInfo = predictionCounts[beliefId];
	const totalCount = countInfo?.total ?? predictions.length;

	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<span className="text-xs text-text-secondary uppercase tracking-wider font-medium">
						Predictions
					</span>
					<span className="bg-surface-2 text-text-secondary text-xs px-1.5 py-0.5 rounded-full">
						{totalCount}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setShowForm((v) => !v)}
					className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
				>
					<Plus size={14} />
					Add
				</button>
			</div>

			{showForm && (
				<div className="mb-3">
					<PredictionForm
						beliefId={beliefId}
						defaultConfidence={beliefConfidence}
						onClose={() => setShowForm(false)}
					/>
				</div>
			)}

			{predictions.length === 0 ? (
				<p className="text-text-secondary text-sm py-2">No predictions yet.</p>
			) : (
				<div className="space-y-2">
					{predictions.map((p) => (
						<PredictionCard key={p.id} prediction={p} beliefId={beliefId} />
					))}
				</div>
			)}
		</div>
	);
}
