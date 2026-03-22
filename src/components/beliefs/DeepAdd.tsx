import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import { useUIStore } from "../../store/ui-store";
import type { EvidenceType } from "../../types";
import { ConfidenceSlider } from "../shared/ConfidenceSlider";
import { DomainSelect } from "../shared/DomainSelect";
import { StrengthSelector } from "../shared/StrengthSelector";

const EVIDENCE_TYPES: EvidenceType[] = [
	"observation",
	"data",
	"argument",
	"authority",
	"experience",
];

export function DeepAdd() {
	const deepAddOpen = useUIStore((s) => s.deepAddOpen);
	const closeDeepAdd = useUIStore((s) => s.closeDeepAdd);
	const selectBelief = useUIStore((s) => s.selectBelief);
	const createBelief = useBeliefStore((s) => s.createBelief);
	const addEvidence = useBeliefStore((s) => s.addEvidence);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [confidence, setConfidence] = useState(50);
	const [domain, setDomain] = useState("General");
	const [halfLife, setHalfLife] = useState(90);

	const [evidenceExpanded, setEvidenceExpanded] = useState(false);
	const [evidenceType, setEvidenceType] = useState<EvidenceType>("observation");
	const [evidenceContent, setEvidenceContent] = useState("");
	const [evidenceUrl, setEvidenceUrl] = useState("");
	const [evidenceStrength, setEvidenceStrength] = useState(3);

	const titleRef = useRef<HTMLInputElement>(null);

	// Reset and auto-focus on open
	useEffect(() => {
		if (deepAddOpen) {
			setTitle("");
			setDescription("");
			setConfidence(50);
			setDomain("General");
			setHalfLife(90);
			setEvidenceExpanded(false);
			setEvidenceType("observation");
			setEvidenceContent("");
			setEvidenceUrl("");
			setEvidenceStrength(3);
			setTimeout(() => titleRef.current?.focus(), 50);
		}
	}, [deepAddOpen]);

	// Escape to close
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				closeDeepAdd();
			}
		}
		if (deepAddOpen) {
			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [deepAddOpen, closeDeepAdd]);

	if (!deepAddOpen) return null;

	async function handleSubmit() {
		if (!title.trim()) return;
		const belief = await createBelief({
			title: title.trim(),
			description: description.trim() || undefined,
			confidence,
			domain,
			half_life: halfLife,
		});
		if (evidenceExpanded && evidenceContent.trim()) {
			await addEvidence({
				belief_id: belief.id,
				type: evidenceType,
				content: evidenceContent.trim(),
				source_url: evidenceUrl.trim() || undefined,
				strength: evidenceStrength,
			});
		}
		closeDeepAdd();
		selectBelief(belief.id);
	}

	return (
		<div
			className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
			onClick={closeDeepAdd}
		>
			<div
				className="bg-surface-1 rounded-xl shadow-2xl w-[520px] p-5 space-y-4 border border-border max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-lg font-light text-text-primary">
					New Belief (Detailed)
				</h2>

				{/* Title */}
				<div>
					<input
						ref={titleRef}
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="What do you believe?"
						className="w-full text-sm bg-surface-2 rounded-lg px-3 py-2.5 border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-primary placeholder:text-text-secondary transition-colors"
					/>
				</div>

				{/* Description */}
				<div>
					<label className="block text-xs text-text-secondary mb-1">
						Description
					</label>
					<textarea
						rows={3}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Describe this belief in more detail..."
						className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary resize-none outline-none focus:border-accent transition-colors"
					/>
				</div>

				{/* Confidence + Domain row */}
				<div className="flex gap-4 items-end">
					<div className="flex-1">
						<label className="block text-xs text-text-secondary mb-2">
							Confidence
						</label>
						<ConfidenceSlider value={confidence} onChange={setConfidence} />
					</div>
					<div className="w-48">
						<label className="block text-xs text-text-secondary mb-1">
							Domain
						</label>
						<DomainSelect value={domain} onChange={setDomain} />
					</div>
				</div>

				{/* Half-life row */}
				<div>
					<label className="block text-xs text-text-secondary mb-1">
						Half-life
					</label>
					<div className="flex items-center gap-2">
						<input
							type="number"
							min={7}
							max={365}
							value={halfLife}
							onChange={(e) => setHalfLife(Number(e.target.value))}
							className="w-28 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
						/>
						<span className="text-sm text-text-secondary">days</span>
					</div>
				</div>

				{/* Collapsible evidence section */}
				<div>
					<button
						type="button"
						onClick={() => setEvidenceExpanded((v) => !v)}
						className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
					>
						<ChevronDown
							size={14}
							className={`transition-transform duration-150 ${evidenceExpanded ? "rotate-180" : ""}`}
						/>
						Add First Evidence
					</button>

					{evidenceExpanded && (
						<div className="mt-3 bg-surface-2 rounded-lg p-3 space-y-3 border border-border">
							<div>
								<label className="block text-xs text-text-secondary mb-1">
									Type
								</label>
								<select
									value={evidenceType}
									onChange={(e) =>
										setEvidenceType(e.target.value as EvidenceType)
									}
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
									value={evidenceContent}
									onChange={(e) => setEvidenceContent(e.target.value)}
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
									value={evidenceUrl}
									onChange={(e) => setEvidenceUrl(e.target.value)}
									placeholder="https://..."
									className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm placeholder:text-text-secondary outline-none focus:border-accent transition-colors"
								/>
							</div>

							<div>
								<label className="block text-xs text-text-secondary mb-1">
									Strength
								</label>
								<StrengthSelector
									value={evidenceStrength}
									onChange={setEvidenceStrength}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Action buttons */}
				<div className="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onClick={closeDeepAdd}
						className="text-text-secondary text-sm hover:text-text-primary transition-colors px-3 py-2"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!title.trim()}
						className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Add Belief
					</button>
				</div>
			</div>
		</div>
	);
}
