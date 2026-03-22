import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { EDGE_COLORS } from "../../lib/graph-layout";
import { useBeliefStore } from "../../store/belief-store";
import type { RelationshipType } from "../../types";
import { StrengthSelector } from "../shared/StrengthSelector";

type Props = {
	beliefId: number;
};

const RELATIONSHIP_TYPES: RelationshipType[] = [
	"supports",
	"contradicts",
	"depends_on",
	"related",
];

function RelationshipBadge({
	relationship,
}: {
	relationship: RelationshipType;
}) {
	const color = EDGE_COLORS[relationship] ?? "#6B7280";
	const label =
		relationship === "depends_on"
			? "Depends On"
			: relationship.charAt(0).toUpperCase() + relationship.slice(1);
	return (
		<span
			className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
			style={{ backgroundColor: `${color}22`, color }}
		>
			{label}
		</span>
	);
}

export function ConnectionSection({ beliefId }: Props) {
	const beliefs = useBeliefStore((s) => s.beliefs);
	const connections = useBeliefStore((s) => s.connections);
	const createConnection = useBeliefStore((s) => s.createConnection);
	const removeConnection = useBeliefStore((s) => s.removeConnection);

	const myConnections = connections.filter(
		(c) => c.from_belief_id === beliefId || c.to_belief_id === beliefId,
	);

	const [showForm, setShowForm] = useState(false);
	const [searchText, setSearchText] = useState("");
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [relationship, setRelationship] = useState<RelationshipType | null>(
		null,
	);
	const [strength, setStrength] = useState(3);
	const [error, setError] = useState<string | null>(null);

	const filteredBeliefs = beliefs.filter(
		(b) =>
			b.id !== beliefId &&
			b.title.toLowerCase().includes(searchText.toLowerCase()),
	);

	const selectedBelief =
		selectedId != null ? beliefs.find((b) => b.id === selectedId) : null;

	function resetForm() {
		setSearchText("");
		setSelectedId(null);
		setRelationship(null);
		setStrength(3);
		setError(null);
		setShowForm(false);
	}

	async function handleCreate() {
		if (selectedId == null || relationship == null) return;
		setError(null);
		try {
			await createConnection({
				from_belief_id: beliefId,
				to_belief_id: selectedId,
				relationship,
				strength,
			});
			resetForm();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes("UNIQUE")) {
				setError("Connection already exists");
			} else {
				setError(msg);
			}
		}
	}

	function handleDelete(id: number) {
		if (window.confirm("Remove this connection?")) {
			removeConnection(id);
		}
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs text-text-secondary uppercase tracking-wider font-medium">
						Connections
					</span>
					<span className="bg-surface-2 text-text-secondary text-xs px-1.5 py-0.5 rounded-full">
						{myConnections.length}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setShowForm((v) => !v)}
					className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
				>
					<Plus size={14} />
					Add
				</button>
			</div>

			{myConnections.length === 0 && !showForm && (
				<p className="text-text-secondary text-sm">No connections.</p>
			)}

			<div className="space-y-2">
				{myConnections.map((conn) => {
					const otherId =
						conn.from_belief_id === beliefId
							? conn.to_belief_id
							: conn.from_belief_id;
					const other = beliefs.find((b) => b.id === otherId);
					return (
						<div
							key={conn.id}
							className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2"
						>
							<RelationshipBadge relationship={conn.relationship} />
							<span className="text-sm text-text-primary truncate flex-1">
								{other?.title ?? `Belief #${otherId}`}
							</span>
							<span className="text-xs text-text-secondary tabular-nums shrink-0">
								{conn.strength}
							</span>
							<button
								type="button"
								onClick={() => handleDelete(conn.id)}
								className="text-text-secondary hover:text-danger transition-colors shrink-0"
								aria-label="Remove connection"
							>
								<Trash2 size={14} />
							</button>
						</div>
					);
				})}
			</div>

			{showForm && (
				<div className="bg-surface-2 rounded-lg p-3 space-y-3 border border-border">
					{/* Step 1: pick belief */}
					{selectedId == null && (
						<div>
							<label className="block text-xs text-text-secondary mb-1">
								Search beliefs
							</label>
							<input
								type="text"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								placeholder="Type to filter..."
								className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm placeholder:text-text-secondary outline-none focus:border-accent transition-colors"
								autoFocus
							/>
							{searchText.length > 0 && filteredBeliefs.length > 0 && (
								<div className="mt-1 max-h-36 overflow-y-auto bg-surface-1 border border-border rounded-lg divide-y divide-border">
									{filteredBeliefs.map((b) => (
										<button
											key={b.id}
											type="button"
											onClick={() => {
												setSelectedId(b.id);
												setSearchText("");
											}}
											className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-2 transition-colors"
										>
											{b.title}
										</button>
									))}
								</div>
							)}
							{searchText.length > 0 && filteredBeliefs.length === 0 && (
								<p className="mt-1 text-xs text-text-secondary px-1">
									No matching beliefs.
								</p>
							)}
						</div>
					)}

					{/* Step 2: pick relationship */}
					{selectedId != null && relationship == null && (
						<div>
							<p className="text-xs text-text-secondary mb-2">
								Connecting to:{" "}
								<span className="text-text-primary">
									{selectedBelief?.title}
								</span>
							</p>
							<p className="text-xs text-text-secondary mb-1">
								Relationship type
							</p>
							<div className="flex gap-1.5 flex-wrap">
								{RELATIONSHIP_TYPES.map((r) => {
									const color = EDGE_COLORS[r] ?? "#6B7280";
									const label =
										r === "depends_on"
											? "Depends On"
											: r.charAt(0).toUpperCase() + r.slice(1);
									return (
										<button
											key={r}
											type="button"
											onClick={() => setRelationship(r)}
											className="px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
											style={{ backgroundColor: `${color}22`, color }}
										>
											{label}
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Step 3: strength + create */}
					{selectedId != null && relationship != null && (
						<div className="space-y-2">
							<p className="text-xs text-text-secondary">
								<span className="text-text-primary">
									{selectedBelief?.title}
								</span>
								{" — "}
								<RelationshipBadge relationship={relationship} />
							</p>
							<div>
								<label className="block text-xs text-text-secondary mb-1">
									Strength
								</label>
								<StrengthSelector value={strength} onChange={setStrength} />
							</div>
							{error && <p className="text-xs text-danger">{error}</p>}
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={resetForm}
									className="text-text-secondary hover:text-text-primary text-sm transition-colors px-2 py-1"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleCreate}
									className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
								>
									Create
								</button>
							</div>
						</div>
					)}

					{selectedId == null && (
						<div className="flex justify-end">
							<button
								type="button"
								onClick={resetForm}
								className="text-text-secondary hover:text-text-primary text-sm transition-colors px-2 py-1"
							>
								Cancel
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
