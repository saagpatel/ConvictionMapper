import { useSettingsStore } from "../../store/settings-store";

type Props = {
	domain: string;
	size?: "sm" | "md";
};

export function DomainBadge({ domain, size = "md" }: Props) {
	const getDomainColor = useSettingsStore((s) => s.getDomainColor);
	const color = getDomainColor(domain);
	const dotSize = size === "sm" ? 6 : 8;

	return (
		<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-2">
			<span
				style={{
					width: dotSize,
					height: dotSize,
					backgroundColor: color,
					borderRadius: "50%",
					flexShrink: 0,
					display: "inline-block",
				}}
			/>
			<span
				className={
					size === "sm"
						? "text-xs text-text-secondary"
						: "text-sm text-text-secondary"
				}
			>
				{domain}
			</span>
		</span>
	);
}
