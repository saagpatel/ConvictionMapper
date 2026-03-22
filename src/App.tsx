import { useCallback, useEffect } from "react";
import { BeliefPanel } from "./components/beliefs/BeliefPanel";
import { DeepAdd } from "./components/beliefs/DeepAdd";
import { QuickAdd } from "./components/beliefs/QuickAdd";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { useBeliefStore } from "./store/belief-store";
import { useUIStore } from "./store/ui-store";
import { ListViewPage } from "./views/ListViewPage";

function App() {
	const loadAll = useBeliefStore((s) => s.loadAll);
	const loaded = useBeliefStore((s) => s.loaded);
	const panelOpen = useUIStore((s) => s.panelOpen);
	const quickAddOpen = useUIStore((s) => s.quickAddOpen);
	const deepAddOpen = useUIStore((s) => s.deepAddOpen);
	const openQuickAdd = useUIStore((s) => s.openQuickAdd);
	const openDeepAdd = useUIStore((s) => s.openDeepAdd);
	const closeQuickAdd = useUIStore((s) => s.closeQuickAdd);
	const closeDeepAdd = useUIStore((s) => s.closeDeepAdd);
	const selectBelief = useUIStore((s) => s.selectBelief);

	useEffect(() => {
		loadAll();
	}, [loadAll]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// ⌘⇧N → DeepAdd (check before ⌘N since it also has metaKey)
			if (e.metaKey && e.shiftKey && e.key === "n") {
				e.preventDefault();
				openDeepAdd();
				return;
			}
			// ⌘N → QuickAdd
			if (e.metaKey && !e.shiftKey && e.key === "n") {
				e.preventDefault();
				openQuickAdd();
				return;
			}
			// Escape → close in priority order
			if (e.key === "Escape") {
				if (quickAddOpen) {
					closeQuickAdd();
				} else if (deepAddOpen) {
					closeDeepAdd();
				} else if (panelOpen) {
					selectBelief(null);
				}
			}
		},
		[
			openQuickAdd,
			openDeepAdd,
			closeQuickAdd,
			closeDeepAdd,
			selectBelief,
			quickAddOpen,
			deepAddOpen,
			panelOpen,
		],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	if (!loaded) {
		return (
			<div className="h-screen flex items-center justify-center bg-surface-0">
				<p className="text-text-secondary text-sm">Loading...</p>
			</div>
		);
	}

	return (
		<div className="h-screen flex bg-surface-0 overflow-hidden">
			<Sidebar />
			<div className="flex-1 flex flex-col min-w-0">
				<TopBar />
				<main
					className={`flex-1 overflow-hidden flex transition-all duration-200 ${panelOpen ? "mr-[380px]" : ""}`}
				>
					<ListViewPage />
				</main>
			</div>
			<BeliefPanel />
			{quickAddOpen && <QuickAdd />}
			{deepAddOpen && <DeepAdd />}
		</div>
	);
}

export default App;
