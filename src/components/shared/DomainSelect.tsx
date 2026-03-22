import { DOMAIN_COLORS } from "../../lib/graph-layout";

type Props = {
	value: string;
	onChange: (v: string) => void;
};

const DOMAINS = Object.keys(DOMAIN_COLORS);

export function DomainSelect({ value, onChange }: Props) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="w-full bg-surface-1 border border-border text-text-primary rounded-lg px-3 py-2 text-sm outline-none focus:border-accent transition-colors cursor-pointer"
		>
			{DOMAINS.map((domain) => (
				<option key={domain} value={domain}>
					{domain}
				</option>
			))}
		</select>
	);
}
