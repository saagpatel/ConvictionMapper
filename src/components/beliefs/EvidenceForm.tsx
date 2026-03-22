import { useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import type { EvidenceType } from "../../types";
import { StrengthSelector } from "../shared/StrengthSelector";

type Props = {
	beliefId: number;
	onClose: () => void;
};

const EVIDENCE_TYPES: EvidenceType[] = [
	"observation",
	"data",
	"argument",
	"authority",
	"experience",
];

export function EvidenceForm({ beliefId, onClose }: Props) {
	const addEvidence = useBeliefStore((s) => s.addEvidence);

	const [type, setType] = useState<EvidenceType>("observation");
	const [content, setContent] = useState("");
	const [url, setUrl] = useState("");
	const [strength, setStrength] = useState(3);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit() {
		if (!content.trim()) return;
		setSubmitting(true);
		try {
			await addEvidence({
				belief_id: beliefId,
				type,
				content: content.trim(),
				source_url: url.trim() || undefined,
				strength,
			});
			setType("observation");
			setContent("");
			setUrl("");
			setStrength(3);
			onClose();
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="bg-surface-2 rounded-lg p-3 space-y-3 border border-border">
			<div>
				<label className="block text-xs text-text-secondary mb-1">Type</label>
				<select
					value={type}
					onChange={(e) => setType(e.target.value as EvidenceType)}
					className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent transition-colors"
				>
					{EVIDENCE_TYPES.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
			</div>

			<div>
				<label className="block text-xs text-text-secondary mb-1">
					Content
				</label>
				<textarea
					rows={3}
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Describe the evidence..."
					className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-2 text-sm placeholder:text-text-secondary resize-none outline-none focus:border-accent transition-colors"
				/>
			</div>

			<div>
				<label className="block text-xs text-text-secondary mb-1">
					Source URL (optional)
				</label>
				<input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://..."
					className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm placeholder:text-text-secondary outline-none focus:border-accent transition-colors"
				/>
			</div>

			<div>
				<label className="block text-xs text-text-secondary mb-1">
					Strength
				</label>
				<StrengthSelector value={strength} onChange={setStrength} />
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
					disabled={!content.trim() || submitting}
					className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Add
				</button>
			</div>
		</div>
	);
}
