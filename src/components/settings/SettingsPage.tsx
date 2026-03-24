import { Settings, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	clearAllData,
	exportDatabase,
	importDatabase,
} from "../../lib/tauri-commands";
import { useBeliefStore } from "../../store/belief-store";
import { useSettingsStore } from "../../store/settings-store";
import { useUIStore } from "../../store/ui-store";

type ConfirmDialog = { kind: "import" } | { kind: "clear" } | null;

export function SettingsPage() {
	const settingsOpen = useUIStore((s) => s.settingsOpen);
	const closeSettings = useUIStore((s) => s.closeSettings);

	const beliefs = useBeliefStore((s) => s.beliefs);

	const defaultHalfLife = useSettingsStore((s) => s.defaultHalfLife);
	const decayDemoMode = useSettingsStore((s) => s.decayDemoMode);
	const setDefaultHalfLife = useSettingsStore((s) => s.setDefaultHalfLife);
	const setDecayDemoMode = useSettingsStore((s) => s.setDecayDemoMode);
	const updateDomainColor = useSettingsStore((s) => s.updateDomainColor);
	const getDomainColor = useSettingsStore((s) => s.getDomainColor);

	const [halfLifeDraft, setHalfLifeDraft] = useState(defaultHalfLife);
	const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
	const [exportMsg, setExportMsg] = useState<string | null>(null);

	// Sync draft when store changes (e.g. on open)
	useEffect(() => {
		setHalfLifeDraft(defaultHalfLife);
	}, [defaultHalfLife, settingsOpen]);

	// Escape to close
	useEffect(() => {
		if (!settingsOpen) return;
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") closeSettings();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [settingsOpen, closeSettings]);

	if (!settingsOpen) return null;

	// Derive unique domains sorted alphabetically
	const domains = Array.from(
		new Set(beliefs.map((b) => b.domain).filter(Boolean)),
	).sort() as string[];

	const beliefCountByDomain = beliefs.reduce<Record<string, number>>(
		(acc, b) => {
			if (b.domain) {
				acc[b.domain] = (acc[b.domain] ?? 0) + 1;
			}
			return acc;
		},
		{},
	);

	async function handleHalfLifeCommit() {
		if (halfLifeDraft !== defaultHalfLife) {
			await setDefaultHalfLife(halfLifeDraft);
		}
	}

	async function handleExport() {
		const date = new Date().toISOString().slice(0, 10);
		const path = `${date}-conviction-backup.db`;
		try {
			await exportDatabase(path);
			setExportMsg(
				`Exported to ~/Library/Application Support/conviction-mapper/${path}`,
			);
			setTimeout(() => setExportMsg(null), 5000);
		} catch (err) {
			console.error("Export failed:", err);
			setExportMsg("Export failed. Check the app logs.");
			setTimeout(() => setExportMsg(null), 5000);
		}
	}

	async function handleClearConfirm() {
		try {
			await clearAllData();
			await useBeliefStore.getState().loadAll();
			setConfirmDialog(null);
			closeSettings();
		} catch (err) {
			console.error("Clear all data failed:", err);
		}
	}

	return (
		<div
			className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
			onClick={closeSettings}
		>
			<div
				className="bg-surface-1 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 border border-border"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-2">
						<Settings size={18} className="text-text-secondary" />
						<h2 className="text-lg font-light text-text-primary">Settings</h2>
					</div>
					<button
						type="button"
						onClick={closeSettings}
						className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded"
						aria-label="Close settings"
					>
						<X size={18} />
					</button>
				</div>

				{/* Section A — App */}
				<section className="border-b border-border pb-6">
					<h3 className="text-sm uppercase tracking-wider text-text-secondary mb-4">
						App
					</h3>

					{/* Default half-life */}
					<div className="flex items-center justify-between gap-6 mb-4">
						<div>
							<label
								htmlFor="half-life-range"
								className="block text-sm text-text-primary mb-1"
							>
								Default half-life
							</label>
							<p className="text-xs text-text-secondary">
								How quickly beliefs decay without updates
							</p>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							<input
								id="half-life-range"
								type="range"
								min={30}
								max={365}
								step={1}
								value={halfLifeDraft}
								onChange={(e) => setHalfLifeDraft(Number(e.target.value))}
								onMouseUp={handleHalfLifeCommit}
								onTouchEnd={handleHalfLifeCommit}
								className="w-32 accent-accent cursor-pointer"
							/>
							<span className="text-sm text-text-primary w-16 text-right">
								{halfLifeDraft} days
							</span>
						</div>
					</div>

					{/* Decay demo mode */}
					<div className="flex items-center justify-between gap-6">
						<div>
							<p className="text-sm text-text-primary mb-1">Decay demo mode</p>
							<p className="text-xs text-text-secondary">
								Preview how beliefs look 1 year from now
							</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer shrink-0">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={decayDemoMode}
								onChange={(e) => setDecayDemoMode(e.target.checked)}
							/>
							<div className="w-10 h-5 bg-surface-2 border border-border rounded-full peer peer-checked:bg-accent peer-checked:border-accent transition-colors" />
							<div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
						</label>
					</div>
				</section>

				{/* Section B — Domains */}
				<section className="border-b border-border py-6">
					<h3 className="text-sm uppercase tracking-wider text-text-secondary mb-4">
						Domains
					</h3>

					{domains.length === 0 ? (
						<p className="text-sm text-text-secondary">
							No domains yet. Add beliefs to see domains here.
						</p>
					) : (
						<ul className="space-y-2">
							{domains.map((domain) => {
								const count = beliefCountByDomain[domain] ?? 0;
								const hasBeliefsInDomain = count > 0;
								return (
									<li key={domain} className="flex items-center gap-3">
										<input
											type="color"
											value={getDomainColor(domain)}
											onChange={(e) =>
												updateDomainColor(domain, e.target.value)
											}
											className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
											style={{ minWidth: "24px" }}
											title={`Color for ${domain}`}
										/>
										<span className="text-sm text-text-primary flex-1">
											{domain}
										</span>
										<span className="text-xs text-text-secondary">
											{count} {count === 1 ? "belief" : "beliefs"}
										</span>
										<button
											type="button"
											disabled={hasBeliefsInDomain}
											className={`p-1 rounded transition-colors ${
												hasBeliefsInDomain
													? "opacity-40 cursor-not-allowed text-text-secondary"
													: "text-text-secondary hover:text-danger hover:bg-surface-2"
											}`}
											title={
												hasBeliefsInDomain
													? "Cannot delete domain with beliefs"
													: `Delete ${domain}`
											}
											aria-label={`Delete domain ${domain}`}
										>
											<Trash2 size={14} />
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</section>

				{/* Section C — Data */}
				<section className="pt-6">
					<h3 className="text-sm uppercase tracking-wider text-text-secondary mb-4">
						Data
					</h3>

					<div className="space-y-3">
						{/* Export */}
						<div>
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-sm text-text-primary">Export database</p>
									<p className="text-xs text-text-secondary">
										Save a backup of all your beliefs and evidence
									</p>
								</div>
								<button
									type="button"
									onClick={handleExport}
									className="shrink-0 px-4 py-2 rounded-lg text-sm border border-accent text-accent hover:bg-accent hover:text-white transition-colors"
								>
									Export
								</button>
							</div>
							{exportMsg && (
								<p className="mt-2 text-xs text-text-secondary">{exportMsg}</p>
							)}
						</div>

						{/* Import */}
						<div>
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-sm text-text-primary">Import database</p>
									<p className="text-xs text-text-secondary">
										Replace all data with a backup file
									</p>
								</div>
								<button
									type="button"
									onClick={() => setConfirmDialog({ kind: "import" })}
									className="shrink-0 px-4 py-2 rounded-lg text-sm border border-border text-text-primary hover:border-accent hover:text-accent transition-colors"
								>
									Import
								</button>
							</div>

							{confirmDialog?.kind === "import" && (
								<div className="mt-3 p-3 rounded-lg bg-surface-2 border border-border">
									<p className="text-sm text-text-primary mb-3">
										This will replace all current data. Are you sure?
									</p>
									<p className="text-xs text-text-secondary mb-3">
										Import requires selecting a file. Use the path from your
										last export (~/Library/Application
										Support/conviction-mapper/).
									</p>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={async () => {
												try {
													await importDatabase("conviction-backup.db");
													await useBeliefStore.getState().loadAll();
												} catch (err) {
													console.error("Import failed:", err);
												} finally {
													setConfirmDialog(null);
												}
											}}
											className="px-3 py-1.5 rounded-lg text-sm border border-border text-text-primary hover:border-accent hover:text-accent transition-colors"
										>
											Confirm
										</button>
										<button
											type="button"
											onClick={() => setConfirmDialog(null)}
											className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
										>
											Cancel
										</button>
									</div>
								</div>
							)}
						</div>

						{/* Clear all */}
						<div>
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-sm text-text-primary">Clear all data</p>
									<p className="text-xs text-text-secondary">
										Permanently delete all beliefs, evidence, and connections
									</p>
								</div>
								<button
									type="button"
									onClick={() => setConfirmDialog({ kind: "clear" })}
									className="shrink-0 px-4 py-2 rounded-lg text-sm border border-red-500/60 text-red-400 hover:bg-red-500/10 transition-colors"
								>
									Clear all
								</button>
							</div>

							{confirmDialog?.kind === "clear" && (
								<div className="mt-3 p-3 rounded-lg bg-surface-2 border border-red-500/30">
									<p className="text-sm text-red-400 mb-1 font-medium">
										This cannot be undone.
									</p>
									<p className="text-xs text-text-secondary mb-3">
										This will permanently delete all beliefs, evidence, and
										connections.
									</p>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={handleClearConfirm}
											className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 border border-red-500/60 text-red-400 hover:bg-red-500/30 transition-colors"
										>
											Yes, delete everything
										</button>
										<button
											type="button"
											onClick={() => setConfirmDialog(null)}
											className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
										>
											Cancel
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
