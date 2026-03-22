import { Star } from "lucide-react";

type Props = {
	value: number;
	onChange: (v: number) => void;
};

export function StrengthSelector({ value, onChange }: Props) {
	return (
		<div className="flex items-center gap-1">
			{[1, 2, 3, 4, 5].map((star) => (
				<button
					key={star}
					type="button"
					onClick={() => onChange(star)}
					className="transition-transform hover:scale-110 focus:outline-none"
					aria-label={`Set strength to ${star}`}
				>
					<Star
						size={16}
						className={star <= value ? "text-amber-400" : "text-text-secondary"}
						fill={star <= value ? "#fbbf24" : "none"}
					/>
				</button>
			))}
		</div>
	);
}
