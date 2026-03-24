import { useEffect, useState } from "react";
import { EDGE_COLORS } from "../../lib/graph-layout";
import type { ConnectionPayload, RelationshipType } from "../../types";
import { StrengthSelector } from "../shared/StrengthSelector";

type Props = {
	sourceNodeId: number;
	targetNodeId: number;
	beliefs: Array<{ id: number; title: string }>;
	onComplete: (payload: ConnectionPayload) => void;
	onCancel: () => void;
};

const RELATIONSHIP_TYPES: RelationshipType[] = [
	"supports",
	"contradicts",
	"depends_on",
	"related",
];

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
	supports: "Supports",
	contradicts: "Contradicts",
	depends_on: "Depends on",
	related: "Related",
};

export function RelationshipSelector({
	sourceNodeId,
	targetNodeId,
	beliefs,
	onComplete,
	onCancel,
}: Props) {
	const [selectedType, setSelectedType] = useState<RelationshipType | null>(
		null,
	);
	const [strength, setStrength] = useState(3);

	const sourceName =
		beliefs.find((b) => b.id === sourceNodeId)?.title ??
		`Belief #${sourceNodeId}`;
	const targetName =
		beliefs.find((b) => b.id === targetNodeId)?.title ??
		`Belief #${targetNodeId}`;

	// Escape to cancel
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onCancel();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onCancel]);

	function handleCreate() {
		if (!selectedType) return;
		onComplete({
			from_belief_id: sourceNodeId,
			to_belief_id: targetNodeId,
			relationship: selectedType,
			strength,
		});
	}

	return (
		<div
			className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
			onClick={onCancel}
		>
			<div
				className="bg-surface-1 rounded-xl shadow-2xl w-[400px] p-5 space-y-4 border border-border"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-base font-light text-text-primary">
					Create Connection
				</h2>

				{/* Source → target display */}
				<div className="flex items-center gap-2 text-sm">
					<span className="flex-1 truncate bg-surface-2 rounded px-2 py-1.5 text-text-primary border border-border">
						{sourceName}
					</span>
					<span className="text-text-secondary text-xs shrink-0">→</span>
					<span className="flex-1 truncate bg-surface-2 rounded px-2 py-1.5 text-text-primary border border-border">
						{targetName}
					</span>
				</div>

				{/* Relationship type picker */}
				<div className="space-y-1.5">
					<p className="text-xs text-text-secondary">Relationship type</p>
					<div className="grid grid-cols-2 gap-2">
						{RELATIONSHIP_TYPES.map((type) => {
							const color = EDGE_COLORS[type];
							const isSelected = selectedType === type;
							return (
								<button
									key={type}
									type="button"
									onClick={() => setSelectedType(type)}
									className="rounded-full px-3 py-1.5 text-sm font-medium border transition-all"
									style={{
										backgroundColor: isSelected ? `${color}33` : `${color}11`,
										color: color,
										borderColor: isSelected ? color : `${color}44`,
									}}
								>
									{RELATIONSHIP_LABELS[type]}
								</button>
							);
						})}
					</div>
				</div>

				{/* Strength selector — only shown after type is chosen */}
				{selectedType !== null && (
					<div className="space-y-1.5">
						<p className="text-xs text-text-secondary">Strength</p>
						<StrengthSelector value={strength} onChange={setStrength} />
					</div>
				)}

				{/* Actions */}
				<div className="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onClick={onCancel}
						className="text-text-secondary text-sm hover:text-text-primary transition-colors px-3 py-2"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleCreate}
						disabled={selectedType === null}
						className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Create
					</button>
				</div>
			</div>
		</div>
	);
}
