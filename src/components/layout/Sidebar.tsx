import { LayoutGrid, List } from "lucide-react";
import { DOMAIN_COLORS } from "../../lib/graph-layout";
import { useBeliefStore } from "../../store/belief-store";
import { useUIStore } from "../../store/ui-store";

export function Sidebar() {
	const beliefs = useBeliefStore((s) => s.beliefs);
	const activeView = useUIStore((s) => s.activeView);
	const setActiveView = useUIStore((s) => s.setActiveView);
	const selectedDomains = useUIStore((s) => s.selectedDomains);
	const toggleDomain = useUIStore((s) => s.toggleDomain);

	const uniqueDomains = Array.from(new Set(beliefs.map((b) => b.domain)));

	return (
		<aside className="w-14 h-screen flex flex-col bg-surface-1 border-r border-border flex-shrink-0">
			{/* App logo */}
			<div className="flex items-center justify-center py-3">
				<div
					className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent font-bold text-sm text-white select-none"
					style={{ letterSpacing: "-0.02em" }}
				>
					CM
				</div>
			</div>

			<div className="h-px bg-border mx-2 my-1" />

			{/* View switcher */}
			<nav className="flex flex-col items-center gap-1 px-2 py-2">
				<button
					type="button"
					title="List view"
					onClick={() => setActiveView("list")}
					className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-150 ${
						activeView === "list"
							? "text-accent bg-surface-2"
							: "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
					}`}
				>
					<List size={18} />
				</button>
				<button
					type="button"
					title="Graph view (coming soon)"
					disabled
					className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary opacity-40 cursor-not-allowed"
				>
					<LayoutGrid size={18} />
				</button>
			</nav>

			<div className="h-px bg-border mx-2 my-1" />

			{/* Domain filter dots */}
			<div className="flex flex-col items-center gap-2 px-2 py-2 overflow-y-auto flex-1">
				{uniqueDomains.map((domain) => {
					const color = DOMAIN_COLORS[domain] ?? "#6B7280";
					const isActive = selectedDomains.includes(domain);
					return (
						<button
							key={domain}
							type="button"
							title={domain}
							onClick={() => toggleDomain(domain)}
							className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-surface-2 focus:outline-none ${
								isActive ? "opacity-100 ring-1 ring-border" : "opacity-40"
							}`}
						>
							<span
								style={{
									width: 10,
									height: 10,
									backgroundColor: color,
									borderRadius: "50%",
									display: "inline-block",
								}}
							/>
						</button>
					);
				})}
			</div>
		</aside>
	);
}
