import {
	ArrowRightLeft,
	Plus,
	RotateCcw,
	Search,
	Settings,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBeliefStore } from "../../store/belief-store";
import { useUIStore } from "../../store/ui-store";
import type { Belief } from "../../types";
import { DomainBadge } from "../shared/DomainBadge";

type Command = {
	id: string;
	name: string;
	shortcut?: string;
	icon: React.ReactNode;
	action: () => void;
};

export function CommandPalette() {
	const { beliefs } = useBeliefStore();
	const {
		commandPaletteOpen,
		closeCommandPalette,
		selectBelief,
		openQuickAdd,
		openDeepAdd,
		openSettings,
		activeView,
		setActiveView,
	} = useUIStore();

	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const commands: Command[] = [
		{
			id: "new-belief",
			name: "New Belief",
			shortcut: "⌘N",
			icon: <Plus size={16} />,
			action: openQuickAdd,
		},
		{
			id: "new-belief-detailed",
			name: "New Belief (Detailed)",
			shortcut: "⌘⇧N",
			icon: <Plus size={16} />,
			action: openDeepAdd,
		},
		{
			id: "settings",
			name: "Settings",
			icon: <Settings size={16} />,
			action: openSettings,
		},
		{
			id: "toggle-view",
			name: "Toggle View",
			icon: <ArrowRightLeft size={16} />,
			action: () => setActiveView(activeView === "list" ? "graph" : "list"),
		},
		{
			id: "reset-zoom",
			name: "Reset Zoom",
			icon: <RotateCcw size={16} />,
			action: () => {
				// no-op: graph-specific, handled by graph component
			},
		},
	];

	const filteredBeliefs: Belief[] = query.trim()
		? beliefs
				.filter((b) =>
					b.title.toLowerCase().includes(query.trim().toLowerCase()),
				)
				.slice(0, 10)
		: [];

	const filteredCommands = query.trim()
		? commands.filter((c) =>
				c.name.toLowerCase().includes(query.trim().toLowerCase()),
			)
		: commands;

	const totalItems = filteredBeliefs.length + filteredCommands.length;

	// Reset state when palette opens
	useEffect(() => {
		if (commandPaletteOpen) {
			setQuery("");
			setSelectedIndex(0);
			// Delay focus to let the element mount
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [commandPaletteOpen]);

	// Reset selection when results change
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (!listRef.current) return;
		const highlighted = listRef.current.querySelector(
			"[data-highlighted='true']",
		);
		highlighted?.scrollIntoView({ block: "nearest" });
	}, [selectedIndex]);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") {
			closeCommandPalette();
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((i) => (i + 1) % Math.max(totalItems, 1));
			return;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((i) => (i === 0 ? Math.max(totalItems - 1, 0) : i - 1));
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			handleSelectIndex(selectedIndex);
		}
	}

	function handleSelectIndex(index: number) {
		if (index < filteredBeliefs.length) {
			const belief = filteredBeliefs[index];
			closeCommandPalette();
			selectBelief(belief.id);
		} else {
			const cmdIndex = index - filteredBeliefs.length;
			const command = filteredCommands[cmdIndex];
			if (command) {
				closeCommandPalette();
				command.action();
			}
		}
	}

	if (!commandPaletteOpen) return null;

	return (
		<div
			className="fixed inset-0 z-40 bg-black/60 flex items-start justify-center pt-[20vh]"
			onMouseDown={(e) => {
				// Close when clicking the backdrop
				if (e.target === e.currentTarget) closeCommandPalette();
			}}
		>
			<div className="bg-surface-1 rounded-xl shadow-2xl w-[500px] border border-border overflow-hidden">
				{/* Search input */}
				<div className="flex items-center border-b border-border">
					<span className="pl-4 text-text-secondary flex-shrink-0">
						<Search size={18} />
					</span>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Search beliefs and commands..."
						className="w-full bg-transparent text-text-primary text-lg px-4 py-3 outline-none placeholder:text-text-secondary"
					/>
				</div>

				{/* Results */}
				<div ref={listRef} className="max-h-[400px] overflow-y-auto">
					{/* Beliefs section */}
					{filteredBeliefs.length > 0 && (
						<>
							<div className="px-4 py-1.5 text-xs text-text-secondary uppercase tracking-wider bg-surface-0">
								Beliefs
							</div>
							{filteredBeliefs.map((belief, i) => {
								const isSelected = i === selectedIndex;
								return (
									<div
										key={belief.id}
										data-highlighted={isSelected}
										className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
											isSelected ? "bg-surface-2" : "hover:bg-surface-2"
										}`}
										onMouseEnter={() => setSelectedIndex(i)}
										onMouseDown={() => handleSelectIndex(i)}
									>
										<DomainBadge domain={belief.domain} size="sm" />
										<span className="flex-1 truncate text-sm text-text-primary">
											{belief.title}
										</span>
										<span className="text-sm text-text-secondary flex-shrink-0">
											{belief.confidence}
										</span>
									</div>
								);
							})}
						</>
					)}

					{/* Commands section */}
					{filteredCommands.length > 0 && (
						<>
							<div className="px-4 py-1.5 text-xs text-text-secondary uppercase tracking-wider bg-surface-0">
								Commands
							</div>
							{filteredCommands.map((command, i) => {
								const absoluteIndex = filteredBeliefs.length + i;
								const isSelected = absoluteIndex === selectedIndex;
								return (
									<div
										key={command.id}
										data-highlighted={isSelected}
										className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
											isSelected ? "bg-surface-2" : "hover:bg-surface-2"
										}`}
										onMouseEnter={() => setSelectedIndex(absoluteIndex)}
										onMouseDown={() => handleSelectIndex(absoluteIndex)}
									>
										<span className="text-text-secondary flex-shrink-0">
											{command.icon}
										</span>
										<span className="flex-1 text-sm text-text-primary">
											{command.name}
										</span>
										{command.shortcut && (
											<span className="text-xs text-text-secondary flex-shrink-0">
												{command.shortcut}
											</span>
										)}
									</div>
								);
							})}
						</>
					)}

					{/* Empty state */}
					{totalItems === 0 && query.trim() && (
						<div className="px-4 py-8 text-center text-sm text-text-secondary">
							No results for &ldquo;{query}&rdquo;
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
