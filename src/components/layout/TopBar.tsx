import { Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUIStore } from "../../store/ui-store";
import { DomainBadge } from "../shared/DomainBadge";

export function TopBar() {
	const activeView = useUIStore((s) => s.activeView);
	const searchQuery = useUIStore((s) => s.searchQuery);
	const setSearchQuery = useUIStore((s) => s.setSearchQuery);
	const selectedDomains = useUIStore((s) => s.selectedDomains);
	const toggleDomain = useUIStore((s) => s.toggleDomain);
	const openQuickAdd = useUIStore((s) => s.openQuickAdd);

	const [localQuery, setLocalQuery] = useState(searchQuery);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setSearchQuery(localQuery);
		}, 150);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [localQuery, setSearchQuery]);

	// Sync if store is cleared externally
	useEffect(() => {
		if (searchQuery === "") setLocalQuery("");
	}, [searchQuery]);

	return (
		<header className="h-12 flex items-center px-4 gap-3 border-b border-border bg-surface-0 flex-shrink-0">
			{/* View label */}
			<span className="text-lg font-light tracking-wide text-text-secondary select-none whitespace-nowrap">
				{activeView === "graph" ? "Graph" : "Beliefs"}
			</span>

			{/* Search */}
			<div className="flex items-center gap-2 bg-surface-1 rounded-lg px-3 py-1.5 flex-1 max-w-md">
				<Search size={16} className="text-text-secondary flex-shrink-0" />
				<input
					type="text"
					value={localQuery}
					onChange={(e) => setLocalQuery(e.target.value)}
					placeholder="Search beliefs..."
					className="bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary text-sm flex-1 min-w-0"
				/>
				{localQuery && (
					<button
						type="button"
						onClick={() => setLocalQuery("")}
						className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
						aria-label="Clear search"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* Active domain filter pills */}
			{selectedDomains.length > 0 && (
				<div className="flex items-center gap-1.5 overflow-x-auto no-select">
					{selectedDomains.map((domain) => (
						<button
							key={domain}
							type="button"
							onClick={() => toggleDomain(domain)}
							className="flex items-center gap-1 focus:outline-none group"
							aria-label={`Remove ${domain} filter`}
						>
							<DomainBadge domain={domain} size="sm" />
							<X
								size={12}
								className="text-text-secondary group-hover:text-text-primary transition-colors -ml-0.5"
							/>
						</button>
					))}
				</div>
			)}

			{/* New button */}
			<button
				type="button"
				onClick={openQuickAdd}
				className="flex items-center gap-1 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 flex-shrink-0 ml-auto"
			>
				<Plus size={16} />
				New
			</button>
		</header>
	);
}
