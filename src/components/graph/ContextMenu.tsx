import { Link2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
	nodeId: number;
	x: number;
	y: number;
	onEdit: (nodeId: number) => void;
	onConnect: (nodeId: number) => void;
	onTouch: (nodeId: number) => void;
	onDelete: (nodeId: number) => void;
	onClose: () => void;
};

const MENU_WIDTH = 200;
const MENU_HEIGHT_APPROX = 160;

export function ContextMenu({
	nodeId,
	x,
	y,
	onEdit,
	onConnect,
	onTouch,
	onDelete,
	onClose,
}: Props) {
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Clamp position so the menu stays within the viewport
	const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
	const top = Math.min(y, window.innerHeight - MENU_HEIGHT_APPROX - 8);

	// Close on outside click
	useEffect(() => {
		function handleMouseDown(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		}
		window.addEventListener("mousedown", handleMouseDown);
		return () => window.removeEventListener("mousedown", handleMouseDown);
	}, [onClose]);

	// Close on Escape
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const itemClass =
		"px-3 py-2 flex items-center gap-2 text-sm text-text-primary hover:bg-surface-2 cursor-pointer transition-colors";

	return (
		<div
			ref={menuRef}
			className="fixed z-50 bg-surface-1 border border-border rounded-lg shadow-xl overflow-hidden"
			style={{ left, top, width: MENU_WIDTH }}
		>
			<div
				className={itemClass}
				onClick={() => {
					onEdit(nodeId);
					onClose();
				}}
			>
				<Pencil size={14} />
				Edit
			</div>

			<div
				className={itemClass}
				onClick={() => {
					onConnect(nodeId);
					onClose();
				}}
			>
				<Link2 size={14} />
				Connect to…
			</div>

			<div
				className={itemClass}
				onClick={() => {
					onTouch(nodeId);
					onClose();
				}}
			>
				<RefreshCw size={14} />
				Touch — Reset Decay
			</div>

			{confirmingDelete ? (
				<div className="px-3 py-2 space-y-2">
					<p className="text-sm text-text-primary">Delete this belief?</p>
					<div className="flex gap-2">
						<button
							type="button"
							className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 transition-colors"
							onClick={() => {
								onDelete(nodeId);
								onClose();
							}}
						>
							Confirm
						</button>
						<button
							type="button"
							className="flex-1 text-xs bg-surface-2 hover:bg-surface-3 text-text-primary rounded px-2 py-1 transition-colors"
							onClick={() => setConfirmingDelete(false)}
						>
							Cancel
						</button>
					</div>
				</div>
			) : (
				<div
					className={`${itemClass} text-red-400 hover:text-red-300`}
					onClick={() => setConfirmingDelete(true)}
				>
					<Trash2 size={14} />
					Delete
				</div>
			)}
		</div>
	);
}
