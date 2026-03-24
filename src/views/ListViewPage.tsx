import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { DomainBadge } from "../components/shared/DomainBadge";
import { useBeliefStore } from "../store/belief-store";
import { useUIStore } from "../store/ui-store";
import type { Belief } from "../types";

type SortColumn =
	| "title"
	| "domain"
	| "confidence"
	| "last_touched"
	| "evidence"
	| "predictions";
type SortDirection = "asc" | "desc";

function confidenceColor(value: number): string {
	if (value > 70) return "text-accent";
	if (value < 30) return "text-danger";
	return "text-text-primary";
}

export function ListViewPage() {
	const beliefs = useBeliefStore((s) => s.beliefs);
	const evidenceCounts = useBeliefStore((s) => s.evidenceCounts);
	const predictionCounts = useBeliefStore((s) => s.predictionCounts);
	const searchQuery = useUIStore((s) => s.searchQuery);
	const selectedDomains = useUIStore((s) => s.selectedDomains);
	const selectedBeliefId = useUIStore((s) => s.selectedBeliefId);
	const selectBelief = useUIStore((s) => s.selectBelief);
	const openQuickAdd = useUIStore((s) => s.openQuickAdd);

	const [sortColumn, setSortColumn] = useState<SortColumn>("last_touched");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	function handleSort(col: SortColumn) {
		if (sortColumn === col) {
			setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortColumn(col);
			setSortDirection("desc");
		}
	}

	const filtered = useMemo(() => {
		let list: Belief[] = [...beliefs];

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter((b) => b.title.toLowerCase().includes(q));
		}

		if (selectedDomains.length > 0) {
			list = list.filter((b) => selectedDomains.includes(b.domain));
		}

		list.sort((a, b) => {
			let cmp = 0;
			if (sortColumn === "title") {
				cmp = a.title.localeCompare(b.title);
			} else if (sortColumn === "domain") {
				cmp = a.domain.localeCompare(b.domain);
			} else if (sortColumn === "confidence") {
				cmp = a.confidence - b.confidence;
			} else if (sortColumn === "last_touched") {
				cmp =
					new Date(a.last_touched).getTime() -
					new Date(b.last_touched).getTime();
			} else if (sortColumn === "evidence") {
				cmp = (evidenceCounts[a.id] ?? 0) - (evidenceCounts[b.id] ?? 0);
			} else if (sortColumn === "predictions") {
				cmp =
					(predictionCounts[a.id]?.total ?? 0) -
					(predictionCounts[b.id]?.total ?? 0);
			}
			return sortDirection === "asc" ? cmp : -cmp;
		});

		return list;
	}, [
		beliefs,
		evidenceCounts,
		predictionCounts,
		searchQuery,
		selectedDomains,
		sortColumn,
		sortDirection,
	]);

	function SortIcon({ col }: { col: SortColumn }) {
		if (sortColumn !== col) return null;
		return sortDirection === "asc" ? (
			<ChevronUp size={12} className="inline-block ml-0.5" />
		) : (
			<ChevronDown size={12} className="inline-block ml-0.5" />
		);
	}

	const colHeader = (label: string, col: SortColumn, extra = "") => (
		<th
			className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-secondary cursor-pointer hover:text-text-primary select-none transition-colors duration-100 ${extra}`}
			onClick={() => handleSort(col)}
		>
			{label}
			<SortIcon col={col} />
		</th>
	);

	if (beliefs.length === 0) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
				<p className="text-text-secondary text-sm">
					No beliefs yet. Press ⌘N to add your first.
				</p>
				<button
					type="button"
					onClick={openQuickAdd}
					className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
				>
					<Plus size={16} />
					New Belief
				</button>
			</div>
		);
	}

	if (filtered.length === 0) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-text-secondary text-sm">
					No beliefs match your search.
				</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<table className="w-full border-collapse">
				<thead className="sticky top-0 bg-surface-1 z-10">
					<tr>
						{colHeader("Title", "title", "min-w-0")}
						{colHeader("Domain", "domain", "w-36")}
						{colHeader("Confidence", "confidence", "w-28")}
						{colHeader("Last Touched", "last_touched", "w-36")}
						{colHeader("Evidence", "evidence", "w-20 text-center")}
						{colHeader("Pred.", "predictions", "w-16 text-center")}
					</tr>
					<tr>
						<td colSpan={6} className="p-0">
							<div className="h-px bg-border" />
						</td>
					</tr>
				</thead>
				<tbody>
					{filtered.map((belief) => {
						const isSelected = belief.id === selectedBeliefId;
						const evCount = evidenceCounts[belief.id] ?? 0;
						const predInfo = predictionCounts[belief.id];
						return (
							<tr
								key={belief.id}
								onClick={() => selectBelief(belief.id)}
								className={`cursor-pointer transition-colors duration-150 hover:bg-surface-1 ${
									isSelected ? "bg-surface-1 border-l-2 border-l-accent" : ""
								}`}
							>
								<td className="px-4 py-3 min-w-0">
									<span className="block text-sm font-medium text-text-primary truncate max-w-xs">
										{belief.title}
									</span>
								</td>
								<td className="px-4 py-3 w-36">
									<DomainBadge domain={belief.domain} size="sm" />
								</td>
								<td className="px-4 py-3 w-28">
									<span
										className={`text-sm font-bold tabular-nums ${confidenceColor(belief.confidence)}`}
									>
										{belief.confidence}
									</span>
									<div className="mt-1 h-1 rounded-full bg-surface-2 w-full overflow-hidden">
										<div
											className="h-full rounded-full bg-accent"
											style={{ width: `${belief.confidence}%` }}
										/>
									</div>
								</td>
								<td className="px-4 py-3 w-36">
									<span className="text-sm text-text-secondary">
										{formatDistanceToNow(new Date(belief.last_touched), {
											addSuffix: true,
										})}
									</span>
								</td>
								<td className="px-4 py-3 w-20 text-center">
									<span className="text-sm text-text-secondary">
										{evCount > 0 ? evCount : "—"}
									</span>
								</td>
								<td className="px-4 py-3 w-16 text-center">
									<span
										className={`text-sm tabular-nums ${
											predInfo && predInfo.overdue > 0
												? "text-amber-400 font-medium"
												: "text-text-secondary"
										}`}
									>
										{predInfo && predInfo.total > 0 ? predInfo.total : "—"}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
