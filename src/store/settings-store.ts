import { create } from "zustand";
import { DOMAIN_COLORS } from "../lib/graph-layout";
import { getSetting, setSetting } from "../lib/tauri-commands";

interface SettingsState {
	domainColors: Record<string, string>;
	defaultHalfLife: number;
	decayDemoMode: boolean;
	loaded: boolean;

	loadSettings: () => Promise<void>;
	setDefaultHalfLife: (days: number) => Promise<void>;
	setDecayDemoMode: (enabled: boolean) => Promise<void>;
	updateDomainColor: (domain: string, color: string) => Promise<void>;
	getDomainColor: (domain: string) => string;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	domainColors: { ...DOMAIN_COLORS },
	defaultHalfLife: 90,
	decayDemoMode: false,
	loaded: false,

	loadSettings: async () => {
		try {
			const halfLife = await getSetting("default_half_life");
			const demoMode = await getSetting("decay_demo_mode");

			let userColors: Record<string, string> = {};
			try {
				const raw = await getSetting("domain_colors");
				userColors = JSON.parse(raw) as Record<string, string>;
			} catch {
				// No custom colors saved yet
			}

			set({
				defaultHalfLife: Number.parseInt(halfLife, 10) || 90,
				decayDemoMode: demoMode === "true",
				domainColors: { ...DOMAIN_COLORS, ...userColors },
				loaded: true,
			});
		} catch {
			set({ loaded: true });
		}
	},

	setDefaultHalfLife: async (days) => {
		await setSetting("default_half_life", String(days));
		set({ defaultHalfLife: days });
	},

	setDecayDemoMode: async (enabled) => {
		await setSetting("decay_demo_mode", String(enabled));
		set({ decayDemoMode: enabled });
	},

	updateDomainColor: async (domain, color) => {
		const updated = { ...get().domainColors, [domain]: color };
		// Save only user overrides (diff from defaults)
		const overrides: Record<string, string> = {};
		for (const [d, c] of Object.entries(updated)) {
			if (c !== DOMAIN_COLORS[d]) {
				overrides[d] = c;
			}
		}
		await setSetting("domain_colors", JSON.stringify(overrides));
		set({ domainColors: updated });
	},

	getDomainColor: (domain) => {
		return get().domainColors[domain] ?? "#6B7280";
	},
}));
