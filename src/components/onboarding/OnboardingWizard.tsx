import { useState } from "react";
import { DOMAIN_COLORS } from "../../lib/graph-layout";
import { seedDatabase } from "../../lib/onboarding";
import { setSetting } from "../../lib/tauri-commands";
import { useBeliefStore } from "../../store/belief-store";
import { ConfidenceSlider } from "../shared/ConfidenceSlider";

type Props = {
	onComplete: () => void;
};

type Step = 1 | 2 | 3;

const ALL_DOMAINS = Object.keys(DOMAIN_COLORS).filter((d) => d !== "General");

// Decorative circles for the welcome screen
const FLOAT_CIRCLES: Array<{
	color: string;
	size: number;
	top: string;
	left: string;
	duration: string;
	delay: string;
	tx: string;
	ty: string;
}> = [
	{
		color: DOMAIN_COLORS["Geopolitics"] ?? "#EF4444",
		size: 16,
		top: "20%",
		left: "15%",
		duration: "7s",
		delay: "0s",
		tx: "12px",
		ty: "-8px",
	},
	{
		color: DOMAIN_COLORS["Technology"] ?? "#3B82F6",
		size: 10,
		top: "65%",
		left: "80%",
		duration: "9s",
		delay: "1.5s",
		tx: "-10px",
		ty: "14px",
	},
	{
		color: DOMAIN_COLORS["Philosophy"] ?? "#A78BFA",
		size: 8,
		top: "75%",
		left: "20%",
		duration: "6s",
		delay: "0.8s",
		tx: "8px",
		ty: "10px",
	},
	{
		color: DOMAIN_COLORS["Society"] ?? "#F97316",
		size: 12,
		top: "25%",
		left: "75%",
		duration: "10s",
		delay: "2s",
		tx: "-14px",
		ty: "-6px",
	},
];

function StepDots({ step }: { step: Step }) {
	return (
		<div className="flex items-center justify-center gap-2">
			{([1, 2, 3] as Step[]).map((s) => (
				<div
					key={s}
					className="rounded-full transition-all duration-300"
					style={{
						width: step === s ? 20 : 8,
						height: 8,
						backgroundColor:
							step === s ? "var(--accent)" : "var(--bg-tertiary)",
					}}
				/>
			))}
		</div>
	);
}

function WelcomeScreen({ onNext }: { onNext: () => void }) {
	return (
		<div className="flex flex-col items-center text-center space-y-8">
			{/* Decorative floating circles */}
			<div className="relative w-[200px] h-[200px]">
				<style>{`
					@keyframes float-0 {
						0%, 100% { transform: translate(0, 0); }
						50% { transform: translate(12px, -8px); }
					}
					@keyframes float-1 {
						0%, 100% { transform: translate(0, 0); }
						50% { transform: translate(-10px, 14px); }
					}
					@keyframes float-2 {
						0%, 100% { transform: translate(0, 0); }
						50% { transform: translate(8px, 10px); }
					}
					@keyframes float-3 {
						0%, 100% { transform: translate(0, 0); }
						50% { transform: translate(-14px, -6px); }
					}
				`}</style>
				{FLOAT_CIRCLES.map((c, i) => (
					<div
						key={i}
						className="absolute rounded-full opacity-80"
						style={{
							width: c.size,
							height: c.size,
							backgroundColor: c.color,
							top: c.top,
							left: c.left,
							animation: `float-${i} ${c.duration} ${c.delay} ease-in-out infinite`,
						}}
					/>
				))}
				{/* Central accent dot */}
				<div
					className="absolute top-1/2 left-1/2 rounded-full"
					style={{
						width: 40,
						height: 40,
						backgroundColor: "var(--accent)",
						transform: "translate(-50%, -50%)",
						opacity: 0.9,
						boxShadow: "0 0 32px var(--accent)",
					}}
				/>
			</div>

			<div className="space-y-2">
				<h1 className="text-3xl font-light text-text-primary">
					Conviction Mapper
				</h1>
				<p className="text-text-secondary">
					Map your beliefs. Track how they evolve.
				</p>
			</div>

			<button
				type="button"
				onClick={onNext}
				className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-xl text-lg font-medium transition-colors"
			>
				Get Started
			</button>
		</div>
	);
}

function DomainPickerScreen({
	selectedDomains,
	onChange,
	onNext,
}: {
	selectedDomains: string[];
	onChange: (domains: string[]) => void;
	onNext: () => void;
}) {
	const tooFew = selectedDomains.length < 2;

	function toggle(domain: string) {
		if (selectedDomains.includes(domain)) {
			onChange(selectedDomains.filter((d) => d !== domain));
		} else {
			onChange([...selectedDomains, domain]);
		}
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="text-2xl font-light text-text-primary">
					Choose your starting domains
				</h2>
				<p className="text-text-secondary text-sm">
					We'll seed example beliefs for your selected domains
				</p>
			</div>

			<div className="space-y-1">
				{ALL_DOMAINS.map((domain) => {
					const checked = selectedDomains.includes(domain);
					return (
						<label
							key={domain}
							className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-1 transition-colors"
						>
							<span
								className="rounded-full flex-shrink-0"
								style={{
									width: 10,
									height: 10,
									backgroundColor: DOMAIN_COLORS[domain],
								}}
							/>
							<span className="flex-1 text-sm text-text-primary">{domain}</span>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => toggle(domain)}
								className="w-4 h-4 accent-accent cursor-pointer"
							/>
						</label>
					);
				})}
			</div>

			{tooFew && (
				<p className="text-danger text-xs">
					Please select at least 2 domains to continue.
				</p>
			)}

			<button
				type="button"
				onClick={onNext}
				disabled={tooFew}
				className="w-full bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
			>
				Continue
			</button>
		</div>
	);
}

function FirstBeliefScreen({
	selectedDomains,
	onFinish,
	onSkip,
}: {
	selectedDomains: string[];
	onFinish: (title: string, confidence: number, domain: string) => void;
	onSkip: () => void;
}) {
	const [title, setTitle] = useState("");
	const [confidence, setConfidence] = useState(50);
	const [domain, setDomain] = useState(selectedDomains[0] ?? "General");

	function handleFinish() {
		onFinish(title, confidence, domain);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="text-2xl font-light text-text-primary">
					Add your first belief
				</h2>
				<p className="text-text-secondary text-sm">
					Optional — you can always add beliefs later
				</p>
			</div>

			<div className="space-y-4">
				<div>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="What do you believe?"
						className="w-full text-sm bg-surface-2 rounded-lg px-3 py-2.5 border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-primary placeholder:text-text-secondary transition-colors"
					/>
				</div>

				<div>
					<label className="block text-xs text-text-secondary mb-2">
						Confidence
					</label>
					<ConfidenceSlider value={confidence} onChange={setConfidence} />
				</div>

				<div>
					<label className="block text-xs text-text-secondary mb-1">
						Domain
					</label>
					<select
						value={domain}
						onChange={(e) => setDomain(e.target.value)}
						className="w-full text-sm bg-surface-2 rounded-lg px-3 py-2.5 border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-primary transition-colors cursor-pointer"
					>
						{selectedDomains.map((d) => (
							<option key={d} value={d}>
								{d}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="space-y-3">
				<button
					type="button"
					onClick={handleFinish}
					className="w-full bg-accent hover:bg-accent-hover text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
				>
					Finish &amp; Start
				</button>
				<button
					type="button"
					onClick={onSkip}
					className="w-full text-text-secondary text-sm hover:text-text-primary transition-colors py-1"
				>
					Skip
				</button>
			</div>
		</div>
	);
}

export function OnboardingWizard({ onComplete }: Props) {
	const [step, setStep] = useState<Step>(1);
	const [selectedDomains, setSelectedDomains] = useState<string[]>(ALL_DOMAINS);
	const [submitting, setSubmitting] = useState(false);

	async function finalize(
		title: string,
		confidence: number,
		domain: string,
	): Promise<void> {
		if (submitting) return;
		setSubmitting(true);
		try {
			await seedDatabase(selectedDomains);
			if (title.trim()) {
				await useBeliefStore
					.getState()
					.createBelief({ title: title.trim(), confidence, domain });
			}
			await setSetting("onboarding_complete", "true");
			onComplete();
		} catch (err) {
			console.error("Onboarding finalization failed:", err);
			setSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 bg-surface-0 flex items-center justify-center">
			<div className="w-[480px] p-8 space-y-8">
				{step === 1 && <WelcomeScreen onNext={() => setStep(2)} />}
				{step === 2 && (
					<DomainPickerScreen
						selectedDomains={selectedDomains}
						onChange={setSelectedDomains}
						onNext={() => setStep(3)}
					/>
				)}
				{step === 3 && (
					<FirstBeliefScreen
						selectedDomains={selectedDomains}
						onFinish={(t, c, d) => finalize(t, c, d)}
						onSkip={() => finalize("", 50, selectedDomains[0] ?? "General")}
					/>
				)}

				<StepDots step={step} />
			</div>
		</div>
	);
}
