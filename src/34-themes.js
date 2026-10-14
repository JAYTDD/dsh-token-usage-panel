/**
 * Element palettes for this usage panel. The page background, borders and body
 * type stay on the DSH host aliases. A named look rewrites the in-panel roles
 * (heading, number, model name, tag, comment), the chart series, composition
 * states, hover wash and the accent. `system` inherits everything. Stored off
 * the filters blob so reset cannot clear a look the reader chose.
 */
const THEME_DEFAULT = "system";

/**
 * One named look. `dark`/`light` are null for `system`.
 * @param id - persistence id.
 * @param group - `system` | `looks`.
 * @param dark - CSS custom-property map for `body[data-ds-dark-theme]`, or null.
 * @param light - CSS custom-property map for light, or null.
 */
function palette(id, group, dark, light) {
	return { id, group, dark, light };
}

/**
 * `#rgb` / `#rrggbb` → `rgba(r,g,b,a)` for hover and chip fills.
 * @param hex - a 3- or 6-digit hex colour.
 * @param alpha - 0..1.
 */
function rgba(hex, alpha) {
	const raw = hex.replace("#", "");
	const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
	const n = parseInt(full, 16);
	return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}

/**
 * Element tokens only: no background, border, or body-label aliases.
 * @param parts - type roles, accent, series, composition states.
 * @returns a token map to splice onto `.dshTup_root`.
 */
function tokens(parts) {
	const series = parts.c;
	return {
		"--dsw-alias-brand-primary": parts.brand,
		"--dsw-focus-ring-color": parts.brand,
		"--dsw-alias-interactive-bg-hover": rgba(parts.brand, 0.12),
		"--dsw-alias-scrollbar-hover-l2": parts.brand,
		"--dsw-alias-state-warn-primary": parts.warn,
		"--dsw-alias-state-success-primary": parts.ok,
		"--dsw-alias-state-business-primary": parts.biz,
		"--dsh-tup-c1": series[0],
		"--dsh-tup-c2": series[1],
		"--dsh-tup-c3": series[2],
		"--dsh-tup-c4": series[3],
		"--dsh-tup-c5": series[4],
		"--dsh-tup-c6": series[5],
		"--dsh-tup-c7": series[6],
		"--dsh-tup-c8": series[7],
		"--dsh-tup-other": parts.other,
		"--dsh-tup-heat": parts.brand,
		"--dsh-tup-heading": parts.heading,
		"--dsh-tup-number": parts.number,
		"--dsh-tup-name": parts.name,
		"--dsh-tup-tag": parts.tag,
		"--dsh-tup-comment": parts.comment,
		"--dsh-tup-link": parts.brand,
		"--dsh-tup-tag-bg": rgba(parts.tag, 0.18),
		"--dsh-tup-ok": parts.ok,
		"--dsh-tup-warn": parts.warn,
		"--dsh-tup-biz": parts.biz,
	};
}

const PALETTES = [
	palette(THEME_DEFAULT, "system", null, null),
	palette(
		"graphite",
		"looks",
		tokens({
			heading: "#E4E4E4",
			number: "#82B4E8",
			name: "#8FB8AE",
			tag: "#CDB97A",
			comment: "#9A9A9A",
			brand: "#82B4E8",
			ok: "#8FB8AE",
			warn: "#CDB97A",
			biz: "#A39BC0",
			other: "#8A8A8A",
			c: ["#82B4E8", "#8FB8AE", "#A39BC0", "#D09090", "#CDB97A", "#7AAFBF", "#C4A894", "#9A9A9A"],
		}),
		tokens({
			heading: "#1F1F1F",
			number: "#1B5FA8",
			name: "#1F6B62",
			tag: "#8A6A12",
			comment: "#5C6166",
			brand: "#1B5FA8",
			ok: "#1F6B62",
			warn: "#8A6A12",
			biz: "#5B4A8A",
			other: "#64748B",
			c: ["#1B5FA8", "#1F6B62", "#5B4A8A", "#B42318", "#8A6A12", "#0E6A7A", "#9A3412", "#525252"],
		}),
	),
	palette(
		"celadon",
		"looks",
		tokens({
			heading: "#E2E8E4",
			number: "#7DB8A0",
			name: "#9AADC0",
			tag: "#C8B56A",
			comment: "#8A9A90",
			brand: "#7DB8A0",
			ok: "#7DB8A0",
			warn: "#C8B56A",
			biz: "#9AADC0",
			other: "#8A9A90",
			c: ["#7DB8A0", "#9AADC0", "#C8B56A", "#D09088", "#6AA8B8", "#B8A090", "#A090C0", "#8A9A90"],
		}),
		tokens({
			heading: "#1A2420",
			number: "#0D5C4C",
			name: "#2A4A62",
			tag: "#6B5410",
			comment: "#5C6B66",
			brand: "#0D5C4C",
			ok: "#0D5C4C",
			warn: "#6B5410",
			biz: "#2A4A62",
			other: "#5C6B66",
			c: ["#0D5C4C", "#2A4A62", "#6B5410", "#9F2A2A", "#0E6A7A", "#7C2D12", "#5B4A8A", "#3F5A4A"],
		}),
	),
	palette(
		"nightferry",
		"looks",
		tokens({
			heading: "#E8E4D6",
			number: "#6EC4B8",
			name: "#A8B4C8",
			tag: "#D4B06A",
			comment: "#8A909A",
			brand: "#6EC4B8",
			ok: "#6EC4B8",
			warn: "#D4B06A",
			biz: "#A8B4C8",
			other: "#8A909A",
			c: ["#6EC4B8", "#A8B4C8", "#D4B06A", "#D09088", "#7AAFBF", "#C4A894", "#A39BC0", "#9A9A9A"],
		}),
		tokens({
			heading: "#1A1E28",
			number: "#0C5C56",
			name: "#2C3E5C",
			tag: "#8A5A10",
			comment: "#5C6570",
			brand: "#0C5C56",
			ok: "#0C5C56",
			warn: "#8A5A10",
			biz: "#2C3E5C",
			other: "#5C6570",
			c: ["#0C5C56", "#2C3E5C", "#8A5A10", "#9F2A2A", "#0E6A7A", "#7C2D12", "#5B4A8A", "#3F4A5A"],
		}),
	),
	palette(
		"cinnabar",
		"looks",
		tokens({
			heading: "#EDE6E0",
			number: "#E09080",
			name: "#C0B0A4",
			tag: "#C8B06A",
			comment: "#9A8A82",
			brand: "#E09080",
			ok: "#8FB8AE",
			warn: "#C8B06A",
			biz: "#7AAFBF",
			other: "#9A8A82",
			c: ["#E09080", "#C0B0A4", "#C8B06A", "#8FB8AE", "#D4A090", "#7AAFBF", "#A39BC0", "#9A9A9A"],
		}),
		tokens({
			heading: "#221814",
			number: "#A32D1C",
			name: "#4A3A32",
			tag: "#7A5A10",
			comment: "#6A5C54",
			brand: "#A32D1C",
			ok: "#0D5C4C",
			warn: "#7A5A10",
			biz: "#1B5FA8",
			other: "#6A5C54",
			c: ["#A32D1C", "#4A3A32", "#7A5A10", "#0D5C4C", "#9A3412", "#1B5FA8", "#5B4A8A", "#525252"],
		}),
	),
	palette(
		"amber",
		"looks",
		tokens({
			heading: "#EDE6D8",
			number: "#D4A85A",
			name: "#C4A898",
			tag: "#8FBA9A",
			comment: "#9A9080",
			brand: "#D4A85A",
			ok: "#8FBA9A",
			warn: "#E09080",
			biz: "#7AAFBF",
			other: "#9A9080",
			c: ["#D4A85A", "#C4A898", "#8FBA9A", "#E09080", "#7AAFBF", "#C4A894", "#A39BC0", "#9A9A9A"],
		}),
		tokens({
			heading: "#241C10",
			number: "#8A5A0C",
			name: "#5C4030",
			tag: "#2F5C3A",
			comment: "#6A6054",
			brand: "#8A5A0C",
			ok: "#2F5C3A",
			warn: "#A32D1C",
			biz: "#0E6A7A",
			other: "#6A6054",
			c: ["#8A5A0C", "#5C4030", "#2F5C3A", "#A32D1C", "#0E6A7A", "#7C2D12", "#5B4A8A", "#525252"],
		}),
	),
	palette(
		"inkstone",
		"looks",
		tokens({
			heading: "#E8E4DC",
			number: "#D88880",
			name: "#8FA3B4",
			tag: "#C4A35A",
			comment: "#8A8680",
			brand: "#D88880",
			ok: "#8FA3B4",
			warn: "#C4A35A",
			biz: "#8FB8AE",
			other: "#8A8680",
			c: ["#D88880", "#8FA3B4", "#C4A35A", "#8FB8AE", "#C4A090", "#7AAFBF", "#A39BC0", "#9A9A9A"],
		}),
		tokens({
			heading: "#1A1814",
			number: "#8F1D2C",
			name: "#243A56",
			tag: "#7A5A10",
			comment: "#5C5850",
			brand: "#8F1D2C",
			ok: "#243A56",
			warn: "#7A5A10",
			biz: "#0D5C4C",
			other: "#5C5850",
			c: ["#8F1D2C", "#243A56", "#7A5A10", "#0D5C4C", "#9A3412", "#1B5FA8", "#5B4A8A", "#525252"],
		}),
	),
];

const PALETTE_IDS = PALETTES.map((entry) => entry.id);

function paletteOf(id) {
	for (const entry of PALETTES) if (entry.id === id) return entry;
	return undefined;
}

/**
 * A known palette id, or `system` when the value is unusable.
 * @param value - raw JSON.
 * @returns a palette id.
 */
function normalizeTheme(value) {
	if (typeof value !== "string") return THEME_DEFAULT;
	return paletteOf(value) === undefined ? THEME_DEFAULT : value;
}

/** Read the persisted palette, or system. */
function loadTheme() {
	try {
		const raw = window.localStorage.getItem(THEME_KEY);
		if (raw === null) return THEME_DEFAULT;
		return normalizeTheme(JSON.parse(raw));
	} catch {
		return THEME_DEFAULT;
	}
}

/** Persist the palette id; a failure only loses the preference. */
function saveTheme(id) {
	try {
		window.localStorage.setItem(THEME_KEY, JSON.stringify(id));
	} catch {
		/* private mode or quota: the panel keeps working without persistence */
	}
}

function themeRule(selector, tokensMap) {
	const body = [];
	for (const name of Object.keys(tokensMap)) body.push(name + ":" + tokensMap[name]);
	return selector + "{" + body.join(";") + "}";
}

/**
 * CSS rules that rewrite element colours on a named look. Surfaces stay on the
 * host. `system` emits nothing. Dark/light follow the DSH host attribute so the
 * same look can sit on either chrome.
 * @returns rule strings to concatenate into the panel sheet.
 */
function themeCss() {
	const rules = [];
	for (const entry of PALETTES) {
		if (entry.dark === null || entry.light === null) continue;
		const root = '.dshTup_root[data-palette="' + entry.id + '"]';
		rules.push(themeRule("body[data-ds-dark-theme] " + root, entry.dark));
		rules.push(themeRule("body:not([data-ds-dark-theme]) " + root, entry.light));
	}
	return rules;
}
