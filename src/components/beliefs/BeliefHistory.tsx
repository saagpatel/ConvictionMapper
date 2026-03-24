import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getUpdates } from "../../lib/tauri-commands";
import type { BeliefUpdate } from "../../types";

type Props = {
	beliefId: number;
};

function ConfidenceDelta({ update }: { update: BeliefUpdate }) {
	const { old_confidence, new_confidence } = update;

	if (old_confidence === null) {
		return <span className="text-sm text-accent">— → {new_confidence}</span>;
	}

	if (new_confidence > old_confidence) {
		return (
			<span className="text-sm text-green-400">
				{old_confidence} → {new_confidence} ↑
			</span>
		);
	}

	if (new_confidence < old_confidence) {
		return (
			<span className="text-sm text-red-400">
				{old_confidence} → {new_confidence} ↓
			</span>
		);
	}

	return (
		<span className="text-sm text-text-primary">
			{old_confidence} → {new_confidence}
		</span>
	);
}

export function BeliefHistory({ beliefId }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [updates, setUpdates] = useState<BeliefUpdate[]>([]);

	useEffect(() => {
		if (!expanded) return;

		getUpdates(beliefId)
			.then(setUpdates)
			.catch((err: unknown) => {
				console.error("Failed to fetch belief history:", err);
			});
	}, [expanded, beliefId]);

	function toggleExpanded() {
		setExpanded((prev) => !prev);
	}

	return (
		<div>
			<button
				onClick={toggleExpanded}
				className="flex items-center gap-2 w-full text-left py-1"
			>
				{expanded ? (
					<ChevronDown
						size={14}
						className="text-text-secondary flex-shrink-0"
					/>
				) : (
					<ChevronRight
						size={14}
						className="text-text-secondary flex-shrink-0"
					/>
				)}
				<span className="text-sm font-medium text-text-primary">History</span>
				{updates.length > 0 && (
					<span className="ml-1 text-xs text-text-secondary bg-bg-tertiary rounded-full px-1.5 py-0.5">
						{updates.length}
					</span>
				)}
			</button>

			{expanded && (
				<div className="space-y-0 max-h-48 overflow-y-auto mt-1">
					{updates.length === 0 ? (
						<p className="text-xs text-text-secondary py-2">No history yet.</p>
					) : (
						updates.map((update) => (
							<div
								key={update.id}
								className="py-2 border-b border-border last:border-0"
							>
								<div className="flex items-center justify-between gap-2">
									<ConfidenceDelta update={update} />
									<span className="text-xs text-text-secondary flex-shrink-0">
										{format(new Date(update.created_at), "MMM d, yyyy")}
									</span>
								</div>
								<p className="text-xs text-text-secondary italic mt-0.5">
									{update.trigger_description ?? "No note"}
								</p>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
