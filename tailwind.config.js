/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ['"DM Sans Variable"', "sans-serif"],
			},
			colors: {
				surface: {
					0: "var(--bg-primary)",
					1: "var(--bg-secondary)",
					2: "var(--bg-tertiary)",
				},
				border: "var(--border)",
				"text-primary": "var(--text-primary)",
				"text-secondary": "var(--text-secondary)",
				accent: {
					DEFAULT: "var(--accent)",
					hover: "var(--accent-hover)",
				},
				danger: "var(--danger)",
			},
		},
	},
	plugins: [],
};
