import { create } from "zustand";

type ActiveView = "list" | "graph" | "predictions";

interface UIState {
	selectedBeliefId: number | null;
	activeView: ActiveView;
	panelOpen: boolean;
	searchQuery: string;
	selectedDomains: string[];
	quickAddOpen: boolean;
	deepAddOpen: boolean;
	settingsOpen: boolean;
	commandPaletteOpen: boolean;

	selectBelief: (id: number | null) => void;
	setActiveView: (view: ActiveView) => void;
	setSearchQuery: (q: string) => void;
	toggleDomain: (domain: string) => void;
	clearFilters: () => void;
	openQuickAdd: () => void;
	closeQuickAdd: () => void;
	openDeepAdd: () => void;
	closeDeepAdd: () => void;
	openSettings: () => void;
	closeSettings: () => void;
	openCommandPalette: () => void;
	closeCommandPalette: () => void;
	closeAll: () => void;
}

export const useUIStore = create<UIState>((set) => ({
	selectedBeliefId: null,
	activeView: "list",
	panelOpen: false,
	searchQuery: "",
	selectedDomains: [],
	quickAddOpen: false,
	deepAddOpen: false,
	settingsOpen: false,
	commandPaletteOpen: false,

	selectBelief: (id) =>
		set({
			selectedBeliefId: id,
			panelOpen: id !== null,
		}),

	setActiveView: (view) => set({ activeView: view }),

	setSearchQuery: (q) => set({ searchQuery: q }),

	toggleDomain: (domain) =>
		set((state) => ({
			selectedDomains: state.selectedDomains.includes(domain)
				? state.selectedDomains.filter((d) => d !== domain)
				: [...state.selectedDomains, domain],
		})),

	clearFilters: () => set({ searchQuery: "", selectedDomains: [] }),

	openQuickAdd: () => set({ quickAddOpen: true }),
	closeQuickAdd: () => set({ quickAddOpen: false }),
	openDeepAdd: () => set({ deepAddOpen: true }),
	closeDeepAdd: () => set({ deepAddOpen: false }),
	openSettings: () => set({ settingsOpen: true }),
	closeSettings: () => set({ settingsOpen: false }),
	openCommandPalette: () => set({ commandPaletteOpen: true }),
	closeCommandPalette: () => set({ commandPaletteOpen: false }),

	closeAll: () =>
		set({
			panelOpen: false,
			selectedBeliefId: null,
			quickAddOpen: false,
			deepAddOpen: false,
			settingsOpen: false,
			commandPaletteOpen: false,
		}),
}));
