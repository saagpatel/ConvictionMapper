import type { PredictionStatus } from "../../types";

type Props = {
	status: PredictionStatus;
};

const STATUS_CONFIG: Record<
	PredictionStatus,
	{ label: string; className: string }
> = {
	pending: {
		label: "Pending",
		className: "bg-surface-2 text-text-secondary",
	},
	overdue: {
		label: "Overdue",
		className: "bg-amber-500/20 text-amber-400",
	},
	correct: {
		label: "Correct",
		className: "bg-emerald-500/20 text-emerald-400",
	},
	incorrect: {
		label: "Incorrect",
		className: "bg-red-500/20 text-red-400",
	},
	voided: {
		label: "Voided",
		className: "bg-surface-2 text-text-secondary line-through",
	},
};

export function StatusBadge({ status }: Props) {
	const { label, className } = STATUS_CONFIG[status];
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
		>
			{label}
		</span>
	);
}
