import { addDays, addMonths, differenceInDays, format } from "date-fns";
import { ChevronDown, ChevronUp, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
	minDate: string;
	onDateChange: (date: Date | null) => void;
	currentDate: Date | null;
};

export function TimeTravelPanel({ minDate, onDateChange, currentDate }: Props) {
	const [expanded, setExpanded] = useState(false);
	const [playing, setPlaying] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const now = new Date();
	const start = new Date(minDate);
	const totalDays = Math.max(1, differenceInDays(now, start));

	const sliderValue = currentDate
		? differenceInDays(currentDate, start)
		: totalDays;

	function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
		const days = Number(e.target.value);
		if (days >= totalDays) {
			onDateChange(null);
		} else {
			onDateChange(addDays(start, days));
		}
	}

	function stopPlayback() {
		setPlaying(false);
		if (intervalRef.current !== null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}

	function startPlayback() {
		setPlaying(true);
		intervalRef.current = setInterval(() => {
			const next = addMonths(currentDate ?? start, 1);
			if (next >= now) {
				stopPlayback();
				onDateChange(null);
			} else {
				onDateChange(next);
			}
		}, 1000);
	}

	function togglePlay() {
		if (playing) {
			stopPlayback();
		} else {
			startPlayback();
		}
	}

	function handleExit() {
		stopPlayback();
		onDateChange(null);
		setExpanded(false);
	}

	// Clean up on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	// Stop playback if currentDate becomes null externally
	useEffect(() => {
		if (currentDate === null && playing) {
			stopPlayback();
		}
	}, [currentDate]);

	const displayDate = currentDate ? format(currentDate, "MMM d, yyyy") : "Now";
	const pct = (sliderValue / totalDays) * 100;

	return (
		<div
			className={`absolute bottom-0 left-0 right-0 z-10 bg-surface-1 border-t border-border transition-transform duration-200`}
		>
			{!expanded ? (
				<div className="flex justify-center py-1">
					<button
						onClick={() => setExpanded(true)}
						className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary"
						aria-label="Expand time travel panel"
					>
						<ChevronUp size={16} />
					</button>
				</div>
			) : (
				<div className="h-16 flex items-center gap-4 px-4">
					<button
						onClick={() => setExpanded(false)}
						className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary flex-shrink-0"
						aria-label="Collapse time travel panel"
					>
						<ChevronDown size={16} />
					</button>

					<div className="flex-1 flex items-center gap-3">
						<input
							type="range"
							min={0}
							max={totalDays}
							step={1}
							value={sliderValue}
							onChange={handleSliderChange}
							className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
							style={{
								background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-tertiary) ${pct}%, var(--bg-tertiary) 100%)`,
							}}
						/>
						<span className="w-24 text-sm text-text-secondary tabular-nums text-right flex-shrink-0">
							{displayDate}
						</span>
					</div>

					<button
						onClick={togglePlay}
						className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary flex-shrink-0"
						aria-label={playing ? "Pause playback" : "Play time travel"}
					>
						{playing ? <Pause size={16} /> : <Play size={16} />}
					</button>

					<button
						onClick={handleExit}
						className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary flex-shrink-0"
						aria-label="Exit time travel"
					>
						<X size={16} />
					</button>
				</div>
			)}
		</div>
	);
}
