// GENERATED FILE — do not edit.
// Source of truth: src/*.js. Regenerate with: node scripts/build.mjs
// Checked for staleness by: node scripts/verify-bundle.mjs
window.__ModuleLoader__.load({
	id: "dsh-token-usage-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/**
		 * Module boot: the module table this bundle is allowed to resolve.
		 *
		 * Both requests are platform seed words from the shell's frozen module table
		 * (`react` plus the static UI libraries), so the package declares no
		 * `dsh.client.external` — declaring one would require a boot-graph row, and a
		 * seed module is answered by the baseline table itself.
		 */
		const react = require("react");
		const h = react.createElement;
		const {
			Button,
			Checkbox,
			IconChevronDownOutlineRegular,
			IconCloseOutlineRegular,
			IconDatabaseOutlineRegular,
			IconDownloadOutlineRegular,
			IconFlatListOutlineRegular,
			IconFolderOpenOutlineRegular,
			IconRefreshOutlineRegular,
			IconSearchOutlineRegular,
			IconSlidersTwoOutlineRegular,
			IconWarningOutlineRegular,
			Input,
			Menu,
			SegmentedControl,
			StateDot,
			Tag,
			writeClipboard,
		} = require("@deepseek-ai/dsh-client-ui-primitives");

		/** Locale namespace owned by this plugin. */
		const NS = "tokenUsage";
		/** One id keys both the sidebar row and the main panel the row selects. */
		const PANEL_ID = "token-usage";
		/** Sessions whose projection column was empty are read on mount, up to this many. */
		const AUTO_LOAD_BUDGET = 60;
		/** Concurrent projection reads. */
		const LOAD_CONCURRENCY = 3;
		/**
		 * Filter persistence key. The version suffix retires incompatible shapes: a
		 * stored `v1`/`v2` object is ignored rather than half-applied.
		 */
		const FILTER_KEY = "dsh-token-usage-panel.filters.v3";
		/**
		 * The panel's motion vocabulary: every duration and curve it uses, in one table.
		 *
		 * It is handed to the stylesheet as custom properties on the root
		 * (`--dsh-tup-fast` / `-base` / `-slow` / `-stagger` / `-ease` / `-settle`), the
		 * same handoff the row height uses, so retiming the panel is one edit here rather
		 * than a sweep through the CSS.
		 *
		 * `stagger` is the per-item delay that turns a batch of marks into a wave: chart
		 * cells, table rows and the bands all multiply this one token by their index.
		 */
		const MOTION = Object.freeze({
			/** Hover, press and focus feedback: short enough to read as instant. */
			fast: 140,
			/** Band, view and row entrances. */
			base: 220,
			/** Chart growth: a line draw, a ring sweep, a heatmap wave. */
			slow: 460,
			/** Per-item delay inside a staggered reveal, in milliseconds. */
			stagger: 16,
			/** Entrances and growth: leaves quickly, arrives softly. */
			ease: "cubic-bezier(.22,.61,.36,1)",
			/** Growth: a fast start that settles without overshoot. */
			settle: "cubic-bezier(.16,1,.3,1)",
		});
		/**
		 * How long a user-initiated change keeps the headline count-up armed.
		 *
		 * This is the panel's one animation that writes React state on every frame, so it
		 * is deliberately NOT opened by live data ticks: the render gate asserts that one
		 * real usage change costs at most two renders. Every other animation is CSS and
		 * replays whenever its own data changes.
		 */
		const COUNT_UP_MS = 320;
		/** Row count above which the table renders only the visible window. */
		const VIRTUALIZATION_THRESHOLD = 100;
		/** Extra rows rendered above and below the viewport (mirrors ui-trajectory). */
		const VIRTUAL_OVERSCAN_ROWS = 12;
		/** Number of sessions shown on one table page. */
		const PAGE_SIZE = 20;
		const DAY_MS = 86400000;
		
		/** Composition segments in stacked-bar order. */
		const SEGMENTS = [
			{ key: "uncachedInputTokens", labelKey: "segment.input", color: "var(--dsw-alias-brand-primary)" },
			{ key: "cacheReadTokens", labelKey: "segment.cacheRead", color: "var(--dsw-alias-state-success-primary)" },
			{ key: "cacheWriteTokens", labelKey: "segment.cacheWrite", color: "var(--dsw-alias-state-warn-primary)" },
			{ key: "outputTokens", labelKey: "segment.output", color: "var(--dsw-alias-state-business-primary)" },
		];
		/** Sortable measures; the dictionary names each one. */
		const SORT_KEYS = ["total", "input", "cacheRead", "cacheWrite", "output", "title", "recent"];
		/** Range filter values. */
		const RANGES = ["all", "today", "7d", "30d"];
		/** The panel's two views: the charts, and the session table. */
		const VIEWS = ["overview", "sessions"];
		/** Trend chart windows, in days. */
		const TREND_RANGES = [7, 30];
		/** Weeks rendered by the activity grid (about a year, like the reference design). */
		const HEATMAP_WEEKS = 53;
		/**
		 * Palette for the per-model series.
		 *
		 * Eight distinguishable hues were needed and the theme exposes only a handful of
		 * state colours, so this stays a dedicated palette — but named as CSS custom
		 * properties rather than literal hex. SVG `stroke`/`fill` accept a `var()`
		 * reference, so naming them lets the stylesheet substitute a light-theme set: every
		 * literal here scores only 1.88-3.09:1 against white, which is unusable for the
		 * thin strokes and small donut arcs they paint. The defaults in `50-css.js` are
		 * the originals, tuned for the dark surface.
		 */
		const MODEL_COLORS = [
			"var(--dsh-tup-c1)",
			"var(--dsh-tup-c2)",
			"var(--dsh-tup-c3)",
			"var(--dsh-tup-c4)",
			"var(--dsh-tup-c5)",
			"var(--dsh-tup-c6)",
			"var(--dsh-tup-c7)",
			"var(--dsh-tup-c8)",
		];
		/**
		 * Table columns in render order.
		 *
		 * `sortKey` present means the header sorts.
		 * `hideBelow` names the column the container query drops on narrow panes, so a
		 * squeezed window loses detail instead of growing a horizontal scrollbar.
		 * `hideBelow2` is the tighter tier: dropped only once the pane is narrow enough
		 * that even the reduced column set would overflow.
		 */
		const COLUMNS = [
			{ key: "updated", labelKey: "col.updated", sortKey: "recent" },
			{ key: "session", labelKey: "col.session", sortKey: "title", className: "dshTup_colSession" },
			{ key: "total", labelKey: "col.total", sortKey: "total", hideBelow2: true },
			{ key: "share", labelKey: "col.share", hideBelow: true },
			{ key: "input", labelKey: "col.input", sortKey: "input", hideBelow: true },
			{ key: "cacheRead", labelKey: "col.cacheRead", sortKey: "cacheRead", hideBelow: true },
			{ key: "cacheWrite", labelKey: "col.cacheWrite", sortKey: "cacheWrite", hideBelow: true },
			{ key: "output", labelKey: "col.output", sortKey: "output", hideBelow: true },
		];
		/**
		 * Column-width bounds for the drag handle. The floor keeps a numeric column
		 * readable; the ceiling keeps one column from starving the rest, which matters
		 * because the table is the panel's only scrollport and must not grow a horizontal
		 * scrollbar: the table band is sized by the pane, never by its own content.
		 */
		const COLUMN_WIDTH_LIMITS = { min: 64, max: 420 };
		/** Default width per column, in pixels; a column the user never resized uses this. */
		const COLUMN_DEFAULT_WIDTHS = {
			updated: 130,
			session: 260,
			total: 110,
			share: 130,
			input: 130,
			cacheRead: 130,
			cacheWrite: 130,
			output: 110,
		};
		/** Default filters, also the reset target. */
		const DEFAULT_FILTERS = Object.freeze({
			query: "",
			range: "all",
			cwd: "",
			sortKey: "total",
			sortDesc: true,
			topLevelOnly: false,
			usedOnly: false,
			/** Empty means every model; set by the model chart or legend. */
			model: "",
			/** Host day index (e.g. 20726) selected from the activity calendar; null = every day. */
			day: null,
			/** Per-column pixel widths the user dragged; a column absent here uses its default. */
			columnWidths: Object.freeze({}),
			view: "overview",
			trendDays: 7,
		});

		/**
		 * Number and time formatting.
		 *
		 * `Intl.NumberFormat` is built once: `toLocaleString` constructs a formatter per
		 * call, and the table formats several counters per row, so the allocation shows
		 * up as frame cost while a session streams.
		 */
		const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
		
		/** Group an integer with thousands separators. */
		function formatInt(value) {
			const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
			return NUMBER_FORMAT.format(safe);
		}
		
		/** Compact a large count: `12K`, `1.2M`, `8.8B`. */
		function formatCompact(value) {
			const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
			if (safe < 10000) return NUMBER_FORMAT.format(safe);
			if (safe < 1000000) return (safe / 1000).toFixed(safe < 100000 ? 1 : 0) + "K";
			if (safe < 1000000000) return (safe / 1000000).toFixed(safe < 10000000 ? 2 : 1) + "M";
			return (safe / 1000000000).toFixed(2) + "B";
		}
		
		/** Render an epoch-millisecond timestamp as `MM-DD HH:mm` (year only when it differs). */
		function formatTime(value) {
			if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
			const date = new Date(value);
			const now = new Date();
			const pad = (number) => String(number).padStart(2, "0");
			const year = date.getFullYear() === now.getFullYear() ? "" : date.getFullYear() + "-";
			return year + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
		}
		
		/** Full timestamp for a row's native tooltip; empty when unknown. */
		function formatFullTime(value) {
			if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
			return new Date(value).toLocaleString();
		}
		
		/**
		 * The local date a Host day index names.
		 *
		 * The Host buckets by its own UTC offset and ships that offset with the data, so
		 * the browser must shift by the same amount before reading the calendar fields.
		 * @param day - the Host day index.
		 * @param offsetMinutes - minutes east of UTC used by the fold.
		 * @returns the Date at that local day.
		 */
		function dateOfDay(day, offsetMinutes) {
			return new Date(day * DAY_MS - offsetMinutes * 60000);
		}
		
		/**
		 * `9月23日` / `Sep 23` for a Host day index.
		 *
		 * The browser's own locale formats the date: the panel already switches all its
		 * copy through the locale seat, and re-deriving the active language here would be
		 * a second source of truth for the same thing.
		 */
		function formatDayShort(day, offsetMinutes) {
			return dateOfDay(day, offsetMinutes).toLocaleDateString(undefined, { month: "short", day: "numeric" });
		}
		
		/** `2026-09-23` for a Host day index, used in titles and exports. */
		function formatDayIso(day, offsetMinutes) {
			const date = dateOfDay(day, offsetMinutes);
			const pad = (number) => String(number).padStart(2, "0");
			return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
		}
		
		/** `9月` / `Sep` for a Host day index, used as a month axis label. */
		function formatMonthShort(day, offsetMinutes) {
			return dateOfDay(day, offsetMinutes).toLocaleDateString(undefined, { month: "short" });
		}
		
		/**
		 * Inclusive lower bound of a range filter.
		 * @param key - `all` | `today` | `7d` | `30d`.
		 * @param now - current epoch milliseconds.
		 * @returns the window start, or 0 for `all`.
		 */
		function rangeStart(key, now) {
			if (key === "today") {
				const start = new Date(now);
				start.setHours(0, 0, 0, 0);
				return start.getTime();
			}
			if (key === "7d") return now - 7 * DAY_MS;
			if (key === "30d") return now - 30 * DAY_MS;
			return 0;
		}
		
		/** Leaf directory name of a workspace path. */
		function leafName(path) {
			if (typeof path !== "string" || path === "") return undefined;
			const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
			return parts[parts.length - 1] || path;
		}
		
		/** Join truthy class names. */
		function cx(...values) {
			return values.filter((value) => typeof value === "string" && value !== "").join(" ");
		}
		
		/** Shallow equality for string-keyed records. */
		function shallowEqual(left, right) {
			if (Object.is(left, right)) return true;
			if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
			const keys = Object.keys(left);
			if (keys.length !== Object.keys(right).length) return false;
			for (const key of keys) {
				if (!Object.hasOwn(right, key) || !Object.is(left[key], right[key])) return false;
			}
			return true;
		}
		
		/** Escape one CSV field (RFC 4180: quote when it holds a delimiter, quote or newline). */
		function csvField(value) {
			const text = value === undefined || value === null ? "" : String(value);
			return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
		}
		
		/** Clamp a number into a range. */
		function clamp(value, low, high) {
			return value < low ? low : value > high ? high : value;
		}

		/** Wire field names of the `tokenUsage` projection, in bucket order. */
		const USAGE_FIELDS = ["uncachedInputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"];
		/** The all-zero usage a session with no turns reports. */
		const ZERO_USAGE = Object.freeze({
			uncachedInputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0,
		});
		/** A frozen fresh zero total, used as the fold's seed. */
		function zeroUsage() {
			return { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
		}
		
		/**
		 * Validate one wire `tokenUsage` value.
		 * @param value - candidate projection value.
		 * @returns the four non-negative counters, or undefined when absent or malformed.
		 */
		function readUsage(value) {
			if (value === null || typeof value !== "object") return undefined;
			const out = {};
			for (const field of USAGE_FIELDS) {
				const raw = value[field];
				if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return undefined;
				out[field] = raw;
			}
			return out;
		}
		
		/** Whether two normalized usage values carry the same counters. */
		function sameUsage(left, right) {
			if (left === right) return true;
			if (left === undefined || right === undefined) return false;
			for (const field of USAGE_FIELDS) {
				if (left[field] !== right[field]) return false;
			}
			return true;
		}
		
		/**
		 * Validate one wire `sessionStats` value.
		 * @param value - candidate projection value.
		 * @returns turns and steps, or undefined when absent or malformed.
		 */
		function readStats(value) {
			if (value === null || typeof value !== "object") return undefined;
			const { turns, steps } = value;
			if (typeof turns !== "number" || !Number.isFinite(turns) || turns < 0) return undefined;
			if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) return undefined;
			return { turns, steps };
		}
		
		/** Whether two normalized stats carry the same counts. */
		function sameStats(left, right) {
			if (left === right) return true;
			if (left === undefined || right === undefined) return false;
			return left.turns === right.turns && left.steps === right.steps;
		}
		
		/** Sum the three disjoint prompt-side billing buckets. */
		function billedInput(usage) {
			return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
		}
		
		/** Total tokens billed for one usage value. */
		function totalOf(usage) {
			return billedInput(usage) + usage.outputTokens;
		}
		
		/**
		 * Sum normalized usage values.
		 * @param values - usage values to add.
		 * @returns the four summed counters.
		 */
		function sumUsages(values) {
			const total = zeroUsage();
			for (const usage of values) {
				for (const field of USAGE_FIELDS) total[field] += usage[field];
			}
			return total;
		}
		
		/** Accumulate `right` into the `left` counters in place. */
		function addInto(left, right) {
			for (const field of USAGE_FIELDS) left[field] += right[field];
			return left;
		}
		
		//#region host wire values
		/**
		 * The gateway/model labels the Host resolved for one route.
		 *
		 * Both are authoritative and both come from the LLM registry (`listProviders` /
		 * `listModels`) — the same source the Models settings page renders. There is
		 * deliberately no vendor here: an event records only `provider/model`, and the
		 * provider is a route key such as `opencodegochat`, i.e. a gateway rather than a
		 * model maker, so a vendor label would be a guess presented as a fact.
		 */
		function readLabels(table, provider, model) {
			const entry = table === undefined ? undefined : table[provider + "/" + model];
			if (entry === null || typeof entry !== "object") return { providerName: provider, modelName: model };
			return {
				providerName: typeof entry.providerName === "string" && entry.providerName !== "" ? entry.providerName : provider,
				modelName: typeof entry.modelName === "string" && entry.modelName !== "" ? entry.modelName : model,
			};
		}
		
		/**
		 * The one label form every view renders: `opencode go chat · deepseek-v4.1-flash`.
		 * @param route - any object carrying `providerName` and `modelName`.
		 * @returns the display label.
		 */
		function routeLabel(route) {
			return route.providerName + " · " + route.modelName;
		}
		
		/** Whether a wire `names` table is usable. */
		function isNameTable(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		
		/**
		 * Validate the `tokenUsageByRoute` wire value and resolve its labels.
		 * @param value - candidate projection value.
		 * @returns `{ routes: [{ provider, model, providerName, modelName, tokens }] }`,
		 *   or undefined when absent or malformed.
		 */
		function readRouteUsage(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
			if (!Array.isArray(value.routes) || !isNameTable(value.names)) return undefined;
			const routes = [];
			for (const entry of value.routes) {
				if (entry === null || typeof entry !== "object") return undefined;
				if (typeof entry.provider !== "string" || typeof entry.model !== "string") return undefined;
				const tokens = readUsage(entry.tokens);
				if (tokens === undefined) return undefined;
				routes.push({ provider: entry.provider, model: entry.model, ...readLabels(value.names, entry.provider, entry.model), tokens });
			}
			return { routes };
		}
		
		/** Whether two resolved route breakdowns carry the same rows. */
		function sameRouteUsage(left, right) {
			if (left === right) return true;
			if (left === undefined || right === undefined) return false;
			if (left.routes.length !== right.routes.length) return false;
			for (let index = 0; index < left.routes.length; index += 1) {
				const a = left.routes[index];
				const b = right.routes[index];
				if (a.provider !== b.provider || a.model !== b.model) return false;
				if (a.providerName !== b.providerName || a.modelName !== b.modelName) return false;
				if (!sameUsage(a.tokens, b.tokens)) return false;
			}
			return true;
		}
		
		/**
		 * Validate the `tokenUsageByDay` wire value.
		 *
		 * `offsetMinutes` MUST travel with the days. The Host buckets every event by its
		 * own UTC offset and ships that offset alongside the buckets; the browser
		 * re-derives every calendar date, month label and "today" anchor from a bare day
		 * index, so a dropped offset silently renders the whole calendar in the wrong
		 * frame — a mistake that stays invisible while the browser shares the Host zone.
		 *
		 * A missing or non-finite offset is deliberately NOT fatal: it is left undefined
		 * and the aggregator falls back to 0, which is exactly the behaviour a Host that
		 * never shipped the field would deserve. A malformed *day* still rejects the
		 * block, as before.
		 * @param value - candidate projection value.
		 * @returns `{ days: [{ day, tokens }], first, last, offsetMinutes }`, or undefined.
		 */
		function readDayUsage(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
			if (!Array.isArray(value.days)) return undefined;
			const days = [];
			for (const entry of value.days) {
				if (entry === null || typeof entry !== "object" || !Number.isInteger(entry.day)) return undefined;
				const tokens = readUsage(entry.tokens);
				if (tokens === undefined) return undefined;
				days.push({ day: entry.day, tokens });
			}
			const first = typeof value.first === "number" && Number.isFinite(value.first) ? value.first : null;
			const last = typeof value.last === "number" && Number.isFinite(value.last) ? value.last : null;
			const offsetMinutes =
				typeof value.offsetMinutes === "number" && Number.isFinite(value.offsetMinutes) ? value.offsetMinutes : undefined;
			return { days, first, last, offsetMinutes };
		}
		
		/** Whether two day-usage values carry the same days, span and UTC offset. */
		function sameDayUsage(left, right) {
			if (left === right) return true;
			if (left === undefined || right === undefined) return false;
			if (left.first !== right.first || left.last !== right.last) return false;
			// The offset participates in identity: it changes every rendered date, and the
			// row objects are reused on equality, so ignoring it would freeze the calendar
			// in a stale frame after a DST or timezone change.
			if (left.offsetMinutes !== right.offsetMinutes) return false;
			if (left.days.length !== right.days.length) return false;
			for (let index = 0; index < left.days.length; index += 1) {
				if (left.days[index].day !== right.days[index].day) return false;
				if (!sameUsage(left.days[index].tokens, right.days[index].tokens)) return false;
			}
			return true;
		}
		
		/**
		 * Validate the `tokenUsageByRouteByDay` wire value and resolve its labels.
		 * @param value - candidate projection value.
		 * @returns `{ days: [{ day, routes: [...] }] }`, or undefined.
		 */
		function readRouteDayUsage(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
			if (!Array.isArray(value.days) || !isNameTable(value.names)) return undefined;
			const days = [];
			for (const entry of value.days) {
				if (entry === null || typeof entry !== "object" || !Number.isInteger(entry.day)) return undefined;
				if (!Array.isArray(entry.routes)) return undefined;
				const routes = [];
				for (const route of entry.routes) {
					if (route === null || typeof route !== "object") return undefined;
					if (typeof route.provider !== "string" || typeof route.model !== "string") return undefined;
					const tokens = readUsage(route.tokens);
					if (tokens === undefined) return undefined;
					routes.push({ provider: route.provider, model: route.model, ...readLabels(value.names, route.provider, route.model), tokens });
				}
				days.push({ day: entry.day, routes });
			}
			return { days };
		}
		
		/** Whether two route-day values carry the same days and rows. */
		function sameRouteDayUsage(left, right) {
			if (left === right) return true;
			if (left === undefined || right === undefined) return false;
			if (left.days.length !== right.days.length) return false;
			for (let index = 0; index < left.days.length; index += 1) {
				const a = left.days[index];
				const b = right.days[index];
				if (a.day !== b.day || a.routes.length !== b.routes.length) return false;
				for (let inner = 0; inner < a.routes.length; inner += 1) {
					if (a.routes[inner].provider !== b.routes[inner].provider || a.routes[inner].model !== b.routes[inner].model) return false;
					// The resolved labels participate in identity exactly like they do for
					// `tokenUsageByRoute`: a registry rename with unchanged tokens must reach
					// the trend legend, not stay frozen behind a reused row object.
					if (a.routes[inner].providerName !== b.routes[inner].providerName) return false;
					if (a.routes[inner].modelName !== b.routes[inner].modelName) return false;
					if (!sameUsage(a.routes[inner].tokens, b.routes[inner].tokens)) return false;
				}
			}
			return true;
		}
		
		/** A stable key for one route, used as the merge and colour identity. */
		function routeIdOf(route) {
			return route.provider + "/" + route.model;
		}
		//#endregion

		//#region persistence
		/**
		 * A complete, usable filter set: the defaults plus an empty width table.
		 *
		 * `columnWidths` is a per-column override map, so it needs its own empty object
		 * rather than the shared reference `DEFAULT_FILTERS` holds — writing a dragged
		 * width into it must never mutate the defaults for the next reader.
		 * @returns a fresh filter object.
		 */
		function freshFilters() {
			return { ...DEFAULT_FILTERS, columnWidths: {} };
		}
		
		/**
		 * Validate one persisted filter shape, so a stale, hand-edited, or
		 * older-version entry can never leave the panel in an unreachable state.
		 * @param value - parsed JSON.
		 * @returns a complete filter object, or undefined when unusable.
		 */
		function normalizeFilters(value) {
			if (value === null || typeof value !== "object") return undefined;
			const next = freshFilters();
			if (typeof value.query === "string") next.query = value.query;
			if (RANGES.includes(value.range)) next.range = value.range;
			if (typeof value.cwd === "string") next.cwd = value.cwd;
			if (SORT_KEYS.includes(value.sortKey)) next.sortKey = value.sortKey;
			if (typeof value.sortDesc === "boolean") next.sortDesc = value.sortDesc;
			if (typeof value.topLevelOnly === "boolean") next.topLevelOnly = value.topLevelOnly;
			if (typeof value.usedOnly === "boolean") next.usedOnly = value.usedOnly;
			if (typeof value.model === "string") next.model = value.model;
			// A day is a Host day index, so it is a non-negative integer or nothing. A
			// stale index is harmless (it simply matches no row) but a non-integer would
			// make selectRows compare nonsense, so it is dropped here.
			if (typeof value.day === "number" && Number.isInteger(value.day) && value.day >= 0) next.day = value.day;
			if (VIEWS.includes(value.view)) next.view = value.view;
			if (TREND_RANGES.includes(value.trendDays)) next.trendDays = value.trendDays;
			// Only known columns, only in-bounds integers: a hand-edited width must never
			// be able to collapse a column to nothing or blow past the panel.
			if (value.columnWidths !== null && typeof value.columnWidths === "object" && !Array.isArray(value.columnWidths)) {
				const known = new Set(COLUMNS.map((column) => column.key));
				for (const [key, width] of Object.entries(value.columnWidths)) {
					if (!known.has(key)) continue;
					if (typeof width !== "number" || !Number.isFinite(width)) continue;
					next.columnWidths[key] = Math.min(COLUMN_WIDTH_LIMITS.max, Math.max(COLUMN_WIDTH_LIMITS.min, Math.round(width)));
				}
			}
			return next;
		}
		
		/** Read the persisted filters, or the defaults. */
		function loadFilters() {
			try {
				const raw = window.localStorage.getItem(FILTER_KEY);
				if (raw === null) return freshFilters();
				return normalizeFilters(JSON.parse(raw)) ?? freshFilters();
			} catch {
				return freshFilters();
			}
		}
		
		/** Persist the filters; a failure only loses the preference. */
		function saveFilters(filters) {
			try {
				window.localStorage.setItem(FILTER_KEY, JSON.stringify(filters));
			} catch {
				/* private mode or quota: the panel keeps working without persistence */
			}
		}
		
		/**
		 * Whether any *filter* deviates from the defaults.
		 *
		 * The view and the trend window are presentation choices, not filters: they are
		 * excluded so the reset control does not look active just because someone opened
		 * the charts, and so resetting filters does not bounce the user back to the other
		 * view.
		 */
		function isFiltered(filters) {
			return (
				filters.query !== DEFAULT_FILTERS.query ||
				filters.range !== DEFAULT_FILTERS.range ||
				filters.cwd !== DEFAULT_FILTERS.cwd ||
				filters.sortKey !== DEFAULT_FILTERS.sortKey ||
				filters.sortDesc !== DEFAULT_FILTERS.sortDesc ||
				filters.topLevelOnly ||
				filters.usedOnly ||
				filters.model !== DEFAULT_FILTERS.model ||
				filters.day !== DEFAULT_FILTERS.day ||
				Object.keys(filters.columnWidths).length > 0
			);
		}
		
		/** The reset target: defaults, with the presentation choices preserved. */
		function resetFilters(filters) {
			return {
				...freshFilters(),
				view: filters.view,
				trendDays: filters.trendDays,
			};
		}
		
		/**
		 * The columns to render, each carrying its resolved pixel width.
		 * @param filters - current filter set.
		 * @returns column definitions carrying a resolved `width`.
		 */
		function orderedColumns(filters) {
			return COLUMNS.map((column) => ({
				...column,
				width: filters.columnWidths[column.key] ?? COLUMN_DEFAULT_WIDTHS[column.key] ?? COLUMN_WIDTH_LIMITS.min,
				// One source of truth for the responsive hiding of this column's cells, its
				// header, and its colgroup track: a class for the cells, and the matching
				// `col*` variant for the `<col>` element, which is not a cell and so cannot
				// share the cell rule.
				hideClass: column.hideBelow2 === true ? "dshTup_hideBelow2" : column.hideBelow === true ? "dshTup_hideBelow" : undefined,
				colHideClass: column.hideBelow2 === true ? "dshTup_colHideBelow2" : column.hideBelow === true ? "dshTup_colHideBelow" : undefined,
			}));
		}
		//#endregion
		
		//#region selection
		/**
		 * Select and order the rows for the current filters.
		 *
		 * Decorate-sort-undecorate: each row's sort measure is computed once, so the
		 * comparator does no arithmetic. The range window is only resolved when a range
		 * filter is active.
		 *
		 * @param rows - every projected row.
		 * @param filters - current filter set.
		 * @param now - current epoch milliseconds, for the range window.
		 * @returns the matching rows in display order.
		 */
		function selectRows(rows, filters, now) {
			const from = filters.range === "all" ? 0 : rangeStart(filters.range, now);
			const needle = filters.query.trim().toLowerCase();
			const usedOnly = filters.usedOnly;
			const topLevelOnly = filters.topLevelOnly;
			const cwd = filters.cwd;
			const model = filters.model;
			const day = filters.day;
			const decorated = [];
			for (const row of rows) {
				if (topLevelOnly && row.parentId !== undefined) continue;
				if (cwd !== "" && row.cwd !== cwd) continue;
				if (model !== "") {
					// A session matches when any of its models does: the per-model filter is
					// how a reader gets from "this model dominates" to the sessions behind it.
					const routes = row.routeUsage === undefined ? undefined : row.routeUsage.routes;
					if (routes === undefined || !routes.some((route) => routeIdOf(route) === model)) continue;
				}
				if (day !== null) {
					// The calendar answers "what happened that day", so a session matches only
					// when its own day breakdown carries that day. Keeping the zero-token days
					// out makes "the session used tokens that day" the meaning of the filter.
					const days = row.dayUsage === undefined ? undefined : row.dayUsage.days;
					if (days === undefined || !days.some((entry) => entry.day === day && totalOf(entry.tokens) > 0)) continue;
				}
				if (from !== 0 && row.updatedAt < from) continue;
				if (needle !== "") {
					const haystack = (row.title ?? "") + " " + row.id + " " + (row.cwd ?? "");
					if (!haystack.toLowerCase().includes(needle)) continue;
				}
				const total = row.usage === undefined ? undefined : totalOf(row.usage);
				if (usedOnly && (total === undefined || total === 0)) continue;
				decorated.push({ row, measure: measureOf(row, filters.sortKey, total) });
			}
			const direction = filters.sortDesc ? -1 : 1;
			const key = filters.sortKey;
			decorated.sort((left, right) => {
				if (key === "recent") return (left.row.updatedAt - right.row.updatedAt) * direction;
				if (key === "title") {
					const order = (left.row.title ?? left.row.id).localeCompare(right.row.title ?? right.row.id);
					return order * direction;
				}
				const delta = left.measure - right.measure;
				if (delta !== 0) return delta * direction;
				return right.row.updatedAt - left.row.updatedAt;
			});
			return decorated.map((entry) => entry.row);
		}
		
		/**
		 * One row's sort measure, or -1 when the row has no usage data so it always sorts
		 * last.
		 * @param row - projected row.
		 * @param key - sort key.
		 * @param total - the row's total, already computed by the caller.
		 * @returns the comparable measure.
		 */
		function measureOf(row, key, total) {
			if (total === undefined) return -1;
			if (key === "total") return total;
			if (key === "input") return row.usage.uncachedInputTokens;
			if (key === "cacheRead") return row.usage.cacheReadTokens;
			if (key === "cacheWrite") return row.usage.cacheWriteTokens;
			if (key === "output") return row.usage.outputTokens;
			return 0;
		}
		//#endregion

		//#region projection
		/** Shared empty row list, so an empty table keeps one array identity. */
		const EMPTY_ROWS = Object.freeze([]);
		/** Shared empty day map, so an empty overview keeps one identity. */
		const EMPTY_DAY_MAP = new Map();
		
		/**
		 * Read one row's projection values from the list snapshot.
		 *
		 * The list surface carries a per-session projection block whose values are the
		 * wire views (the Host applies `wire.view` to the persisted checkpoint), so this
		 * reads exactly what the shipped folds produced.
		 */
		function valuesOf(snapshot, id) {
			const block = snapshot.projectionsBySession === undefined ? undefined : snapshot.projectionsBySession[id];
			if (block !== undefined && block.values !== undefined) return block.values;
			const summary = snapshot.byId[id];
			return summary === undefined ? undefined : summary.projectionValues;
		}
		
		/**
		 * Project one session into the row model, reusing the previous object whenever
		 * every field it exposes is unchanged.
		 *
		 * This identity reuse is the whole performance story: the session list ticks
		 * once per animation frame while any session runs, and `list.set()` hands out a
		 * fresh snapshot object every time. Comparing fields and returning the previous
		 * row object lets the subscription below skip the render entirely instead of
		 * rebuilding rows, re-sorting, and re-formatting numbers 60 times a second.
		 *
		 * @param snapshot - the `ctx.sessions.list` snapshot.
		 * @param id - session id.
		 * @param attempts - projection-read ledger keyed by session id.
		 * @param previous - this id's row from the previous projection, when there was one.
		 * @returns the row, or undefined when the snapshot no longer lists the id.
		 */
		function rowInputOf(snapshot, id, attempts, previous) {
			const summary = snapshot.byId[id];
			if (summary === undefined) return undefined;
			const values = valuesOf(snapshot, id);
			const usage = readUsage(values === undefined ? undefined : values.tokenUsage);
			const stats = readStats(values === undefined ? undefined : values.sessionStats);
			const routeUsageRaw = readRouteUsage(values === undefined ? undefined : values.tokenUsageByRoute);
			const dayUsageRaw = readDayUsage(values === undefined ? undefined : values.tokenUsageByDay);
			const routeDayUsageRaw = readRouteDayUsage(values === undefined ? undefined : values.tokenUsageByRouteByDay);
			const title = typeof summary.displayTitle === "string" && summary.displayTitle !== "" ? summary.displayTitle : undefined;
			const running = summary.running === true;
			const blank = summary.blank === true;
			const updatedAt = typeof summary.updatedAt === "number" ? summary.updatedAt : 0;
			const cwd = typeof summary.cwd === "string" ? summary.cwd : undefined;
			const parentId = typeof summary.parentId === "string" ? summary.parentId : undefined;
			// `mainView` retention is how ui-workspace identifies the session shown in the
			// centre column; compare the number, never the wrapper object (which is
			// rebuilt on every list tick and would defeat the identity reuse below).
			const retainedBy = summary.retainedBy;
			const retainedMainView = retainedBy === undefined || retainedBy === null ? 0 : retainedBy.mainView ?? 0;
			// A blank session has started no turn, so it cannot carry usage; recording it
			// as `skipped` keeps it out of the read queue and reports it as zero.
			const attempt = blank ? "skipped" : attempts.get(id);
			const usageStable = previous !== undefined && sameUsage(previous.usage, usage) ? previous.usage : usage;
			const statsStable = previous !== undefined && sameStats(previous.stats, stats) ? previous.stats : stats;
			const routeUsageStable = previous !== undefined && sameRouteUsage(previous.routeUsage, routeUsageRaw) ? previous.routeUsage : routeUsageRaw;
			const dayUsageStable = previous !== undefined && sameDayUsage(previous.dayUsage, dayUsageRaw) ? previous.dayUsage : dayUsageRaw;
			const routeDayStable =
				previous !== undefined && sameRouteDayUsage(previous.routeDayUsage, routeDayUsageRaw) ? previous.routeDayUsage : routeDayUsageRaw;
			if (
				previous !== undefined &&
				previous.title === title &&
				previous.running === running &&
				previous.blank === blank &&
				previous.updatedAt === updatedAt &&
				previous.cwd === cwd &&
				previous.parentId === parentId &&
				previous.retainedMainView === retainedMainView &&
				previous.attempt === attempt &&
				previous.usage === usageStable &&
				previous.stats === statsStable &&
				previous.routeUsage === routeUsageStable &&
				previous.dayUsage === dayUsageStable &&
				previous.routeDayUsage === routeDayStable
			) {
				return previous;
			}
			return {
				id,
				title,
				running,
				blank,
				updatedAt,
				cwd,
				parentId,
				retainedMainView,
				attempt,
				usage: usageStable,
				stats: statsStable,
				routeUsage: routeUsageStable,
				dayUsage: dayUsageStable,
				routeDayUsage: routeDayStable,
			};
		}
		
		/**
		 * Subscribe to the session list through a projection that keeps stable row
		 * identities, so React only re-renders when a row's data actually changed.
		 *
		 * `useSyncExternalStore` requires a snapshot that is cached between store
		 * notifications; the projection caches both the per-id rows and the array, and
		 * returns the previous array when nothing changed.
		 *
		 * @param store - `ctx.sessions.list`.
		 * @param attempts - projection-read ledger.
		 * @param epoch - bumped when the ledger changes, forcing a re-projection.
		 * @returns the row list.
		 */
		function useProjectedSessions(store, attempts, epoch) {
			const state = react.useRef({ epoch: -1, phase: undefined, byId: new Map(), rows: EMPTY_ROWS });
			const subscribe = react.useCallback((notify) => store.subscribe(notify), [store]);
			const getSnapshot = react.useCallback(() => {
				const snapshot = store.getSnapshot();
				// The baseline phase is read from the snapshot, never captured at render
				// time: a phase-only change (an empty profile finishing its first pull)
				// must be able to notify, and a value closed over by the last render could
				// not see it.
				const phase = snapshot.phase;
				const current = state.current;
				const byId = new Map();
				const rows = [];
				for (const id of snapshot.ids) {
					const input = rowInputOf(snapshot, id, attempts, current.byId.get(id));
					if (input === undefined) continue;
					byId.set(id, input);
					rows.push(input);
				}
				// Deliberately NOT comparing `snapshot.ids`: the Host rebuilds that array on
				// every list publication, so an identity check there would defeat the gate
				// for exactly the ticks it exists to absorb. Row identity plus the length
				// and order comparison below already detect every real change, including
				// an emptied list and a reordering.
				const unchanged =
					current.epoch === epoch &&
					current.phase === phase &&
					current.rows.length === rows.length &&
					current.rows.every((row, index) => row === rows[index]);
				state.current = { epoch, phase, byId, rows: unchanged ? current.rows : rows };
				return state.current.rows;
			}, [store, attempts, epoch]);
			return react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
		}
		//#endregion
		
		//#region display cache
		/**
		 * Per-row display strings, keyed by the row object.
		 *
		 * The row identity is stable until the row's data changes, so every formatted
		 * number, timestamp, and label is computed once per real change instead of once
		 * per render. Swapped rather than cleared on a locale change, because a
		 * `WeakMap` cannot be emptied.
		 */
		let displayCache = new WeakMap();
		
		/** Drop every cached string; the next render recomputes against the new locale. */
		function clearDisplayCache() {
			displayCache = new WeakMap();
		}
		
		/**
		 * The formatted strings one row renders.
		 * @param row - projected row.
		 * @param t - translate seat.
		 * @returns the cached display record.
		 */
		function displayOf(row, t) {
			const cached = displayCache.get(row);
			if (cached !== undefined) return cached;
			const usage = row.usage;
			const total = usage === undefined ? undefined : totalOf(usage);
			const meta = [];
			const directory = leafName(row.cwd);
			if (directory !== undefined) meta.push(directory);
			if (row.stats !== undefined) meta.push(t("col.turns") + " " + formatInt(row.stats.turns));
			if (total === undefined) meta.push(t("missing"));
			else if (total === 0) meta.push(t("zero"));
			meta.push(row.id);
			const record = {
				total: total === undefined ? t("never") : formatInt(total),
				input: usage === undefined ? t("never") : formatInt(usage.uncachedInputTokens),
				cacheRead: usage === undefined ? t("never") : formatInt(usage.cacheReadTokens),
				cacheWrite: usage === undefined ? t("never") : formatInt(usage.cacheWriteTokens),
				output: usage === undefined ? t("never") : formatInt(usage.outputTokens),
				updatedAt: formatTime(row.updatedAt),
				tooltip: formatFullTime(row.updatedAt),
				meta: meta.join(" · "),
			};
			displayCache.set(row, record);
			return record;
		}
		//#endregion
		
		//#region aggregation
		/**
		 * Merge the filtered rows' per-model usage into one breakdown.
		 *
		 * Labels come from the rows' own resolved labels, so the browser never re-derives
		 * a gateway or a display name — the Host owns that single implementation.
		 *
		 * @param rows - the filtered rows.
		 * @returns `{ routes: [{ provider, model, providerName, modelName, tokens }] }`,
		 *   or undefined when no row carries route data.
		 */
		function aggregateRoutes(rows) {
			const merged = new Map();
			for (const row of rows) {
				const value = row.routeUsage;
				if (value === undefined) continue;
				for (const route of value.routes) {
					// The model band answers which models consumed tokens. Keep zero-use
					// registry/header routes out of the displayed breakdown.
					if (totalOf(route.tokens) <= 0) continue;
					const key = routeIdOf(route);
					let entry = merged.get(key);
					if (entry === undefined) {
						entry = {
							provider: route.provider,
							model: route.model,
							providerName: route.providerName,
							modelName: route.modelName,
							tokens: zeroUsage(),
						};
						merged.set(key, entry);
					}
					addInto(entry.tokens, route.tokens);
				}
			}
			if (merged.size === 0) return undefined;
			const routes = [...merged.values()];
			routes.sort((left, right) => totalOf(right.tokens) - totalOf(left.tokens) || left.model.localeCompare(right.model));
			return { routes };
		}
		
		/**
		 * Merge the filtered rows' per-day totals into one calendar.
		 * @param rows - the filtered rows.
		 * @returns `{ byDay, offsetMinutes, first, last }`, where `byDay` maps a Host day
		 *   index to summed tokens; empty maps and a null span when no row carries day data.
		 */
		function aggregateDays(rows) {
			const byDay = new Map();
			let offsetMinutes;
			let first = null;
			let last = null;
			let any = false;
			for (const row of rows) {
				const value = row.dayUsage;
				if (value === undefined) continue;
				any = true;
				if (offsetMinutes === undefined) offsetMinutes = value.offsetMinutes;
				for (const day of value.days) {
					const current = byDay.get(day.day);
					if (current === undefined) byDay.set(day.day, { ...day.tokens });
					else addInto(current, day.tokens);
				}
				if (value.first !== null && (first === null || value.first < first)) first = value.first;
				if (value.last !== null && (last === null || value.last > last)) last = value.last;
			}
			if (!any) return { byDay: EMPTY_DAY_MAP, offsetMinutes: 0, first: null, last: null };
			return { byDay, offsetMinutes: offsetMinutes ?? 0, first, last };
		}
		
		/**
		 * Merge the filtered rows' per-day-per-model detail into one calendar.
		 * @param rows - the filtered rows.
		 * @returns `{ byDay, offsetMinutes }`, where each day maps `routeId` to that day's
		 *   tokens for the route.
		 */
		function aggregateRouteDays(rows) {
			const byDay = new Map();
			let offsetMinutes;
			let any = false;
			for (const row of rows) {
				const value = row.routeDayUsage;
				if (value === undefined) continue;
				any = true;
				if (offsetMinutes === undefined && row.dayUsage !== undefined) offsetMinutes = row.dayUsage.offsetMinutes;
				for (const day of value.days) {
					let bucket = byDay.get(day.day);
					if (bucket === undefined) {
						bucket = new Map();
						byDay.set(day.day, bucket);
					}
					for (const route of day.routes) {
						if (totalOf(route.tokens) <= 0) continue;
						const key = routeIdOf(route);
						const current = bucket.get(key);
						if (current === undefined) bucket.set(key, { ...route, tokens: { ...route.tokens } });
						else addInto(current.tokens, route.tokens);
					}
				}
			}
			if (!any) return { byDay: EMPTY_DAY_MAP, offsetMinutes: 0 };
			return { byDay, offsetMinutes: offsetMinutes ?? 0 };
		}
		
		/**
		 * The day index the Host would assign to "now".
		 * @param offsetMinutes - the Host's UTC offset from the data.
		 * @returns the day index.
		 */
		function currentDayIndex(offsetMinutes) {
			return Math.floor((Date.now() + offsetMinutes * 60000) / DAY_MS);
		}
		
		/**
		 * A window of Host day indices ending today, in ascending order.
		 * @param today - the Host's current day index.
		 * @param count - how many days the window spans.
		 * @returns the day indices.
		 */
		function rangeDays(today, count) {
			const days = [];
			for (let offset = count - 1; offset >= 0; offset -= 1) days.push(today - offset);
			return days;
		}
		
		/**
		 * Longest and current run of consecutive days that have usage.
		 *
		 * "Current" counts back from today (or from the most recent day with usage, so a
		 * day that has not started yet in the Host's frame does not read as a broken
		 * streak); a gap of one day ends it, which is the usual reading of a streak.
		 *
		 * @param byDay - day index → tokens.
		 * @param today - the Host's current day index.
		 * @returns `{ longest, current }` in days.
		 */
		function streaksOf(byDay, today) {
			// A day entry can exist with all-zero buckets (a zero-token settlement is
			// recorded, not dropped), and a day without tokens must not read as an active
			// streak day: the calendar paints it empty and the KPI would disagree.
			const days = [...byDay.keys()].filter((day) => totalOf(byDay.get(day)) > 0).sort((left, right) => left - right);
			let longest = 0;
			let run = 0;
			let previous = null;
			for (const day of days) {
				run = previous !== null && day === previous + 1 ? run + 1 : 1;
				if (run > longest) longest = run;
				previous = day;
			}
			if (days.length === 0) return { longest: 0, current: 0 };
			let current = 0;
			let cursor = days[days.length - 1];
			if (cursor < today - 1) return { longest, current: 0 };
			while (byDay.has(cursor) && totalOf(byDay.get(cursor)) > 0) {
				current += 1;
				cursor -= 1;
			}
			return { longest, current };
		}
		
		/** The largest single-day total. */
		function peakOf(byDay) {
			let peak = 0;
			for (const tokens of byDay.values()) {
				const total = totalOf(tokens);
				if (total > peak) peak = total;
			}
			return peak;
		}
		
		//#endregion
		
		//#region read queue
		/**
		 * Read every session's token usage, refreshing projection columns the list
		 * snapshot left empty.
		 *
		 * The list surface already carries each session's cached projection column, so
		 * most rows resolve without a read. Rows whose cache missed are read one at a
		 * time through `sessions.refreshProjections`, which folds the durable log on the
		 * Host without activating an Agent; the result lands in the same projection
		 * store the list snapshot serves, so this hook needs no value cache.
		 *
		 * Reads are never cancelled by a snapshot change: the session list ticks every
		 * frame, so tearing reads down with an effect would strand ids mid-read and
		 * leave them spinning forever. The queue is drained by one long-lived pump.
		 *
		 * @param sessions - the `sessions` client service.
		 * @param store - `ctx.sessions.list`.
		 * @returns rows plus load state and recovery callbacks.
		 */
		function useUsageRows(sessions, store) {
			/** Attempt ledger: id → `loading` | `loaded` | `error`. Never retried on its own. */
			const attemptsRef = react.useRef(new Map());
			/** Ids waiting for a read slot, owned for the panel's lifetime. */
			const queueRef = react.useRef([]);
			/** Reads currently in flight. */
			const activeRef = react.useRef(0);
			/** False once the panel unmounts, so a settling read stops driving state. */
			const aliveRef = react.useRef(true);
			const [budget, setBudget] = react.useState(AUTO_LOAD_BUDGET);
			const [epoch, setEpoch] = react.useState(0);
			/**
			 * Whether this Host serves the extra usage units, resolved by the first read.
			 *
			 * A session whose cached projection column predates this plugin carries
			 * `tokenUsage` but NOT `tokenUsageByRoute` / `ByDay` / `ByRouteByDay`. Keying the
			 * read queue on `tokenUsage` alone therefore never refreshes those rows, so the
			 * charts and the per-model breakdown silently cover only the sessions that
			 * happened to be live. Measured on a real profile that was 186M of 216M tokens —
			 * 14% of the total missing, and the table and the charts disagreeing. The probe
			 * keeps a composition without the Host half from folding every log for units that
			 * will never appear.
			 */
			const [hostUnits, setHostUnits] = react.useState("unknown");
			const rows = useProjectedSessions(store, attemptsRef.current, epoch);
		
			react.useEffect(
				() => () => {
					aliveRef.current = false;
				},
				[],
			);
		
			/**
			 * Whether this row still needs a projection read.
			 * @param row - the projected row.
			 * @returns true when any value the panel displays is absent.
			 */
			const needsRead = (row) => {
				if (row.blank) return false;
				if (row.usage === undefined) return true;
				if (hostUnits === "no") return false;
				// Every value the panel displays is a read requirement, so this list must
				// name each projected unit the row field depends on. Dropping one here
				// leaves cache rows written before it silently under-reported.
				return row.routeUsage === undefined || row.dayUsage === undefined || row.routeDayUsage === undefined;
			};
		
			/** Fill the read slots from the queue. */
			const pump = react.useCallback(() => {
				/** Whether one finished read produced the day unit (the probe's evidence). */
				const probeDayUnit = (id) => {
					const values = valuesOf(store.getSnapshot(), id);
					return readDayUsage(values === undefined ? undefined : values.tokenUsageByDay) !== undefined;
				};
				/**
				 * Resolve whether this Host serves the extra units, from the store rather
				 * than from the rows this render closed over (the refresh just landed and
				 * React has not re-rendered).
				 *
				 * A "yes" is conclusive. A "no" is re-checked once on a later macrotask:
				 * `refreshProjections` may resolve before the list snapshot has ingested
				 * the refreshed projection, and a false "no" would disable the backfill
				 * for every remaining stale row — the exact 14% failure this probe exists
				 * to prevent. `refresh()` resets the verdict, so even a wrong "no" has a
				 * recovery path.
				 */
				const probeHostUnits = (id) => {
					if (probeDayUnit(id)) {
						setHostUnits("yes");
						return;
					}
					setTimeout(() => {
						if (!aliveRef.current) return;
						setHostUnits((value) => (value === "unknown" && !probeDayUnit(id) ? "no" : value));
					}, 0);
				};
				while (activeRef.current < LOAD_CONCURRENCY && queueRef.current.length > 0) {
					const id = queueRef.current.shift();
					activeRef.current += 1;
					void (async () => {
						try {
							await sessions.refreshProjections(id);
							attemptsRef.current.set(id, "loaded");
							probeHostUnits(id);
						} catch (error) {
							attemptsRef.current.set(id, "error");
							console.warn("[dsh-token-usage-panel] projection read failed for " + id, error);
						} finally {
							activeRef.current -= 1;
							if (aliveRef.current) {
								setEpoch((value) => value + 1);
								pump();
							}
						}
					})();
				}
			}, [sessions, store]);
		
			react.useEffect(() => {
				let queued = false;
				for (const row of rows) {
					if (!needsRead(row)) continue;
					if (attemptsRef.current.has(row.id)) continue;
					if (attemptsRef.current.size >= budget) break;
					attemptsRef.current.set(row.id, "loading");
					queueRef.current.push(row.id);
					queued = true;
				}
				if (queued) pump();
			}, [rows, budget, pump, hostUnits]);
		
			let pending = 0;
			let waiting = 0;
			let unavailable = 0;
			for (const row of rows) {
				if (row.attempt === "loading") {
					pending += 1;
					continue;
				}
				if (row.usage === undefined) {
					// `blank` rows are complete by definition (they cannot carry usage).
					if (row.attempt === undefined && !row.blank) waiting += 1;
					else if (!row.blank) unavailable += 1;
					continue;
				}
				if (needsRead(row) && row.attempt === undefined) waiting += 1;
			}
		
			const refresh = react.useCallback(() => {
				attemptsRef.current.clear();
				queueRef.current.length = 0;
				// Re-open the Host-unit probe: the verdict may have been a false "no" (a
				// store that lagged the first read), or the Host half may have appeared
				// since. Without this reset the panel could never recover.
				setHostUnits("unknown");
				setBudget(AUTO_LOAD_BUDGET);
				void Promise.resolve(sessions.refresh()).catch(() => undefined);
				setEpoch((value) => value + 1);
			}, [sessions]);
		
			/** Re-read one session whose projection read failed. */
			const retry = react.useCallback(
				(id) => {
					attemptsRef.current.delete(id);
					queueRef.current.push(id);
					pump();
				},
				[pump],
			);
		
			const loadMore = react.useCallback(() => {
				setBudget((value) => value + AUTO_LOAD_BUDGET);
			}, []);
		
			return { rows, pending, waiting, unavailable, refresh, retry, loadMore };
		}
		//#endregion

		/**
		 * Runtime consistency audit — the mechanism that turns a silent under-count into
		 * a reported drift.
		 *
		 * That bug was silent and human-visible: the session table reads each row's
		 * `tokenUsage` (the official meter) while the model donut and the per-model band
		 * read `tokenUsageByRoute`. When the read queue covered only `tokenUsage`, nine
		 * stale cache rows never folded the route unit, so the table said 216M and the
		 * charts said 186M — two totals on one panel disagreeing, caught only because the
		 * user eyeballed it.
		 *
		 * `tokenUsageByRoute` is UNwindowed (unlike `ByDay` / `ByRouteByDay`, which clip
		 * to 366 / 31 days and therefore legitimately sum to LESS than the total). So for
		 * any row that carries both values, the four buckets summed across routes MUST
		 * equal the row's total exactly — the same identity the Host differential oracle
		 * enforces at fold time, re-checked here at render against whatever
		 * actually reached the browser. It fires only on a real drift: a future change to
		 * `advanceUsage`, a new sampling dimension that forgets a bucket, or a malformed
		 * wire value the validator let through.
		 *
		 * Rows missing either value are skipped, NOT flagged — an absent unit is a read
		 * still pending (the read queue already reports that); this audit is for values
		 * that arrived and disagree.
		 */

		/**
		 * Find every complete row whose per-model sum disagrees with its own total.
		 * @param rows - the projected rows.
		 * @returns `{ count, entries }`, where each entry is `{ id, title, usageTotal, routeTotal, delta }`.
		 */
		function auditUsageConsistency(rows) {
			const entries = [];
			for (const row of rows) {
				const usage = row.usage;
				const route = row.routeUsage;
				if (usage === undefined || route === undefined) continue;
				const routeTotal = zeroUsage();
				for (const entry of route.routes) addInto(routeTotal, entry.tokens);
				const usageTotal = totalOf(usage);
				const summed = totalOf(routeTotal);
				if (summed === usageTotal) continue;
				entries.push({
					id: row.id,
					title: row.title === undefined ? "" : row.title,
					usageTotal,
					routeTotal: summed,
					delta: summed - usageTotal,
				});
			}
			return { count: entries.length, entries };
		}

		/**
		 * The plugin stylesheet.
		 *
		 * Layout contract (guarded by a static assertion in the self-check): the frame's
		 * centre column is `display:flex; overflow:hidden` with a definite height, so
		 * this panel is a flex column of that same height. Every band except the table is
		 * `flex:0 0 auto`; the table region is the ONE `flex:1 1 auto; min-height:<floor>;
		 * overflow:auto` child and therefore the only scrollport. A shrinking
		 * `overflow:hidden` table wrapper was absorbing all the shrink and clipping rows
		 * instead of producing a scrollbar.
		 *
		 * Motion contract: the root carries `data-animate="true"` plus the `--dsh-tup-*`
		 * tokens built from `MOTION` in `05-constants.js`, and every entrance, growth and
		 * interaction rule is scoped under that attribute so a host could embed the panel
		 * without motion. Growth replays on a real data change because the animated leaves
		 * are keyed on a digest of their own data — an unchanged re-render must NOT restart
		 * a drawing — and `prefers-reduced-motion` turns the whole vocabulary off.
		 */
		const css = [
			//#region shell and bands
			".dshTup_root{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;container-type:inline-size;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.5;--dsh-tup-row-h:54px;--dsh-tup-fast:140ms;--dsh-tup-base:220ms;--dsh-tup-slow:460ms;--dsh-tup-stagger:16ms;--dsh-tup-ease:cubic-bezier(.22,.61,.36,1);--dsh-tup-settle:cubic-bezier(.16,1,.3,1)}",
			// The motion vocabulary. Every wave — bands, table rows, heatmap columns — is
			// `index * --dsh-tup-stagger`, and every curve is one of the two easing tokens, so
			// the panel is retimed from `MOTION` in `05-constants.js`; the values in the root
			// rule are only the fallback for a stylesheet rendered without the panel's inline
			// properties.
			"@keyframes dshTup-enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
			"@keyframes dshTup-bandIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
			"@keyframes dshTup-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}",
			"@keyframes dshTup-sweep{from{opacity:0;transform:rotate(-108deg) scale(.86)}to{opacity:1;transform:none}}",
			"@keyframes dshTup-cellIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
			"@keyframes dshTup-grow{from{transform:scaleX(0)}to{transform:none}}",
			"@keyframes dshTup-tipIn{from{opacity:0;transform:translate(-50%,-3px)}to{opacity:1;transform:translate(-50%,0)}}",
			".dshTup_root{animation:dshTup-enter var(--dsh-tup-base) var(--dsh-tup-ease) both}",
			// The bands of a view enter as one wave. The delay comes from the child index in
			// CSS rather than from a prop, so no component has to know it is being staggered;
			// the fifth band and beyond share the last step so a long view cannot push its tail
			// late.
			".dshTup_root[data-animate=true] .dshTup_overview>*,.dshTup_root[data-animate=true] .dshTup_sessions>*{animation:dshTup-bandIn var(--dsh-tup-base) var(--dsh-tup-ease) both}",
			".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(2),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(2){animation-delay:calc(var(--dsh-tup-stagger) * 1)}",
			".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(3),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(3){animation-delay:calc(var(--dsh-tup-stagger) * 2)}",
			".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(4),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(4){animation-delay:calc(var(--dsh-tup-stagger) * 3)}",
			".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(n+5),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(n+5){animation-delay:calc(var(--dsh-tup-stagger) * 4)}",
			// Interaction feedback is deliberately NOT part of that wave: a hover or a press is
			// immediate feedback, and gating it on a data change would read as a dead surface.
			".dshTup_root button{transition:transform var(--dsh-tup-fast) var(--dsh-tup-ease),background-color var(--dsh-tup-fast) var(--dsh-tup-ease),border-color var(--dsh-tup-fast) var(--dsh-tup-ease),color var(--dsh-tup-fast) var(--dsh-tup-ease),opacity var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_root button:active:not(:disabled){transform:scale(.97)}",
			".dshTup_card{transition:border-color var(--dsh-tup-fast) var(--dsh-tup-ease),background-color var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}",
			// The empty heatmap cell is painted with the card's own resting surface
			// (`--dsw-alias-bg-layer-2`, see `heatColor`), so on hover the card lifts to that
			// same colour and the whole grid vanishes — same story for the donut track and
			// the tooltip chrome. Chart cards therefore keep the resting surface and signal
			// the hover on the border alone.
			".dshTup_chartCard:hover{background:var(--dsw-alias-bg-layer-1)}",
			// Inside the sessions scrollport the cards take their natural height
			// (`flex:none`), so card content can never be squeezed and the page scrolls
			// instead.
			".dshTup_sessions>.dshTup_summary,.dshTup_sessions>.dshTup_routes,.dshTup_sessions>.dshTup_chartCard{flex:none}",
			// The chart card is the only `.dshTup_card` placed straight into that flow, and
			// `.dshTup_card` carries no margin of its own (the overview's cards are inset by
			// `.dshTup_overview`'s padding). Without this inset it renders full-bleed: wider
			// than the summary and model bands above it, and clipped at the panel edges.
			".dshTup_sessions>.dshTup_chartCard{margin:12px 20px 0}",
			// Padding-top matches .dshTup_overview so the title does not jump 4px when the
			// view switches between overview and sessions.
			".dshTup_head{flex:0 0 auto;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:12px 20px 0}",
			".dshTup_headMain{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 260px}",
			".dshTup_title{margin:0;font-size:17px;font-weight:600}",
			".dshTup_subtitle{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px}",
			// margin-left:auto keeps the wrapped action row right-aligned under the title
			// instead of dropping to the far left when the head wraps on a narrow pane.
			".dshTup_actions{display:flex;align-items:center;gap:8px;flex:none;margin-left:auto}",
			".dshTup_summary{flex:0 0 auto;display:flex;align-items:center;gap:16px 22px;flex-wrap:wrap;margin:12px 20px 0;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
			".dshTup_sumHead{display:flex;flex-direction:column;gap:1px;flex:none;min-width:148px}",
			".dshTup_sumLabel{color:var(--dsw-alias-label-secondary);font-size:12px}",
			".dshTup_sumValue{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.25;overflow-wrap:anywhere}",
			".dshTup_sumHint{color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dshTup_sumBar{display:flex;flex-direction:column;gap:6px;flex:1 1 220px;min-width:170px}",
			".dshTup_bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-interactive-bg-hover)}",
			".dshTup_barSeg{height:100%;min-width:0}",
			".dshTup_root[data-animate=true] .dshTup_barSeg{transform-origin:left center;animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both;transition:width var(--dsh-tup-base) var(--dsh-tup-ease)}",
			".dshTup_legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:var(--dsw-alias-label-secondary)}",
			".dshTup_legendItem{display:inline-flex;align-items:center;gap:5px;transition:transform var(--dsh-tup-fast) var(--dsh-tup-settle),opacity var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_legendItem:hover{transform:translateY(-1px)}",
			".dshTup_dot{width:8px;height:8px;border-radius:2px;flex:none}",
			".dshTup_legendNum{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}",
			".dshTup_stats{display:grid;grid-template-columns:repeat(2,minmax(84px,auto));gap:2px 20px;margin:0;flex:none}",
			".dshTup_stat{display:flex;align-items:baseline;gap:8px}",
			".dshTup_stat dt{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}",
			".dshTup_stat dd{margin:0;font-size:13px;font-variant-numeric:tabular-nums;font-weight:500}",
			".dshTup_grand{flex:1 1 100%;display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dshTup_grandNum{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
			//#endregion
		
			//#region per-model breakdown
			".dshTup_routes{flex:0 0 auto;display:flex;flex-direction:column;gap:6px;margin:12px 20px 0;padding:10px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
			".dshTup_routeHead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}",
			".dshTup_routeList{display:flex;flex-wrap:wrap;gap:6px 10px;margin:0;padding:0;list-style:none}",
			".dshTup_routeItem{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;max-width:100%;padding:3px 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);font-size:12px;transition:border-color var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
			".dshTup_routeItem:hover{border-color:var(--dsw-alias-border-l2);transform:translateY(-1px)}",
			".dshTup_routeProvider{color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dshTup_routeModel{color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}",
			".dshTup_routeTokens{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
			".dshTup_routeShare{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums;min-width:38px;text-align:right}",
			".dshTup_routeMoney{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:500}",
			".dshTup_routeHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px}",
			// Grouped reading: one block per gateway, its own header carrying the rolled-up
			// total and share, the same chips inside. The chips stay chips — grouping only
			// adds the headers and the column direction.
			".dshTup_routeGroups{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}",
			".dshTup_routeGroup{display:flex;flex-direction:column;gap:5px;min-width:0}",
			".dshTup_routeGroupHead{display:flex;align-items:baseline;gap:8px}",
			".dshTup_routeGroupName{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_root .dshTup_routeButton{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;max-width:100%;border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer}",
			//#endregion
		
			//#region views and charts
			// Both views scroll as one document. The sessions view used to be a composed
			// flex column (fixed chrome + one flexible table band), which meant that when
			// the cards were collectively taller than the panel the only shrinkable member
			// was the table: it collapsed to its floor, the cards kept their height, and the
			// overflow was clipped by the root's `overflow:hidden` with no scrollable
			// ancestor at all — the cards were unreachable and no scrollbar existed. The
			// cards now sit in normal flow and scroll with the page, so no combination of
			// card content can push anything out of reach.
			".dshTup_root[data-view=overview]{overflow-y:auto;overscroll-behavior:contain}",
			".dshTup_overview{flex:0 0 auto;display:flex;flex-direction:column;gap:12px;padding:12px 20px 0}",
			// `min-height:0` + `overflow-y:auto` make this the scrollport for the sessions
			// view. The table keeps its own inner scroller (the virtual window needs a
			// definite `clientHeight`), so a tall table scrolls inside the page scroll
			// rather than growing without bound.
			".dshTup_sessions{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;overflow-y:auto;overscroll-behavior:contain}",
			".dshTup_kpi{flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:stretch;gap:6px 0;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
			".dshTup_kpiItem{flex:1 1 130px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:0 12px;min-width:0}",
			".dshTup_kpiItem+.dshTup_kpiItem{border-left:.5px solid var(--dsw-alias-border-l1)}",
			".dshTup_kpiValue{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}",
			".dshTup_kpiLabel{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}",
			".dshTup_card{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
			".dshTup_cardHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}",
			".dshTup_cardTitle{margin:0;font-size:13px;font-weight:600}",
			".dshTup_chartCard{flex:0 0 auto}",
			".dshTup_chartHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dshTup_legendRow{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:var(--dsw-alias-label-secondary)}",
			".dshTup_cell{transform-box:fill-box;transform-origin:center;transition:opacity var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
			".dshTup_cell:hover{opacity:.8;transform:scale(1.18)}",
			// The heatmap wave: the SVG groups its cells by week column, so this is 53
			// staggered group animations rather than 371 individual ones.
			".dshTup_heatCol{transform-box:fill-box;transform-origin:center}",
			".dshTup_root[data-animate=true] .dshTup_heatCol{animation:dshTup-cellIn var(--dsh-tup-base) var(--dsh-tup-ease) both;animation-delay:calc(var(--dsh-tup-i,0) * var(--dsh-tup-stagger))}",
			// Only the days that carry usage are offered as buttons; the affordance has to
			// follow that, or the empty cells read as clickable too.
			".dshTup_cell[role=button]{cursor:pointer}",
			".dshTup_cell[role=button]:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dshTup_axisLabel{fill:var(--dsw-alias-label-tertiary);font-size:11px}",
			// A `width:100%;height:auto` SVG against a fixed viewBox scales its text with
			// the container (an 11px axis label rendered ~14.6px wide, ~2.5px narrow), and
			// capping the rendered width to a band fixed that by leaving the right of a wide
			// card empty. The trend instead measures its wrapper in JS and widens its own
			// viewBox to match, so it fills the card at scale 1 with its labels at 11px;
			// 520px is the floor, below which the wrapper scrolls. The heatmap is a square
			// grid rather than a plot, so it keeps the centred band.
			".dshTup_trendWrap{position:relative;overflow-x:auto;overscroll-behavior:contain}",
			".dshTup_trend{display:block;width:100%;min-width:520px;height:auto}",
			".dshTup_heatmapWrap{overflow-x:auto;overscroll-behavior:contain}",
			".dshTup_heatmap{display:block;width:100%;min-width:680px;max-width:900px;height:auto;margin:0 auto}",
			".dshTup_gridLine{stroke:var(--dsw-alias-border-l1);stroke-width:1;stroke-dasharray:3 4}",
			".dshTup_trendLine{fill:none;stroke-width:2;stroke-linecap:round}",
			// The line draws itself: `pathLength="1"` on the element normalizes its length, so
			// the dash pattern can be written here without measuring the path. The two halves
			// are a pair — drop `pathLength` from the charts and every line turns into a
			// one-unit dashed stroke.
			".dshTup_root[data-animate=true] .dshTup_trendLine{stroke-dasharray:1;animation:dshTup-draw var(--dsh-tup-slow) var(--dsh-tup-settle) both}",
			".dshTup_cursor{stroke:var(--dsw-alias-border-l2);stroke-width:1}",
			".dshTup_cursorDot{stroke:var(--dsw-alias-bg-layer-1);stroke-width:1.5}",
			".dshTup_overlay{fill:transparent;cursor:crosshair}",
			// The gateway is its own bounded chip rather than a prefix blended into the model
			// name, because the two are different facts: `opencodegochat` is the route taken,
			// the model is what answered.
			".dshTup_providerTag{flex:none;display:inline-flex;align-items:center;box-sizing:border-box;padding:0 5px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px;white-space:nowrap}",
			".dshTup_modelName{display:inline-flex;align-items:center;gap:6px;min-width:0}",
			".dshTup_modelText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_tooltip{position:absolute;top:4px;transform:translateX(-50%);min-width:150px;max-width:240px;padding:7px 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));box-shadow:var(--dsw-shadow-lv2);font-size:11px;pointer-events:none;z-index:3}",
			".dshTup_root[data-animate=true] .dshTup_tooltip{animation:dshTup-tipIn var(--dsh-tup-fast) var(--dsh-tup-ease) both}",
			".dshTup_tooltipDay{color:var(--dsw-alias-label-secondary);margin-bottom:4px}",
			".dshTup_tooltipRow{display:flex;align-items:center;gap:6px}",
			".dshTup_tooltipLabel{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto;min-width:0}",
			".dshTup_tooltipValue{font-variant-numeric:tabular-nums;font-weight:500}",
			".dshTup_donutWrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}",
			".dshTup_donut{flex:0 0 auto;width:170px;height:170px}",
			".dshTup_donutTrack{stroke:var(--dsw-alias-bg-layer-2)}",
			".dshTup_donutSegment{transition:stroke-dashoffset var(--dsh-tup-slow) var(--dsh-tup-ease)}",
			// The ring sweeps in as one group: each segment's geometry lives in its own
			// `stroke-dasharray`/`stroke-dashoffset` attributes, so animating those from CSS
			// would fight the data. Rotating the group into place is the growth animation.
			".dshTup_donutSweep{transform-box:fill-box;transform-origin:center}",
			".dshTup_root[data-animate=true] .dshTup_donutSweep{animation:dshTup-sweep var(--dsh-tup-slow) var(--dsh-tup-settle) both}",
			".dshTup_donutValue{fill:var(--dsw-alias-label-primary);font-size:20px;font-weight:600}",
			".dshTup_donutUnit{fill:var(--dsw-alias-label-tertiary);font-size:10px}",
			".dshTup_modelList{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}",
			".dshTup_modelButton{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;font:inherit;padding:5px 6px;cursor:pointer;text-align:left;transition:background var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
			".dshTup_modelButton:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshTup_modelLabels{display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-width:0}",
			".dshTup_modelName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_modelMeta{color:var(--dsw-alias-label-tertiary);font-size:11px}",
			".dshTup_modelShare{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px}",
			//#endregion
		
			//#region filter band
			".dshTup_filters{flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding:12px 20px 0}",
			".dshTup_filterRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
			".dshTup_root .dshTup_search{height:36px;flex:1 1 220px;min-width:170px}",
			".dshTup_root .dshTup_menu{display:inline-flex;flex:none}",
			".dshTup_root .dshTup_trigger{max-width:230px}",
			".dshTup_triggerLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_chevron{flex:none;transition:transform var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_chevronOpen{transform:rotate(180deg)}",
			".dshTup_filterSpacer{flex:1 1 0;min-width:0}",
			".dshTup_menuLabelRow{display:inline-flex;align-items:center;gap:6px}",
			".dshTup_menuCount{color:var(--dsw-alias-label-tertiary);font-size:11px}",
			//#endregion
		
			//#region the table
			// The table sits in the sessions page flow: that view is the single scrollport, so
			// the table must not open a second one. What bounds the rendered row count here is
			// pagination (`PAGE_SIZE` rows per page), not a fixed-height scroller — which is
			// also why the virtual window never engages (its threshold sits above one page) and
			// why this band no longer needs a definite `clientHeight`.
			// Only the horizontal axis may scroll, and only once a dragged column pushes the
			// table past the pane; that must not spill out of the card's rounded border.
			// Only the ::-webkit-scrollbar family is declared: the host is Chromium, where
			// those pseudo-elements take precedence over scrollbar-width/scrollbar-color, so
			// declaring both would leave the standard properties silently dead.
			".dshTup_tableWrap{flex:0 0 auto;margin:12px 20px 0}",
			".dshTup_tableScroll{overflow-x:auto;overscroll-behavior-x:contain;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
			".dshTup_tableWrap[data-scrolled=true] .dshTup_tableScroll{border-color:var(--dsw-alias-border-l2)}",
			".dshTup_root[data-animate=true] .dshTup_tableScroll{transition:border-color var(--dsh-tup-base) var(--dsh-tup-ease)}",
			".dshTup_tableScroll::-webkit-scrollbar{width:10px;height:10px}",
			".dshTup_tableScroll::-webkit-scrollbar-track{background:transparent}",
			".dshTup_tableScroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);background-clip:content-box;border:2px solid transparent;border-radius:999px}",
			".dshTup_tableScroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2);background-clip:content-box}",
			".dshTup_tableScroll::-webkit-scrollbar-corner{background:transparent}",
			// `min(720px,100%)` keeps the columns from crushing while never exceeding the
			// container: a bare 720px floor would force a horizontal scrollbar as soon as
			// the pane is narrower than the sum of the visible columns.
			".dshTup_table{width:100%;min-width:min(720px,100%);border-collapse:separate;border-spacing:0;font-size:13px}",
			".dshTup_table th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:500;text-align:right;white-space:nowrap;padding:0}",
			".dshTup_root[data-scrolled=true] .dshTup_table th{box-shadow:inset 0 -1px 0 var(--dsw-alias-border-l2)}",
			".dshTup_thBtn{display:flex;align-items:center;justify-content:flex-end;gap:4px;width:100%;box-sizing:border-box;padding:9px 12px;border:0;border-bottom:.5px solid var(--dsw-alias-border-l3);background:transparent;color:inherit;font:inherit;font-weight:500;text-align:inherit;cursor:pointer;border-radius:0}",
			".dshTup_thStatic{display:flex;align-items:center;justify-content:flex-end;padding:9px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3)}",
			".dshTup_thBtn:hover{color:var(--dsw-alias-label-primary)}",
			".dshTup_thBtn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
			".dshTup_colSession .dshTup_thBtn,.dshTup_colSession .dshTup_thStatic{justify-content:flex-start}",
			".dshTup_sortGlyph{flex:none;opacity:.85}",
			// Fixed layout makes the browser honour the colgroup widths exactly, which is
			// what a drag must do; `th` is already position:sticky, so it is the containing
			// block for the absolutely positioned handle below.
			".dshTup_table{table-layout:fixed}",
			".dshTup_resizeHandle{position:absolute;top:0;right:-3px;width:7px;height:100%;cursor:col-resize;touch-action:none}",
			".dshTup_resizeHandle:hover{background:var(--dsw-alias-border-l2)}",
			".dshTup_table td{box-sizing:border-box;height:var(--dsh-tup-row-h);padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1);text-align:right;vertical-align:middle;font-variant-numeric:tabular-nums;white-space:nowrap}",
			".dshTup_spacer td{height:auto;padding:0;border:0;background:transparent}",
			"@keyframes dshTup-rowIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}",
			// Rows land as a wave: each row carries its page index as `--dsh-tup-i` (see
			// `70-table.js`), so paging reads as a sweep rather than a jump. Spacers are
			// excluded — they have no content to reveal.
			".dshTup_root[data-animate=true] .dshTup_table tbody tr[data-row]{animation:dshTup-rowIn var(--dsh-tup-base) var(--dsh-tup-settle) both;animation-delay:calc(var(--dsh-tup-i,0) * var(--dsh-tup-stagger))}",
			".dshTup_table tbody tr[data-row]{transition:background var(--dsh-tup-fast) var(--dsh-tup-ease),box-shadow var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_table tbody tr[data-row]:last-child td{border-bottom:none}",
			".dshTup_row{cursor:pointer}",
			".dshTup_row:hover{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}",
			".dshTup_row:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
			".dshTup_rowCurrent{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshTup_cellMain{display:flex;flex-direction:column;gap:2px;min-width:0;overflow:hidden}",
			".dshTup_rowTitle{display:flex;align-items:center;gap:6px;min-width:0}",
			".dshTup_rowTitleText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_rowMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_share{display:flex;align-items:center;gap:8px;justify-content:flex-end}",
			".dshTup_shareTrack{width:56px;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);overflow:hidden;flex:none}",
			".dshTup_shareFill{height:100%;background:var(--dsw-alias-brand-primary);border-radius:999px}",
			".dshTup_root[data-animate=true] .dshTup_shareFill{transform-origin:left center;animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both;transition:width var(--dsh-tup-base) var(--dsh-tup-ease)}",
			".dshTup_shareNum{min-width:42px;text-align:right;color:var(--dsw-alias-label-secondary);font-size:12px}",
			".dshTup_muted{color:var(--dsw-alias-label-tertiary)}",
			".dshTup_retry{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:var(--dsw-alias-state-warn-primary);font:inherit;font-size:11px;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}",
			//#endregion
		
			//#region empty, skeleton, footer
			".dshTup_empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:200px;padding:28px 16px;text-align:center;color:var(--dsw-alias-label-secondary)}",
			".dshTup_emptyIcon{color:var(--dsw-alias-label-dimmed)}",
			"@keyframes dshTup-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}",
			".dshTup_skelRow{display:flex;align-items:center;gap:16px;padding:0 14px;height:var(--dsh-tup-row-h);border-bottom:.5px solid var(--dsw-alias-border-l1)}",
			".dshTup_skel{position:relative;height:10px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;flex:none}",
			".dshTup_skel::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--dsw-alias-interactive-bg-hover),transparent);animation:dshTup-shimmer 1.4s linear infinite}",
			".dshTup_skelGrow{flex:1 1 auto;min-width:0;max-width:280px}",
			// margin-top (not padding-top) so the seam above the footer is the same 12px
			// every other band-to-band gap uses.
			".dshTup_foot{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin-top:12px;padding:0 20px 14px;color:var(--dsw-alias-label-tertiary);font-size:12px}",
			// Visually hidden but still announced: clipped rather than `display:none`, which
			// would remove the live region from the accessibility tree entirely.
			".dshTup_live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}",
			".dshTup_footSpacer{flex:1 1 0;min-width:0}",
			".dshTup_pagination{display:inline-flex;align-items:center;gap:6px}",
			".dshTup_notice{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-state-warn-primary)}",
			//#endregion
		
			//#region responsive columns
			// A hidden column must stop reserving a track. The cells are `display:none`, but
			// under `table-layout:fixed` the browser sizes columns from the colgroup, so the
			// `<col>` has to be dropped too — otherwise the "hidden" columns still add up to
			// more than the container and the table grows the forbidden horizontal scrollbar.
			"@container (max-width: 900px){.dshTup_hideBelow{display:none}.dshTup_colHideBelow{display:none}}",
			"@container (max-width: 640px){.dshTup_hideBelow2{display:none}.dshTup_colHideBelow2{display:none}}",
			//#endregion
		
			//#region light-theme contrast
			// The theme's light palette is tuned for large chrome surfaces, but this panel
			// renders a lot of 9-12px text on the same white, and four of the aliases fall
			// below WCAG AA there: label-tertiary 3.71:1, warn 2.15:1, success 2.28:1,
			// business 4.23:1. The theme itself is not ours to change, so the aliases are
			// remapped inside this panel only. Light is the default theme and dark is opted
			// into with `body[data-ds-dark-theme]`, so `body:not([data-ds-dark-theme])`
			// scopes these to light without touching dark.
			"body:not([data-ds-dark-theme]) .dshTup_root{--dsw-alias-label-tertiary:#61666b;--dsw-alias-state-warn-primary:#b45309;--dsw-alias-state-success-primary:#15803d;--dsw-alias-state-business-primary:#2563eb}",
			// The chart palette follows the same split. The defaults below are the original
			// mid-saturation hexes, tuned for the dark surface; the light block deepens each
			// hue to clear 3:1 against white, since these paint thin strokes, small donut
			// arcs and heatmap cells rather than large fills.
			":root{--dsh-tup-c1:#5b9dff;--dsh-tup-c2:#4ecb71;--dsh-tup-c3:#b98cff;--dsh-tup-c4:#ff6b6b;--dsh-tup-c5:#ffab4d;--dsh-tup-c6:#39c7c7;--dsh-tup-c7:#ff8ad4;--dsh-tup-c8:#9aa7b8;--dsh-tup-other:#8b93a1;--dsh-tup-heat:#5b9dff}",
			"body:not([data-ds-dark-theme]){--dsh-tup-c1:#2563eb;--dsh-tup-c2:#15803d;--dsh-tup-c3:#7c3aed;--dsh-tup-c4:#dc2626;--dsh-tup-c5:#b45309;--dsh-tup-c6:#0f766e;--dsh-tup-c7:#be185d;--dsh-tup-c8:#475569;--dsh-tup-other:#64748b;--dsh-tup-heat:#2563eb}",
			//#endregion
		
			"@media (prefers-reduced-motion:reduce){.dshTup_root{animation:none}.dshTup_root *,.dshTup_root *::before,.dshTup_root *::after{transition:none!important;animation:none!important}}",
		].join("");
		const cssTagId = "dsh-token-usage-panel/panel.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-token-usage-panel";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"panel": "Token 用量",
			"title": "Token 用量统计",
			"subtitle": "按会话与模型聚合的输入、缓存与输出 token",
			"view.overview": "概览",
			"view.sessions": "会话",
			"refresh": "刷新",
			"refreshing": "读取中",
			"loading": "正在读取会话投影…",
			"loadMore": "读取其余 {n} 个会话",
			"audit": "{n} 个会话的模型用量与总量不一致",
			"audit.row": "{title}：模型合计 {route}，总量 {usage}",
			"unit.tokens": "token",
			"search": "搜索会话",
			"searchPlaceholder": "标题、会话 ID 或目录",
			"range": "时间范围",
			"range.all": "全部",
			"range.today": "今天",
			"range.7d": "7 天",
			"range.30d": "30 天",
			"directory": "目录",
			"directory.all": "全部目录",
			"sort": "排序",
			"sort.total": "总量",
			"sort.input": "未缓存输入",
			"sort.cacheRead": "缓存读取",
			"sort.cacheWrite": "缓存写入",
			"sort.output": "输出",
			"sort.title": "标题",
			"sort.recent": "最近活动",
			"sort.desc": "降序",
			"sort.asc": "升序",
			"sort.by": "按 {key} {direction}",
			"direction.desc": "降序",
			"direction.asc": "升序",
			"filter.topLevel": "仅顶层会话",
			"filter.used": "仅显示有用量的会话",
			"filter.model": "模型",
			"filter.day": "某一天",
			"filter.clearDay": "清除日期筛选",
			"activity.filterDay": "只看 {day} 的会话",
			"resize.handle": "拖动以调整「{column}」列宽",
			"reset": "重置筛选",
			"export": "导出",
			"export.copy": "复制 TSV",
			"export.download": "下载 CSV",
			"export.copied": "已复制",
			"card.total": "总消耗",
			"card.input": "输入",
			"card.output": "输出",
			"card.sessions": "会话",
			"card.sessionsHint": "{matched} / {total} 个会话",
			"clean": "筛选后总量",
			"allTime": "全部会话合计",
			"models.title": "模型用量",
			"models.total": "合计",
			"models.group": "分组方式",
			"models.group.provider": "按网关",
			"models.group.model": "按模型",
			"models.other": "其他模型",
			"models.summary": "{models} 个模型，共 {total} token",
			"models.openSessions": "只看使用该模型的会话",
			"activity.title": "Token 活动",
			"activity.summary": "共 {total} token，{days} 天有活动",
			"activity.weekday0": "一",
			"activity.weekday1": "三",
			"activity.weekday2": "五",
			"trend.title": "每日 Token 趋势",
			"trend.summary": "{series} 个模型，{days} 天",
			"kpi.total": "累计 Token 数",
			"kpi.peak": "峰值 Token 数",
			"kpi.current": "当前连续天数",
			"kpi.longestRun": "最长连续天数",
			"kpi.days": "{n} 天",
			"chart.empty": "还没有按天数据",
			"chart.emptyHint": "按天用量来自本插件的 Host 半场（tokenUsageByDay），重启 DSH 后开始累积。",
			"composition": "用量构成",
			"segment.input": "未缓存输入",
			"segment.cacheRead": "缓存读取",
			"segment.cacheWrite": "缓存写入",
			"segment.output": "输出",
			"col.session": "会话",
			"col.total": "总量",
			"col.share": "占比",
			"col.input": "未缓存输入",
			"col.cacheRead": "缓存读取",
			"col.cacheWrite": "缓存写入",
			"col.output": "输出",
			"col.updated": "最近活动",
			"col.turns": "轮次",
			"badge.subagent": "子会话",
			"badge.current": "当前",
			"empty": "没有匹配的会话",
			"emptyHint": "换个筛选条件，或先进行一段对话产生用量。",
			"emptyAction": "新建会话",
			"missing": "未取到用量数据",
			"pending": "{n} 个会话暂无用量数据",
			"retry": "重试",
			"retryHint": "重新读取该会话的用量",
			"openFailed": "无法打开该会话",
			"copyFailed": "复制失败",
			"startFailed": "无法新建会话",
			"loaded": "用量读取完成",
			"zero": "暂无用量",
			"unknownTitle": "未命名会话",
			"open": "打开会话 {title}",
			"jumpToCurrent": "跳到当前会话",
			"never": "—",
			"window": "显示 {start}–{end} / {total} 行",
			"page.previous": "上一页",
			"page.next": "下一页",
			"page.status": "第 {page} / {pages} 页",
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"panel": "Token usage",
			"title": "Token usage",
			"subtitle": "Input, cache, and output tokens aggregated per session and per model",
			"view.overview": "Overview",
			"view.sessions": "Sessions",
			"refresh": "Refresh",
			"refreshing": "Loading",
			"loading": "Reading session projections…",
			"loadMore": "Read the remaining {n} sessions",
			"audit": "{n} session(s) where the model breakdown disagrees with the total",
			"audit.row": "{title}: model sum {route}, total {usage}",
			"unit.tokens": "tokens",
			"search": "Search sessions",
			"searchPlaceholder": "Title, session id, or directory",
			"range": "Range",
			"range.all": "All",
			"range.today": "Today",
			"range.7d": "7 days",
			"range.30d": "30 days",
			"directory": "Directory",
			"directory.all": "All directories",
			"sort": "Sort",
			"sort.total": "Total",
			"sort.input": "Uncached input",
			"sort.cacheRead": "Cache read",
			"sort.cacheWrite": "Cache write",
			"sort.output": "Output",
			"sort.title": "Title",
			"sort.recent": "Recent activity",
			"sort.desc": "Descending",
			"sort.asc": "Ascending",
			"sort.by": "By {key}, {direction}",
			"direction.desc": "descending",
			"direction.asc": "ascending",
			"filter.topLevel": "Top-level only",
			"filter.used": "Only sessions with usage",
			"filter.model": "Model",
			"filter.day": "One day",
			"filter.clearDay": "Clear the day filter",
			"activity.filterDay": "Show only the sessions on {day}",
			"resize.handle": "Drag to resize the {column} column",
			"reset": "Reset filters",
			"export": "Export",
			"export.copy": "Copy TSV",
			"export.download": "Download CSV",
			"export.copied": "Copied",
			"card.total": "Total",
			"card.input": "Input",
			"card.output": "Output",
			"card.sessions": "Sessions",
			"card.sessionsHint": "{matched} / {total} sessions",
			"clean": "Filtered total",
			"allTime": "All sessions",
			"models.title": "Model usage",
			"models.total": "Total",
			"models.group": "Group by",
			"models.group.provider": "Gateway",
			"models.group.model": "Model",
			"models.other": "Other models",
			"models.summary": "{models} models, {total} tokens",
			"models.openSessions": "Show only the sessions using this model",
			"activity.title": "Token activity",
			"activity.summary": "{total} tokens in total across {days} active days",
			"activity.weekday0": "Mon",
			"activity.weekday1": "Wed",
			"activity.weekday2": "Fri",
			"trend.title": "Daily token trend",
			"trend.summary": "{series} models over {days} days",
			"kpi.total": "Total tokens",
			"kpi.peak": "Peak tokens",
			"kpi.current": "Current streak",
			"kpi.longestRun": "Longest streak",
			"kpi.days": "{n} days",
			"chart.empty": "No per-day data yet",
			"chart.emptyHint": "Daily usage comes from this plugin's Host half (tokenUsageByDay) and starts accumulating after a DSH restart.",
			"composition": "Composition",
			"segment.input": "Uncached input",
			"segment.cacheRead": "Cache read",
			"segment.cacheWrite": "Cache write",
			"segment.output": "Output",
			"col.session": "Session",
			"col.total": "Total",
			"col.share": "Share",
			"col.input": "Uncached input",
			"col.cacheRead": "Cache read",
			"col.cacheWrite": "Cache write",
			"col.output": "Output",
			"col.updated": "Last activity",
			"col.turns": "Turns",
			"badge.subagent": "Subagent",
			"badge.current": "Current",
			"empty": "No session matches",
			"emptyHint": "Change the filters, or have a conversation first so usage exists.",
			"emptyAction": "New session",
			"missing": "usage unavailable",
			"pending": "{n} session(s) have no usage data",
			"retry": "Retry",
			"retryHint": "Read this session's usage again",
			"openFailed": "Could not open that session",
			"copyFailed": "Copy failed",
			"startFailed": "Could not start a session",
			"loaded": "Usage loaded",
			"zero": "no usage yet",
			"unknownTitle": "Untitled session",
			"open": "Open session {title}",
			"jumpToCurrent": "Jump to the current session",
			"never": "—",
			"window": "Showing {start}–{end} / {total} rows",
			"page.previous": "Previous page",
			"page.next": "Next page",
			"page.status": "Page {page} / {pages}",
		};

		//#region count-up
		/**
		 * Animate a headline integer toward its value, but only when the change came
		 * from the user.
		 *
		 * Live data ticks must not restart this: a session streams once per frame, so an
		 * always-animating counter would never settle and would read as jitter. While
		 * `animate` is false the raw value is returned straight through, so live numbers
		 * stay exact.
		 *
		 * @param value - the target integer.
		 * @param animate - whether this change may animate.
		 * @returns the value to render.
		 */
		function useCountUp(value, animate) {
			const [display, setDisplay] = react.useState(value);
			const fromRef = react.useRef(value);
			const frameRef = react.useRef(0);
			react.useEffect(() => {
				const from = fromRef.current;
				fromRef.current = value;
				const reduced =
					typeof window !== "undefined" &&
					typeof window.matchMedia === "function" &&
					window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				if (!animate || from === value || reduced || typeof requestAnimationFrame !== "function") {
					setDisplay(value);
					return undefined;
				}
				const started = (typeof performance !== "undefined" ? performance.now() : Date.now());
				const step = () => {
					const now = typeof performance !== "undefined" ? performance.now() : Date.now();
					const progress = Math.min(1, (now - started) / 240);
					const eased = 1 - Math.pow(1 - progress, 3);
					setDisplay(Math.round(from + (value - from) * eased));
					if (progress < 1) frameRef.current = requestAnimationFrame(step);
				};
				frameRef.current = requestAnimationFrame(step);
				return () => cancelAnimationFrame(frameRef.current);
			}, [value, animate]);
			return animate ? display : value;
		}
		//#endregion
		
		//#region atoms
		/** Sidebar row glyph, matching the shipped global-panel entries' convention. */
		function TokenUsageIcon({ size }) {
			return h(IconDatabaseOutlineRegular, { size });
		}
		
		/** One labelled figure in the summary grid. */
		function Stat({ label, value }) {
			return h("div", { className: "dshTup_stat" }, [
				h("dt", { key: "l" }, label),
				h("dd", { key: "v" }, value),
			]);
		}
		
		/**
		 * Headline totals plus the stacked composition bar over the filtered set.
		 * @param props - summed usage, counts, the user-change flag, and translate seat.
		 * @returns the summary band.
		 */
		function Summary({ totals, filteredTotal, matched, total, grandTotal, filteredOut, animate, t }) {
			const shown = useCountUp(filteredTotal, animate);
			const parts = SEGMENTS.map((segment) => ({ ...segment, value: totals[segment.key] }));
			const visible = parts.filter((part) => part.value > 0);
			const label = t("composition") + ": " + formatInt(filteredTotal);
			return h("section", { className: "dshTup_summary" }, [
				h("div", { key: "head", className: "dshTup_sumHead" }, [
					h("span", { key: "l", className: "dshTup_sumLabel" }, filteredOut ? t("clean") : t("card.total")),
					h("span", { key: "v", className: "dshTup_sumValue" }, formatInt(shown)),
					h(
						"span",
						{ key: "h", className: "dshTup_sumHint" },
						t("card.sessionsHint", { matched, total }) + (filteredTotal >= 10000 ? " · " + formatCompact(filteredTotal) : ""),
					),
				]),
				h("div", { key: "bar", className: "dshTup_sumBar" }, [
					h(
						"div",
						{ key: "track", className: "dshTup_bar", role: "img", "aria-label": label },
						visible.length === 0
							? []
							: visible.map((part) =>
									h("div", {
										key: part.key,
										className: "dshTup_barSeg",
										style: { width: (part.value / filteredTotal) * 100 + "%", background: part.color },
										title: t(part.labelKey) + ": " + formatInt(part.value),
									}),
								),
					),
					h(
						"div",
						{ key: "legend", className: "dshTup_legend" },
						parts.map((part) =>
							h("span", { key: part.key, className: "dshTup_legendItem" }, [
								h("span", { key: "dot", className: "dshTup_dot", style: { background: part.color }, "aria-hidden": "true" }),
								h("span", { key: "label" }, t(part.labelKey)),
								h("span", { key: "num", className: "dshTup_legendNum" }, formatInt(part.value)),
							]),
						),
					),
				]),
				h("dl", { key: "stats", className: "dshTup_stats" }, [
					h(Stat, { key: "input", label: t("card.input"), value: formatInt(billedInput(totals)) }),
					h(Stat, { key: "output", label: t("card.output"), value: formatInt(totals.outputTokens) }),
					h(Stat, { key: "cacheRead", label: t("segment.cacheRead"), value: formatInt(totals.cacheReadTokens) }),
					h(Stat, { key: "cacheWrite", label: t("segment.cacheWrite"), value: formatInt(totals.cacheWriteTokens) }),
				]),
				filteredOut && grandTotal !== filteredTotal
					? h("div", { key: "grand", className: "dshTup_grand" }, [
							t("allTime"),
							h("span", { key: "v", className: "dshTup_grandNum" }, formatInt(grandTotal)),
						])
					: null,
			]);
		}
		
		/**
		 * A `Menu` dropdown anchored to an outline button.
		 * @param props - trigger presentation, options, current value, and change handler.
		 * @returns the anchored dropdown.
		 */
		function MenuSelect({ icon, label, value, options, onChange, open, setOpen, triggerText, className, selectedIds }) {
			// The directory options identify themselves with `id` (the `Menu` items), so
			// the trigger must accept either key: matching only `value` left the trigger
			// permanently showing the generic label, i.e. the active directory invisible.
			const current = options.find((option) => (option.value ?? option.id) === value);
			return h(Menu, {
				open,
				className: cx("dshTup_menu", className),
				items: options,
				selectedId: value,
				selectedIds,
				onSelect: (next) => {
					onChange(next);
					setOpen(false);
				},
				onClose: () => setOpen(false),
				portal: true,
				anchor: h(
					Button,
					{
						variant: "outline",
						className: "dshTup_trigger",
						icon,
						"aria-label": label,
						"aria-haspopup": "menu",
						"aria-expanded": open,
						onClick: () => setOpen((previous) => !previous),
					},
					[
						h("span", { key: "l", className: "dshTup_triggerLabel" }, triggerText ?? (current === undefined ? label : current.label)),
						h(IconChevronDownOutlineRegular, { key: "c", size: 14, className: cx("dshTup_chevron", open && "dshTup_chevronOpen") }),
					],
				),
			});
		}
		
		/**
		 * The sort menu: one row per measure, then the direction pair.
		 * @param props - current sort, its setter, and the open state.
		 * @returns the anchored sort menu.
		 */
		function SortMenu({ filters, setFilters, open, setOpen, t }) {
			const items = SORT_KEYS.map((key) => ({ id: "key:" + key, label: t("sort." + key) }));
			items.push({ id: "sep:dir", type: "separator" });
			items.push({ id: "dir:desc", label: t("sort.desc") });
			items.push({ id: "dir:asc", label: t("sort.asc") });
			const direction = filters.sortDesc ? t("direction.desc") : t("direction.asc");
			return h(Menu, {
				open,
				className: "dshTup_menu",
				items,
				selectedId: "key:" + filters.sortKey,
				selectedIds: [filters.sortDesc ? "dir:desc" : "dir:asc"],
				onSelect: (id) => {
					if (id.startsWith("key:")) {
						const key = id.slice(4);
						// A measure reads best largest-first; a title reads best A to Z.
						setFilters((previous) => ({ ...previous, sortKey: key, sortDesc: key !== "title" }));
					} else if (id === "dir:desc") {
						setFilters((previous) => ({ ...previous, sortDesc: true }));
					} else if (id === "dir:asc") {
						setFilters((previous) => ({ ...previous, sortDesc: false }));
					}
					setOpen(false);
				},
				onClose: () => setOpen(false),
				portal: true,
				anchor: h(
					Button,
					{
						variant: "outline",
						className: "dshTup_trigger",
						icon: h(IconFlatListOutlineRegular, { size: 14 }),
						"aria-label": t("sort.by", { key: t("sort." + filters.sortKey), direction }),
						"aria-haspopup": "menu",
						"aria-expanded": open,
						onClick: () => setOpen((previous) => !previous),
					},
					[
						h("span", { key: "l", className: "dshTup_triggerLabel" }, t("sort." + filters.sortKey) + " " + (filters.sortDesc ? "↓" : "↑")),
						h(IconChevronDownOutlineRegular, { key: "c", size: 14, className: cx("dshTup_chevron", open && "dshTup_chevronOpen") }),
					],
				),
			});
		}
		
		/**
		 * The export menu: copy the current view as TSV, or download it as CSV.
		 * @param props - export handlers, the copied flag, and the open state.
		 * @returns the anchored export menu.
		 */
		function ExportMenu({ onCopy, onDownload, copied, open, setOpen, disabled, t }) {
			return h(Menu, {
				open,
				className: "dshTup_menu",
				items: [
					{ id: "copy", label: t("export.copy") },
					{ id: "download", label: t("export.download") },
				],
				onSelect: (id) => {
					if (id === "copy") onCopy();
					else onDownload();
					setOpen(false);
				},
				onClose: () => setOpen(false),
				portal: true,
				anchor: h(
					Button,
					{
						variant: "outline",
						className: "dshTup_trigger",
						icon: h(IconDownloadOutlineRegular, { size: 14 }),
						disabled,
						"aria-label": t("export"),
						"aria-haspopup": "menu",
						"aria-expanded": open,
						onClick: () => setOpen((previous) => !previous),
					},
					[
						h("span", { key: "l", className: "dshTup_triggerLabel" }, copied ? t("export.copied") : t("export")),
						h(IconChevronDownOutlineRegular, { key: "c", size: 14, className: cx("dshTup_chevron", open && "dshTup_chevronOpen") }),
					],
				),
			});
		}
		
		/** One row of filter controls; the band stacks two of them. */
		function FilterRow({ children }) {
			return h("div", { className: "dshTup_filterRow" }, children);
		}
		
		/**
		 * The filter band: identity and ordering on the first row, scoping and
		 * presentation on the second.
		 * @param props - filters, setters, directories, export handlers, and counts.
		 * @returns the filter band.
		 */
		function FilterBar({ filters, setFilters, directories, searchRef, exportProps, onJumpToCurrent, hasCurrent, modelLabel, dayOffsetMinutes, t }) {
			const [openMenu, setOpenMenu] = react.useState(null);
			const openFor = (id) => ({
				open: openMenu === id,
				setOpen: (next) => setOpenMenu(next ? id : null),
			});
			return h("div", { className: "dshTup_filters" }, [
				h(FilterRow, { key: "primary" }, [
					h(Input, {
						key: "search",
						ref: searchRef,
						className: "dshTup_search",
						type: "search",
						icon: h(IconSearchOutlineRegular, { size: 14 }),
						value: filters.query,
						placeholder: t("searchPlaceholder"),
						"aria-label": t("search"),
						onChange: (event) => setFilters((previous) => ({ ...previous, query: event.target.value })),
					}),
					directories.length > 1
						? h(MenuSelect, {
								key: "cwd",
								icon: h(IconFolderOpenOutlineRegular, { size: 14 }),
								label: t("directory"),
								value: filters.cwd,
								options: [{ id: "", label: t("directory.all") }].concat(
									directories.map((entry) => ({ id: entry.path, label: entry.label })),
								),
								onChange: (next) => setFilters((previous) => ({ ...previous, cwd: next })),
								...openFor("cwd"),
							})
						: null,
					h(SortMenu, { key: "sort", filters, setFilters, ...openFor("sort"), t }),
					h(ExportMenu, { key: "export", ...exportProps, ...openFor("export"), t }),
					filters.model === ""
						? null
						: h(
								Button,
								{
									key: "model",
									variant: "toolbar",
									size: "sm",
									icon: h(IconCloseOutlineRegular, { size: 12 }),
									title: t("models.openSessions"),
									onClick: () => setFilters((previous) => ({ ...previous, model: "" })),
								},
								t("filter.model") + ": " + modelLabel,
							),
					filters.day === null
						? null
						: h(
								Button,
								{
									key: "day",
									variant: "toolbar",
									size: "sm",
									icon: h(IconCloseOutlineRegular, { size: 12 }),
									title: t("filter.clearDay"),
									onClick: () => setFilters((previous) => ({ ...previous, day: null })),
								},
								t("filter.day") + ": " + formatDayIso(filters.day, dayOffsetMinutes),
							),
					h("span", { key: "spacer", className: "dshTup_filterSpacer" }),
					h(
						Button,
						{
							key: "reset",
							variant: "ghost",
							icon: h(IconSlidersTwoOutlineRegular, { size: 14 }),
							disabled: !isFiltered(filters),
							onClick: () => setFilters((previous) => resetFilters(previous)),
						},
						t("reset"),
					),
				]),
				h(FilterRow, { key: "secondary" }, [
					h(SegmentedControl, {
						key: "range",
						id: "dsh-tup-range",
						label: t("range"),
						value: filters.range,
						options: RANGES.map((value) => ({ value, label: t("range." + value) })),
						onChange: (next) => setFilters((previous) => ({ ...previous, range: next })),
					}),
					h(Checkbox, {
						key: "topLevel",
						checked: filters.topLevelOnly,
						label: t("filter.topLevel"),
						onChange: (next) => setFilters((previous) => ({ ...previous, topLevelOnly: next })),
					}),
					h(Checkbox, {
						key: "used",
						checked: filters.usedOnly,
						label: t("filter.used"),
						onChange: (next) => setFilters((previous) => ({ ...previous, usedOnly: next })),
					}),
					hasCurrent
						? h(
								Button,
								{ key: "current", variant: "ghost", size: "sm", onClick: onJumpToCurrent },
								t("jumpToCurrent"),
							)
						: null,
				]),
			]);
		}
		
		/**
		 * One sortable or static header cell, plus its column-resize handle.
		 *
		 * The handle is a `separator` with `tabIndex: -1`: a pointer affordance, never a
		 * keyboard stop. Resizing by keyboard would need arrow-key semantics and a live
		 * announcement of the resulting width, and the panel's keyboard budget is spent on
		 * the controls that change what the table shows, not on how wide it is.
		 *
		 * @param props - column, current sort, the sort setter, and the resize handler.
		 * @returns the header cell.
		 */
		function HeaderCell({ column, filters, onSort, onResize, t }) {
			const active = column.sortKey !== undefined && filters.sortKey === column.sortKey;
			const ariaSort = column.sortKey === undefined ? undefined : active ? (filters.sortDesc ? "descending" : "ascending") : "none";
			const glyph = active
				? h(IconChevronDownOutlineRegular, {
						size: 12,
						className: cx("dshTup_sortGlyph", !filters.sortDesc && "dshTup_chevronOpen"),
					})
				: null;
			/** The sort action's description, shared by the tooltip and the accessible name. */
			const sortLabel =
				column.sortKey === undefined
					? undefined
					: t("sort.by", {
							key: t("sort." + column.sortKey),
							direction: active && filters.sortDesc ? t("direction.asc") : t("direction.desc"),
						});
			return h(
				"th",
				{
					scope: "col",
					className: cx(column.className, column.hideClass),
					"aria-sort": ariaSort,
				},
				[
					column.sortKey === undefined
						? h("span", { key: "label", className: "dshTup_thStatic" }, t(column.labelKey))
						: h(
								"button",
								{
									key: "label",
									type: "button",
									className: "dshTup_thBtn",
									// Not a tab stop: the panel's keyboard path to sorting is the
									// filter bar's SortMenu, which also carries the direction pair.
									// Seven header stops to cross before reaching the table is a
									// keyboard tax for a control that duplicates it.
									tabIndex: -1,
									"aria-label": sortLabel,
									onClick: () => onSort(column.sortKey),
									title: sortLabel,
								},
								[t(column.labelKey), glyph === null ? null : h("span", { key: "g" }, glyph)],
							),
					onResize === undefined
						? null
						: h("span", {
								key: "rz",
								className: "dshTup_resizeHandle",
								"data-column": column.key,
								role: "separator",
								"aria-orientation": "vertical",
								"aria-label": t("resize.handle", { column: t(column.labelKey) }),
								tabIndex: -1,
								onPointerDown: (event) => {
									if (event.currentTarget !== null && event.currentTarget !== undefined && typeof event.currentTarget.setPointerCapture === "function") {
										event.currentTarget.setPointerCapture(event.pointerId);
									}
									onResize(column.key, event.clientX, "start");
								},
								onPointerMove: (event) => onResize(column.key, event.clientX, "move"),
								onPointerUp: (event) => onResize(column.key, event.clientX, "end"),
								// A cancelled pointer (browser gesture, touch interruption) never
								// fires pointerup; without this the drag record survives and the
								// next button-less hover would keep resizing the column.
								onPointerCancel: (event) => onResize(column.key, event.clientX, "end"),
							}),
				],
			);
		}
		
		/**
		 * The per-model breakdown for the filtered sessions.
		 *
		 * It sits outside the table because it answers a different question: the table is
		 * per session, this is per model over the same filtered set. Each row reads
		 * `gateway · model`, both names resolved by the Host from the LLM registry — the
		 * browser never re-derives either — and clicking a row narrows the sessions to
		 * that model, which is the whole point of seeing the split.
		 *
		 * Two readings of the same data. Flat, one chip per route, which is what the
		 * numbers are keyed on. Or grouped by gateway, which is what a reader wants once
		 * several gateways serve overlapping model names: the group header answers "who
		 * is spending", the chips inside it answer "on what". Grouping is a view over the
		 * same routes, never a re-aggregation — the fold invariants are about the
		 * projections, not about this list.
		 *
		 * @param props - the merged breakdown, a select handler, and the translate seat.
		 * @returns the band, or null when no row carries model data.
		 */
		function ModelBreakdown({ breakdown, onSelect, t }) {
			// The hook is called before the early return so the unit count never depends
			// on whether the breakdown has data yet.
			const [grouping, setGrouping] = react.useState("provider");
			if (breakdown === undefined) return null;
			const total = breakdown.routes.reduce((sum, route) => sum + totalOf(route.tokens), 0);
			const shareOf = (value) => (total > 0 ? (value / total) * 100 : 0).toFixed(1) + "%";
			const chip = (route) =>
				h(
					"li",
					{ key: routeIdOf(route), className: "dshTup_routeItem" },
					h(
						"button",
						{
							type: "button",
							className: "dshTup_routeButton",
							title: t("models.openSessions"),
							onClick: () => onSelect(routeIdOf(route)),
						},
						[
							h("span", { key: "dot", className: "dshTup_dot", style: { background: routeColor(routeIdOf(route)) } }),
							h("span", { key: "v", className: "dshTup_providerTag" }, route.providerName),
							h("span", { key: "m", className: "dshTup_routeModel" }, route.modelName),
							h("span", { key: "n", className: "dshTup_routeTokens" }, formatCompact(totalOf(route.tokens))),
							h("span", { key: "p", className: "dshTup_routeShare" }, shareOf(totalOf(route.tokens))),
						],
					),
				);
			const groups = [];
			if (grouping === "provider") {
				const byProvider = new Map();
				for (const route of breakdown.routes) {
					let group = byProvider.get(route.provider);
					if (group === undefined) {
						group = { provider: route.provider, providerName: route.providerName, value: 0, routes: [] };
						byProvider.set(route.provider, group);
					}
					group.value += totalOf(route.tokens);
					group.routes.push(route);
				}
				groups.push(...byProvider.values());
				// The routes arrive sorted by size, so each group's members already are;
				// only the groups themselves need ordering.
				groups.sort((left, right) => right.value - left.value || left.provider.localeCompare(right.provider));
			}
			return h("section", { className: "dshTup_routes" }, [
				h("div", { key: "head", className: "dshTup_routeHead" }, [
					h("span", { key: "l", className: "dshTup_sumLabel" }, t("models.title")),
					h(SegmentedControl, {
						key: "grouping",
						id: "dsh-tup-model-grouping",
						label: t("models.group"),
						value: grouping,
						options: [
							{ value: "provider", label: t("models.group.provider") },
							{ value: "model", label: t("models.group.model") },
						],
						onChange: setGrouping,
					}),
					h("span", { key: "c", className: "dshTup_routeMoney" }, t("models.total") + " " + formatInt(total) + " " + t("unit.tokens")),
				]),
				grouping === "model"
					? h("ul", { key: "list", className: "dshTup_routeList" }, breakdown.routes.map(chip))
					: h(
							"ul",
							{ key: "groups", className: "dshTup_routeGroups" },
							groups.map((group) =>
								h("li", { key: group.provider, className: "dshTup_routeGroup" }, [
									h("div", { key: "h", className: "dshTup_routeGroupHead" }, [
										h("span", { key: "n", className: "dshTup_routeGroupName" }, group.providerName),
										h("span", { key: "t", className: "dshTup_routeTokens" }, formatCompact(group.value)),
										h("span", { key: "p", className: "dshTup_routeShare" }, shareOf(group.value)),
									]),
									h("ul", { key: "m", className: "dshTup_routeList" }, group.routes.map(chip)),
								]),
							),
						),
			]);
		}
		//#endregion

		/**
		 * Hand-written SVG charts.
		 *
		 * No chart library: the shell's frozen module table carries React, Cordis, the
		 * client store/slots and `ui-primitives` — no charting package — and adding one
		 * would mean a pnpm install into the profile plus a bundle many times this size.
		 * Everything here is a few hundred bytes of geometry instead.
		 *
		 * Two conventions:
		 *   - Charts are `role="img"` with an `aria-label` summarising the data, and the
		 *     same numbers are always available as text (the table, the legend, the KPI
		 *     strip), so no figure exists only inside a picture.
		 *   - Hover state lives inside the chart component, so moving the pointer never
		 *     re-renders the panel around it.
		 */
		//#region shared
		/** The number of series drawn before the rest are merged into "other". */
		const TREND_SERIES_LIMIT = 5;
		/** Neutral colour for the merged "other" series, outside the route palette. */
		const OTHER_COLOR = "var(--dsh-tup-other)";
		
		/**
		 * A stable colour for one route, so the same model keeps its colour across the
		 * donut, the trend, and the legend without any stored mapping.
		 * @param routeId - `provider/model`.
		 * @returns a palette colour.
		 */
		function routeColor(routeId) {
			let hash = 0;
			for (let index = 0; index < routeId.length; index += 1) hash = (hash * 31 + routeId.charCodeAt(index)) >>> 0;
			return MODEL_COLORS[hash % MODEL_COLORS.length];
		}
		
		/** A grid of labelled figures across the top of the overview. */
		function KpiStrip({ items }) {
			return h(
				"section",
				{ className: "dshTup_kpi", role: "group" },
				items.map((item) =>
					h("div", { key: item.key, className: "dshTup_kpiItem" }, [
						h("span", { key: "v", className: "dshTup_kpiValue" }, item.value),
						h("span", { key: "l", className: "dshTup_kpiLabel" }, item.label),
					]),
				),
			);
		}
		
		/** One card shell shared by every chart. */
		function ChartCard({ title, extra, children, className }) {
			return h("section", { className: cx("dshTup_card", className) }, [
				h("header", { key: "head", className: "dshTup_cardHead" }, [h("h3", { key: "t", className: "dshTup_cardTitle" }, title), extra ?? null]),
				children,
			]);
		}
		
		/**
		 * Aggregate `{ day → { routeId → row } }` into the series a trend chart draws.
		 * @param byDay - the merged per-day per-model calendars.
		 * @param days - the day indices in the window, ascending.
		 * @param t - translate seat, for the merged series label.
		 * @returns `{ series }` with per-day values and a legend label per series.
		 */
		function trendSeries(byDay, days, t) {
			const totals = new Map();
			for (const day of days) {
				const bucket = byDay.get(day);
				if (bucket === undefined) continue;
				for (const [id, row] of bucket) {
					totals.set(id, (totals.get(id) ?? 0) + totalOf(row.tokens));
				}
			}
			const ranked = [...totals.entries()].sort((left, right) => right[1] - left[1]);
			const kept = ranked.slice(0, TREND_SERIES_LIMIT).map(([id]) => id);
			const series = [];
			for (const id of kept) {
				const label = labelOfRoute(byDay, days, id);
				series.push({ id, label, color: routeColor(id), values: seriesValues(byDay, days, id) });
			}
			if (ranked.length > kept.length) {
				const values = new Map();
				for (const day of days) {
					const bucket = byDay.get(day);
					if (bucket === undefined) continue;
					let total = 0;
					for (const [id, row] of bucket) {
						if (kept.includes(id)) continue;
						total += totalOf(row.tokens);
					}
					if (total > 0) values.set(day, total);
				}
				series.push({ id: "__other__", label: t("models.other"), color: OTHER_COLOR, values });
			}
			return { series };
		}
		
		/** The per-day totals of one route over a window. */
		function seriesValues(byDay, days, id) {
			const values = new Map();
			for (const day of days) {
				const row = byDay.get(day)?.get(id);
				if (row === undefined) continue;
				const total = totalOf(row.tokens);
				if (total > 0) values.set(day, total);
			}
			return values;
		}
		
		/** The display label of one route found anywhere in the window. */
		function labelOfRoute(byDay, days, id) {
			for (const day of days) {
				const row = byDay.get(day)?.get(id);
				if (row !== undefined) return routeLabel(row);
			}
			return id;
		}
		//#endregion
		
		//#region activity heat map
		/** Weekday of a Host day index, with 0 = Sunday (day 0 is a Thursday). */
		function weekdayOf(day) {
			return (((day % 7) + 7 + 4) % 7 + 7) % 7;
		}
		
		/**
		 * The activity grid: one cell per day, coloured by intensity.
		 *
		 * One reading of the calendar — each day on its own — over the last `HEATMAP_WEEKS`
		 * weeks. There is deliberately no aggregation to switch between: "how did the year
		 * go" is the question this card answers.
		 *
		 * @param props - merged calendar, the Host offset, and locale seats.
		 * @returns the card.
		 */
		function ActivityHeatmap({ byDay, offsetMinutes, today, t, extra, onSelectDay }) {
			const weeks = HEATMAP_WEEKS;
			const endWeekday = weekdayOf(today);
			const gridEnd = today + (6 - endWeekday);
			const gridStart = gridEnd - (weeks * 7 - 1);
			/** One entry per cell of the grid; a day the Host never saw counts as zero. */
			const daily = [];
			for (let day = gridStart; day <= gridEnd; day += 1) {
				const tokens = byDay.has(day) ? totalOf(byDay.get(day)) : 0;
				daily.push({ day, tokens, value: tokens });
			}
			let max = 0;
			for (const entry of daily) if (entry.value > max) max = entry.value;
			const total = daily.reduce((sum, entry) => sum + entry.tokens, 0);
			const cell = 12;
			const gap = 3;
			const pitch = cell + gap;
			const left = 26;
			const top = 16;
			const width = left + weeks * pitch;
			const height = top + 7 * pitch + 4;
			/**
			 * One label per month, pinned to the column that holds that month's first day.
			 *
			 * The earlier rule took every day with `getDate() <= 7` and deduped by column,
			 * so a month whose first week straddled two columns was labelled twice and the
			 * two texts overprinted each other ("9月月", "10月月" on the axis). A month has
			 * exactly one first day, and that day alone names the column.
			 */
			const months = [];
			for (let column = 0; column < weeks; column += 1) {
				const start = gridStart + column * 7;
				let stamp = null;
				for (let offset = 0; offset < 7; offset += 1) {
					const day = start + offset;
					if (day > gridEnd) break;
					if (dateOfDay(day, offsetMinutes).getDate() === 1) {
						stamp = day;
						break;
					}
				}
				if (stamp !== null) months.push({ column, label: formatMonthShort(stamp, offsetMinutes) });
			}
			// The grid opens mid-month often enough that the first column deserves its own
			// month name. Only when it sits at least three columns clear of the next label,
			// though: three columns is 45px against a ~28px label, and anything nearer would
			// overprint itself exactly like the bug this replaced.
			if (months.length === 0 || months[0].column >= 3) {
				months.unshift({ column: 0, label: formatMonthShort(gridStart, offsetMinutes) });
			}
			const summary = t("activity.summary", { total: formatCompact(total), days: daily.filter((entry) => entry.tokens > 0).length });
			const selectable = onSelectDay !== undefined && daily.some((entry) => entry.tokens > 0);
			/**
			 * The cells, grouped by week column.
			 *
			 * The entrance wave runs once per group rather than once per cell: 53 staggered
			 * groups paint in the same left-to-right order as 371 staggered rects but cost a
			 * fraction of the compositor work. The digest of the values is part of the group's
			 * key, so a real data change remounts it and replays the wave, while a re-render
			 * that changed nothing does not restart it.
			 */
			const cellsDigest = motionDigest(daily.map((entry) => entry.tokens));
			const columnCells = [];
			for (let index = 0; index < weeks; index += 1) columnCells.push([]);
			for (const entry of daily) {
				const column = Math.floor((entry.day - gridStart) / 7);
				if (column >= 0 && column < weeks) columnCells[column].push(entry);
			}
			return h(
				ChartCard,
				{ title: t("activity.title"), extra, className: "dshTup_chartCard" },
				h("div", { key: "scroll", className: "dshTup_heatmapWrap" }, h(
					"svg",
					{
						key: "grid",
						className: "dshTup_heatmap",
						viewBox: "0 0 " + width + " " + height,
						// `role="img"` would collapse this subtree into a single image node, which
						// prunes the day cells' `role="button"` and names from the accessibility
						// tree — the days stay Tab-reachable but become undiscoverable. When the
						// cells are interactive the SVG is a group instead, and the figure's
						// summary lives in the text paragraph below it; with nothing to select it
						// really is just a picture, and stays announced as one.
						role: selectable ? "group" : "img",
						"aria-label": summary,
					},
					[
						months.map((month) =>
							h(
								"text",
								{ key: "m" + month.column, className: "dshTup_axisLabel", x: left + month.column * pitch, y: 10 },
								month.label,
							),
						),
						["一", "三", "五"].map((_, row) =>
							h("text", { key: "wd" + row, className: "dshTup_axisLabel", x: 0, y: top + (row * 2 + 1) * pitch + cell - 2 }, [t("activity.weekday" + row)]),
						),
						h(
							"g",
							{ key: "cells-" + cellsDigest },
							columnCells.map((cells, column) =>
								h(
									"g",
									{ key: "col" + column, className: "dshTup_heatCol", style: { "--dsh-tup-i": column } },
									cells.map((entry) => {
										const row = weekdayOf(entry.day);
										return h(
											"rect",
											{
												key: entry.day,
												className: "dshTup_cell",
												x: left + column * pitch,
												y: top + row * pitch,
												width: cell,
												height: cell,
												rx: 3,
												fill: heatColor(entry.tokens === 0 ? 0 : entry.value, max),
												role: entry.tokens > 0 && onSelectDay !== undefined ? "button" : undefined,
												tabIndex: entry.tokens > 0 && onSelectDay !== undefined ? 0 : undefined,
												"aria-label":
													entry.tokens > 0 && onSelectDay !== undefined
														? t("activity.filterDay", { day: formatDayIso(entry.day, offsetMinutes) })
														: undefined,
												onClick: entry.tokens > 0 && onSelectDay !== undefined ? () => onSelectDay(entry.day) : undefined,
												onKeyDown:
													entry.tokens > 0 && onSelectDay !== undefined
														? (event) => {
																if (event.key !== "Enter" && event.key !== " ") return;
																event.preventDefault();
																onSelectDay(entry.day);
															}
														: undefined,
											},
											h("title", null, formatDayIso(entry.day, offsetMinutes) + " · " + formatInt(entry.tokens) + " " + t("unit.tokens")),
										);
									}),
								),
							),
						),
					],
				)),
				h("p", { key: "sum", className: "dshTup_chartHint" }, summary),
			);
		}
		
		/** One of five intensity steps; level 0 is the empty cell. */
		function heatColor(value, max) {
			if (value <= 0 || max <= 0) return "var(--dsw-alias-bg-layer-2)";
			const level = Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
			// `color-mix` against the themed base rather than a literal rgba: the blue that
			// reads on the dark surface is nearly invisible mixed into white, and a literal
			// triple cannot follow the theme. The percentage keeps the same five steps.
			const percent = [0, 28, 50, 72, 100][level];
			return "color-mix(in srgb, var(--dsh-tup-heat) " + percent + "%, transparent)";
		}
		//#endregion
		
		//#region motion digest
		/**
		 * A cheap order-sensitive digest of a numeric list.
		 *
		 * Chart growth animations replay when their input changes, and React replays a CSS
		 * animation only when the element is remounted — so the digest becomes part of the
		 * animated leaf's `key`. It is a digest rather than a frame counter on purpose: a
		 * re-render that changed nothing must not restart the drawing.
		 *
		 * @param values - the numbers the animation depends on.
		 * @returns an integer that changes exactly when one of them does.
		 */
		function motionDigest(values) {
			let digest = 0;
			for (const value of values) digest = (digest * 31 + Math.round(value)) % 2147483647;
			return digest;
		}
		//#endregion
		
		//#region trend
		/**
		 * Plot geometry in viewBox units. `width` is the design width and the fallback
		 * before the wrapper is measured; `floor` is the narrowest plot that still reads,
		 * and is why the wrapper keeps its own horizontal scroll.
		 */
		const TREND = { width: 760, height: 190, left: 52, right: 14, top: 12, bottom: 28, floor: 520 };
		
		/** A rounded "nice" axis maximum above the data. */
		function niceMax(value) {
			if (value <= 0) return 1;
			const exponent = Math.floor(Math.log10(value));
			const magnitude = Math.pow(10, exponent);
			const scaled = value / magnitude;
			const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
			return step * magnitude;
		}
		
		/** The smooth path through one series, using the previous point as each control. */
		function smoothPath(points) {
			if (points.length === 0) return "";
			if (points.length === 1) return "M " + points[0][0] + " " + points[0][1];
			let path = "M " + points[0][0] + " " + points[0][1];
			for (let index = 1; index < points.length; index += 1) {
				const previous = points[index - 1];
				const current = points[index];
				path += " Q " + previous[0] + " " + previous[1] + " " + (previous[0] + current[0]) / 2 + " " + (previous[1] + current[1]) / 2;
			}
			const last = points[points.length - 1];
			return path + " L " + last[0] + " " + last[1];
		}
		
		/**
		 * The per-day trend, one smooth line per model.
		 *
		 * @param props - window days, series, locale seats, and the window length.
		 * @returns the card.
		 */
		function TokenTrend({ days, series, offsetMinutes, t, extra }) {
			const [hover, setHover] = react.useState(null);
			const [frame, setFrame] = react.useState(0);
			const wrapRef = react.useRef(null);
			// A fixed-viewBox SVG drawn at `width:100%` scales its own axis text with the
			// pane, so the plot used to be capped by CSS instead — which left the right of a
			// wide card empty. Measuring the wrapper lets the viewBox width match the
			// rendered width one-to-one: the plot fills the card and the labels stay 11px.
			react.useLayoutEffect(() => {
				const node = wrapRef.current;
				if (node === null || node === undefined || typeof node.clientWidth !== "number") return undefined;
				const measure = () => {
					const next = Math.max(TREND.floor, Math.round(node.clientWidth));
					setFrame((previous) => (previous === next ? previous : next));
				};
				measure();
				if (typeof ResizeObserver === "function") {
					const observer = new ResizeObserver(measure);
					observer.observe(node);
					return () => observer.disconnect();
				}
				if (typeof window === "undefined" || typeof window.addEventListener !== "function") return undefined;
				window.addEventListener("resize", measure);
				return () => window.removeEventListener("resize", measure);
			}, []);
			const width = frame > 0 ? frame : TREND.width;
			const plotWidth = width - TREND.left - TREND.right;
			const plotHeight = TREND.height - TREND.top - TREND.bottom;
			let peak = 0;
			for (const line of series) for (const value of line.values.values()) if (value > peak) peak = value;
			const max = niceMax(peak);
			// The growth animation replays by remounting the paths, so what decides whether a
			// drawing restarts is the digest of the numbers behind it.
			const trendValues = [];
			for (const line of series) for (const day of days) trendValues.push(line.values.get(day) ?? 0);
			const trendDigest = motionDigest(trendValues);
			const step = days.length > 1 ? plotWidth / (days.length - 1) : 0;
			const xOf = (index) => TREND.left + step * index;
			const yOf = (value) => TREND.top + plotHeight - (value / max) * plotHeight;
			const ticks = [0, 0.25, 0.5, 0.75, 1];
			const labelEvery = Math.max(1, Math.ceil(days.length / 7));
			const hoverIndex = hover === null ? null : clamp(hover, 0, days.length - 1);
			const hoverDay = hoverIndex === null ? null : days[hoverIndex];
			const summary = t("trend.summary", { series: series.length, days: days.length });
			return h(
				ChartCard,
				{
					title: t("trend.title"),
					extra,
					className: "dshTup_chartCard",
				},
				h("div", { key: "legend", className: "dshTup_legendRow" }, series.map((line) =>
					h("span", { key: line.id, className: "dshTup_legendItem" }, [
						h("span", { key: "dot", className: "dshTup_dot", style: { background: line.color } }),
						h("span", { key: "l" }, line.label),
					]),
				)),
				h("div", { key: "plot", ref: wrapRef, className: "dshTup_trendWrap" }, [
					h(
						"svg",
						{
							key: "svg",
							className: "dshTup_trend",
							viewBox: "0 0 " + width + " " + TREND.height,
							role: "img",
							"aria-label": summary,
						},
						[
							ticks.map((fraction) =>
								h("g", { key: "g" + fraction }, [
									h("line", {
										className: "dshTup_gridLine",
										x1: TREND.left,
										x2: TREND.left + plotWidth,
										y1: yOf(max * fraction),
										y2: yOf(max * fraction),
									}),
									h(
										"text",
										{ className: "dshTup_axisLabel", x: TREND.left - 6, y: yOf(max * fraction) + 3, "text-anchor": "end" },
										formatCompact(max * fraction),
									),
								]),
							),
							days.map((day, index) =>
								index % labelEvery === 0
									? h(
											"text",
											{ key: "x" + day, className: "dshTup_axisLabel", x: xOf(index), y: TREND.height - 8, "text-anchor": "middle" },
											formatDayShort(day, offsetMinutes),
										)
									: null,
							),
							hoverIndex === null
								? null
								: h("line", {
										key: "cursor",
										className: "dshTup_cursor",
										x1: xOf(hoverIndex),
										x2: xOf(hoverIndex),
										y1: TREND.top,
										y2: TREND.top + plotHeight,
									}),
							series.map((line) =>
								h("path", {
									key: line.id + "-" + trendDigest,
									className: "dshTup_trendLine",
									// `pathLength` normalizes the geometry to 1, which lets the stylesheet
									// draw the line on with a plain `stroke-dasharray:1` — no measuring.
									pathLength: 1,
									d: smoothPath(days.map((day, index) => [xOf(index), yOf(line.values.get(day) ?? 0)])),
									stroke: line.color,
								}),
							),
							hoverIndex === null
								? null
								: series.map((line) =>
										h("circle", {
											key: "p" + line.id,
											className: "dshTup_cursorDot",
											cx: xOf(hoverIndex),
											cy: yOf(line.values.get(hoverDay) ?? 0),
											r: 3,
											fill: line.color,
										}),
									),
							h("rect", {
								key: "overlay",
								className: "dshTup_overlay",
								x: TREND.left,
								y: TREND.top,
								width: plotWidth,
								height: plotHeight,
								onPointerMove: (event) => {
									const rect = event.currentTarget.getBoundingClientRect();
									if (rect.width <= 0) return;
									const ratio = (event.clientX - rect.left) / rect.width;
									const index = step > 0 ? Math.round(ratio * (days.length - 1)) : 0;
									setHover((previous) => (previous === index ? previous : index));
								},
								onPointerLeave: () => setHover(null),
							}),
						],
					),
					hoverIndex === null
						? null
						: h(
								"div",
								{
									key: "tip",
									className: "dshTup_tooltip",
									style: { left: (xOf(hoverIndex) / width) * 100 + "%" },
								},
								[
									h("div", { key: "d", className: "dshTup_tooltipDay" }, formatDayShort(hoverDay, offsetMinutes)),
									...series
										.filter((line) => (line.values.get(hoverDay) ?? 0) > 0)
										.map((line) =>
											h("div", { key: line.id, className: "dshTup_tooltipRow" }, [
												h("span", { key: "dot", className: "dshTup_dot", style: { background: line.color } }),
												h("span", { key: "l", className: "dshTup_tooltipLabel" }, line.label),
												h("span", { key: "v", className: "dshTup_tooltipValue" }, formatInt(line.values.get(hoverDay))),
											]),
										),
								],
							),
				]),
			);
		}
		//#endregion
		
		//#region donut
		/** Donut geometry in viewBox units. */
		const DONUT = { size: 190, radius: 68, stroke: 26 };
		
		/**
		 * The per-model donut with its legend.
		 *
		 * The legend is the accessible half: it is real text listing every model with its
		 * share, and clicking a row is how a reader gets from "this model dominates" to
		 * the sessions that spent it.
		 *
		 * @param props - merged model rows, the total, and an optional select handler.
		 * @returns the card.
		 */
		function ModelDonut({ routes, t, onSelect, extra }) {
			const total = routes.reduce((sum, route) => sum + totalOf(route.tokens), 0);
			const center = DONUT.size / 2;
			const circumference = 2 * Math.PI * DONUT.radius;
			let offset = 0;
			const segments = routes.map((route) => {
				const share = total > 0 ? totalOf(route.tokens) / total : 0;
				const length = share * circumference;
				const segment = { route, id: routeIdOf(route), share, length, offset };
				offset += length;
				return segment;
			});
			const summary = t("models.summary", { models: routes.length, total: formatCompact(total) });
			// The ring's growth animation replays on a real change, so it is keyed on the
			// digest of the shares behind it.
			const sweepDigest = motionDigest(routes.map((route) => totalOf(route.tokens)));
			return h(
				ChartCard,
				{ title: t("models.title"), extra, className: "dshTup_chartCard" },
				h("div", { key: "body", className: "dshTup_donutWrap" }, [
					h(
						"svg",
						{ key: "svg", className: "dshTup_donut", viewBox: "0 0 " + DONUT.size + " " + DONUT.size, role: "img", "aria-label": summary },
						[
							h("circle", {
								key: "track",
								className: "dshTup_donutTrack",
								cx: center,
								cy: center,
								r: DONUT.radius,
								fill: "none",
								strokeWidth: DONUT.stroke,
							}),
							h(
								"g",
								{ key: "sweep-" + sweepDigest, className: "dshTup_donutSweep" },
								segments.map((segment) =>
									h("circle", {
										key: segment.id,
										className: "dshTup_donutSegment",
										cx: center,
										cy: center,
										r: DONUT.radius,
										fill: "none",
										stroke: routeColor(segment.id),
										strokeWidth: DONUT.stroke,
										strokeDasharray: segment.length + " " + (circumference - segment.length),
										strokeDashoffset: -segment.offset,
										transform: "rotate(-90 " + center + " " + center + ")",
									}),
								),
							),
							h(
								"text",
								{ key: "value", className: "dshTup_donutValue", x: center, y: center - 2, "text-anchor": "middle" },
								formatCompact(total),
							),
							h("text", { key: "unit", className: "dshTup_donutUnit", x: center, y: center + 14, "text-anchor": "middle" }, t("unit.tokens")),
						],
					),
					h(
						"ul",
						{ key: "legend", className: "dshTup_modelList" },
						segments.map((segment) =>
							h(
								"li",
								{ key: segment.id, className: "dshTup_modelRow" },
								h(
									"button",
									{
										type: "button",
										className: "dshTup_modelButton",
										title: t("models.openSessions"),
										onClick: () => onSelect(segment.id),
									},
									[
										h("span", { key: "dot", className: "dshTup_dot", style: { background: routeColor(segment.id) } }),
										h("span", { key: "labels", className: "dshTup_modelLabels" }, [
											// Gateway first, then the model, exactly as a route reads:
											// `opencode go chat · deepseek-v4.1-flash`. Both names are the
											// registry's own; nothing here is inferred.
											h("span", { key: "m", className: "dshTup_modelName" }, [
												h("span", { key: "tag", className: "dshTup_providerTag" }, segment.route.providerName),
												h("span", { key: "n", className: "dshTup_modelText" }, segment.route.modelName),
											]),
											h("span", { key: "v", className: "dshTup_modelMeta" }, formatInt(totalOf(segment.route.tokens)) + " " + t("unit.tokens")),
										]),
										h("span", { key: "p", className: "dshTup_modelShare" }, (segment.share * 100).toFixed(1) + "%"),
									],
								),
							),
						),
					),
				]),
			);
		}
		//#endregion

		/**
		 * The row height in JS, written onto the root as the `--dsh-tup-row-h` custom
		 * property.
		 *
		 * The windowing math below needs the exact rendered row height, so JS owns the
		 * number and CSS consumes it: two independently maintained constants would drift
		 * and misalign the virtual window. There is one height only — the comfortable and
		 * compact choice is gone — so this is no longer a lookup table.
		 */
		const ROW_HEIGHT = 54;
		/** Scroll offset remembered across panel unmount/remount (one panel instance). */
		const SCROLL_MEMORY = { top: 0 };
		
		/**
		 * The rows to render for the current scroll offset.
		 * @param count - total row count.
		 * @param top - scroll offset in pixels.
		 * @param height - viewport height in pixels.
		 * @param rowHeight - rendered row height in pixels.
		 * @returns the slice bounds, the spacer heights, and whether windowing is on.
		 */
		function windowRange(count, top, height, rowHeight) {
			if (count <= VIRTUALIZATION_THRESHOLD || rowHeight <= 0) {
				return { first: 0, last: count, topPad: 0, bottomPad: 0, windowed: false };
			}
			const first = Math.max(0, Math.floor(top / rowHeight) - VIRTUAL_OVERSCAN_ROWS);
			const span = Math.max(0, Math.ceil(height / rowHeight)) + VIRTUAL_OVERSCAN_ROWS * 2;
			const last = Math.min(count, first + span);
			return { first, last, topPad: first * rowHeight, bottomPad: (count - last) * rowHeight, windowed: true };
		}
		
		/** A spacer row that reserves `height` pixels without rendering content. */
		function SpacerRow({ height, columns, position }) {
			if (height <= 0) return null;
			return h("tr", { className: "dshTup_spacer", "data-spacer": position, "aria-hidden": "true" }, [
				h("td", { colSpan: columns, style: { height: height + "px" } }),
			]);
		}
		
		/**
		 * One cell of a session row, chosen by the column key. Rendering per column keeps
		 * a hidden column out of the DOM entirely rather than hiding it with CSS.
		 * @param column - the column definition.
		 * @param context - row, display record, share, and handlers.
		 * @returns the cell element.
		 */
		function usageCell(column, context) {
			const { row, display, share, filteredTotal, currentId, onRetry, t } = context;
			const hideBelow = column.hideClass;
			if (column.key === "session") {
				return h("td", { key: "session", className: cx("dshTup_colSession", hideBelow) }, [
					h("div", { key: "main", className: "dshTup_cellMain" }, [
						h("div", { key: "title", className: "dshTup_rowTitle" }, [
							row.running ? h(StateDot, { key: "run", state: "ongoing", "aria-hidden": "true" }) : null,
							h("span", { key: "text", className: "dshTup_rowTitleText" }, row.title !== undefined ? row.title : t("unknownTitle")),
							row.parentId !== undefined ? h(Tag, { key: "sub" }, t("badge.subagent")) : null,
							row.id === currentId ? h(Tag, { key: "cur" }, t("badge.current")) : null,
						]),
						h("div", { key: "meta", className: "dshTup_rowMeta" }, [
							display.meta,
							row.attempt === "error"
								? h(
										"button",
										{
											key: "retry",
											type: "button",
											className: "dshTup_retry",
											title: t("retryHint"),
											onClick: (event) => {
												event.stopPropagation();
												onRetry(row.id);
											},
										},
										t("retry"),
									)
								: null,
						]),
					]),
				]);
			}
			if (column.key === "total") return h("td", { key: "total", className: hideBelow }, display.total);
			if (column.key === "share") {
				const ratio = filteredTotal > 0 ? share / filteredTotal : 0;
				return h("td", { key: "share", className: hideBelow }, [
					h("div", { key: "wrap", className: "dshTup_share" }, [
						h(
							"div",
							{ key: "track", className: "dshTup_shareTrack" },
							h("div", { className: "dshTup_shareFill", style: { width: Math.max(ratio > 0 ? 2 : 0, ratio * 100) + "%" } }),
						),
						h("span", { key: "num", className: "dshTup_shareNum" }, filteredTotal > 0 ? (ratio * 100).toFixed(1) + "%" : t("never")),
					]),
				]);
			}
			if (column.key === "input") return h("td", { key: "input", className: hideBelow }, display.input);
			if (column.key === "cacheRead") return h("td", { key: "cacheRead", className: hideBelow }, display.cacheRead);
			if (column.key === "cacheWrite") return h("td", { key: "cacheWrite", className: hideBelow }, display.cacheWrite);
			if (column.key === "output") return h("td", { key: "output", className: hideBelow }, display.output);
			return h("td", { key: "updated", className: hideBelow }, display.updatedAt);
		}
		
		/**
		 * One session's usage row. Reachable by pointer and by keyboard.
		 * @param props - row, its index on the page, its cached display record, the filtered
		 * total, and handlers.
		 * @returns the table row.
		 */
		function UsageRow({ row, index, display, share, filteredTotal, columns, currentId, onOpen, onRetry, t }) {
			const activate = () => onOpen(row.id);
			return h(
				"tr",
				{
					className: cx("dshTup_row", row.id === currentId && "dshTup_rowCurrent"),
					"data-row": row.id,
					// The index only feeds the entrance wave: CSS multiplies it by the shared
					// stagger token, so a page of rows lands as a sweep instead of a jump.
					style: { "--dsh-tup-i": index },
					tabIndex: 0,
					"aria-label": t("open", { title: row.title !== undefined ? row.title : t("unknownTitle") }),
					title: display.tooltip,
					onClick: activate,
					onKeyDown: (event) => {
						if (event.key !== "Enter" && event.key !== " ") return;
						event.preventDefault();
						activate();
					},
				},
				columns.map((column) => usageCell(column, { row, display, share, filteredTotal, currentId, onRetry, t })),
			);
		}
		
		/** The loading placeholder shown before the session list's first baseline. */
		function SkeletonRows({ count, t }) {
			const rows = [];
			for (let index = 0; index < count; index += 1) {
				rows.push(
					h("div", { key: index, className: "dshTup_skelRow" }, [
						h("span", { key: "a", className: "dshTup_skel dshTup_skelGrow" }),
						h("span", { key: "b", className: "dshTup_skel", style: { width: "64px" } }),
						h("span", { key: "c", className: "dshTup_skel", style: { width: "52px" } }),
						h("span", { key: "d", className: "dshTup_skel", style: { width: "72px" } }),
					]),
				);
			}
			return h("div", { "aria-busy": "true", "aria-label": t("loading") }, rows);
		}
		
		/**
		 * The table region: the panel's single scrollport, its windowed body, and the
		 * scroll-linked header state.
		 *
		 * Scroll position lives here rather than in the panel so that scrolling
		 * re-renders only this subtree.
		 *
		 * @param props - rows, columns, and handlers.
		 * @returns the table region element.
		 */
		function UsageTable({
			rows,
			filters,
			onSort,
			onResize,
			filteredTotal,
			columns,
			rowHeight,
			focusId,
			onFocusHandled,
			onWindowChange,
			onOpen,
			onRetry,
			onEmptyAction,
			skeleton,
			currentId,
			t,
		}) {
			const scrollRef = react.useRef(null);
			const [view, setView] = react.useState({ top: 0, height: 0 });
			const [scrolled, setScrolled] = react.useState(false);
		
			react.useLayoutEffect(() => {
				const element = scrollRef.current;
				if (element === null || element === undefined) return;
				if (SCROLL_MEMORY.top > 0) element.scrollTop = SCROLL_MEMORY.top;
				const height = element.clientHeight;
				setView((previous) => (previous.top === element.scrollTop && previous.height === height ? previous : { top: element.scrollTop, height }));
			}, []);
		
			react.useLayoutEffect(() => {
				if (focusId === undefined) return;
				const element = scrollRef.current;
				const index = rows.findIndex((row) => row.id === focusId);
				if (element !== null && element !== undefined && index >= 0) {
					element.scrollTop = Math.max(0, index * rowHeight - rowHeight * 2);
					SCROLL_MEMORY.top = element.scrollTop;
					setView((previous) => (previous.top === element.scrollTop ? previous : { ...previous, top: element.scrollTop }));
					onFocusHandled();
				}
				// Not found on THIS page is not a failure: the table renders one page at a
				// time, so a cross-page jump stays pending while the panel turns to the
				// page that holds the row (it owns the resolution, since only it knows the
				// full filtered order). Clearing here would make the jump a silent no-op.
			}, [focusId, rows, rowHeight, onFocusHandled]);
		
			const onScroll = react.useCallback((event) => {
				const element = event.currentTarget;
				SCROLL_MEMORY.top = element.scrollTop;
				const next = { top: element.scrollTop, height: element.clientHeight };
				setView((previous) => (previous.top === next.top && previous.height === next.height ? previous : next));
				const isScrolled = next.top > 2;
				setScrolled((previous) => (previous === isScrolled ? previous : isScrolled));
			}, []);
		
			const range = windowRange(rows.length, view.top, view.height, rowHeight);
			const slice = range.windowed ? rows.slice(range.first, range.last) : rows;
			react.useEffect(() => {
				if (onWindowChange === undefined) return;
				onWindowChange(range.windowed ? { first: range.first, last: range.last, total: rows.length } : null);
			}, [onWindowChange, range.windowed, range.first, range.last, rows.length]);
		
			let body;
			if (skeleton) {
				body = h(SkeletonRows, { key: "skeleton", count: 6, t });
			} else if (rows.length === 0) {
				body = h("div", { key: "empty", className: "dshTup_empty" }, [
					h(IconDatabaseOutlineRegular, { key: "icon", size: 28, className: "dshTup_emptyIcon" }),
					h("div", { key: "a" }, t("empty")),
					h("div", { key: "b", className: "dshTup_subtitle" }, t("emptyHint")),
					h(Button, { key: "c", variant: "outline", onClick: onEmptyAction }, t("emptyAction")),
				]);
			} else {
				const head = h(
					"thead",
					{ key: "head" },
					h(
						"tr",
						null,
						columns.map((column) => h(HeaderCell, { key: column.key, column, filters, onSort, onResize, t })),
					),
				);
				// The widths live in a colgroup so the browser sizes the columns before the
				// rows render: a per-cell width would reflow every cell on each drag frame.
				// Each `<col>` carries the same responsive hide class as its cells, because
				// under `table-layout:fixed` a colgroup track keeps reserving width even when
				// every cell in it is `display:none`.
				const cols = h(
					"colgroup",
					{ key: "cols" },
					columns.map((column) =>
						h("col", { key: column.key, className: column.colHideClass, style: { width: column.width + "px" } }),
					),
				);
				body = h("table", { key: "t", className: "dshTup_table" }, [cols, head, h("tbody", { key: "body" }, bodyRows())]);
			}
		
			/** The ordered body content: spacer, window slice, spacer. */
			function bodyRows() {
				const out = [];
				if (range.topPad > 0) out.push(h(SpacerRow, { key: "top", height: range.topPad, columns: columns.length, position: "top" }));
				for (let index = 0; index < slice.length; index += 1) {
					const row = slice[index];
					const display = displayOf(row, t);
					out.push(
						h(UsageRow, {
							key: row.id,
							index,
							row,
							display,
							share: row.usage === undefined ? 0 : totalOf(row.usage),
							filteredTotal,
							columns,
							currentId,
							onOpen,
							onRetry,
							t,
						}),
					);
				}
				if (range.bottomPad > 0) out.push(h(SpacerRow, { key: "bottom", height: range.bottomPad, columns: columns.length, position: "bottom" }));
				return out;
			}
		
			// Two elements, deliberately. The outer band (`.dshTup_tableWrap`) is the card's
			// margin and vertical rhythm and does not scroll, while the inner element
			// (`.dshTup_tableScroll`) owns the horizontal scrolling and the rounded, bordered
			// frame. Splitting them keeps the scrollport's border and background off the
			// element that also has to carry the card's outer spacing, which one element
			// cannot do without the two sizing jobs fighting each other.
			return h(
				"div",
				{
					className: "dshTup_tableWrap",
					"data-scrolled": scrolled ? "true" : "false",
				},
				h(
					"div",
					{
						className: "dshTup_tableScroll",
						ref: scrollRef,
						onScroll,
					},
					body,
				),
			);
		}

		/**
		 * The usage panel: two views over one filter set.
		 *
		 *   `overview`  the KPI strip, the activity calendar, the daily trend, and the
		 *               model donut — a document-flow scroll, because charts stack.
		 *   `sessions`  the headline totals, the per-model breakdown, and the table, which
		 *               keeps the fixed-chrome-plus-one-scroller model described below.
		 *
		 * Two rules keep it smooth while a session streams:
		 *
		 * 1. Nothing here re-renders unless a projected row actually changed — the
		 *    subscription in `useProjectedSessions` returns a stable array otherwise.
		 * 2. Motion is CSS-only and always enabled: `data-animate="true"` scopes the whole
		 *    vocabulary, and the `MOTION` tokens ride along as custom properties. Chart
		 *    growth replays whenever the data changes because the animated leaves are keyed
		 *    on a digest of their own data, so a genuine change redraws and an unchanged
		 *    re-render does not. The one exception is the headline count-up, which writes
		 *    state on every frame and is therefore armed only by user-initiated changes
		 *    (`COUNT_UP_MS`) — that is what keeps the render gate honest.
		 *
		 * The chart aggregates are the most expensive thing this panel computes, so they
		 * are memoised on the filtered rows AND skipped entirely while the sessions view
		 * is on screen.
		 *
		 * @param props - slot-injected data plus the locale seat.
		 * @returns the panel element tree.
		 */
		function TokenUsagePanel(props) {
			const t = typeof props.t === "function" ? props.t : (key) => key;
			const store = props.sessionList;
			const [filters, setFiltersState] = react.useState(loadFilters);
			const [animate, setAnimate] = react.useState(true);
			const [copied, setCopied] = react.useState(false);
			const [focusId, setFocusId] = react.useState(undefined);
			const [windowInfo, setWindowInfo] = react.useState(null);
			const [page, setPage] = react.useState(1);
			/**
			 * The text of the panel's single live region.
			 *
			 * Everything this panel does asynchronously is invisible to a screen reader
			 * otherwise: the skeleton only sets `aria-busy`, the refresh button is disabled
			 * rather than announced, and the copy confirmation, the audit warning and the
			 * paging buttons are all purely visual. This is the one place those become
			 * speech, so each state change writes a short phrase here.
			 */
			const [status, setStatus] = react.useState("");
			const searchRef = react.useRef(null);
			const animateTimer = react.useRef(0);
			const copyTimer = react.useRef(0);
			const statusTimer = react.useRef(0);
		
			/** Announce one phrase, clearing it after a beat so repeats are re-announced. */
			const announce = react.useCallback((text) => {
				setStatus(text);
				window.clearTimeout(statusTimer.current);
				statusTimer.current = window.setTimeout(() => setStatus(""), 2200);
			}, []);
		
			const phase = store.getSnapshot().phase;
			const { rows, pending, waiting, unavailable, refresh, retry, loadMore } = useUsageRows(props.sessionService, store);
		
			react.useEffect(() => {
				saveFilters(filters);
			}, [filters]);
		
			react.useEffect(
				() => () => {
					clearTimeout(animateTimer.current);
					clearTimeout(copyTimer.current);
					clearTimeout(statusTimer.current);
				},
				[],
			);
		
			/**
			 * Arm the headline count-up. Called for every user-initiated change, plus once
			 * on mount; live ticks never call it, because the counter writes state on every
			 * animation frame and would then never settle.
			 */
			const markUserChange = react.useCallback(() => {
				setAnimate(true);
				window.clearTimeout(animateTimer.current);
				animateTimer.current = window.setTimeout(() => setAnimate(false), COUNT_UP_MS);
			}, []);
		
			react.useEffect(() => {
				markUserChange();
			}, [markUserChange]);
		
			/** The one write path for filters, so every user change opens the window. */
			const updateFilters = react.useCallback(
				(next) => {
					markUserChange();
					setFiltersState(next);
				},
				[markUserChange],
			);
		
			// The input updates urgently; the table catches up. A large re-sort must never
			// make typing lose keystrokes.
			const deferredQuery = react.useDeferredValue(filters.query);
			const filtered = react.useMemo(
				() => selectRows(rows, deferredQuery === filters.query ? filters : { ...filters, query: deferredQuery }, Date.now()),
				[rows, filters, deferredQuery],
			);
			/**
			 * The rows the overview's calendars, KPIs, and trend are built from.
			 *
			 * Identical to `filtered` except that the `day` filter is ignored. That filter
			 * is set by clicking a cell *of the very calendar it feeds*, so honouring it
			 * here would collapse the year grid to the single day just clicked — the chart
			 * answering its own question with its own answer. Every other filter still
			 * applies, so the overview keeps describing the current selection as a whole.
			 */
			const calendarRows = react.useMemo(
				() => (filters.day === null ? filtered : selectRows(rows, { ...filters, day: null }, Date.now())),
				[rows, filters, filtered],
			);
			const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
			const currentPage = Math.min(page, pageCount);
			// One page of rows, always. The previous form handed the WHOLE filtered list to the
			// table whenever there was more than one page, so the pager moved its label but
			// never the rows. Slicing unconditionally is also right for a single page, whose
			// length is at most PAGE_SIZE.
			const paged = react.useMemo(
				() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
				[filtered, currentPage],
			);
			react.useEffect(() => {
				if (page > pageCount) setPage(pageCount);
			}, [page, pageCount]);
			react.useEffect(() => {
				setPage(1);
			}, [filters.query, filters.range, filters.cwd, filters.sortKey, filters.sortDesc, filters.topLevelOnly, filters.usedOnly, filters.model, filters.day]);
		
			const directories = react.useMemo(() => {
				const seen = new Map();
				for (const row of rows) {
					if (row.cwd === undefined || seen.has(row.cwd)) continue;
					seen.set(row.cwd, { path: row.cwd, label: leafName(row.cwd) ?? row.cwd });
				}
				return [...seen.values()].sort((left, right) => left.label.localeCompare(right.label));
			}, [rows]);
		
			/** Summed usage over the filtered set; rows without data contribute nothing. */
			const totals = react.useMemo(() => sumUsages(filtered.map((row) => row.usage ?? ZERO_USAGE)), [filtered]);
			const filteredTotal = totalOf(totals);
			const grandTotal = react.useMemo(() => totalOf(sumUsages(rows.map((row) => row.usage ?? ZERO_USAGE))), [rows]);
			/**
			 * Runtime drift check over EVERY row, independent of the active filters — a
			 * filter must never be able to hide a disagreement. Rows are identity-stable,
			 * so this only recomputes when a row's data actually changed.
			 */
			const audit = react.useMemo(() => auditUsageConsistency(rows), [rows]);
			const columns = react.useMemo(() => orderedColumns(filters), [filters]);
			const breakdown = react.useMemo(() => aggregateRoutes(filtered), [filtered]);
			const rowHeight = ROW_HEIGHT;
			// The session shown in the workspace's centre column: the table marks its row
			// and the filter bar offers to jump back to it. Compare `retainedMainView` as a
			// number, never the wrapper object (rebuilt on every list tick).
			const current = react.useMemo(() => rows.find((row) => row.retainedMainView > 0), [rows]);
			const filteredOut =
				filters.topLevelOnly ||
				filters.cwd !== "" ||
				filters.range !== "all" ||
				filters.query.trim() !== "" ||
				filters.usedOnly ||
				filters.model !== "" ||
				filters.day !== null;
		
			//#region overview data (only while the overview is on screen)
			const isOverview = filters.view === "overview";
			const calendar = react.useMemo(() => (isOverview ? aggregateDays(calendarRows) : null), [isOverview, calendarRows]);
			const routeCalendar = react.useMemo(() => (isOverview ? aggregateRouteDays(calendarRows) : null), [isOverview, calendarRows]);
			/**
			 * The Host offset that labels the day chip.
			 *
			 * The calendar (and its offset) only exists while the overview is mounted,
			 * but the chip lives in the sessions view — the view a calendar click
			 * switches to. Recovering the offset from the rows is what keeps the chip in
			 * the Host's frame; rendering it with 0 would label the selected day one day
			 * early for a Host west of UTC (a same-timezone machine cancels this error,
			 * which is why the regression must use a whole-day offset).
			 */
			const dayFilterOffset = react.useMemo(() => {
				if (filters.day === null) return 0;
				let fallback = 0;
				let found = false;
				for (const row of rows) {
					const value = row.dayUsage;
					if (value === undefined) continue;
					if (!found) {
						fallback = value.offsetMinutes ?? 0;
						found = true;
					}
					if (value.days.some((entry) => entry.day === filters.day)) return value.offsetMinutes ?? 0;
				}
				return fallback;
			}, [rows, filters.day]);
			const offsetMinutes = calendar === null ? dayFilterOffset : calendar.offsetMinutes;
			const today = currentDayIndex(offsetMinutes);
			const streak = react.useMemo(() => (calendar === null ? { longest: 0, current: 0 } : streaksOf(calendar.byDay, today)), [calendar, today]);
			const peak = react.useMemo(() => (calendar === null ? 0 : peakOf(calendar.byDay)), [calendar]);
			const trendDays = react.useMemo(() => (isOverview ? rangeDays(today, filters.trendDays) : []), [isOverview, today, filters.trendDays]);
			const trend = react.useMemo(
				() => (routeCalendar === null ? { series: [] } : trendSeries(routeCalendar.byDay, trendDays, t)),
				[routeCalendar, trendDays, t],
			);
			// Zero-token days exist in the state (a zero sample is recorded, not dropped)
			// but must not count as "there is calendar data": the grid would render empty
			// while claiming a year of data.
			const hasCalendar = calendar !== null && [...calendar.byDay.values()].some((tokens) => totalOf(tokens) > 0);
			/**
			 * The overview KPI total. It ignores the day filter exactly like the calendar
			 * and the trend do — the day filter is set by clicking a cell *of* the
			 * calendar and belongs to the table, so an overview showing one day's total
			 * beside a year of chart would contradict itself. Every other filter still
			 * applies (the rows come from `calendarRows`).
			 */
			const overviewTotal = react.useMemo(
				() => (filters.day === null ? filteredTotal : totalOf(sumUsages(calendarRows.map((row) => row.usage ?? ZERO_USAGE)))),
				[filters.day, filteredTotal, calendarRows],
			);
			/**
			 * The label of the active model filter. Resolved from the breakdown rather than
			 * echoed as the raw `provider/model` route, so the chip reads like the legend
			 * that set it (`opencode go chat · deepseek-v4.1-flash`).
			 */
			const modelLabel = react.useMemo(() => {
				if (filters.model === "") return "";
				const route = breakdown === undefined ? undefined : breakdown.routes.find((candidate) => routeIdOf(candidate) === filters.model);
				return route === undefined ? filters.model : routeLabel(route);
			}, [breakdown, filters.model]);
			//#endregion
		
			const onSort = react.useCallback(
				(key) => {
					updateFilters((previous) =>
						previous.sortKey === key ? { ...previous, sortDesc: !previous.sortDesc } : { ...previous, sortKey: key, sortDesc: key !== "title" },
					);
				},
				[updateFilters],
			);
		
			const openSession = react.useCallback(
				(id) => {
					try {
						props.openSession(id);
					} catch (error) {
						// A failure used to be console-only, so a click that did nothing looked
						// like a click that was ignored.
						console.warn("[dsh-token-usage-panel] could not open " + id, error);
						announce(t("openFailed"));
					}
				},
				[props.openSession, announce, t],
			);
		
			const onWindowChange = react.useCallback((info) => setWindowInfo(info), []);
			const onFocusHandled = react.useCallback(() => setFocusId(undefined), []);
			/**
			 * Turn to the page that holds a pending focus row.
			 *
			 * `onJumpToCurrent` only records which row to reach; the table renders one
			 * page at a time, so the panel — the only place that sees the full filtered
			 * order — resolves the page here. The table then scrolls the row into view on
			 * the next pass (see its focus effect). Before this, a jump to a row beyond
			 * the first page searched only the rendered page and silently did nothing.
			 */
			react.useEffect(() => {
				if (focusId === undefined) return;
				const index = filtered.findIndex((row) => row.id === focusId);
				if (index < 0) {
					onFocusHandled();
					return;
				}
				const target = Math.floor(index / PAGE_SIZE) + 1;
				setPage((previous) => (previous === target ? previous : target));
			}, [focusId, filtered, onFocusHandled]);
		
			/** Narrow to one model's sessions — the payoff of seeing the split. */
			const onSelectModel = react.useCallback(
				(routeId) => {
					updateFilters((previous) => ({ ...previous, model: routeId, view: "sessions" }));
				},
				[updateFilters],
			);
		
			/**
			 * One drag, tracked across the three pointer phases.
			 *
			 * The start position is captured on `start` rather than recomputed per move, so
			 * the width follows the pointer's total displacement instead of accumulating
			 * rounding drift across frames. Both ends are clamped to `COLUMN_WIDTH_LIMITS`,
			 * which is what keeps the table from growing a horizontal scrollbar.
			 */
			const resizeRef = react.useRef(null);
			const onResize = react.useCallback(
				(key, clientX, phase) => {
					if (phase === "start") {
						const current = columns.find((column) => column.key === key);
						resizeRef.current = { key, startX: clientX, startWidth: current === undefined ? COLUMN_WIDTH_LIMITS.min : current.width };
						return;
					}
					const drag = resizeRef.current;
					if (drag === null || drag.key !== key) return;
					if (phase === "end") {
						resizeRef.current = null;
						return;
					}
					const width = Math.min(
						COLUMN_WIDTH_LIMITS.max,
						Math.max(COLUMN_WIDTH_LIMITS.min, drag.startWidth + (clientX - drag.startX)),
					);
					updateFilters((previous) =>
						previous.columnWidths[key] === width ? previous : { ...previous, columnWidths: { ...previous.columnWidths, [key]: width } },
					);
				},
				[columns, updateFilters],
			);
		
			const onSelectDay = react.useCallback(
				(day) => {
					// Selecting a day is a filter, so it also moves to the sessions view: the
					// calendar answers "when", the table answers "who", and the chip is how the
					// reader gets back out.
					updateFilters((previous) => ({ ...previous, day, view: "sessions" }));
				},
				[updateFilters],
			);
		
			const exportLines = react.useMemo(() => {
				const exportColumns = columns.filter((column) => column.key !== "share");
				const lines = [exportColumns.map((column) => t(column.labelKey))];
				for (const row of filtered) {
					const display = displayOf(row, t);
					lines.push(
						exportColumns.map((column) => {
							if (column.key === "session") return row.title !== undefined ? row.title : t("unknownTitle");
							if (column.key === "updated") return display.updatedAt;
							if (row.usage === undefined) return "";
							if (column.key === "total") return totalOf(row.usage);
							if (column.key === "input") return row.usage.uncachedInputTokens;
							if (column.key === "cacheRead") return row.usage.cacheReadTokens;
							if (column.key === "cacheWrite") return row.usage.cacheWriteTokens;
							if (column.key === "output") return row.usage.outputTokens;
							return "";
						}),
					);
				}
				return lines;
			}, [columns, filtered, t]);
		
			const flagCopied = react.useCallback(() => {
				setCopied(true);
				announce(t("export.copied"));
				window.clearTimeout(copyTimer.current);
				copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
			}, [announce, t]);
		
			const onCopy = react.useCallback(() => {
				const tsv = exportLines.map((line) => line.join("\t")).join("\n");
				void Promise.resolve(writeClipboard(tsv)).then(flagCopied, (error) => {
					console.warn("[dsh-token-usage-panel] clipboard write failed", error);
					announce(t("copyFailed"));
				});
			}, [exportLines, flagCopied, announce, t]);
		
			const onDownload = react.useCallback(() => {
				const csv = exportLines.map((line) => line.map(csvField).join(",")).join("\r\n");
				const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
				const link = document.createElement("a");
				const stamp = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "");
				link.href = url;
				link.download = "token-usage-" + stamp + ".csv";
				document.body.appendChild(link);
				link.click();
				link.remove();
				URL.revokeObjectURL(url);
			}, [exportLines]);
		
			const onJumpToCurrent = react.useCallback(() => {
				updateFilters((previous) => ({ ...resetFilters(previous), model: "", view: "sessions" }));
				if (current !== undefined) setFocusId(current.id);
			}, [updateFilters, current]);
		
			const onEmptyAction = react.useCallback(() => {
				try {
					props.startSession();
				} catch (error) {
					console.warn("[dsh-token-usage-panel] could not start a session", error);
					announce(t("startFailed"));
				}
			}, [props.startSession, announce, t]);
		
			const onKeyDown = react.useCallback(
				(event) => {
					const tag = event.target !== null && typeof event.target === "object" && typeof event.target.tagName === "string" ? event.target.tagName : "";
					const typing = tag === "INPUT" || tag === "TEXTAREA";
					if (event.key === "Escape" && typing) {
						updateFilters((previous) => ({ ...previous, query: "" }));
						return;
					}
					if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
					if (event.key === "/") {
						event.preventDefault();
						if (searchRef.current !== null && searchRef.current !== undefined) searchRef.current.focus();
						return;
					}
					if (event.key === "r" || event.key === "R") {
						event.preventDefault();
						refresh();
					}
				},
				[refresh, updateFilters],
			);
		
			const loading = pending > 0;
			const skeleton = phase !== "ready" && rows.length === 0;
		
			// Announce the end of a read, so a refresh or a cold-session backfill is not
			// silent. Only the falling edge speaks: the rising edge is already conveyed by
			// the disabled button and the skeleton.
			const wasLoading = react.useRef(false);
			react.useEffect(() => {
				if (wasLoading.current && !loading) announce(t("loaded"));
				wasLoading.current = loading;
			}, [loading, announce, t]);
		
			const header = h("header", { key: "head", className: "dshTup_head" }, [
				h("div", { key: "main", className: "dshTup_headMain" }, [
					h("h1", { key: "title", className: "dshTup_title" }, t("title")),
					h("p", { key: "sub", className: "dshTup_subtitle" }, t("subtitle")),
				]),
				h("div", { key: "actions", className: "dshTup_actions" }, [
					h(SegmentedControl, {
						key: "view",
						id: "dsh-tup-view",
						label: t("title"),
						value: filters.view,
						options: VIEWS.map((value) => ({ value, label: t("view." + value) })),
						onChange: (next) => updateFilters((previous) => ({ ...previous, view: next })),
					}),
					h(
						Button,
						{
							key: "refresh",
							variant: "outline",
							icon: h(IconRefreshOutlineRegular, { size: 14 }),
							disabled: loading,
							onClick: refresh,
						},
						loading ? t("refreshing") : t("refresh"),
					),
				]),
			]);
		
			const filterBar = h(FilterBar, {
				key: "filters",
				filters,
				setFilters: updateFilters,
				directories,
				searchRef,
				exportProps: { onCopy, onDownload, copied, disabled: filtered.length === 0 },
				onJumpToCurrent,
				hasCurrent: current !== undefined,
				modelLabel,
				dayOffsetMinutes: offsetMinutes,
				t,
			});
		
			const footer = h("footer", { key: "foot", className: "dshTup_foot" }, [
				loading ? h("span", { key: "loading" }, t("loading")) : null,
				waiting > 0 ? h(Button, { key: "more", variant: "outline", size: "sm", onClick: loadMore }, t("loadMore", { n: waiting })) : null,
				unavailable > 0
					? h("span", { key: "missing", className: "dshTup_notice" }, [
							h(IconWarningOutlineRegular, { key: "icon", size: 12 }),
							t("pending", { n: unavailable }),
						])
					: null,
				audit.count > 0
					? h("span", {
							key: "audit",
							className: "dshTup_notice dshTup_audit",
							title: audit.entries
								.slice(0, 10)
								.map((entry) => t("audit.row", { title: entry.title === "" ? entry.id : entry.title, route: formatInt(entry.routeTotal), usage: formatInt(entry.usageTotal) }))
								.join("\n"),
						}, [h(IconWarningOutlineRegular, { key: "icon", size: 12 }), t("audit", { n: audit.count })])
					: null,
				h("span", { key: "spacer", className: "dshTup_footSpacer" }),
				windowInfo !== null && windowInfo !== undefined
					? h("span", { key: "window" }, t("window", { start: windowInfo.first + 1, end: windowInfo.last, total: windowInfo.total }))
					: null,
				pageCount > 1
					? h("span", { key: "pagination", className: "dshTup_pagination" }, [
						h(Button, { key: "prev", variant: "ghost", size: "sm", disabled: currentPage <= 1, onClick: () => setPage((value) => Math.max(1, value - 1)), "aria-label": t("page.previous") }, t("page.previous")),
						h("span", { key: "status" }, t("page.status", { page: currentPage, pages: pageCount })),
						h(Button, { key: "next", variant: "ghost", size: "sm", disabled: currentPage >= pageCount, onClick: () => setPage((value) => Math.min(pageCount, value + 1)), "aria-label": t("page.next") }, t("page.next")),
					  ])
					: null,
				h("span", { key: "count" }, t("card.sessionsHint", { matched: filtered.length, total: rows.length })),
			]);
		
			let body;
			if (isOverview) {
				body = h("div", { key: "overview", className: "dshTup_overview" }, [
					h(KpiStrip, {
						key: "kpi",
						items: [
							{ key: "total", label: t("kpi.total"), value: formatCompact(overviewTotal) },
							{ key: "peak", label: t("kpi.peak"), value: formatCompact(peak) },
							{ key: "current", label: t("kpi.current"), value: t("kpi.days", { n: streak.current }) },
							{ key: "longestRun", label: t("kpi.longestRun"), value: t("kpi.days", { n: streak.longest }) },
						],
					}),
					hasCalendar
						? h(ActivityHeatmap, {
								key: "activity",
								byDay: calendar.byDay,
								offsetMinutes,
								today,
								t,
								onSelectDay,
							})
						: h("section", { key: "noCalendar", className: "dshTup_card dshTup_chartCard" }, [
								h("h3", { key: "t", className: "dshTup_cardTitle" }, t("activity.title")),
								h("p", { key: "a", className: "dshTup_chartHint" }, t("chart.empty")),
								h("p", { key: "b", className: "dshTup_chartHint" }, t("chart.emptyHint")),
							]),
					hasCalendar
						? h(TokenTrend, {
								key: "trend",
								days: trendDays,
								series: trend.series,
								offsetMinutes,
								t,
								extra: h(SegmentedControl, {
									id: "dsh-tup-trend",
									label: t("trend.title"),
									value: filters.trendDays,
									options: TREND_RANGES.map((value) => ({ value, label: t("kpi.days", { n: value }) })),
									onChange: (next) => updateFilters((previous) => ({ ...previous, trendDays: next })),
								}),
							})
						: null,
					breakdown === undefined
						? null
						: h(ModelDonut, { key: "donut", routes: breakdown.routes, t, onSelect: onSelectModel, extra: null }),
				]);
			} else {
				body = h("div", { key: "sessions", className: "dshTup_sessions" }, [
					h(Summary, {
						key: "summary",
						totals,
						filteredTotal,
						matched: filtered.length,
						total: rows.length,
						grandTotal,
						filteredOut,
						animate,
						t,
					}),
					h(ModelBreakdown, { key: "models", breakdown, onSelect: onSelectModel, t }),
					h(UsageTable, {
						key: "table",
						rows: paged,
						filters,
						onSort,
						onResize,
						filteredTotal,
						columns,
						rowHeight,
						focusId,
						onFocusHandled,
						onWindowChange,
						onOpen: openSession,
						onRetry: retry,
						onEmptyAction,
						skeleton,
						currentId: current === undefined ? undefined : current.id,
						t,
					}),
				]);
			}
		
			return h(
				"div",
				{
					className: "dshTup_root",
					"data-token-usage-panel": true,
					"data-view": filters.view,
					// Motion is always on. The attribute is the stylesheet's scope for every
					// entrance, growth and interaction rule, so it is also how a host embedding
					// this panel could turn the vocabulary off.
					"data-animate": "true",
					style: {
						"--dsh-tup-row-h": rowHeight + "px",
						"--dsh-tup-fast": MOTION.fast + "ms",
						"--dsh-tup-base": MOTION.base + "ms",
						"--dsh-tup-slow": MOTION.slow + "ms",
						"--dsh-tup-stagger": MOTION.stagger + "ms",
						"--dsh-tup-ease": MOTION.ease,
						"--dsh-tup-settle": MOTION.settle,
					},
					onKeyDown,
				},
				// The panel's one live region. `polite` because nothing here is an emergency
				// and interrupting the user mid-sentence would be worse than a short delay.
				[
					h("div", { key: "status", className: "dshTup_live", role: "status", "aria-live": "polite", "aria-atomic": "true" }, status),
					header,
					filterBar,
					body,
					footer,
				],
			);
		}

		/** Services this client half needs before it can register its slots. */
		const inject = ["slots", "locale", "sessions", "uiWorkspace"];

		/**
		 * Register the sidebar entry and its main panel.
		 * @param ctx - browser services used by these contributions.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-token-usage-panel: dictionaries");
			// Rows cache formatted labels, and those follow the active locale: drop the
			// cache whenever a dictionary or the preference changes.
			ctx.effect(() => ctx.locale.subscribe(() => clearDisplayCache()), "dsh-token-usage-panel: locale cache");
			const openSession = (id) => {
				ctx.uiWorkspace.openSession(id);
			};
			const startSession = (workspaceId) => {
				ctx.uiWorkspace.startSession(workspaceId);
			};
			ctx.slots.inject("main", () =>
				ctx.slots.register(
					{
						name: "main",
						key: PANEL_ID,
						locale: NS,
						inject: () => ({
							openSession,
							startSession,
							sessionList: ctx.sessions.list,
							sessionService: ctx.sessions,
						}),
					},
					TokenUsagePanel,
				),
			);
			ctx.slots.inject("sidebar.panellist", () =>
				ctx.slots.register(
					{
						name: "sidebar.panellist",
						id: PANEL_ID,
						order: 20,
						locale: NS,
						label: () => ctx.locale.bind(NS)("panel"),
					},
					TokenUsageIcon,
				),
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
