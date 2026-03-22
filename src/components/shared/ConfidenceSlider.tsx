type Props = {
	value: number;
	onChange: (v: number) => void;
};

function numberColor(value: number): string {
	if (value > 70) return "text-accent";
	if (value < 30) return "text-danger";
	return "text-text-primary";
}

export function ConfidenceSlider({ value, onChange }: Props) {
	const pct = value;

	return (
		<div className="flex items-center gap-3">
			<div className="relative flex-1 flex items-center">
				<input
					type="range"
					min={0}
					max={100}
					value={value}
					onChange={(e) => onChange(Number(e.target.value))}
					className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
					style={{
						background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-tertiary) ${pct}%, var(--bg-tertiary) 100%)`,
					}}
				/>
			</div>
			<span
				className={`w-12 text-right font-bold text-lg tabular-nums ${numberColor(value)}`}
			>
				{value}
			</span>
		</div>
	);
}
