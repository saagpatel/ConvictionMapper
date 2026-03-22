import { useEffect, useRef, useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import { useUIStore } from "../../store/ui-store";
import { ConfidenceSlider } from "../shared/ConfidenceSlider";
import { DomainSelect } from "../shared/DomainSelect";

export function QuickAdd() {
	const quickAddOpen = useUIStore((s) => s.quickAddOpen);
	const closeQuickAdd = useUIStore((s) => s.closeQuickAdd);
	const selectBelief = useUIStore((s) => s.selectBelief);
	const createBelief = useBeliefStore((s) => s.createBelief);

	const [title, setTitle] = useState("");
	const [confidence, setConfidence] = useState(50);
	const [domain, setDomain] = useState("General");

	const titleRef = useRef<HTMLInputElement>(null);

	// Auto-focus on open
	useEffect(() => {
		if (quickAddOpen) {
			setTitle("");
			setConfidence(50);
			setDomain("General");
			setTimeout(() => titleRef.current?.focus(), 50);
		}
	}, [quickAddOpen]);

	// Escape to close
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				closeQuickAdd();
			}
		}
		if (quickAddOpen) {
			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [quickAddOpen, closeQuickAdd]);

	if (!quickAddOpen) return null;

	async function handleSubmit() {
		if (!title.trim()) return;
		const belief = await createBelief({
			title: title.trim(),
			confidence,
			domain,
		});
		closeQuickAdd();
		selectBelief(belief.id);
	}

	function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && title.trim()) {
			handleSubmit();
		}
	}

	return (
		<div
			className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
			onClick={closeQuickAdd}
		>
			<div
				className="bg-surface-1 rounded-xl shadow-2xl w-[400px] p-5 space-y-4 border border-border"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-lg font-light text-text-primary">New Belief</h2>

				<div>
					<input
						ref={titleRef}
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						onKeyDown={handleTitleKeyDown}
						placeholder="What do you believe?"
						className="w-full text-sm bg-surface-2 rounded-lg px-3 py-2.5 border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-primary placeholder:text-text-secondary transition-colors"
					/>
				</div>

				<div>
					<label className="block text-xs text-text-secondary mb-2">
						Confidence
					</label>
					<ConfidenceSlider value={confidence} onChange={setConfidence} />
				</div>

				<div>
					<label className="block text-xs text-text-secondary mb-1">
						Domain
					</label>
					<DomainSelect value={domain} onChange={setDomain} />
				</div>

				<div className="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onClick={closeQuickAdd}
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
