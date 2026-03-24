type Props = {
	onExit: () => void;
};

export function DecayDemoBanner({ onExit }: Props) {
	return (
		<div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/20 border border-amber-500/40 rounded-lg px-4 py-2 flex items-center gap-3">
			<span className="text-sm text-amber-200">
				Decay Preview: showing belief state 1 year from now
			</span>
			<button
				onClick={onExit}
				className="text-amber-300 hover:text-amber-100 text-sm font-medium"
			>
				Exit Preview
			</button>
		</div>
	);
}
