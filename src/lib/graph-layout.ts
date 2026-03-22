export const DOMAIN_COLORS: Record<string, string> = {
	Geopolitics: "#EF4444",
	"Personal Finance": "#10B981",
	Technology: "#3B82F6",
	"Science & Health": "#8B5CF6",
	Society: "#F97316",
	"Personal/Values": "#EC4899",
	Career: "#14B8A6",
	Philosophy: "#A78BFA",
	General: "#6B7280",
};

export const EDGE_COLORS: Record<string, string> = {
	supports: "#3B82F6",
	contradicts: "#EF4444",
	depends_on: "#6B7280",
	related: "#F59E0B",
};

export const FORCE_CONFIG = {
	manyBodyStrength: -300,
	linkDistanceBase: 120,
	linkDistanceScale: 30,
	clusterStrength: 0.15,
	alphaDecayRate: 0.028,
	velocityDecay: 0.4,
	idleFreezeSecs: 3,
} as const;
