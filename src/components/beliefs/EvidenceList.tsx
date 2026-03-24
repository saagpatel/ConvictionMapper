import { ExternalLink, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import type { EvidenceType } from "../../types";

type Props = {
	beliefId: number;
};

const TYPE_COLORS: Record<EvidenceType, string> = {
	observation: "#3B82F6",
	data: "#10B981",
	argument: "#F59E0B",
	authority: "#8B5CF6",
	experience: "#EC4899",
};

function TypeBadge({ type }: { type: EvidenceType }) {
	const color = TYPE_COLORS[type];
	return (
		<span
			className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
			style={{ backgroundColor: `${color}22`, color }}
		>
			{type}
		</span>
	);
}

function ReadOnlyStars({ value }: { value: number }) {
	return (
		<div className="flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((star) => (
				<Star
					key={star}
					size={12}
					className={star <= value ? "text-amber-400" : "text-text-secondary"}
					fill={star <= value ? "#fbbf24" : "none"}
				/>
			))}
		</div>
	);
}

export function EvidenceList({ beliefId }: Props) {
	const loadEvidence = useBeliefStore((s) => s.loadEvidence);
	const removeEvidence = useBeliefStore((s) => s.removeEvidence);
	const evidenceCache = useBeliefStore((s) => s.evidenceCache);
	const entries = evidenceCache[beliefId] ?? [];
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		loadEvidence(beliefId).finally(() => setLoading(false));
	}, [beliefId, loadEvidence]);

	if (loading && entries.length === 0) {
		return (
			<p className="text-text-secondary text-sm py-2 animate-pulse">
				Loading...
			</p>
		);
	}

	if (entries.length === 0) {
		return <p className="text-text-secondary text-sm py-2">No evidence yet.</p>;
	}

	function handleDelete(id: number) {
		if (window.confirm("Remove this evidence entry?")) {
			removeEvidence(id, beliefId);
		}
	}

	return (
		<div className="space-y-2">
			{entries.map((ev) => (
				<div key={ev.id} className="bg-surface-2 rounded-lg p-3 space-y-1.5">
					<div className="flex items-center gap-2">
						<TypeBadge type={ev.type} />
						<ReadOnlyStars value={ev.strength} />
						<button
							type="button"
							onClick={() => handleDelete(ev.id)}
							className="ml-auto text-text-secondary hover:text-danger transition-colors"
							aria-label="Delete evidence"
						>
							<Trash2 size={14} />
						</button>
					</div>
					<p className="text-sm text-text-primary line-clamp-3">{ev.content}</p>
					{ev.source_url && (
						<a
							href={ev.source_url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 text-xs text-accent hover:underline truncate max-w-full"
						>
							<ExternalLink size={10} />
							<span className="truncate">{ev.source_url}</span>
						</a>
					)}
				</div>
			))}
		</div>
	);
}
