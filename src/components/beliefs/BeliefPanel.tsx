import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { logUpdate } from "../../lib/tauri-commands";
import { useBeliefStore } from "../../store/belief-store";
import { useUIStore } from "../../store/ui-store";
import type { BeliefPayload } from "../../types";
import { ConfidenceSlider } from "../shared/ConfidenceSlider";
import { DomainSelect } from "../shared/DomainSelect";
import { BeliefHistory } from "./BeliefHistory";
import { ConnectionSection } from "./ConnectionSection";
import { EvidenceForm } from "./EvidenceForm";
import { EvidenceList } from "./EvidenceList";
import { PredictionSection } from "./PredictionSection";

type Draft = Partial<BeliefPayload>;

export function BeliefPanel() {
	const panelOpen = useUIStore((s) => s.panelOpen);
	const selectedBeliefId = useUIStore((s) => s.selectedBeliefId);
	const selectBelief = useUIStore((s) => s.selectBelief);

	const beliefs = useBeliefStore((s) => s.beliefs);
	const evidenceCounts = useBeliefStore((s) => s.evidenceCounts);
	const updateBelief = useBeliefStore((s) => s.updateBelief);
	const removeBelief = useBeliefStore((s) => s.removeBelief);

	const belief =
		selectedBeliefId != null
			? beliefs.find((b) => b.id === selectedBeliefId)
			: undefined;

	const [draft, setDraft] = useState<Draft>({});
	const [showEvidenceForm, setShowEvidenceForm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingUpdate, setPendingUpdate] = useState<{
		beliefId: number;
		oldConf: number;
		newConf: number;
	} | null>(null);
	const [triggerText, setTriggerText] = useState("");

	// Clone belief into draft state when selection changes
	useEffect(() => {
		if (belief) {
			setDraft({
				title: belief.title,
				description: belief.description ?? undefined,
				confidence: belief.confidence,
				domain: belief.domain,
				half_life: belief.half_life,
			});
			setShowEvidenceForm(false);
			setShowDeleteConfirm(false);
		}
	}, [belief?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	const isDirty =
		belief != null &&
		(draft.title !== belief.title ||
			(draft.description ?? "") !== (belief.description ?? "") ||
			draft.confidence !== belief.confidence ||
			draft.domain !== belief.domain ||
			draft.half_life !== belief.half_life);

	function patchDraft(patch: Partial<BeliefPayload>) {
		setDraft((prev) => ({ ...prev, ...patch }));
	}

	async function handleSave() {
		if (!belief) return;
		setError(null);
		try {
			const confidenceChanged =
				draft.confidence !== undefined &&
				draft.confidence !== belief.confidence;

			await updateBelief({
				id: belief.id,
				title: draft.title ?? belief.title,
				description: draft.description,
				confidence: draft.confidence ?? belief.confidence,
				domain: draft.domain ?? belief.domain,
				half_life: draft.half_life ?? belief.half_life,
				pos_x: belief.pos_x ?? undefined,
				pos_y: belief.pos_y ?? undefined,
			});

			if (confidenceChanged) {
				setPendingUpdate({
					beliefId: belief.id,
					oldConf: belief.confidence,
					newConf: draft.confidence!,
				});
				setTriggerText("");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
		}
	}

	async function handleDelete() {
		if (!belief) return;
		setError(null);
		try {
			await removeBelief(belief.id);
			selectBelief(null);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
		}
	}

	const evidenceCount =
		selectedBeliefId != null ? (evidenceCounts[selectedBeliefId] ?? 0) : 0;

	const visible = panelOpen && belief != null;

	return (
		<div
			className={`fixed top-0 right-0 h-screen w-[380px] bg-surface-1 border-l border-border z-30 overflow-y-auto flex flex-col transition-transform duration-200 ease-out ${
				visible ? "translate-x-0" : "translate-x-full"
			}`}
		>
			{belief && (
				<>
					{/* Header */}
					<div className="sticky top-0 bg-surface-1 z-10 px-4 pt-4 pb-3 border-b border-border">
						<div className="relative pr-8">
							<button
								type="button"
								onClick={() => selectBelief(null)}
								className="absolute top-0 right-0 text-text-secondary hover:text-text-primary transition-colors"
								aria-label="Close panel"
							>
								<X size={18} />
							</button>
							<input
								type="text"
								value={draft.title ?? ""}
								onChange={(e) => patchDraft({ title: e.target.value })}
								className="text-lg font-bold bg-transparent border-none w-full text-text-primary outline-none focus:ring-1 focus:ring-accent rounded px-2 py-1 -ml-2"
							/>
						</div>
					</div>

					{/* Core fields */}
					<div className="px-4 py-3 space-y-3">
						<div>
							<label className="block text-xs text-text-secondary mb-1">
								Description
							</label>
							<textarea
								rows={3}
								value={draft.description ?? ""}
								onChange={(e) => patchDraft({ description: e.target.value })}
								placeholder="Describe this belief..."
								className="w-full bg-surface-2 border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary px-3 py-2 resize-none outline-none focus:border-accent transition-colors"
							/>
						</div>

						<div>
							<label className="block text-xs text-text-secondary mb-1">
								Domain
							</label>
							<DomainSelect
								value={draft.domain ?? belief.domain}
								onChange={(v) => patchDraft({ domain: v })}
							/>
						</div>

						<div>
							<label className="block text-xs text-text-secondary mb-1">
								Half-life
							</label>
							<div className="flex items-center gap-2">
								<input
									type="number"
									min={7}
									max={365}
									value={draft.half_life ?? belief.half_life}
									onChange={(e) =>
										patchDraft({ half_life: Number(e.target.value) })
									}
									className="bg-surface-2 border border-border rounded-lg text-sm text-text-primary px-3 py-2 w-24 outline-none focus:border-accent transition-colors"
								/>
								<span className="text-sm text-text-secondary">days</span>
							</div>
						</div>
					</div>

					{/* Confidence */}
					<div className="px-4 py-3 border-t border-border">
						<p className="text-xs text-text-secondary uppercase tracking-wider mb-2">
							Confidence
						</p>
						<p className="text-3xl font-light text-accent mb-3">
							{draft.confidence ?? belief.confidence}
						</p>
						<ConfidenceSlider
							value={draft.confidence ?? belief.confidence}
							onChange={(v) => patchDraft({ confidence: v })}
						/>
					</div>

					{/* Evidence */}
					<div className="px-4 py-3 border-t border-border">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<span className="text-xs text-text-secondary uppercase tracking-wider font-medium">
									Evidence
								</span>
								<span className="bg-surface-2 text-text-secondary text-xs px-1.5 py-0.5 rounded-full">
									{evidenceCount}
								</span>
							</div>
							<button
								type="button"
								onClick={() => setShowEvidenceForm((v) => !v)}
								className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
							>
								<Plus size={14} />
								Add
							</button>
						</div>

						{showEvidenceForm && (
							<div className="mb-3">
								<EvidenceForm
									beliefId={belief.id}
									onClose={() => setShowEvidenceForm(false)}
								/>
							</div>
						)}

						<EvidenceList beliefId={belief.id} />
					</div>

					{/* Predictions */}
					<div className="px-4 py-3 border-t border-border">
						<PredictionSection
							beliefId={belief.id}
							beliefConfidence={draft.confidence ?? belief.confidence}
						/>
					</div>

					{/* Connections */}
					<div className="px-4 py-3 border-t border-border">
						<ConnectionSection beliefId={belief.id} />
					</div>

					{/* History */}
					<div className="px-4 py-3 border-t border-border">
						<BeliefHistory beliefId={belief.id} />
					</div>

					{/* "What changed?" prompt after confidence save */}
					{pendingUpdate && (
						<div className="px-4 py-3 border-t border-accent/30 bg-accent/5">
							<p className="text-xs text-text-secondary mb-2">
								What changed your thinking?
							</p>
							<div className="flex gap-2">
								<input
									type="text"
									value={triggerText}
									onChange={(e) => setTriggerText(e.target.value)}
									placeholder="Optional note..."
									className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-accent"
									autoFocus
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											logUpdate({
												belief_id: pendingUpdate.beliefId,
												old_confidence: pendingUpdate.oldConf,
												new_confidence: pendingUpdate.newConf,
												trigger_description: triggerText.trim() || undefined,
											});
											setPendingUpdate(null);
										}
									}}
								/>
								<button
									type="button"
									onClick={() => {
										logUpdate({
											belief_id: pendingUpdate.beliefId,
											old_confidence: pendingUpdate.oldConf,
											new_confidence: pendingUpdate.newConf,
											trigger_description: triggerText.trim() || undefined,
										});
										setPendingUpdate(null);
									}}
									className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs font-medium"
								>
									Save
								</button>
								<button
									type="button"
									onClick={() => {
										logUpdate({
											belief_id: pendingUpdate.beliefId,
											old_confidence: pendingUpdate.oldConf,
											new_confidence: pendingUpdate.newConf,
										});
										setPendingUpdate(null);
									}}
									className="text-text-secondary hover:text-text-primary text-xs px-2"
								>
									Skip
								</button>
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="sticky bottom-0 mt-auto px-4 py-3 border-t border-border bg-surface-1 space-y-2">
						{error && <p className="text-xs text-danger">{error}</p>}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleSave}
								className="relative bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							>
								Save
								{isDirty && (
									<span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
								)}
							</button>

							{!showDeleteConfirm ? (
								<button
									type="button"
									onClick={() => setShowDeleteConfirm(true)}
									className="text-danger hover:bg-danger/10 px-4 py-2 rounded-lg text-sm transition-colors"
								>
									Delete
								</button>
							) : (
								<div className="flex items-center gap-2">
									<span className="text-sm text-text-secondary">
										Delete this belief?
									</span>
									<button
										type="button"
										onClick={handleDelete}
										className="text-danger hover:bg-danger/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
									>
										Confirm
									</button>
									<button
										type="button"
										onClick={() => setShowDeleteConfirm(false)}
										className="text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg text-sm transition-colors"
									>
										Cancel
									</button>
								</div>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
