import { useCallback, useEffect, useState } from "react";
import { BeliefPanel } from "./components/beliefs/BeliefPanel";
import { DeepAdd } from "./components/beliefs/DeepAdd";
import { QuickAdd } from "./components/beliefs/QuickAdd";
import { CommandPalette } from "./components/command-palette/CommandPalette";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { SettingsPage } from "./components/settings/SettingsPage";
import { getSetting } from "./lib/tauri-commands";
import { useBeliefStore } from "./store/belief-store";
import { useSettingsStore } from "./store/settings-store";
import { useUIStore } from "./store/ui-store";
import { GraphViewPage } from "./views/GraphViewPage";
import { ListViewPage } from "./views/ListViewPage";

function App() {
	const loadAll = useBeliefStore((s) => s.loadAll);
	const loaded = useBeliefStore((s) => s.loaded);
	const loadSettings = useSettingsStore((s) => s.loadSettings);
	const activeView = useUIStore((s) => s.activeView);
	const panelOpen = useUIStore((s) => s.panelOpen);
	const quickAddOpen = useUIStore((s) => s.quickAddOpen);
	const deepAddOpen = useUIStore((s) => s.deepAddOpen);
	const settingsOpen = useUIStore((s) => s.settingsOpen);
	const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
	const openQuickAdd = useUIStore((s) => s.openQuickAdd);
	const openDeepAdd = useUIStore((s) => s.openDeepAdd);
	const closeQuickAdd = useUIStore((s) => s.closeQuickAdd);
	const closeDeepAdd = useUIStore((s) => s.closeDeepAdd);
	const closeSettings = useUIStore((s) => s.closeSettings);
	const openCommandPalette = useUIStore((s) => s.openCommandPalette);
	const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
	const selectBelief = useUIStore((s) => s.selectBelief);

	// Onboarding state: null = checking, true = done, false = needs wizard
	const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

	useEffect(() => {
		async function checkOnboarding() {
			try {
				const val = await getSetting("onboarding_complete");
				setOnboardingDone(val === "true");
			} catch {
				setOnboardingDone(false);
			}
		}
		checkOnboarding();
	}, []);

	useEffect(() => {
		if (onboardingDone) {
			loadAll();
			loadSettings();
		}
	}, [onboardingDone, loadAll, loadSettings]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// ⌘K → CommandPalette
			if (e.metaKey && e.key === "k") {
				e.preventDefault();
				if (commandPaletteOpen) {
					closeCommandPalette();
				} else {
					openCommandPalette();
				}
				return;
			}
			// ⌘⇧N → DeepAdd
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
				if (commandPaletteOpen) {
					closeCommandPalette();
				} else if (settingsOpen) {
					closeSettings();
				} else if (quickAddOpen) {
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
			closeSettings,
			openCommandPalette,
			closeCommandPalette,
			selectBelief,
			quickAddOpen,
			deepAddOpen,
			settingsOpen,
			commandPaletteOpen,
			panelOpen,
		],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	// Onboarding check in progress
	if (onboardingDone === null) {
		return (
			<div className="h-screen flex items-center justify-center bg-surface-0">
				<p className="text-text-secondary text-sm">Loading...</p>
			</div>
		);
	}

	// Show onboarding wizard
	if (!onboardingDone) {
		return (
			<OnboardingWizard
				onComplete={() => {
					setOnboardingDone(true);
				}}
			/>
		);
	}

	// Data loading
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
					{activeView === "list" ? <ListViewPage /> : <GraphViewPage />}
				</main>
			</div>
			<BeliefPanel />
			{quickAddOpen && <QuickAdd />}
			{deepAddOpen && <DeepAdd />}
			<SettingsPage />
			{commandPaletteOpen && <CommandPalette />}
		</div>
	);
}

export default App;
