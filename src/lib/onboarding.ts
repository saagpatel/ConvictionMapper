import { addDays, formatISO, subDays } from "date-fns";
import type {
	Belief,
	BeliefPayload,
	ConnectionPayload,
	EvidencePayload,
	EvidenceType,
	PredictionPayload,
	RelationshipType,
} from "../types";
import {
	logUpdate,
	resolvePrediction,
	upsertBelief,
	upsertConnection,
	upsertEvidence,
	upsertPrediction,
} from "./tauri-commands";

interface SeedBelief {
	title: string;
	description: string;
	confidence: number;
	domain: string;
	daysAgo: number;
	evidence: Array<{
		type: EvidenceType;
		content: string;
		source_url?: string;
		strength: number;
	}>;
}

const SEED_BELIEFS: SeedBelief[] = [
	{
		title: "Multipolar world order is emerging",
		description:
			"The post-Cold War unipolar moment is ending as China, India, and regional blocs gain economic and military influence.",
		confidence: 72,
		domain: "Geopolitics",
		daysAgo: 180,
		evidence: [
			{
				type: "data",
				content:
					"BRICS expansion to 10 members in 2024, combined GDP now exceeds G7 in PPP terms",
				strength: 4,
			},
			{
				type: "observation",
				content:
					"Increasing frequency of non-USD trade settlements between BRICS nations",
				strength: 3,
			},
		],
	},
	{
		title: "Index funds outperform active management long-term",
		description:
			"Over 15+ year periods, low-cost index funds beat the majority of actively managed funds after fees.",
		confidence: 88,
		domain: "Personal Finance",
		daysAgo: 14,
		evidence: [
			{
				type: "data",
				content:
					"SPIVA scorecard: 92% of large-cap US funds underperformed S&P 500 over 15 years",
				source_url:
					"https://www.spglobal.com/spdji/en/research-insights/spiva/",
				strength: 5,
			},
			{
				type: "argument",
				content:
					"Efficient market hypothesis: consistent alpha is structurally difficult when information is widely available",
				strength: 4,
			},
		],
	},
	{
		title: "AI will fundamentally reshape white-collar work by 2030",
		description:
			"LLMs and AI agents will automate or augment 30-50% of knowledge worker tasks within 5 years.",
		confidence: 65,
		domain: "Technology",
		daysAgo: 45,
		evidence: [
			{
				type: "observation",
				content:
					"Rapid adoption of coding assistants (Copilot, Claude Code) changing developer workflows in real time",
				strength: 4,
			},
			{
				type: "data",
				content:
					"McKinsey estimates generative AI could automate 60-70% of employee time on current work activities",
				strength: 3,
			},
		],
	},
	{
		title: "Sleep quality matters more than sleep quantity",
		description:
			"Deep sleep and REM ratios have stronger correlations with cognitive performance than total hours in bed.",
		confidence: 78,
		domain: "Science & Health",
		daysAgo: 90,
		evidence: [
			{
				type: "data",
				content:
					"Studies show 6h of high-quality sleep outperforms 8h of fragmented sleep on memory consolidation tasks",
				strength: 4,
			},
			{
				type: "experience",
				content:
					"Personal tracking with Oura ring confirms: deep sleep % correlates more with next-day energy than total hours",
				strength: 3,
			},
		],
	},
	{
		title: "Social media is net negative for adolescent mental health",
		description:
			"Heavy social media use (3+ hrs/day) correlates with increased anxiety, depression, and sleep disruption in teens.",
		confidence: 70,
		domain: "Society",
		daysAgo: 120,
		evidence: [
			{
				type: "data",
				content:
					"Jonathan Haidt's meta-analysis in The Anxious Generation aggregating 100+ studies showing dose-response relationship",
				strength: 4,
			},
			{
				type: "argument",
				content:
					"Counterpoint: correlation vs causation debate is unresolved; some studies show null effects",
				strength: 2,
			},
		],
	},
	{
		title: "Deep work produces 10x more value than shallow work",
		description:
			"Uninterrupted focus blocks of 90+ minutes on cognitively demanding tasks yield disproportionate output.",
		confidence: 85,
		domain: "Personal/Values",
		daysAgo: 7,
		evidence: [
			{
				type: "authority",
				content:
					"Cal Newport's Deep Work thesis, supported by Anders Ericsson's deliberate practice research",
				strength: 4,
			},
			{
				type: "experience",
				content:
					"Personal experience: best code, writing, and strategic thinking happens in morning 3-hour focus blocks",
				strength: 5,
			},
		],
	},
	{
		title: "T-shaped skills beat deep specialization in tech",
		description:
			"Broad competence across disciplines with one deep expertise area is more valuable than narrow specialization.",
		confidence: 55,
		domain: "Career",
		daysAgo: 150,
		evidence: [
			{
				type: "observation",
				content:
					"Most impactful tech leaders I've worked with have breadth (design, business, eng) not just depth",
				strength: 3,
			},
		],
	},
	{
		title: "Free will is compatible with determinism",
		description:
			"Compatibilism: meaningful free will exists as the ability to act on one's own desires without external coercion, even in a deterministic universe.",
		confidence: 42,
		domain: "Philosophy",
		daysAgo: 30,
		evidence: [
			{
				type: "argument",
				content:
					"Daniel Dennett's compatibilist framework: 'freedom worth wanting' doesn't require metaphysical indeterminism",
				strength: 3,
			},
			{
				type: "argument",
				content:
					"Counterpoint: Sam Harris argues the subjective experience of choosing is itself an illusion that neuroscience undermines",
				strength: 3,
			},
		],
	},
];

interface SeedConnection {
	fromIndex: number;
	toIndex: number;
	relationship: RelationshipType;
	strength: number;
}

const SEED_CONNECTIONS: SeedConnection[] = [
	{
		fromIndex: 2,
		toIndex: 5,
		relationship: "supports",
		strength: 4,
	},
	{
		fromIndex: 5,
		toIndex: 6,
		relationship: "contradicts",
		strength: 3,
	},
	{
		fromIndex: 1,
		toIndex: 6,
		relationship: "related",
		strength: 2,
	},
	{
		fromIndex: 3,
		toIndex: 5,
		relationship: "supports",
		strength: 3,
	},
	{
		fromIndex: 0,
		toIndex: 2,
		relationship: "related",
		strength: 2,
	},
];

interface SeedPrediction {
	beliefIndex: number; // index into SEED_BELIEFS
	statement: string;
	predicted_confidence: number;
	daysUntilResolution: number; // positive = future, negative = past
	outcome?: "correct" | "incorrect" | "voided";
	outcome_notes?: string;
}

const SEED_PREDICTIONS: SeedPrediction[] = [
	{
		beliefIndex: 1, // Index funds outperform active management long-term
		statement: "S&P 500 will outperform average active fund over next 3 years",
		predicted_confidence: 85,
		daysUntilResolution: 730,
	},
	{
		beliefIndex: 2, // AI will fundamentally reshape white-collar work
		statement:
			"At least 3 Fortune 500 companies will replace >20% of knowledge workers with AI by end of 2026",
		predicted_confidence: 40,
		daysUntilResolution: 180,
	},
	{
		beliefIndex: 3, // Sleep quality matters more than sleep quantity
		statement:
			"Consistent 10pm bedtime will improve deep sleep % by 15+ points within 30 days",
		predicted_confidence: 70,
		daysUntilResolution: -45,
		outcome: "correct",
		outcome_notes:
			"Oura data confirmed: deep sleep went from 18% to 34% average",
	},
	{
		beliefIndex: 0, // Multipolar world order is emerging
		statement:
			"BRICS will announce shared trade settlement currency by end of 2025",
		predicted_confidence: 25,
		daysUntilResolution: -90,
		outcome: "incorrect",
		outcome_notes: "No formal currency announced; bilateral agreements only",
	},
	{
		beliefIndex: 4, // Social media is net negative for adolescent mental health
		statement: "US will pass federal social media age restriction law by 2026",
		predicted_confidence: 55,
		daysUntilResolution: -10,
		// No outcome — overdue, demonstrates the nudge
	},
];

export async function seedDatabase(selectedDomains?: string[]): Promise<void> {
	const now = new Date();
	const createdBeliefs: Belief[] = [];

	const seeds = selectedDomains
		? SEED_BELIEFS.filter((s) => selectedDomains.includes(s.domain))
		: SEED_BELIEFS;

	// Track original indices for connection filtering
	const createdIndices = new Set<number>();

	for (const seed of seeds) {
		createdIndices.add(SEED_BELIEFS.indexOf(seed));
		const lastTouched = formatISO(subDays(now, seed.daysAgo));

		const payload: BeliefPayload = {
			title: seed.title,
			description: seed.description,
			confidence: seed.confidence,
			domain: seed.domain,
			half_life: 90,
			last_touched: lastTouched,
		};

		const belief = await upsertBelief(payload);
		createdBeliefs.push(belief);

		await logUpdate({
			belief_id: belief.id,
			old_confidence: null,
			new_confidence: seed.confidence,
			trigger_description: "Initial seed",
		});

		for (const ev of seed.evidence) {
			const evidencePayload: EvidencePayload = {
				belief_id: belief.id,
				type: ev.type,
				content: ev.content,
				source_url: ev.source_url,
				strength: ev.strength,
			};
			await upsertEvidence(evidencePayload);
		}
	}

	// Build index map: original SEED_BELIEFS index → createdBeliefs index
	const indexMap = new Map<number, number>();
	let createdIdx = 0;
	for (const origIdx of createdIndices) {
		indexMap.set(origIdx, createdIdx++);
	}

	for (const conn of SEED_CONNECTIONS) {
		const fromMapped = indexMap.get(conn.fromIndex);
		const toMapped = indexMap.get(conn.toIndex);
		if (fromMapped === undefined || toMapped === undefined) continue;

		const fromBelief = createdBeliefs[fromMapped];
		const toBelief = createdBeliefs[toMapped];

		if (fromBelief && toBelief) {
			const connectionPayload: ConnectionPayload = {
				from_belief_id: fromBelief.id,
				to_belief_id: toBelief.id,
				relationship: conn.relationship,
				strength: conn.strength,
			};
			await upsertConnection(connectionPayload);
		}
	}

	// Seed predictions
	let predCount = 0;
	for (const sp of SEED_PREDICTIONS) {
		const mappedIdx = indexMap.get(sp.beliefIndex);
		if (mappedIdx === undefined) continue;
		const belief = createdBeliefs[mappedIdx];
		if (!belief) continue;

		const payload: PredictionPayload = {
			belief_id: belief.id,
			statement: sp.statement,
			predicted_confidence: sp.predicted_confidence,
			resolution_date: formatISO(addDays(now, sp.daysUntilResolution)),
		};
		const prediction = await upsertPrediction(payload);
		predCount++;

		if (sp.outcome) {
			await resolvePrediction({
				id: prediction.id,
				outcome: sp.outcome,
				outcome_notes: sp.outcome_notes,
			});
		}
	}

	console.log(
		`Seeded ${createdBeliefs.length} beliefs, ${SEED_CONNECTIONS.length} connections, ${predCount} predictions`,
	);
}
