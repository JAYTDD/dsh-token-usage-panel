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
			Modal,
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
		 * Soft token-threshold persistence. Kept off the filters blob so resetting
		 * filters or restoring a saved view cannot clear a budget.
		 */
		const THRESHOLD_KEY = "dsh-token-usage-panel.thresholds.v1";
		/** Days of `tokenUsageByRouteByDay` the Host retains; the client uses this to detect coverage gaps. */
		const ROUTE_DAY_RETENTION = 90;
		/** Cap on named filter views stored beside the live filters. */
		const SAVED_VIEW_LIMIT = 5;
		/** Inclusive maximum length of a saved-view name, after trim. */
		const SAVED_VIEW_NAME_MAX = 32;
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
			/**
			 * The headline count-up: how long one run takes, in milliseconds.
			 *
			 * Every duration the panel animates lives in this table, so retiming the count-up
			 * is one edit here rather than a literal buried in the component. Whether a change
			 * may animate at all is a separate question, answered by `COUNT_UP_MS`.
			 */
			countUp: 240,
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
		 * Distinct from `MOTION.countUp`, which is how long one count-up runs: this is the
		 * window during which a further change is still treated as user-initiated. It is
		 * the panel's one animation that writes React state on every frame, so it is
		 * deliberately NOT opened by live data ticks: the render gate asserts that one real
		 * usage change costs at most two renders.
		 */
		const COUNT_UP_MS = 320;
		/**
		 * Row count above which the table renders only the visible window.
		 *
		 * Unreachable today — pagination caps a page at `PAGE_SIZE` rows, well under this
		 * threshold — but kept as the guard for the windowing math rather than removed, as
		 * `README.md` documents.
		 */
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
		const SORT_KEYS = ["total", "input", "cacheRead", "cacheReadRate", "cacheWrite", "output", "title", "recent"];
		/** Range filter values. `today` is accepted only so a stored v3 value can be rewritten to `7d`. */
		const RANGES = ["all", "7d", "30d", "90d"];
		/** Range choices in the header, left to right. */
		const HEADER_RANGES = ["7d", "30d", "90d", "all"];
		/** The panel's two views: the charts, and the session table. */
		const VIEWS = ["overview", "sessions"];
		/** Trend chart windows, in days. Kept so a stored `trendDays` still normalizes. */
		const TREND_RANGES = [7, 30];
		/** Columns that stay off until the reader asks for the composition. */
		const BUCKET_COLUMN_KEYS = new Set(["share", "input", "cacheRead", "cacheWrite", "output"]);
		/** Weeks rendered by the activity grid (about a year, like the reference design). */
		const HEATMAP_WEEKS = 53;
		/** Calendar width before the wrapper is measured, and the narrowest it is drawn (it scrolls below this). */
		const HEATMAP_DEFAULT_WIDTH = 980;
		const HEATMAP_FLOOR = 560;
		/**
		 * Palette for the per-model series.
		 *
		 * Eight distinguishable hues were needed and the theme exposes only a handful of
		 * state colours, so this stays a dedicated palette — but named as CSS custom
		 * properties rather than literal hex. SVG `stroke`/`fill` accept a `var()`
		 * reference, so naming them lets the stylesheet substitute a light-theme set: every
		 * literal here scores only 1.88-3.09:1 against white, which is unusable for the
		 * thin strokes and small donut arcs they paint. The originals, tuned for the dark
		 * surface, are the `--dsh-tup-c*` / `--dsh-tup-other` / `--dsh-tup-heat` defaults in
		 * the emitted stylesheet (`src/50-css.js`, which ships only inside `lib/client.js`).
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
			{ key: "session", labelKey: "col.session", sortKey: "title", className: "dshTup_colSession" },
			{ key: "total", labelKey: "col.total", sortKey: "total" },
			{ key: "updated", labelKey: "col.updated", sortKey: "recent" },
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
			/** When true the table also renders share and the four billing buckets. */
			showBuckets: false,
			/**
			 * Named snapshots of the live filters. Lives on the same blob so one write
			 * path persists both; reset copies this array across rather than wiping it.
			 */
			savedViews: Object.freeze([]),
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
		 * A share of a total, as a percentage.
		 *
		 * A real but tiny share must not print as `0.0%`: a route that spent anything at
		 * all is not nothing, and rounding it to zero hides the row it belongs to. The
		 * precision therefore widens as the value shrinks, and below the smallest step the
		 * string says so rather than claiming a value it cannot show. Trailing zeros are
		 * dropped so the column does not read as a wall of `.0`.
		 *
		 * @param value - the ratio (0.338 for 33.8%), not the percentage.
		 * @returns the percentage string.
		 */
		function formatShare(value) {
			const percent = Number.isFinite(value) ? Math.max(0, value) * 100 : 0;
			if (percent <= 0) return "0%";
			if (percent < 0.01) return "<0.01%";
			const text = percent.toFixed(percent >= 1 ? 1 : 2);
			return (text.indexOf(".") === -1 ? text : text.replace(/\.?0+$/, "")) + "%";
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
		
		/**
		 * Clamp a dragged column width to the table's bounds.
		 *
		 * The floor keeps a numeric column readable and the ceiling keeps one column from
		 * starving the rest; both the drag handler and the persisted-filter validator need
		 * the same two bounds, so they share this rather than repeating the pair.
		 * @param width - the candidate pixel width.
		 * @returns the width within `COLUMN_WIDTH_LIMITS`.
		 */
		function clampColumnWidth(width) {
			return clamp(width, COLUMN_WIDTH_LIMITS.min, COLUMN_WIDTH_LIMITS.max);
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
		
		/**
		 * Readable token-composition ratios. These describe the recorded token buckets,
		 * not provider-side request cache hit rates.
		 */
		function efficiencyOf(usage) {
			const input = billedInput(usage);
			const total = totalOf(usage);
			return {
				input,
				cacheReadRate: input > 0 ? usage.cacheReadTokens / input : 0,
				cacheWriteRate: input > 0 ? usage.cacheWriteTokens / input : 0,
				outputRate: total > 0 ? usage.outputTokens / total : 0,
			};
		}
		
		/** Total tokens billed for one usage value. */
		function totalOf(usage) {
			return billedInput(usage) + usage.outputTokens;
		}
		
		/**
		 * Total tokens across a breakdown's routes.
		 *
		 * The donut and the per-model band both need "how much did all these routes spend
		 * together", so the walk lives here rather than being respelled at each call site.
		 * @param routes - breakdown routes, each carrying a `tokens` usage value.
		 * @returns the summed total.
		 */
		function totalOfRoutes(routes) {
			let total = 0;
			for (const route of routes) total += totalOf(route.tokens);
			return total;
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
			return { ...DEFAULT_FILTERS, columnWidths: {}, savedViews: [] };
		}
		
		/**
		 * Known in-bounds column widths, or undefined when `value` is not a width map.
		 * Extra keys and non-numeric widths are dropped rather than poisoning the table.
		 * @param value - candidate map.
		 * @returns a fresh width table, or undefined when the value is not a map.
		 */
		function readColumnWidths(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
			const next = {};
			const known = new Set(COLUMNS.map((column) => column.key));
			for (const [key, width] of Object.entries(value)) {
				if (!known.has(key)) continue;
				if (typeof width !== "number" || !Number.isFinite(width)) continue;
				next[key] = clampColumnWidth(Math.round(width));
			}
			return next;
		}
		
		/**
		 * A saved-view name: trimmed, 1-32 characters. Anything else is rejected.
		 * @param value - raw prompt or persisted string.
		 * @returns the name, or undefined when unusable.
		 */
		function normalizeViewName(value) {
			if (typeof value !== "string") return undefined;
			const name = value.trim();
			if (name.length < 1 || name.length > SAVED_VIEW_NAME_MAX) return undefined;
			return name;
		}
		
		/**
		 * The fields a named view is allowed to remember. Query, view, paging and
		 * animation stay on the live panel so a restore cannot yank the reader around
		 * or replay a search they just typed.
		 * @param filters - live filters or a saved entry.
		 * @returns a fresh snapshot object.
		 */
		function viewSnapshotOf(filters) {
			return {
				range: filters.range,
				cwd: filters.cwd,
				sortKey: filters.sortKey,
				sortDesc: filters.sortDesc,
				topLevelOnly: filters.topLevelOnly,
				usedOnly: filters.usedOnly,
				model: filters.model,
				day: filters.day,
				showBuckets: filters.showBuckets,
				columnWidths: { ...(filters.columnWidths ?? {}) },
			};
		}
		
		/**
		 * Whether two snapshots describe the same filters, widths included.
		 * @param left - a snapshot.
		 * @param right - a snapshot.
		 * @returns true when every stored field matches.
		 */
		function snapshotsEqual(left, right) {
			if (
				left.range !== right.range ||
				left.cwd !== right.cwd ||
				left.sortKey !== right.sortKey ||
				left.sortDesc !== right.sortDesc ||
				left.topLevelOnly !== right.topLevelOnly ||
				left.usedOnly !== right.usedOnly ||
				left.model !== right.model ||
				left.day !== right.day ||
				left.showBuckets !== right.showBuckets
			) {
				return false;
			}
			const leftKeys = Object.keys(left.columnWidths);
			const rightKeys = Object.keys(right.columnWidths);
			if (leftKeys.length !== rightKeys.length) return false;
			return leftKeys.every((key) => left.columnWidths[key] === right.columnWidths[key]);
		}
		
		/**
		 * Validate one named view. Missing fields, a bad name, or a non-map of widths
		 * drop the entry rather than filling defaults — a half-applied view would lie.
		 * @param value - parsed JSON.
		 * @returns a complete view, or undefined when unusable.
		 */
		function normalizeSavedView(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
			const name = normalizeViewName(value.name);
			if (name === undefined) return undefined;
			const range = value.range === "today" ? "7d" : value.range;
			if (!RANGES.includes(range)) return undefined;
			if (typeof value.cwd !== "string") return undefined;
			if (!SORT_KEYS.includes(value.sortKey)) return undefined;
			if (typeof value.sortDesc !== "boolean") return undefined;
			if (typeof value.topLevelOnly !== "boolean") return undefined;
			if (typeof value.usedOnly !== "boolean") return undefined;
			if (typeof value.model !== "string") return undefined;
			if (!(value.day === null || (typeof value.day === "number" && Number.isInteger(value.day) && value.day >= 0))) return undefined;
			if (typeof value.showBuckets !== "boolean") return undefined;
			const columnWidths = readColumnWidths(value.columnWidths);
			if (columnWidths === undefined) return undefined;
			return {
				name,
				range,
				cwd: value.cwd,
				sortKey: value.sortKey,
				sortDesc: value.sortDesc,
				topLevelOnly: value.topLevelOnly,
				usedOnly: value.usedOnly,
				model: value.model,
				day: value.day,
				showBuckets: value.showBuckets,
				columnWidths,
			};
		}
		
		/**
		 * Keep at most five uniquely named, well-shaped views, in listed order.
		 * @param value - parsed JSON.
		 * @returns a fresh array, empty when unusable.
		 */
		function normalizeSavedViews(value) {
			if (!Array.isArray(value)) return [];
			const seen = new Set();
			const next = [];
			for (const item of value) {
				if (next.length >= SAVED_VIEW_LIMIT) break;
				const view = normalizeSavedView(item);
				if (view === undefined || seen.has(view.name)) continue;
				seen.add(view.name);
				next.push(view);
			}
			return next;
		}
		
		/**
		 * Persist the current snapshot under `name`, replacing a view of the same name.
		 * Invalid names and a full library are no-ops.
		 * @param filters - live filters.
		 * @param name - raw name from the prompt.
		 * @returns the next filter object.
		 */
		function addSavedView(filters, name) {
			const normalized = normalizeViewName(name);
			if (normalized === undefined) return filters;
			const views = normalizeSavedViews(filters.savedViews);
			const entry = { name: normalized, ...viewSnapshotOf(filters) };
			const index = views.findIndex((view) => view.name === normalized);
			if (index >= 0) {
				const next = views.slice();
				next[index] = entry;
				return { ...filters, savedViews: next };
			}
			if (views.length >= SAVED_VIEW_LIMIT) return filters;
			return { ...filters, savedViews: [...views, entry] };
		}
		
		/**
		 * Overlay one saved snapshot onto the live filters, leaving query and view.
		 * @param filters - live filters.
		 * @param index - index in `savedViews`.
		 * @returns the next filter object.
		 */
		function applySavedView(filters, index) {
			const views = Array.isArray(filters.savedViews) ? filters.savedViews : [];
			const view = views[index];
			if (view === undefined) return filters;
			const snapshot = viewSnapshotOf(view);
			return { ...filters, ...snapshot, columnWidths: { ...snapshot.columnWidths } };
		}
		
		/**
		 * Drop one saved view. The live filters stay as they are.
		 * @param filters - live filters.
		 * @param index - index in `savedViews`.
		 * @returns the next filter object.
		 */
		function removeSavedView(filters, index) {
			const views = Array.isArray(filters.savedViews) ? filters.savedViews : [];
			if (!Number.isInteger(index) || index < 0 || index >= views.length) return filters;
			return { ...filters, savedViews: views.filter((_, current) => current !== index) };
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
			if (value.range === "today") next.range = "7d";
			else if (RANGES.includes(value.range)) next.range = value.range;
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
			if (typeof value.showBuckets === "boolean") next.showBuckets = value.showBuckets;
			// Only known columns, only in-bounds integers: a hand-edited width must never
			// be able to collapse a column to nothing or blow past the panel.
			const widths = readColumnWidths(value.columnWidths);
			if (widths !== undefined) next.columnWidths = widths;
			next.savedViews = normalizeSavedViews(value.savedViews);
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
		 * The view, the stored trend window, and the composition-column toggle are
		 * presentation choices, not filters: they are excluded so the reset control does
		 * not look active just because someone opened the charts, and so resetting
		 * filters does not bounce the user back to the other view.
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
				showBuckets: filters.showBuckets,
				savedViews: normalizeSavedViews(filters.savedViews),
			};
		}
		
		/**
		 * The columns to render, each carrying its resolved pixel width.
		 * @param filters - current filter set.
		 * @returns column definitions carrying a resolved `width`.
		 */
		function orderedColumns(filters) {
			return COLUMNS.filter((column) => filters.showBuckets === true || !BUCKET_COLUMN_KEYS.has(column.key)).map((column) => ({
				...column,
				width: filters.columnWidths[column.key] ?? COLUMN_DEFAULT_WIDTHS[column.key] ?? COLUMN_WIDTH_LIMITS.min,
				// The session column absorbs the pane's spare width until the reader drags it;
				// otherwise `table-layout:fixed` spreads the surplus across the numeric columns.
				fluid: column.key === "session" && filters.columnWidths.session === undefined,
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
		 * comparator does no arithmetic. `7d` / `30d` / `90d` keep sessions that spent
		 * tokens inside the usage window; a day chip is more specific and wins over the window.
		 *
		 * @param rows - every projected row.
		 * @param filters - current filter set.
		 * @param today - the Host's current day index, for the usage window.
		 * @returns the matching rows in display order.
		 */
		function selectRows(rows, filters, today) {
			const window = usageWindowOf(filters.range, today);
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
				} else if (window !== null && !rowHasUsageInWindow(row, window.fromDay, window.toDay)) {
					continue;
				}
				if (needle !== "") {
					const haystack = (row.title ?? "") + " " + row.id + " " + (row.cwd ?? "");
					if (!haystack.toLowerCase().includes(needle)) continue;
				}
				const usage =
					day !== null
						? usageInWindow(row, day, day)
						: window !== null
							? usageInWindow(row, window.fromDay, window.toDay)
							: row.usage;
				const total = usage === undefined ? undefined : totalOf(usage);
				if (usedOnly && (total === undefined || total === 0)) continue;
				decorated.push({ row, measure: measureOf(usage, filters.sortKey, total) });
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
		 * @param usage - the usage the current window (or lifetime) attributes to the row.
		 * @param key - sort key.
		 * @param total - the row's total, already computed by the caller.
		 * @returns the comparable measure.
		 */
		function measureOf(usage, key, total) {
			if (total === undefined || usage === undefined) return -1;
			if (key === "total") return total;
			if (key === "input") return usage.uncachedInputTokens;
			if (key === "cacheRead") return usage.cacheReadTokens;
			if (key === "cacheReadRate") return efficiencyOf(usage).cacheReadRate;
			if (key === "cacheWrite") return usage.cacheWriteTokens;
			if (key === "output") return usage.outputTokens;
			return 0;
		}
		//#endregion

		/**
		 * Soft token thresholds: a local, no-money budget the panel checks when it
		 * opens or refreshes. Stored beside the filters, never inside them, so reset
		 * and saved views cannot clear a budget. There is no background notification.
		 */
		function freshThresholds() {
			return { day: null, week: null, session: null };
		}

		/**
		 * A positive integer threshold, or null to disable that dimension.
		 * Zero, negatives, fractions, and non-numbers become null (off), not a throw.
		 * @param value - raw JSON field.
		 * @returns a positive safe integer, or null.
		 */
		function readThresholdNumber(value) {
			if (value === null || value === undefined) return null;
			if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return null;
			return value;
		}

		/**
		 * Validate a persisted threshold blob. Unknown keys are ignored; a bad shape
		 * drops the whole object so a half-applied budget cannot silently lie.
		 * @param value - parsed JSON.
		 * @returns `{ day, week, session }` each `number | null`, or undefined.
		 */
		function normalizeThresholds(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
			return {
				day: readThresholdNumber(value.day),
				week: readThresholdNumber(value.week),
				session: readThresholdNumber(value.session),
			};
		}

		/** Read the persisted thresholds, or all-off. */
		function loadThresholds() {
			try {
				const raw = window.localStorage.getItem(THRESHOLD_KEY);
				if (raw === null) return freshThresholds();
				return normalizeThresholds(JSON.parse(raw)) ?? freshThresholds();
			} catch {
				return freshThresholds();
			}
		}

		/** Persist the thresholds; a failure only loses the preference. */
		function saveThresholds(thresholds) {
			try {
				window.localStorage.setItem(THRESHOLD_KEY, JSON.stringify(thresholds));
			} catch {
				/* private mode or quota: the panel keeps working without persistence */
			}
		}

		/**
		 * Parse one draft field. Empty means off; anything other than a positive
		 * integer is unusable so the caller can refuse to save.
		 * @param raw - the input value.
		 * @returns a positive integer, null (off), or undefined (invalid).
		 */
		function parseThresholdInput(raw) {
			if (typeof raw !== "string") return undefined;
			const text = raw.trim();
			if (text === "") return null;
			if (!/^[1-9][0-9]{0,14}$/.test(text)) return undefined;
			const value = Number(text);
			if (!Number.isSafeInteger(value) || value < 1) return undefined;
			return value;
		}

		/** String draft of a stored threshold set, for the settings dialog. */
		function draftOfThresholds(thresholds) {
			return {
				day: thresholds.day === null ? "" : String(thresholds.day),
				week: thresholds.week === null ? "" : String(thresholds.week),
				session: thresholds.session === null ? "" : String(thresholds.session),
			};
		}

		/**
		 * Commit a settings draft, or undefined when any field is unusable.
		 * @param draft - `{ day, week, session }` strings.
		 * @returns a threshold object, or undefined.
		 */
		function thresholdsFromDraft(draft) {
			const day = parseThresholdInput(draft.day);
			const week = parseThresholdInput(draft.week);
			const session = parseThresholdInput(draft.session);
			if (day === undefined || week === undefined || session === undefined) return undefined;
			return { day, week, session };
		}

		/**
		 * Which configured thresholds the unfiltered corpus currently crosses.
		 *
		 * Day = today's Host-day total. Week = the trailing 7 Host days (same span as
		 * `range.7d`). Session = the largest lifetime `tokenUsage` of any row. Search,
		 * directory, model, and day chips are ignored: a budget watches real spend.
		 *
		 * @param rows - every projected row.
		 * @param thresholds - `{ day, week, session }` each `number | null`.
		 * @param today - the Host's current day index.
		 * @returns `{ kind, used, limit, title? }[]`.
		 */
		function thresholdHits(rows, thresholds, today) {
			const hits = [];
			if (thresholds.day === null && thresholds.week === null && thresholds.session === null) return hits;
			if (thresholds.day !== null) {
				const used = totalOf(sumUsageInWindow(rows, today, today));
				if (used >= thresholds.day) hits.push({ kind: "day", used, limit: thresholds.day });
			}
			if (thresholds.week !== null) {
				const used = totalOf(sumUsageInWindow(rows, today - 6, today));
				if (used >= thresholds.week) hits.push({ kind: "week", used, limit: thresholds.week });
			}
			if (thresholds.session !== null) {
				let used = 0;
				let title = "";
				for (const row of rows) {
					const total = row.usage === undefined ? 0 : totalOf(row.usage);
					if (total > used) {
						used = total;
						title = row.title === undefined || row.title === "" ? row.id : row.title;
					}
				}
				if (used >= thresholds.session) hits.push({ kind: "session", used, limit: thresholds.session, title });
			}
			return hits;
		}

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
		function displayOf(row, t, usageOverride) {
			if (usageOverride === undefined) {
				const cached = displayCache.get(row);
				if (cached !== undefined) return cached;
			}
			const usage = usageOverride !== undefined ? usageOverride : row.usage;
			const total = usage === undefined ? undefined : totalOf(usage);
			const efficiency = usage === undefined ? undefined : efficiencyOf(usage);
			const directory = leafName(row.cwd);
			const record = {
				total: total === undefined ? t("never") : formatInt(total),
				input: usage === undefined ? t("never") : formatInt(usage.uncachedInputTokens),
				cacheRead: usage === undefined ? t("never") : formatInt(usage.cacheReadTokens),
				cacheWrite: usage === undefined ? t("never") : formatInt(usage.cacheWriteTokens),
				output: usage === undefined ? t("never") : formatInt(usage.outputTokens),
				cacheReadRate: efficiency === undefined ? t("never") : formatShare(efficiency.cacheReadRate),
				directory,
				turns: row.stats === undefined ? undefined : t("col.turns") + " " + formatInt(row.stats.turns),
				status: total === undefined ? t("missing") : total === 0 ? t("zero") : undefined,
				updatedAt: formatTime(row.updatedAt),
				tooltip: (row.title ?? t("unknownTitle")) + "\n" + row.id + "\n" + formatFullTime(row.updatedAt),
			};
			if (usageOverride === undefined) displayCache.set(row, record);
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
		
		/**
		 * Identify unusually high days from up to 28 preceding active days. A median
		 * resists one-off spikes, and seven samples are required before any day is
		 * labelled so a new installation does not manufacture anomalies.
		 */
		function anomaliesOf(byDay) {
			const days = [...byDay.keys()].sort((left, right) => left - right);
			const anomalies = new Map();
			for (let index = 0; index < days.length; index += 1) {
				const day = days[index];
				const value = totalOf(byDay.get(day));
				if (value <= 0) continue;
				const samples = [];
				for (let cursor = Math.max(0, index - 28); cursor < index; cursor += 1) {
					const candidate = totalOf(byDay.get(days[cursor]));
					if (candidate > 0) samples.push(candidate);
				}
				if (samples.length < 7) continue;
				samples.sort((left, right) => left - right);
				const middle = Math.floor(samples.length / 2);
				const median = samples.length % 2 === 0 ? (samples[middle - 1] + samples[middle]) / 2 : samples[middle];
				if (median > 0 && value >= median * 2) anomalies.set(day, { value, median });
			}
			return anomalies;
		}
		
		/**
		 * The Host UTC offset carried by the first row that has one.
		 * @param rows - projected rows.
		 * @returns minutes east of UTC, or 0 when none of the rows know.
		 */
		function hostOffsetMinutes(rows) {
			for (const row of rows) {
				const value = row.dayUsage;
				if (value === undefined) continue;
				if (typeof value.offsetMinutes === "number" && Number.isFinite(value.offsetMinutes)) return value.offsetMinutes;
			}
			return 0;
		}
		
		/**
		 * The inclusive Host-day window a range names, or null for lifetime (`all`).
		 * @param range - `all` | `7d` | `30d` | `90d`.
		 * @param today - the Host's current day index.
		 * @returns `{ fromDay, toDay }` or null.
		 */
		function usageWindowOf(range, today) {
			if (range === "7d") return { fromDay: today - 6, toDay: today };
			if (range === "30d") return { fromDay: today - 29, toDay: today };
			if (range === "90d") return { fromDay: today - (ROUTE_DAY_RETENTION - 1), toDay: today };
			return null;
		}
		
		/**
		 * The equal-length window immediately before `window`.
		 * @param window - `{ fromDay, toDay }`.
		 * @returns the previous window, or null when there is no current one.
		 */
		function previousUsageWindow(window) {
			if (window === null || window === undefined) return null;
			const span = window.toDay - window.fromDay + 1;
			return { fromDay: window.fromDay - span, toDay: window.fromDay - 1 };
		}
		
		/**
		 * One row's token buckets inside an inclusive day span.
		 * @param row - projected row.
		 * @param fromDay - inclusive start.
		 * @param toDay - inclusive end.
		 * @returns the summed buckets, or undefined when the row has no day breakdown.
		 */
		function usageInWindow(row, fromDay, toDay) {
			const days = row.dayUsage === undefined ? undefined : row.dayUsage.days;
			if (days === undefined) return undefined;
			const total = zeroUsage();
			for (const entry of days) {
				if (entry.day < fromDay || entry.day > toDay) continue;
				addInto(total, entry.tokens);
			}
			return total;
		}
		
		/**
		 * Whether a row spent any tokens inside an inclusive day span.
		 * @param row - projected row.
		 * @param fromDay - inclusive start.
		 * @param toDay - inclusive end.
		 * @returns true when at least one day in the span has a positive total.
		 */
		function rowHasUsageInWindow(row, fromDay, toDay) {
			const days = row.dayUsage === undefined ? undefined : row.dayUsage.days;
			if (days === undefined) return false;
			for (const entry of days) {
				if (entry.day < fromDay || entry.day > toDay) continue;
				if (totalOf(entry.tokens) > 0) return true;
			}
			return false;
		}
		
		/**
		 * Sum usage over rows. With a window, each row contributes its day buckets in
		 * that span; without one, each row contributes its lifetime `tokenUsage`.
		 * @param rows - projected rows.
		 * @param fromDay - inclusive start, or null/undefined for lifetime.
		 * @param toDay - inclusive end, or null/undefined for lifetime.
		 * @returns the four summed counters.
		 */
		function sumUsageInWindow(rows, fromDay, toDay) {
			if (fromDay === null || fromDay === undefined || toDay === null || toDay === undefined) {
				return sumUsages(rows.map((row) => row.usage ?? ZERO_USAGE));
			}
			const total = zeroUsage();
			for (const row of rows) {
				const usage = usageInWindow(row, fromDay, toDay);
				if (usage === undefined) continue;
				addInto(total, usage);
			}
			return total;
		}
		
		/**
		 * Sum the calendar's per-day totals over an inclusive span.
		 * @param byDay - day index → tokens.
		 * @param fromDay - inclusive start.
		 * @param toDay - inclusive end.
		 * @returns the summed total.
		 */
		function sumDaysBetween(byDay, fromDay, toDay) {
			let total = 0;
			for (let day = fromDay; day <= toDay; day += 1) {
				const tokens = byDay.get(day);
				if (tokens === undefined) continue;
				total += totalOf(tokens);
			}
			return total;
		}
		
		/**
		 * The day indices the trend draws for a range.
		 *
		 * `7d` / `30d` / `90d` are a trailing window ending today. `all` runs from the
		 * earliest day that has usage to today, capped at 366.
		 *
		 * @param range - `all` | `7d` | `30d` | `90d`.
		 * @param today - the Host's current day index.
		 * @param byDay - day index → tokens.
		 * @returns the day indices, ascending.
		 */
		function trendDaysOf(range, today, byDay) {
			if (range === "7d") return rangeDays(today, 7);
			if (range === "30d") return rangeDays(today, 30);
			if (range === "90d") return rangeDays(today, ROUTE_DAY_RETENTION);
			let first = today;
			let any = false;
			for (const [day, tokens] of byDay) {
				if (totalOf(tokens) <= 0) continue;
				any = true;
				if (day < first) first = day;
			}
			if (!any) return rangeDays(today, 1);
			return rangeDays(today, Math.min(366, Math.max(1, today - first + 1)));
		}
		
		/**
		 * Per-day totals over a window, for the single trend line.
		 * @param byDay - day index → tokens.
		 * @param days - the day indices in the window, ascending.
		 * @returns day → total.
		 */
		function totalsByDay(byDay, days) {
			const values = new Map();
			for (const day of days) {
				const tokens = byDay.get(day);
				if (tokens === undefined) continue;
				const total = totalOf(tokens);
				if (total > 0) values.set(day, total);
			}
			return values;
		}
		
		/**
		 * Merge per-model usage. With a window this walks `tokenUsageByRouteByDay`;
		 * without one it uses the lifetime `tokenUsageByRoute` breakdown.
		 * @param rows - projected rows.
		 * @param fromDay - inclusive start, or null/undefined for lifetime.
		 * @param toDay - inclusive end, or null/undefined for lifetime.
		 * @returns `{ routes }` or undefined when nothing has model data.
		 */
		function aggregateRoutesInWindow(rows, fromDay, toDay) {
			if (fromDay === null || fromDay === undefined || toDay === null || toDay === undefined) return aggregateRoutes(rows);
			const merged = new Map();
			for (const row of rows) {
				const value = row.routeDayUsage;
				if (value === undefined) continue;
				for (const day of value.days) {
					if (day.day < fromDay || day.day > toDay) continue;
					for (const route of day.routes) {
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
			}
			if (merged.size === 0) return undefined;
			const routes = [...merged.values()];
			routes.sort((left, right) => totalOf(right.tokens) - totalOf(left.tokens) || left.model.localeCompare(right.model));
			return { routes };
		}
		
		/**
		 * Whether this row's per-model-by-day window is missing a day that the per-day
		 * totals still have, inside the Host retention span.
		 *
		 * Old checkpoints were pruned at 31 days. After the window grew to 90 those
		 * days stay absent until a projection refresh rebuilds them; treating the
		 * truncated block as complete would under-count model hover and the 90-day
		 * rank. Missing units are a different case (`needsRead` already queues those).
		 *
		 * @param row - projected row.
		 * @param today - the Host's current day index.
		 * @returns true when a billed day in the retention window has no route-by-day row.
		 */
		function routeDayCoverageGap(row, today) {
			const dayUsage = row.dayUsage;
			const routeDay = row.routeDayUsage;
			if (dayUsage === undefined || routeDay === undefined) return false;
			const from = today - (ROUTE_DAY_RETENTION - 1);
			const covered = new Set();
			for (const entry of routeDay.days) covered.add(entry.day);
			for (const entry of dayUsage.days) {
				if (entry.day < from || entry.day > today) continue;
				if (totalOf(entry.tokens) <= 0) continue;
				if (!covered.has(entry.day)) return true;
			}
			return false;
		}
		
		/**
		 * How many days in an inclusive span have token totals but no per-model detail.
		 * @param rows - projected rows.
		 * @param fromDay - inclusive start.
		 * @param toDay - inclusive end.
		 * @returns the number of uncovered days.
		 */
		function routeDayCoverageMissing(rows, fromDay, toDay) {
			if (fromDay === null || fromDay === undefined || toDay === null || toDay === undefined) return 0;
			const daysWithUsage = new Set();
			const daysWithRoutes = new Set();
			for (const row of rows) {
				if (row.dayUsage !== undefined) {
					for (const entry of row.dayUsage.days) {
						if (entry.day < fromDay || entry.day > toDay) continue;
						if (totalOf(entry.tokens) > 0) daysWithUsage.add(entry.day);
					}
				}
				if (row.routeDayUsage !== undefined) {
					for (const entry of row.routeDayUsage.days) {
						if (entry.day < fromDay || entry.day > toDay) continue;
						if (entry.routes.some((route) => totalOf(route.tokens) > 0)) daysWithRoutes.add(entry.day);
					}
				}
			}
			let missing = 0;
			for (const day of daysWithUsage) if (!daysWithRoutes.has(day)) missing += 1;
			return missing;
		}
		
		/** Header cells for the four billing buckets plus the total, in export order. */
		function exportBucketHeader(t) {
			return [t("col.input"), t("col.cacheRead"), t("col.cacheWrite"), t("col.output"), t("col.total")];
		}
		
		/** Raw bucket integers (or blanks) matching `exportBucketHeader`. */
		function exportBucketCells(usage) {
			if (usage === undefined) return ["", "", "", "", ""];
			return [usage.uncachedInputTokens, usage.cacheReadTokens, usage.cacheWriteTokens, usage.outputTokens, totalOf(usage)];
		}
		
		/**
		 * Session export: every matched row (tree order, including collapsed children),
		 * always with the four raw buckets. Independent of `showBuckets`.
		 * @param nodes - `flattenAll` result.
		 * @param fromDay - inclusive start, or undefined for lifetime.
		 * @param toDay - inclusive end, or undefined for lifetime.
		 * @param t - translate seat.
		 * @returns `string[][]` including a header row.
		 */
		function exportSessionLines(nodes, fromDay, toDay, t) {
			const lines = [[t("col.session"), t("col.id"), t("col.updated"), ...exportBucketHeader(t)]];
			for (const node of nodes) {
				const row = node.row;
				const usage = fromDay === undefined || toDay === undefined ? row.usage : usageInWindow(row, fromDay, toDay);
				const updated = typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt) && row.updatedAt > 0 ? new Date(row.updatedAt).toISOString() : "";
				lines.push([row.title !== undefined && row.title !== "" ? row.title : t("unknownTitle"), row.id, updated, ...exportBucketCells(usage)]);
			}
			return lines;
		}
		
		/**
		 * Daily export of the current filtered set in the current window.
		 * `all` emits every calendar day that has usage.
		 * @param rows - filtered rows.
		 * @param fromDay - inclusive start, or undefined for lifetime.
		 * @param toDay - inclusive end, or undefined for lifetime.
		 * @param offsetMinutes - Host UTC offset, for ISO dates.
		 * @param t - translate seat.
		 * @returns `string[][]` including a header row.
		 */
		function exportDayLines(rows, fromDay, toDay, offsetMinutes, t) {
			const calendar = aggregateDays(rows);
			const lines = [[t("export.col.date"), ...exportBucketHeader(t)]];
			const days = [];
			if (fromDay === undefined || toDay === undefined) {
				for (const [day, tokens] of calendar.byDay) {
					if (totalOf(tokens) > 0) days.push(day);
				}
				days.sort((left, right) => left - right);
			} else {
				for (let day = fromDay; day <= toDay; day += 1) {
					const tokens = calendar.byDay.get(day);
					if (tokens === undefined || totalOf(tokens) <= 0) continue;
					days.push(day);
				}
			}
			for (const day of days) lines.push([formatDayIso(day, offsetMinutes), ...exportBucketCells(calendar.byDay.get(day))]);
			return lines;
		}
		
		/**
		 * Per-model export of the current filtered set in the current window.
		 * `all` uses lifetime `tokenUsageByRoute`, never a fake year of route-by-day.
		 * @param rows - filtered rows.
		 * @param fromDay - inclusive start, or undefined for lifetime.
		 * @param toDay - inclusive end, or undefined for lifetime.
		 * @param t - translate seat.
		 * @returns `string[][]` including a header row.
		 */
		function exportModelLines(rows, fromDay, toDay, t) {
			const breakdown = aggregateRoutesInWindow(rows, fromDay, toDay);
			const lines = [[t("export.col.provider"), t("export.col.model"), t("filter.model"), ...exportBucketHeader(t)]];
			if (breakdown === undefined) return lines;
			for (const route of breakdown.routes) {
				lines.push([route.provider, route.model, routeLabel(route), ...exportBucketCells(route.tokens)]);
			}
			return lines;
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
			const needsRead = (row, today) => {
				if (row.blank) return false;
				if (row.usage === undefined) return true;
				if (hostUnits === "no") return false;
				// Every value the panel displays is a read requirement, so this list must
				// name each projected unit the row field depends on. Dropping one here
				// leaves cache rows written before it silently under-reported.
				if (row.routeUsage === undefined || row.dayUsage === undefined || row.routeDayUsage === undefined) return true;
				return routeDayCoverageGap(row, today);
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
				const today = currentDayIndex(hostOffsetMinutes(rows));
				for (const row of rows) {
					if (!needsRead(row, today)) continue;
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
			const today = currentDayIndex(hostOffsetMinutes(rows));
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
				if (needsRead(row, today) && row.attempt === undefined) waiting += 1;
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
		 * Nest matched session rows under their projected `parentId`.
		 *
		 * This is a read-only overlay on the already-filtered list. It never writes
		 * `children` onto a projected row — a parent identity must stay stable when a
		 * child ticks, or the 300-row identity gate would miss. Cycles, self-parents,
		 * and missing parents become roots so the table still lists every matched
		 * session. Family totals are derived here for display only; callers must keep
		 * summing each session once.
		 */
		/** Indent steps beyond the first, so a deep nest cannot shove the title away. */
		const TREE_INDENT_CAP = 3;

		/**
		 * The parent id to nest under, or null when this row should be a root.
		 *
		 * A missing parent, a self-reference, or a cycle among currently present ids
		 * all become roots: the table still lists the session instead of dropping it
		 * or looping. The row keeps its original `parentId` so the subagent badge
		 * still shows.
		 *
		 * @param id - session id.
		 * @param parentOf - id → parentId (string or undefined).
		 * @param present - ids in the current matched set.
		 * @returns the parent id to nest under, or null.
		 */
		function resolvedParentId(id, parentOf, present) {
			const parentId = parentOf.get(id);
			if (typeof parentId !== "string" || parentId === id) return null;
			if (!present.has(parentId)) return null;
			const seen = new Set([id]);
			let cursor = parentId;
			while (typeof cursor === "string") {
				if (seen.has(cursor)) return null;
				seen.add(cursor);
				if (!present.has(cursor)) break;
				const next = parentOf.get(cursor);
				if (typeof next !== "string") break;
				cursor = next;
			}
			return parentId;
		}

		/**
		 * Group matched rows into a forest, preserving the caller's sibling order.
		 *
		 * @param rows - already-matched, already-sorted projected rows.
		 * @returns `{ roots, childrenOf, parentOf, present }`.
		 */
		function nestRows(rows) {
			const present = new Set();
			const parentOf = new Map();
			for (const row of rows) {
				present.add(row.id);
				parentOf.set(row.id, row.parentId);
			}
			const childrenOf = new Map();
			const roots = [];
			for (const row of rows) {
				const parentId = resolvedParentId(row.id, parentOf, present);
				if (parentId === null) {
					roots.push(row);
					continue;
				}
				let kids = childrenOf.get(parentId);
				if (kids === undefined) {
					kids = [];
					childrenOf.set(parentId, kids);
				}
				kids.push(row);
			}
			return { roots, childrenOf, parentOf, present };
		}

		/**
		 * Walk the forest into the rows the table should paint.
		 *
		 * Collapsed children are omitted, so pagination can slice this list directly.
		 *
		 * @param roots - top-level rows in display order.
		 * @param childrenOf - parent id → child rows.
		 * @param expandedIds - ids whose children are visible; only `.has` is read.
		 * @returns `{ row, depth, childCount, expanded }[]`.
		 */
		function flattenTree(roots, childrenOf, expandedIds) {
			const out = [];
			const walk = (row, depth) => {
				const kids = childrenOf.get(row.id);
				const childCount = kids === undefined ? 0 : kids.length;
				const expanded = childCount > 0 && expandedIds.has(row.id);
				out.push({ row, depth, childCount, expanded });
				if (expanded) {
					for (const child of kids) walk(child, depth + 1);
				}
			};
			for (const row of roots) walk(row, 1);
			return out;
		}

		/** Like `flattenTree`, but every parent is treated as expanded (export). */
		const ALWAYS_EXPANDED = { has: () => true };

		/**
		 * Flatten the forest with every child included, in tree order.
		 * @param roots - top-level rows in display order.
		 * @param childrenOf - parent id → child rows.
		 * @returns the same node shape as `flattenTree`.
		 */
		function flattenAll(roots, childrenOf) {
			return flattenTree(roots, childrenOf, ALWAYS_EXPANDED);
		}

		/**
		 * Walk from a row toward the roots, nearest parent first.
		 *
		 * Used to expand enough of the tree that a jump can land on a nested row.
		 *
		 * @param id - session id.
		 * @param parentOf - id → parentId.
		 * @param present - ids in the current matched set.
		 * @returns ancestor ids, nearest first.
		 */
		function ancestorIds(id, parentOf, present) {
			const ids = [];
			const seen = new Set();
			let cursor = resolvedParentId(id, parentOf, present);
			while (cursor !== null) {
				if (seen.has(cursor)) break;
				seen.add(cursor);
				ids.push(cursor);
				cursor = resolvedParentId(cursor, parentOf, present);
			}
			return ids;
		}

		/**
		 * Own usage plus every matched descendant's own usage.
		 *
		 * The result is a display figure only. Adding it into a summary would count
		 * descendants twice — once here and once as their own rows.
		 *
		 * @param row - the parent row.
		 * @param childrenOf - parent id → child rows.
		 * @param usageOf - row → windowed usage, or undefined.
		 * @returns summed buckets, or undefined when nobody in the family has usage.
		 */
		function familyUsageOf(row, childrenOf, usageOf) {
			const total = zeroUsage();
			let any = false;
			const add = (node) => {
				const usage = usageOf(node);
				if (usage === undefined) return;
				addInto(total, usage);
				any = true;
			};
			add(row);
			const walk = (id) => {
				const kids = childrenOf.get(id);
				if (kids === undefined) return;
				for (const child of kids) {
					add(child);
					walk(child.id);
				}
			};
			walk(row.id);
			return any ? total : undefined;
		}

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
		 * to 366 / 90 days and therefore legitimately sum to LESS than the total). So for
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
		 * One page, not a stack of boxes. The panel is a continuous data surface: the KPI
		 * strip, the session summary and the per-model breakdown are flat bands separated
		 * by hairlines and whitespace, and only the things that are genuinely a container
		 * — the chart cards and the table — carry a bordered surface. Hierarchy comes from
		 * the type scale and the spacing scale below; colour is spent on two things only,
		 * the data series and a single interaction accent.
		 *
		 * Layout contract (guarded by a static assertion in the self-check): the frame's
		 * centre column is `display:flex; overflow:hidden` with a definite height, so this
		 * panel is a flex column of that same height. Every band except the scrolling view
		 * is `flex:0 0 auto`; each view is its own scrollport and the table band takes its
		 * natural height inside it.
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
			// The type and spacing scales live here, so a size is changed in one place. The
			// motion tokens are repeated from `MOTION` only as the fallback for a stylesheet
			// rendered without the panel's inline properties.
			".dshTup_root{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;container-type:inline-size;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:var(--dsh-tup-fs-base);line-height:1.5;--dsh-tup-row-h:54px;--dsh-tup-hairline:.5px;--dsh-tup-fs-base:14px;--dsh-tup-fs-2xs:11px;--dsh-tup-fs-xs:12px;--dsh-tup-fs-sm:13px;--dsh-tup-fs-lg:15px;--dsh-tup-fs-xl:20px;--dsh-tup-fs-2xl:28px;--dsh-tup-fs-hero:44px;--dsh-tup-sp-1:4px;--dsh-tup-sp-2:8px;--dsh-tup-sp-3:12px;--dsh-tup-sp-4:16px;--dsh-tup-sp-5:24px;--dsh-tup-sp-6:32px;--dsh-tup-fast:140ms;--dsh-tup-base:220ms;--dsh-tup-slow:460ms;--dsh-tup-stagger:16ms;--dsh-tup-ease:cubic-bezier(.22,.61,.36,1);--dsh-tup-settle:cubic-bezier(.16,1,.3,1)}",
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
			"@keyframes dshTup-tipIn{from{opacity:0;transform:translate(var(--dsh-tup-tip-x,-50%),-3px)}to{opacity:1;transform:translate(var(--dsh-tup-tip-x,-50%),0)}}",
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
			".dshTup_root button:active:not(:disabled){transform:scale(.98)}",
			// Inside the sessions scrollport the bands keep their natural height, so no band
			// can squeeze another and the page scrolls instead. Their width comes from the
			// wide-layout region at the end of the sheet — a child selector written here would
			// contain `.dshTup_summary{`, and the self-check reads the first rule carrying a
			// band's selector.
			".dshTup_sessions>.dshTup_chartCard{flex:1 1 100%;margin:var(--dsh-tup-sp-3) 0 0}",
			// Padding-top matches .dshTup_overview so the title does not jump 4px when the
			// view switches between overview and sessions.
			".dshTup_head{flex:0 0 auto;display:flex;align-items:center;gap:var(--dsh-tup-sp-3);flex-wrap:wrap;padding:var(--dsh-tup-sp-6) var(--dsh-tup-sp-6) 0}",
			".dshTup_headMain{display:flex;flex-direction:row;align-items:center;gap:var(--dsh-tup-sp-3);flex-wrap:wrap;min-width:0;flex:1 1 260px}",
			// The title is the only large weight in the shell; the subtitle stays quiet so the
			// two read as a caption pair rather than two competing labels.
			".dshTup_title{margin:0;font-size:var(--dsh-tup-fs-lg);font-weight:600;letter-spacing:-.02em}",
			".dshTup_subtitle{margin:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-sm)}",
			// margin-left:auto keeps the wrapped action row right-aligned under the title
			// instead of dropping to the far left when the head wraps on a narrow pane.
			".dshTup_actions{display:flex;align-items:center;gap:var(--dsh-tup-sp-2);flex:none;margin-left:auto}",
			// A flat band: no border, no fill, no radius. It is separated from what follows by
			// one hairline and from what precedes it by the view's own gap, so the page reads
			// as one surface instead of a column of boxes.
			".dshTup_summary{flex:0 0 auto;display:flex;flex-direction:row;flex-wrap:wrap;align-items:center;gap:var(--dsh-tup-sp-4) var(--dsh-tup-sp-6);margin:var(--dsh-tup-sp-5) 0 0;padding-bottom:var(--dsh-tup-sp-5)}",
			".dshTup_sumHead{display:flex;flex-direction:column;gap:1px;flex:none;min-width:148px}",
			".dshTup_sumLabel{color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-sm)}",
			".dshTup_sumValue{font-size:var(--dsh-tup-fs-2xl);font-weight:600;font-variant-numeric:tabular-nums;line-height:1.25;overflow-wrap:anywhere}",
			".dshTup_sumHint{color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs);font-variant-numeric:tabular-nums}",
			".dshTup_sumBar{display:flex;flex-direction:column;gap:var(--dsh-tup-sp-2);flex:1 1 360px;min-width:0}",
			".dshTup_bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-interactive-bg-hover)}",
			".dshTup_barSeg{height:100%;min-width:0}",
			".dshTup_root[data-animate=true] .dshTup_barSeg{transform-origin:left center;animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both;transition:width var(--dsh-tup-base) var(--dsh-tup-ease)}",
			".dshTup_legend{display:flex;flex-wrap:wrap;gap:var(--dsh-tup-sp-1) var(--dsh-tup-sp-4);font-size:var(--dsh-tup-fs-xs);color:var(--dsw-alias-label-secondary)}",
			// Hover confirms the target with colour alone: a lift on a legend row that is not
			// clickable reads as a broken affordance.
			".dshTup_legendItem{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-1);transition:opacity var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_legendItem:hover{opacity:.82}",
			// The swatch is the same mark in every chart, legend and tooltip, so it is one rule.
			".dshTup_dot{width:8px;height:8px;border-radius:2px;flex:none}",
			".dshTup_legendNum{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}",
			".dshTup_grand{flex:1 1 100%;display:flex;align-items:center;gap:var(--dsh-tup-sp-2);color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs)}",
			".dshTup_grandNum{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
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
			".dshTup_overview{flex:0 0 auto;display:flex;flex-direction:column;gap:var(--dsh-tup-sp-6);padding:var(--dsh-tup-sp-5) var(--dsh-tup-sp-6) var(--dsh-tup-sp-6)}",
			// `min-height:0` + `overflow-y:auto` make this the scrollport for the sessions
			// view. The table keeps its own inner scroller (the virtual window needs a
			// definite `clientHeight`), so a tall table scrolls inside the page scroll
			// rather than growing without bound.
			".dshTup_sessions{flex:1 1 auto;display:flex;flex-direction:row;flex-wrap:wrap;align-content:flex-start;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 var(--dsh-tup-sp-6) var(--dsh-tup-sp-6)}",
			// The KPI strip is a flat band too: four figures separated by hairlines, closed by
			// one rule under the row. It is the first thing in the overview, so it needs no
			// rule above it.
			".dshTup_kpi{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-start;gap:var(--dsh-tup-sp-3);padding:var(--dsh-tup-sp-2) 0 var(--dsh-tup-sp-2)}",
			".dshTup_hero{display:flex;flex-direction:column;align-items:flex-start;gap:var(--dsh-tup-sp-2)}",
			".dshTup_heroValue{font-size:var(--dsh-tup-fs-hero);font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.04em;line-height:1;white-space:nowrap}",
			".dshTup_heroLabel{color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-sm)}",
			".dshTup_heroMeta{margin:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-sm);line-height:1.6}",
			".dshTup_heroCompare{color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-sm);font-variant-numeric:tabular-nums}",
			".dshTup_card{display:flex;flex-direction:column;gap:var(--dsh-tup-sp-4);padding:0;border:0;border-radius:0;background:transparent}",
			".dshTup_cardHead{display:flex;align-items:center;justify-content:space-between;gap:var(--dsh-tup-sp-3);flex-wrap:wrap}",
			".dshTup_cardTitle{margin:0;font-size:var(--dsh-tup-fs-sm);font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.01em}",
			".dshTup_chartCard{flex:0 0 auto}",
			".dshTup_chartHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs)}",
			".dshTup_heatCard .dshTup_cardTitle{font-weight:500;color:var(--dsw-alias-label-tertiary)}",
			".dshTup_cell{transform-box:fill-box;transform-origin:center;transition:opacity var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
			".dshTup_cell:hover{opacity:.8;transform:scale(1.18)}",
			// The heatmap wave: the SVG groups its cells by week column, so this is 53
			// staggered group animations rather than 371 individual ones.
			".dshTup_heatCol{transform-box:fill-box;transform-origin:center}",
			".dshTup_root[data-animate=true] .dshTup_heatCol{animation:dshTup-cellIn var(--dsh-tup-base) var(--dsh-tup-ease) both;animation-delay:calc(var(--dsh-tup-i,0) * var(--dsh-tup-stagger))}",
			// Only the days that carry usage are offered as buttons; the affordance has to
			// follow that, or the empty cells read as clickable too.
			".dshTup_cell[role=button]{cursor:pointer}",
			".dshTup_cellSelected{stroke:var(--dsw-alias-label-primary);stroke-width:1.5}",
			".dshTup_cellAnomaly{stroke:var(--dsw-alias-state-warn-primary);stroke-width:1.5}",
			".dshTup_cell[role=button]:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
			".dshTup_axisLabel{fill:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs)}",
			// A `width:100%;height:auto` SVG against a fixed viewBox scales its text with
			// the container (an 11px axis label rendered ~14.6px wide, ~2.5px narrow), and
			// capping the rendered width to a band fixed that by leaving the right of a wide
			// card empty. The trend instead measures its wrapper in JS and widens its own
			// viewBox to match, so it fills the card at scale 1 with its labels at 11px;
			// 520px is the floor, below which the wrapper scrolls. The heatmap is a square
			// grid rather than a plot, so it keeps the centred band.
			// These wrappers own only horizontal overflow. Containing both axes traps a
			// vertical wheel event over the chart and prevents the overview page scrolling.
			".dshTup_trendWrap{position:relative;overflow-x:auto;overscroll-behavior-x:contain}",
			".dshTup_trend{display:block;width:100%;min-width:520px;height:auto}",
			".dshTup_heatmapWrap{overflow-x:auto;overscroll-behavior-x:contain}",
			".dshTup_heatmap{display:block;width:100%;min-width:560px;height:auto}",
			// Empty days need a visible boundary on the dark base; without this the grid
			// collapses into one black field and activity has no calendar context.
			".dshTup_heatmap .dshTup_cell{stroke:var(--dsw-alias-border-l2);stroke-width:1}",
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
			".dshTup_providerTag{flex:none;display:inline-flex;align-items:center;box-sizing:border-box;padding:0 var(--dsh-tup-sp-1);border:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-2xs);line-height:16px;white-space:nowrap}",
			".dshTup_modelName{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-2);min-width:0}",
			".dshTup_modelText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_tooltip{position:absolute;top:var(--dsh-tup-sp-1);transform:translateX(var(--dsh-tup-tip-x,-50%));min-width:150px;max-width:240px;padding:var(--dsh-tup-sp-2) var(--dsh-tup-sp-2);border:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));box-shadow:var(--dsw-shadow-lv2);font-size:var(--dsh-tup-fs-xs);pointer-events:none;z-index:3}",
			".dshTup_tooltip[data-edge=start]{--dsh-tup-tip-x:0%}",
			".dshTup_tooltip[data-edge=end]{--dsh-tup-tip-x:-100%}",
			".dshTup_trendWrap:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:var(--dsw-radius-sm)}",
			".dshTup_root[data-animate=true] .dshTup_tooltip{animation:dshTup-tipIn var(--dsh-tup-fast) var(--dsh-tup-ease) both}",
			".dshTup_tooltipDay{color:var(--dsw-alias-label-secondary);margin-bottom:var(--dsh-tup-sp-1)}",
			".dshTup_tooltipRow{display:flex;align-items:center;gap:var(--dsh-tup-sp-2)}",
			".dshTup_tooltipLabel{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto;min-width:0}",
			".dshTup_tooltipValue{font-variant-numeric:tabular-nums;font-weight:500}",
			".dshTup_donut{display:block}",
			".dshTup_rank{display:block}",
			".dshTup_modelList{min-width:0;display:flex;flex-direction:column;gap:var(--dsh-tup-sp-1);margin:0;padding:0;list-style:none}",
			".dshTup_modelButton{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(120px,1fr) 64px;align-items:center;gap:var(--dsh-tup-sp-5);width:100%;box-sizing:border-box;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;font:inherit;padding:12px 10px;cursor:pointer;text-align:left;transition:background var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_modelButton:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshTup_root .dshTup_modelToggle{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:var(--dsh-tup-fs-xs);padding:var(--dsh-tup-sp-1) var(--dsh-tup-sp-2);cursor:pointer;text-align:left;border-radius:var(--dsw-radius-sm)}",
			".dshTup_modelToggle:hover{color:var(--dsw-alias-label-primary)}",
			".dshTup_modelLabels{display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-width:0}",
			".dshTup_modelName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_modelMeta{color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs);font-variant-numeric:tabular-nums}",
			".dshTup_modelShare{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:var(--dsh-tup-fs-sm);min-width:52px;text-align:right}",
			".dshTup_rankTrack{display:block;height:6px;border-radius:99px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}",
			".dshTup_rankBar{display:block;height:100%;border-radius:99px;transform-origin:left center}",
			".dshTup_root[data-animate=true] .dshTup_rankBar{animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both}",
			//#endregion
		
			//#region filter band
			".dshTup_filters{flex:0 0 auto;display:flex;flex-direction:column;gap:var(--dsh-tup-sp-2);padding:var(--dsh-tup-sp-5) var(--dsh-tup-sp-6) 0}",
			".dshTup_filterRow{display:flex;align-items:center;gap:var(--dsh-tup-sp-2);flex-wrap:wrap}",
			".dshTup_root .dshTup_search{height:36px;flex:1 1 220px;min-width:170px}",
			".dshTup_root .dshTup_menu{display:inline-flex;flex:none}",
			".dshTup_root .dshTup_trigger{max-width:230px}",
			".dshTup_triggerLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_chevron{flex:none;transition:transform var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_chevronOpen{transform:rotate(180deg)}",
			".dshTup_filterSpacer{flex:1 1 0;min-width:0}",
			".dshTup_menuLabelRow{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-2)}",
			".dshTup_menuCount{color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs)}",
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
			".dshTup_tableWrap{flex:0 0 auto;margin:var(--dsh-tup-sp-3) 0 0}",
			".dshTup_tableScroll{overflow-x:auto;overscroll-behavior-x:contain;border:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
			".dshTup_tableWrap[data-scrolled=true] .dshTup_tableScroll{border-color:var(--dsw-alias-border-l2)}",
			".dshTup_root[data-animate=true] .dshTup_tableScroll{transition:border-color var(--dsh-tup-base) var(--dsh-tup-ease)}",
			".dshTup_tableScroll::-webkit-scrollbar{width:10px;height:10px}",
			".dshTup_tableScroll::-webkit-scrollbar-track{background:transparent}",
			".dshTup_tableScroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);background-clip:content-box;border:2px solid transparent;border-radius:999px}",
			".dshTup_tableScroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2);background-clip:content-box}",
			".dshTup_tableScroll::-webkit-scrollbar-corner{background:transparent}",
			// Fixed layout makes the browser honour the colgroup widths exactly, which is
			// what a drag must do; `min(720px,100%)` keeps the columns from crushing while
			// never exceeding the container, because a bare 720px floor would force a
			// horizontal scrollbar as soon as the pane is narrower than the visible columns.
			".dshTup_table{width:100%;min-width:min(720px,100%);border-collapse:separate;border-spacing:0;font-size:var(--dsh-tup-fs-sm);table-layout:fixed}",
			// The header is a quieter strip than the body: same surface, muted label colour,
			// and it sticks so the column meaning survives a long page.
			".dshTup_table th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:500;text-align:right;white-space:nowrap;padding:0}",
			".dshTup_root[data-scrolled=true] .dshTup_table th{box-shadow:inset 0 -1px 0 var(--dsw-alias-border-l2)}",
			".dshTup_thBtn{display:flex;align-items:center;justify-content:flex-end;gap:var(--dsh-tup-sp-1);width:100%;box-sizing:border-box;padding:var(--dsh-tup-sp-2) var(--dsh-tup-sp-3);border:0;border-bottom:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l3);background:transparent;color:inherit;font:inherit;font-weight:500;text-align:inherit;cursor:pointer;border-radius:0}",
			".dshTup_thStatic{display:flex;align-items:center;justify-content:flex-end;padding:var(--dsh-tup-sp-2) var(--dsh-tup-sp-3);border-bottom:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l3)}",
			".dshTup_thBtn:hover{color:var(--dsw-alias-label-primary)}",
			".dshTup_thBtn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
			".dshTup_colSession .dshTup_thBtn,.dshTup_colSession .dshTup_thStatic{justify-content:flex-start}",
			".dshTup_sortGlyph{flex:none;opacity:.85}",
			// `th` is already position:sticky, so it is the containing block for the
			// absolutely positioned handle below.
			".dshTup_resizeHandle{position:absolute;top:0;right:-3px;width:7px;height:100%;cursor:col-resize;touch-action:none}",
			".dshTup_resizeHandle:hover{background:var(--dsw-alias-border-l2)}",
			".dshTup_table td{box-sizing:border-box;height:var(--dsh-tup-row-h);padding:var(--dsh-tup-sp-2) var(--dsh-tup-sp-3);border-bottom:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l1);text-align:right;vertical-align:middle;font-variant-numeric:tabular-nums;white-space:nowrap}",
			".dshTup_spacer td{height:auto;padding:0;border:0;background:transparent}",
			"@keyframes dshTup-rowIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}",
			// Rows land as a wave: each row carries its page index as `--dsh-tup-i` (see
			// `70-table.js`), so paging reads as a sweep rather than a jump. Spacers are
			// excluded — they have no content to reveal.
			".dshTup_root[data-animate=true] .dshTup_table tbody tr[data-row]{animation:dshTup-rowIn var(--dsh-tup-base) var(--dsh-tup-settle) both;animation-delay:calc(var(--dsh-tup-i,0) * var(--dsh-tup-stagger))}",
			".dshTup_table tbody tr[data-row]{transition:background var(--dsh-tup-fast) var(--dsh-tup-ease),box-shadow var(--dsh-tup-fast) var(--dsh-tup-ease)}",
			".dshTup_table tbody tr[data-row]:last-child td{border-bottom:none}",
			".dshTup_row{cursor:pointer}",
			// One accent for interaction, spent as a 2px inset bar on hover; the current row
			// is marked by surface alone so it does not compete with the hover state.
			".dshTup_row:hover{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}",
			".dshTup_row:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
			".dshTup_rowCurrent{background:var(--dsw-alias-interactive-bg-hover)}",
			".dshTup_cellMain{display:flex;flex-direction:column;gap:2px;min-width:0;overflow:hidden}",
			".dshTup_colSession{position:relative}",
			// Every row starts on the same title rail. Tree depth is added after that rail,
			// while the chevron lives outside it and never shifts a parent title sideways.
			".dshTup_treePad{padding-left:calc(32px + var(--dsh-tup-tree-d,0) * 16px);position:relative}",
			".dshTup_treeHasChildren{padding-left:calc(32px + var(--dsh-tup-tree-d,0) * 16px)}",
			".dshTup_treePad[data-depth]:not([data-depth=\"1\"])::before{content:\"\";position:absolute;left:calc(32px + var(--dsh-tup-tree-d,0) * 16px - 8px);top:4px;bottom:4px;width:1px;background:var(--dsw-alias-border-l2)}",
			".dshTup_treeToggle{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;flex:none;width:24px;height:24px;margin:0;padding:0;border:0;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer}",
			".dshTup_treeToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dshTup_treeToggleRail{position:absolute;z-index:1;left:calc(8px + var(--dsh-tup-tree-d,0) * 16px);top:50%;transform:translateY(-50%)}",
			".dshTup_root .dshTup_treeToggleRail:active:not(:disabled){transform:translateY(-50%) scale(.98)}",
			".dshTup_treeToggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}",
			".dshTup_treeToggle .dshTup_chevron{transform:rotate(-90deg)}",
			".dshTup_treeToggle[aria-expanded=true] .dshTup_chevron{transform:rotate(0deg)}",
			".dshTup_rowTitle{display:flex;align-items:center;gap:var(--dsh-tup-sp-2);min-width:0}",
			".dshTup_rowTitleText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".dshTup_rowMeta{display:flex;align-items:center;gap:0;min-width:0;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-xs);overflow:hidden;white-space:nowrap}",
			".dshTup_rowMetaPart{display:inline-flex;align-items:center;min-width:0;overflow:hidden;text-overflow:ellipsis}",
			".dshTup_rowMetaPart+.dshTup_rowMetaPart::before,.dshTup_rowMetaPart+.dshTup_rowFamily::before,.dshTup_rowFamily+.dshTup_rowFamily::before{content:\"·\";margin:0 var(--dsh-tup-sp-1);color:var(--dsw-alias-label-dimmed)}",
			".dshTup_rowFamily{display:inline-flex;align-items:center;gap:2px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
			".dshTup_share{display:flex;align-items:center;gap:var(--dsh-tup-sp-2);justify-content:flex-end}",
			".dshTup_shareTrack{width:56px;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);overflow:hidden;flex:none}",
			".dshTup_shareFill{height:100%;background:var(--dsw-alias-brand-primary);border-radius:999px}",
			".dshTup_root[data-animate=true] .dshTup_shareFill{transform-origin:left center;animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both;transition:width var(--dsh-tup-base) var(--dsh-tup-ease)}",
			".dshTup_shareNum{min-width:42px;text-align:right;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-sm);font-variant-numeric:tabular-nums}",
			".dshTup_muted{color:var(--dsw-alias-label-tertiary)}",
			".dshTup_retry{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-1);border:0;background:transparent;color:var(--dsw-alias-state-warn-primary);font:inherit;font-size:var(--dsh-tup-fs-xs);padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}",
			//#endregion
		
			//#region empty, skeleton, footer
			".dshTup_empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--dsh-tup-sp-2);min-height:200px;padding:var(--dsh-tup-sp-6) var(--dsh-tup-sp-4);text-align:center;color:var(--dsw-alias-label-secondary)}",
			".dshTup_emptyIcon{color:var(--dsw-alias-label-dimmed)}",
			"@keyframes dshTup-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}",
			".dshTup_skelRow{display:flex;align-items:center;gap:var(--dsh-tup-sp-4);padding:0 var(--dsh-tup-sp-4);height:var(--dsh-tup-row-h);border-bottom:var(--dsh-tup-hairline) solid var(--dsw-alias-border-l1)}",
			".dshTup_skel{position:relative;height:10px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;flex:none}",
			".dshTup_skel::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--dsw-alias-interactive-bg-hover),transparent);animation:dshTup-shimmer 1.4s linear infinite}",
			".dshTup_skelGrow{flex:1 1 auto;min-width:0;max-width:280px}",
			// margin-top (not padding-top) so the seam above the footer is the same 12px
			// every other band-to-band gap uses.
			".dshTup_foot{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:var(--dsh-tup-sp-2) var(--dsh-tup-sp-4);margin-top:var(--dsh-tup-sp-4);padding:0 var(--dsh-tup-sp-6) var(--dsh-tup-sp-5);color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-tup-fs-sm);font-variant-numeric:tabular-nums}",
			// Visually hidden but still announced: clipped rather than `display:none`, which
			// would remove the live region from the accessibility tree entirely.
			".dshTup_live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}",
			".dshTup_footSpacer{flex:1 1 0;min-width:0}",
			".dshTup_pagination{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-2)}",
			".dshTup_notice{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-1);color:var(--dsw-alias-state-warn-primary)}",
			".dshTup_alerts{flex:0 0 auto;flex-direction:column;align-items:flex-start;gap:var(--dsh-tup-sp-1);margin:var(--dsh-tup-sp-3) var(--dsh-tup-sp-6) 0}",
			".dshTup_alertList{margin:0;padding-left:var(--dsh-tup-sp-4)}",
			".dshTup_thresholdForm{display:flex;flex-direction:column;gap:var(--dsh-tup-sp-3)}",
			".dshTup_thresholdField{display:flex;flex-direction:column;gap:var(--dsh-tup-sp-1);align-items:stretch}",
			".dshTup_thresholdField>span{color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-xs)}",
			".dshTup_audit{flex-direction:column;align-items:flex-start}",
			".dshTup_audit>summary{display:inline-flex;align-items:center;gap:var(--dsh-tup-sp-1);cursor:pointer;list-style:none;border-radius:var(--dsw-radius-xs)}",
			".dshTup_audit>summary::-webkit-details-marker{display:none}",
			".dshTup_audit>summary:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}",
			".dshTup_auditList{margin:var(--dsh-tup-sp-1) 0 0;padding-left:var(--dsh-tup-sp-4);color:var(--dsw-alias-label-secondary);font-size:var(--dsh-tup-fs-xs)}",
			//#endregion
		
			//#region wide layout
			// Both views stay a single stacked column at every width. The sessions view is the
			// totals band, then the table full width. `flex:1 0 100%` is deliberate — a bare
			// `flex:1 1 100%` lets flex-shrink pull the bands back onto one line, and the
			// bundle rules that set their bases are more specific than a `>*` reset, so they
			// are named.
			".dshTup_sessions>*{min-width:0}",
			".dshTup_sessions>.dshTup_summary,.dshTup_sessions>.dshTup_tableWrap,.dshTup_sessions>.dshTup_chartCard{flex:1 0 100%;align-self:flex-start}",
			// The filter band stacks two rows because that is the only honest arrangement on a
			// narrow pane. Once the pane is wide enough for every control to share one line,
			// `display:contents` dissolves the two row boxes so their children become flex
			// items of the band itself and flow as a single wrapped toolbar. The threshold is
			// all-or-nothing on purpose: below it the band keeps its two tidy rows rather than
			// half-merging, which strands the reset button at the end of the second row.
			// 1280px is where the toolbar genuinely fits on one line; at a 1140px pane it
			// wrapped into a worse arrangement than the two rows it replaced.
			//
			// The spacer is dropped (its whole job was to push the reset button right) and the
			// reset button is ordered last instead, so it stays the trailing control.
			"@container (min-width: 1280px){.dshTup_filters{flex-direction:row;flex-wrap:wrap;align-items:center}.dshTup_filterRow{display:contents}.dshTup_filterSpacer{display:none}.dshTup_filterRow:first-child>:last-child{order:1}.dshTup_root .dshTup_search{flex:0 1 320px}}",
			//#endregion
		
			//#region responsive columns
			// A hidden column must stop reserving a track. The cells are `display:none`, but
			// under `table-layout:fixed` the browser sizes columns from the colgroup, so the
			// `<col>` has to be dropped too — otherwise the "hidden" columns still add up to
			// more than the container and the table grows the forbidden horizontal scrollbar.
			"@container (max-width: 900px){.dshTup_hideBelow{display:none}.dshTup_colHideBelow{display:none}}",
			"@container (max-width: 640px){.dshTup_hideBelow2{display:none}.dshTup_colHideBelow2{display:none}.dshTup_modelButton{grid-template-columns:minmax(0,1fr) auto}.dshTup_rankTrack{display:none}}",
			"@container (max-width: 760px){.dshTup_rowMetaOptional{display:none}}",
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
			// The series palette. Eight hues spread around the wheel so two neighbouring
			// routes never land on similar colours, and every hue is a *tone* rather than a
			// pure hue: the dark set is lightened so it reads on the dark surface, the light
			// set is deepened so each clears 3:1 against white (these paint thin strokes,
			// small donut arcs and heatmap cells, never large fills). `--dsh-tup-other` is
			// deliberately neutral — it is the merged bucket, not a route — and the heat
			// ramp reuses the first series colour.
			":root{--dsh-tup-c1:#60a5fa;--dsh-tup-c2:#34d399;--dsh-tup-c3:#a78bfa;--dsh-tup-c4:#fb7185;--dsh-tup-c5:#fbbf24;--dsh-tup-c6:#22d3ee;--dsh-tup-c7:#e879f9;--dsh-tup-c8:#94a3b8;--dsh-tup-other:#a1a1aa;--dsh-tup-heat:#60a5fa}",
			"body:not([data-ds-dark-theme]){--dsh-tup-c1:#2563eb;--dsh-tup-c2:#047857;--dsh-tup-c3:#6d28d9;--dsh-tup-c4:#be123c;--dsh-tup-c5:#a16207;--dsh-tup-c6:#0e7490;--dsh-tup-c7:#a21caf;--dsh-tup-c8:#4d7c0f;--dsh-tup-other:#64748b;--dsh-tup-heat:#2563eb}",
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
			"title": "Token 用量",
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
			"range.90d": "90 天",
			"directory": "目录",
			"directory.all": "全部目录",
			"sort": "排序",
			"sort.total": "总量",
			"sort.input": "未缓存输入",
			"sort.cacheRead": "缓存读取",
			"sort.cacheReadRate": "缓存读取占输入",
			"sort.cacheWrite": "缓存写入",
			"sort.output": "输出",
			"sort.title": "标题",
			"sort.recent": "最近活动",
			"sort.desc": "降序",
			"sort.asc": "升序",
			"sort.by": "按 {key} {direction}",
			"direction.desc": "降序",
			"direction.asc": "升序",
			"filter.more": "筛选",
			"filter.topLevel": "仅顶层会话",
			"filter.used": "仅显示有用量的会话",
			"filter.buckets": "显示构成列",
			"filter.model": "模型",
			"filter.day": "某一天",
			"filter.clearDay": "清除日期筛选",
			"activity.filterDay": "只看 {day} 的会话",
			"activity.anomaly": "异常：近 28 个活跃日中位数 {median}",
			"resize.handle": "拖动以调整「{column}」列宽",
			"reset": "重置筛选",
			"views.heading": "已保存的视图",
			"views.save": "保存当前筛选…",
			"views.delete": "删除 {name}",
			"views.savePrompt": "视图名称（1–32 个字符）",
			"export": "导出",
			"export.copy": "复制 TSV",
			"export.download": "下载 CSV",
			"export.copied": "已复制",
			"export.days.copy": "复制按日 TSV",
			"export.days.download": "下载按日 CSV",
			"export.models.copy": "复制按模型 TSV",
			"export.models.download": "下载按模型 CSV",
			"export.col.date": "日期",
			"export.col.provider": "网关",
			"export.col.model": "模型",
			"threshold.settings": "用量阈值…",
			"threshold.day": "每日 token 阈值",
			"threshold.week": "近 7 天 token 阈值",
			"threshold.session": "单会话 token 阈值",
			"threshold.save": "保存",
			"threshold.cancel": "取消",
			"threshold.invalid": "请输入正整数，或留空表示关闭该阈值。",
			"threshold.hint": "打开或刷新面板时检查；不会发送后台通知。",
			"threshold.dayOver": "今日已用 {used} token，达到或超过阈值 {limit}",
			"threshold.weekOver": "近 7 天已用 {used} token，达到或超过阈值 {limit}",
			"threshold.sessionOver": "会话「{title}」已用 {used} token，达到或超过阈值 {limit}",
			"trend.partial": "有 {n} 天有用量但缺少按模型明细（旧数据未覆盖 90 天窗口）",
			"card.total": "Token 总量",
			"card.input": "输入",
			"card.output": "输出",
			"card.sessions": "会话",
			"card.sessionsHint": "{matched} / {total} 个会话",
			"clean": "筛选后 Token 总量",
			"allTime": "全部会话合计",
			"models.title": "模型用量",
			"models.total": "合计",
			"models.group": "分组方式",
			"models.group.provider": "按网关",
			"models.group.model": "按模型",
			"models.other": "其他模型",
			"models.showAll": "展开其余 {n} 个模型",
			"models.showLess": "收起",
			"trend.keyboard": "每日 Token 趋势，用左右方向键逐日查看",
			"models.summary": "{models} 个模型，共 {total} token",
			"models.openSessions": "只看使用该模型的会话",
			"activity.title": "Token 活动",
			"activity.summary": "共 {total} token，{days} 天有活动",
			"activity.weekday0": "一",
			"activity.weekday1": "三",
			"activity.weekday2": "五",
			"trend.title": "每日 Token 趋势",
			"trend.summary": "{series} 个模型，{days} 天",
			"kpi.total": "Token 总量",
			"kpi.peak": "峰值 Token 数",
			"kpi.current": "当前连续天数",
			"kpi.longestRun": "最长连续天数",
			"kpi.days": "{n} 天",
			"kpi.compare": "较前 {n} 天 {delta}",
			"chart.empty": "还没有按天数据",
			"chart.emptyHint": "按天用量来自本插件的 Host 半场（tokenUsageByDay），重启 DSH 后开始累积。",
			"composition": "用量构成",
			"efficiency.cacheRead": "缓存读取占输入",
			"efficiency.cacheReadShort": "缓存读取 {rate}",
			"efficiency.cacheWrite": "缓存写入占输入",
			"efficiency.output": "输出占总量",
			"segment.input": "未缓存输入",
			"segment.cacheRead": "缓存读取",
			"segment.cacheWrite": "缓存写入",
			"segment.output": "输出",
			"col.session": "会话",
			"col.id": "会话 ID",
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
			"tree.expand": "展开子会话",
			"tree.collapse": "收起子会话",
			"tree.children": "{n} 个子会话",
			"tree.family": "家族 {n}",
			"empty": "没有匹配的会话",
			"emptyHint": "先进行一段对话，用量会出现在这里。",
			"emptyAction": "新建会话",
			"emptyFiltered": "当前筛选下没有会话",
			"emptyFilteredHint": "搜索、目录、模型或日期条件把所有会话都排除了。",
			"emptyClear": "清除筛选",
			"emptyRange": "这个时间范围内没有用量",
			"emptyRangeHint": "换一个更长的范围，或查看全部时间。",
			"emptyAll": "查看全部时间",
			"missing": "未取到用量数据",
			"pending": "{n} 个会话暂无用量数据",
			"retry": "重试",
			"retryHint": "重新读取该会话的用量",
			"openFailed": "无法打开该会话",
			"copyFailed": "复制失败",
			"startFailed": "无法新建会话",
			"archivedTitle": "会话已归档",
			"archivedBody": "已归档的会话无法在这里打开。请在侧栏把会话筛选切到“全部对话（显示已归档）”，取消归档后再打开。",
			"archivedClose": "知道了",
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
			"range.90d": "90 days",
			"directory": "Directory",
			"directory.all": "All directories",
			"sort": "Sort",
			"sort.total": "Total",
			"sort.input": "Uncached input",
			"sort.cacheRead": "Cache read",
			"sort.cacheReadRate": "Cache read of input",
			"sort.cacheWrite": "Cache write",
			"sort.output": "Output",
			"sort.title": "Title",
			"sort.recent": "Recent activity",
			"sort.desc": "Descending",
			"sort.asc": "Ascending",
			"sort.by": "By {key}, {direction}",
			"direction.desc": "descending",
			"direction.asc": "ascending",
			"filter.more": "Filters",
			"filter.topLevel": "Top-level only",
			"filter.used": "Only sessions with usage",
			"filter.buckets": "Show composition columns",
			"filter.model": "Model",
			"filter.day": "One day",
			"filter.clearDay": "Clear the day filter",
			"activity.filterDay": "Show only the sessions on {day}",
			"activity.anomaly": "Anomaly: median of prior 28 active days {median}",
			"resize.handle": "Drag to resize the {column} column",
			"reset": "Reset filters",
			"views.heading": "Saved views",
			"views.save": "Save current filters…",
			"views.delete": "Delete {name}",
			"views.savePrompt": "View name (1–32 characters)",
			"export": "Export",
			"export.copy": "Copy TSV",
			"export.download": "Download CSV",
			"export.copied": "Copied",
			"export.days.copy": "Copy daily TSV",
			"export.days.download": "Download daily CSV",
			"export.models.copy": "Copy per-model TSV",
			"export.models.download": "Download per-model CSV",
			"export.col.date": "Date",
			"export.col.provider": "Gateway",
			"export.col.model": "Model",
			"threshold.settings": "Usage thresholds…",
			"threshold.day": "Daily token threshold",
			"threshold.week": "7-day token threshold",
			"threshold.session": "Per-session token threshold",
			"threshold.save": "Save",
			"threshold.cancel": "Cancel",
			"threshold.invalid": "Enter a positive integer, or leave blank to turn that threshold off.",
			"threshold.hint": "Checked when the panel opens or refreshes. No background notifications.",
			"threshold.dayOver": "Today used {used} tokens, at or above the {limit} threshold",
			"threshold.weekOver": "Last 7 days used {used} tokens, at or above the {limit} threshold",
			"threshold.sessionOver": "Session “{title}” used {used} tokens, at or above the {limit} threshold",
			"trend.partial": "{n} day(s) have usage but no per-model detail (older checkpoints do not cover 90 days)",
			"card.total": "Total tokens",
			"card.input": "Input",
			"card.output": "Output",
			"card.sessions": "Sessions",
			"card.sessionsHint": "{matched} / {total} sessions",
			"clean": "Filtered total tokens",
			"allTime": "All sessions",
			"models.title": "Model usage",
			"models.total": "Total",
			"models.group": "Group by",
			"models.group.provider": "Gateway",
			"models.group.model": "Model",
			"models.other": "Other models",
			"models.showAll": "Show the other {n} models",
			"models.showLess": "Show fewer",
			"trend.keyboard": "Daily token trend; use the arrow keys to read each day",
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
			"kpi.compare": "vs previous {n} days {delta}",
			"chart.empty": "No per-day data yet",
			"chart.emptyHint": "Daily usage comes from this plugin's Host half (tokenUsageByDay) and starts accumulating after a DSH restart.",
			"composition": "Composition",
			"efficiency.cacheRead": "Cache read of input",
			"efficiency.cacheReadShort": "Cache read {rate}",
			"efficiency.cacheWrite": "Cache write of input",
			"efficiency.output": "Output of total",
			"segment.input": "Uncached input",
			"segment.cacheRead": "Cache read",
			"segment.cacheWrite": "Cache write",
			"segment.output": "Output",
			"col.session": "Session",
			"col.id": "Session id",
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
			"tree.expand": "Expand sub-sessions",
			"tree.collapse": "Collapse sub-sessions",
			"tree.children": "{n} sub-sessions",
			"tree.family": "Family {n}",
			"empty": "No session matches",
			"emptyHint": "Have a conversation first; its usage will show up here.",
			"emptyAction": "New session",
			"emptyFiltered": "No session matches the current filters",
			"emptyFilteredHint": "The search, directory, model or day filter excludes every session.",
			"emptyClear": "Clear filters",
			"emptyRange": "No usage in this range",
			"emptyRangeHint": "Pick a longer range, or look at all time.",
			"emptyAll": "Show all time",
			"missing": "usage unavailable",
			"pending": "{n} session(s) have no usage data",
			"retry": "Retry",
			"retryHint": "Read this session's usage again",
			"openFailed": "Could not open that session",
			"copyFailed": "Copy failed",
			"startFailed": "Could not start a session",
			"archivedTitle": "Session archived",
			"archivedBody": "An archived session cannot be opened here. Switch the sidebar's session filter to “All conversations (show archived)”, unarchive it, then open it.",
			"archivedClose": "Got it",
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
					const progress = Math.min(1, (now - started) / MOTION.countUp);
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
		
		/**
		 * Headline totals plus the stacked composition bar over the filtered set.
		 * @param props - summed usage, counts, the user-change flag, and translate seat.
		 * @returns the summary band.
		 */
		function Summary({ totals, filteredTotal, matched, total, grandTotal, filteredOut, showGrand, animate, t }) {
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
				showGrand === true && grandTotal !== filteredTotal
					? h("div", { key: "grand", className: "dshTup_grand" }, [
							t("allTime"),
							h("span", { key: "v", className: "dshTup_grandNum" }, formatInt(grandTotal)),
						])
					: null,
			]);
		}
		
		/** One row of filter controls. */
		function FilterRow({ children }) {
			return h("div", { className: "dshTup_filterRow" }, children);
		}
		
		/** A dismissable chip for one active filter. */
		function FilterChip({ chipKey, label, title, onClear }) {
			return h(
				Button,
				{
					key: chipKey,
					variant: "toolbar",
					size: "sm",
					icon: h(IconCloseOutlineRegular, { size: 12 }),
					title,
					onClick: onClear,
				},
				label,
			);
		}
		
		/**
		 * Directory, sort, export, scoping toggles, saved views, jump, and reset — one
		 * menu so the band can stay a search box plus chips.
		 */
		function FilterMenu({ filters, setFilters, directories, exportProps, onJumpToCurrent, hasCurrent, onOpenThresholds, open, setOpen, t }) {
			const items = [];
			const selectedIds = ["sort:" + filters.sortKey, filters.sortDesc ? "dir:desc" : "dir:asc"];
			if (directories.length > 1) {
				items.push({ id: "cwd:", label: t("directory.all") });
				for (const entry of directories) items.push({ id: "cwd:" + entry.path, label: entry.label });
				items.push({ id: "sep:cwd", type: "separator" });
				selectedIds.push("cwd:" + filters.cwd);
			}
			for (const key of SORT_KEYS) items.push({ id: "sort:" + key, label: t("sort." + key) });
			items.push({ id: "sep:dir", type: "separator" });
			items.push({ id: "dir:desc", label: t("sort.desc") });
			items.push({ id: "dir:asc", label: t("sort.asc") });
			items.push({ id: "sep:export", type: "separator" });
			items.push({ id: "export:copy", label: t("export.copy") });
			items.push({ id: "export:download", label: t("export.download") });
			items.push({ id: "export:days:copy", label: t("export.days.copy") });
			items.push({ id: "export:days:download", label: t("export.days.download") });
			items.push({ id: "export:models:copy", label: t("export.models.copy") });
			items.push({ id: "export:models:download", label: t("export.models.download") });
			items.push({ id: "sep:threshold", type: "separator" });
			items.push({ id: "threshold:settings", label: t("threshold.settings") });
			items.push({ id: "sep:scope", type: "separator" });
			items.push({ id: "toggle:topLevel", label: t("filter.topLevel") });
			items.push({ id: "toggle:used", label: t("filter.used") });
			items.push({ id: "toggle:buckets", label: t("filter.buckets") });
			if (filters.topLevelOnly) selectedIds.push("toggle:topLevel");
			if (filters.usedOnly) selectedIds.push("toggle:used");
			if (filters.showBuckets) selectedIds.push("toggle:buckets");
			const savedViews = Array.isArray(filters.savedViews) ? filters.savedViews : [];
			const liveSnapshot = viewSnapshotOf(filters);
			items.push({ id: "sep:views", type: "separator" });
			items.push({ id: "views:heading", type: "label", text: t("views.heading") });
			for (let index = 0; index < savedViews.length; index += 1) {
				const view = savedViews[index];
				items.push({ id: "view:" + index, label: view.name });
				items.push({ id: "views.delete:" + index, label: t("views.delete", { name: view.name }) });
				if (snapshotsEqual(liveSnapshot, viewSnapshotOf(view))) selectedIds.push("view:" + index);
			}
			if (savedViews.length < SAVED_VIEW_LIMIT) items.push({ id: "views.save", label: t("views.save") });
			if (hasCurrent) {
				items.push({ id: "sep:jump", type: "separator" });
				items.push({ id: "jump:current", label: t("jumpToCurrent") });
			}
			items.push({ id: "sep:reset", type: "separator" });
			items.push({ id: "reset", label: t("reset") });
			const menuOpen = open === true;
			return h(Menu, {
				open: menuOpen,
				className: "dshTup_menu",
				items,
				selectedIds,
				onSelect: (id) => {
					if (id.startsWith("cwd:")) {
						setFilters((previous) => ({ ...previous, cwd: id.slice(4) }));
					} else if (id.startsWith("sort:")) {
						const key = id.slice(5);
						setFilters((previous) => ({ ...previous, sortKey: key, sortDesc: key !== "title" }));
					} else if (id === "dir:desc") {
						setFilters((previous) => ({ ...previous, sortDesc: true }));
					} else if (id === "dir:asc") {
						setFilters((previous) => ({ ...previous, sortDesc: false }));
					} else if (id === "export:copy") {
						if (exportProps.disabled !== true) exportProps.onCopy();
					} else if (id === "export:download") {
						if (exportProps.disabled !== true) exportProps.onDownload();
					} else if (id === "export:days:copy") {
						if (exportProps.disabled !== true) exportProps.onCopyDays();
					} else if (id === "export:days:download") {
						if (exportProps.disabled !== true) exportProps.onDownloadDays();
					} else if (id === "export:models:copy") {
						if (exportProps.disabled !== true) exportProps.onCopyModels();
					} else if (id === "export:models:download") {
						if (exportProps.disabled !== true) exportProps.onDownloadModels();
					} else if (id === "threshold:settings") {
						if (typeof onOpenThresholds === "function") onOpenThresholds();
					} else if (id === "toggle:topLevel") {
						setFilters((previous) => ({ ...previous, topLevelOnly: !previous.topLevelOnly }));
					} else if (id === "toggle:used") {
						setFilters((previous) => ({ ...previous, usedOnly: !previous.usedOnly }));
					} else if (id === "toggle:buckets") {
						setFilters((previous) => ({ ...previous, showBuckets: !previous.showBuckets }));
					} else if (id === "views.save") {
						const typed = typeof window.prompt === "function" ? window.prompt(t("views.savePrompt"), "") : null;
						setFilters((previous) => addSavedView(previous, typed));
					} else if (id.startsWith("views.delete:")) {
						const index = Number(id.slice("views.delete:".length));
						setFilters((previous) => removeSavedView(previous, index));
					} else if (id.startsWith("view:")) {
						const index = Number(id.slice(5));
						setFilters((previous) => applySavedView(previous, index));
					} else if (id === "jump:current") {
						onJumpToCurrent();
					} else if (id === "reset") {
						setFilters((previous) => resetFilters(previous));
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
						icon: h(IconSlidersTwoOutlineRegular, { size: 14 }),
						"aria-label": t("filter.more"),
						"aria-haspopup": "menu",
						"aria-expanded": menuOpen,
						onClick: () => setOpen((previous) => previous !== true),
					},
					[
						h("span", { key: "l", className: "dshTup_triggerLabel" }, t("filter.more")),
						h(IconChevronDownOutlineRegular, { key: "c", size: 14, className: cx("dshTup_chevron", menuOpen && "dshTup_chevronOpen") }),
					],
				),
			});
		}
		
		/**
		 * The filter band: search is always visible; everything else lives in one menu,
		 * with active filters shown as chips.
		 * @param props - filters, setters, directories, export handlers, and counts.
		 * @returns the filter band.
		 */
		function FilterBar({ filters, setFilters, directories, searchRef, exportProps, onJumpToCurrent, hasCurrent, onOpenThresholds, modelLabel, dayOffsetMinutes, t }) {
			const [open, setOpen] = react.useState(false);
			const chips = [];
			if (filters.cwd !== "") {
				const entry = directories.find((item) => item.path === filters.cwd);
				chips.push(
					h(FilterChip, {
						key: "cwd",
						chipKey: "cwd",
						label: t("directory") + ": " + (entry === undefined ? (leafName(filters.cwd) ?? filters.cwd) : entry.label),
						title: t("directory"),
						onClear: () => setFilters((previous) => ({ ...previous, cwd: "" })),
					}),
				);
			}
			if (filters.topLevelOnly) {
				chips.push(
					h(FilterChip, {
						key: "topLevel",
						chipKey: "topLevel",
						label: t("filter.topLevel"),
						title: t("filter.topLevel"),
						onClear: () => setFilters((previous) => ({ ...previous, topLevelOnly: false })),
					}),
				);
			}
			if (filters.usedOnly) {
				chips.push(
					h(FilterChip, {
						key: "used",
						chipKey: "used",
						label: t("filter.used"),
						title: t("filter.used"),
						onClear: () => setFilters((previous) => ({ ...previous, usedOnly: false })),
					}),
				);
			}
			if (filters.model !== "") {
				chips.push(
					h(FilterChip, {
						key: "model",
						chipKey: "model",
						label: t("filter.model") + ": " + modelLabel,
						title: t("models.openSessions"),
						onClear: () => setFilters((previous) => ({ ...previous, model: "" })),
					}),
				);
			}
			if (filters.day !== null) {
				chips.push(
					h(FilterChip, {
						key: "day",
						chipKey: "day",
						label: t("filter.day") + ": " + formatDayIso(filters.day, dayOffsetMinutes),
						title: t("filter.clearDay"),
						onClear: () => setFilters((previous) => ({ ...previous, day: null })),
					}),
				);
			}
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
					h(FilterMenu, {
						key: "more",
						filters,
						setFilters,
						directories,
						exportProps,
						onJumpToCurrent,
						hasCurrent,
						onOpenThresholds,
						open,
						setOpen,
						t,
					}),
					...chips,
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
									// filter menu, which also carries the direction pair.
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
		/** Neutral colour for the merged "other" series, outside the route palette. */
		const OTHER_COLOR = "var(--dsh-tup-other)";
		/** Colour of the single total trend line. */
		const TREND_COLOR = "var(--dsh-tup-c1)";
		
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
		
		/**
		 * One hero figure, then the rest of the strip as a single quiet line.
		 * The first item is the number the overview exists to answer; peak and streaks
		 * stay readable without becoming four equal tiles.
		 */
		function KpiStrip({ items, compare }) {
			const hero = items[0];
			return h("section", { className: "dshTup_kpi", role: "group" }, [
				h("div", { key: "hero", className: "dshTup_hero" }, [
					h("span", { key: "v", className: "dshTup_heroValue", title: hero === undefined ? undefined : hero.title }, hero === undefined ? "" : hero.value),
					h("span", { key: "l", className: "dshTup_heroLabel" }, hero === undefined ? "" : hero.label),
					compare
						? h("span", { key: "c", className: "dshTup_heroCompare" }, compare)
						: null,
				]),
			]);
		}
		
		/** One card shell shared by every chart. */
		function ChartCard({ title, extra, children, className }) {
			return h("section", { className: cx("dshTup_card", className) }, [
				h("header", { key: "head", className: "dshTup_cardHead" }, [h("h3", { key: "t", className: "dshTup_cardTitle" }, title), extra ?? null]),
				children,
			]);
		}
		
		/**
		 * Per-day model rows for the trend tooltip.
		 * @param byDay - the merged per-day per-model calendars.
		 * @param days - the day indices in the window, ascending.
		 * @returns day → `[{ id, label, color, value }]`.
		 */
		function trendDetails(byDay, days) {
			const details = new Map();
			for (const day of days) {
				const bucket = byDay.get(day);
				if (bucket === undefined || typeof bucket.get !== "function") continue;
				const rows = [];
				for (const [id, row] of bucket) {
					const value = totalOf(row.tokens);
					if (value <= 0) continue;
					rows.push({ id, label: routeLabel(row), color: routeColor(id), value });
				}
				rows.sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
				if (rows.length > 0) details.set(day, rows);
			}
			return details;
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
		function ActivityHeatmap({ byDay, offsetMinutes, today, t, extra, note, onSelectDay, selectedDay, anomalies, frame, measureRef }) {
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
			// The grid fills the card: the viewBox is the measured wrapper width, so one
			// viewBox unit is one pixel and the cells line up with the trend's plot edges.
			// The pitch is derived from that width, which keeps the labels at 1:1 size.
			const left = 26;
			const top = 16;
			const width = frame > 0 ? frame : HEATMAP_DEFAULT_WIDTH;
			const pitch = (width - left) / weeks;
			const gap = Math.max(2, Math.min(4, pitch - 10));
			const cell = pitch - gap;
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
			// though: three columns is 39px against a ~28px label, and anything nearer would
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
				{ title: t("activity.title"), extra, className: "dshTup_chartCard dshTup_heatCard" },
				h("div", { key: "scroll", ref: measureRef, className: "dshTup_heatmapWrap" }, h(
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
						//
						// The group is left unnamed on purpose: `summary` already renders in the
						// paragraph below, and an `aria-label` here would announce the same
						// sentence twice when entering the grid.
						role: selectable ? "group" : "img",
						"aria-label": selectable ? undefined : summary,
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
										const anomaly = anomalies === undefined ? undefined : anomalies.get(entry.day);
										return h(
											"rect",
											{
												key: entry.day,
												className: cx("dshTup_cell", anomaly !== undefined && "dshTup_cellAnomaly", entry.day === selectedDay && "dshTup_cellSelected"),
												x: left + column * pitch,
												y: top + row * pitch,
												width: cell,
												height: cell,
												rx: 2,
												fill: heatColor(entry.tokens === 0 ? 0 : entry.value, max),
												role: entry.tokens > 0 && onSelectDay !== undefined ? "button" : undefined,
												"aria-pressed": entry.tokens > 0 && onSelectDay !== undefined ? entry.day === selectedDay : undefined,
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
											h(
												"title",
												null,
												formatDayIso(entry.day, offsetMinutes) +
													" · " +
													formatInt(entry.tokens) +
													" " +
													t("unit.tokens") +
													(anomaly === undefined ? "" : " · " + t("activity.anomaly", { median: formatInt(anomaly.median) })),
											),
										);
									}),
								),
							),
						),
					],
				)),
				h("p", { key: "sum", className: "dshTup_chartHint" }, note ? summary + " · " + note : summary),
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
		const TREND = { width: 760, height: 248, left: 52, right: 16, top: 16, bottom: 32, floor: 520 };
		
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
		 * The per-day trend: one total line. Hover may list models when `details` is set
		 * (7d / 30d / 90d, where `tokenUsageByRouteByDay` still covers the window).
		 *
		 * @param props - window days, per-day totals, optional per-day model rows.
		 * @returns the card.
		 */
		function TokenTrend({ days, values, details, offsetMinutes, t, extra }) {
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
			for (const value of values.values()) if (value > peak) peak = value;
			const max = niceMax(peak);
			const trendDigest = motionDigest(days.map((day) => values.get(day) ?? 0));
			const step = days.length > 1 ? plotWidth / (days.length - 1) : 0;
			const xOf = (index) => TREND.left + step * index;
			const yOf = (value) => TREND.top + plotHeight - (value / max) * plotHeight;
			const ticks = [0, 0.25, 0.5, 0.75, 1];
			const labelEvery = Math.max(1, Math.ceil(days.length / 7));
			const hoverIndex = hover === null ? null : clamp(hover, 0, days.length - 1);
			const hoverDay = hoverIndex === null ? null : days[hoverIndex];
			const hoverTotal = hoverDay === null ? 0 : values.get(hoverDay) ?? 0;
			const hoverRows = hoverDay === null || details === undefined ? undefined : details.get(hoverDay);
			const summary = t("trend.summary", { series: 1, days: days.length });
			/** Where the tooltip anchors, so the first and last days are not clipped by the card. */
			const tipRatio = hoverIndex === null ? 0.5 : xOf(hoverIndex) / width;
			const tipEdge = tipRatio < 0.2 ? "start" : tipRatio > 0.8 ? "end" : "center";
			const onKeyDown = (event) => {
				if (days.length === 0) return;
				const last = days.length - 1;
				let next = null;
				if (event.key === "ArrowLeft") next = hoverIndex === null ? last : Math.max(0, hoverIndex - 1);
				else if (event.key === "ArrowRight") next = hoverIndex === null ? last : Math.min(last, hoverIndex + 1);
				else if (event.key === "Home") next = 0;
				else if (event.key === "End") next = last;
				else if (event.key === "Escape") {
					setHover(null);
					return;
				}
				if (next === null) return;
				event.preventDefault();
				setHover(next);
			};
			return h(
				ChartCard,
				{
					title: t("trend.title"),
					extra,
					className: "dshTup_chartCard",
				},
				h("div", {
					key: "plot",
					ref: wrapRef,
					className: "dshTup_trendWrap",
					tabIndex: 0,
					"aria-label": t("trend.keyboard"),
					onKeyDown,
					onBlur: () => setHover(null),
				}, [
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
							h("path", {
								key: "total-" + trendDigest,
								className: "dshTup_trendLine",
								pathLength: 1,
								d: smoothPath(days.map((day, index) => [xOf(index), yOf(values.get(day) ?? 0)])),
								stroke: TREND_COLOR,
							}),
							hoverIndex === null
								? null
								: h("circle", {
										key: "dot",
										className: "dshTup_cursorDot",
										cx: xOf(hoverIndex),
										cy: yOf(hoverTotal),
										r: 3,
										fill: TREND_COLOR,
									}),
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
									"data-edge": tipEdge,
									"aria-live": "polite",
									style: { left: (xOf(hoverIndex) / width) * 100 + "%" },
								},
								[
									h("div", { key: "d", className: "dshTup_tooltipDay" }, formatDayShort(hoverDay, offsetMinutes)),
									hoverRows === undefined || hoverRows.length === 0
										? h("div", { key: "total", className: "dshTup_tooltipRow" }, [
												h("span", { key: "dot", className: "dshTup_dot", style: { background: TREND_COLOR } }),
												h("span", { key: "l", className: "dshTup_tooltipLabel" }, t("kpi.total")),
												h("span", { key: "v", className: "dshTup_tooltipValue" }, formatInt(hoverTotal)),
											])
										: hoverRows.map((row) =>
												h("div", { key: row.id, className: "dshTup_tooltipRow" }, [
													h("span", { key: "dot", className: "dshTup_dot", style: { background: row.color } }),
													h("span", { key: "l", className: "dshTup_tooltipLabel" }, row.label),
													h("span", { key: "v", className: "dshTup_tooltipValue" }, formatInt(row.value)),
												]),
											),
								],
							),
				]),
			);
		}
		//#endregion
		
		//#region model rank
		/**
		 * Ranked model rows. The bar is the comparison; the hero number already said the total.
		 *
		 * The legend is the accessible half: it is real text listing every model with its
		 * share, and clicking a row is how a reader gets from "this model dominates" to
		 * the sessions that spent it.
		 *
		 * @param props - merged model rows, the total, and an optional select handler.
		 * @returns the card.
		 */
		/** How many model rows stay on the overview before the rest fold into one line. */
		const MODEL_RANK_LIMIT = 5;
		
		function ModelDonut({ routes, t, onSelect, extra, expanded, onToggleExpanded }) {
			const total = totalOfRoutes(routes);
			const summary = t("models.summary", { models: routes.length, total: formatCompact(total) });
			const collapsible = routes.length > MODEL_RANK_LIMIT + 1;
			const capped = collapsible && expanded !== true;
			const visible = capped ? routes.slice(0, MODEL_RANK_LIMIT) : routes;
			const hidden = capped ? routes.slice(MODEL_RANK_LIMIT) : [];
			let hiddenTokens = 0;
			for (const route of hidden) hiddenTokens += totalOf(route.tokens);
			const shareOf = (tokens) => (total > 0 ? tokens / total : 0);
			const bar = (share, color) =>
				h(
					"span",
					{ key: "track", className: "dshTup_rankTrack", "aria-hidden": "true" },
					h("span", {
						className: "dshTup_rankBar",
						style: { width: (share > 0 ? Math.max(share * 100, 3) : 0) + "%", background: color },
					}),
				);
			const row = (route) => {
				const id = routeIdOf(route);
				const tokens = totalOf(route.tokens);
				const share = shareOf(tokens);
				const efficiency = efficiencyOf(route.tokens);
				return h(
					"li",
					{ key: id, className: "dshTup_modelRow" },
					h(
						"button",
						{
							type: "button",
							className: "dshTup_modelButton",
							title: t("models.openSessions"),
							onClick: () => onSelect(id),
						},
						[
							h("span", { key: "labels", className: "dshTup_modelLabels" }, [
								h("span", { key: "m", className: "dshTup_modelName" }, [
									h("span", { key: "dot", className: "dshTup_dot", style: { background: routeColor(id) } }),
									h("span", { key: "tag", className: "dshTup_providerTag" }, route.providerName),
									h("span", { key: "sep" }, " · "),
									h("span", { key: "n", className: "dshTup_modelText" }, route.modelName),
								]),
								h(
									"span",
									{ key: "v", className: "dshTup_modelMeta" },
									formatInt(tokens) + " " + t("unit.tokens") + " · " + t("efficiency.cacheReadShort", { rate: formatShare(efficiency.cacheReadRate) }),
								),
							]),
							bar(share, routeColor(id)),
							h("span", { key: "p", className: "dshTup_modelShare" }, formatShare(share)),
						],
					),
				);
			};
			const hiddenShare = shareOf(hiddenTokens);
			return h(
				ChartCard,
				{ title: t("models.title"), extra, className: "dshTup_chartCard" },
				h("ul", { key: "legend", className: "dshTup_modelList", "aria-label": summary }, [
					...visible.map(row),
					hidden.length === 0
						? null
						: h(
								"li",
								{ key: "other", className: "dshTup_modelRow" },
								h("button", {
									type: "button",
									className: "dshTup_modelButton dshTup_modelOther",
									"aria-expanded": false,
									title: t("models.showAll", { n: hidden.length }),
									onClick: onToggleExpanded,
								}, [
									h("span", { key: "labels", className: "dshTup_modelLabels" }, [
										h("span", { key: "m", className: "dshTup_modelName" }, [
											h("span", { key: "dot", className: "dshTup_dot", style: { background: OTHER_COLOR } }),
											h("span", { key: "n", className: "dshTup_modelText" }, t("models.other")),
										]),
										h("span", { key: "v", className: "dshTup_modelMeta" }, formatInt(hiddenTokens) + " " + t("unit.tokens")),
									]),
									bar(hiddenShare, OTHER_COLOR),
									h("span", { key: "p", className: "dshTup_modelShare" }, formatShare(hiddenShare)),
								]),
							),
					collapsible && expanded === true
						? h(
								"li",
								{ key: "less", className: "dshTup_modelRow" },
								h(
									"button",
									{ type: "button", className: "dshTup_modelToggle", "aria-expanded": true, onClick: onToggleExpanded },
									t("models.showLess"),
								),
							)
						: null,
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
		/** Empty-state copy per cause: title, hint, action label. */
		const EMPTY_COPY = {
			filtered: ["emptyFiltered", "emptyFilteredHint", "emptyClear"],
			range: ["emptyRange", "emptyRangeHint", "emptyAll"],
			none: ["empty", "emptyHint", "emptyAction"],
		};
		
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
			const { row, display, share, filteredTotal, currentId, onRetry, onToggleExpand, childCount, expanded, familyTotal, depth, t } = context;
			const hideBelow = column.hideClass;
			if (column.key === "session") {
				return h("td", { key: "session", className: cx("dshTup_colSession", hideBelow) }, [
					childCount > 0
						? h(
								"button",
								{
									key: "tree",
									type: "button",
									className: "dshTup_treeToggle dshTup_treeToggleRail",
									"aria-expanded": expanded === true,
									"aria-label": expanded === true ? t("tree.collapse") : t("tree.expand"),
									onClick: (event) => {
										event.stopPropagation();
										onToggleExpand(row.id);
									},
									onKeyDown: (event) => {
										if (event.key !== "Enter" && event.key !== " ") return;
										event.stopPropagation();
										event.preventDefault();
										onToggleExpand(row.id);
									},
								},
								h(IconChevronDownOutlineRegular, { size: 14, className: "dshTup_chevron" }),
							)
						: null,
					h("div", { key: "main", className: cx("dshTup_cellMain", "dshTup_treePad", childCount > 0 && "dshTup_treeHasChildren"), "data-depth": depth ?? 1 }, [
						h("div", { key: "title", className: "dshTup_rowTitle" }, [
							row.running ? h(StateDot, { key: "run", state: "ongoing", "aria-hidden": "true" }) : null,
							h("span", { key: "text", className: "dshTup_rowTitleText" }, row.title !== undefined ? row.title : t("unknownTitle")),
							row.parentId !== undefined ? h(Tag, { key: "sub" }, t("badge.subagent")) : null,
							row.id === currentId ? h(Tag, { key: "cur" }, t("badge.current")) : null,
						]),
						h("div", { key: "meta", className: "dshTup_rowMeta" }, [
							display.directory === undefined ? null : h("span", { key: "directory", className: "dshTup_rowMetaPart" }, display.directory),
							display.turns === undefined ? null : h("span", { key: "turns", className: "dshTup_rowMetaPart dshTup_rowMetaOptional" }, display.turns),
							display.status === undefined ? null : h("span", { key: "status", className: "dshTup_rowMetaPart" }, display.status),
							h("span", { key: "cache", className: "dshTup_rowMetaPart dshTup_rowMetaOptional" }, t("efficiency.cacheReadShort", { rate: display.cacheReadRate })),
							childCount > 0 ? h("span", { key: "children", className: "dshTup_rowFamily" }, t("tree.children", { n: childCount })) : null,
							childCount > 0 && familyTotal !== undefined
								? h("span", { key: "family", className: "dshTup_rowFamily" }, t("tree.family", { n: formatInt(familyTotal) }))
								: null,
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
						h("span", { key: "num", className: "dshTup_shareNum" }, filteredTotal > 0 ? formatShare(ratio) : t("never")),
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
		function UsageRow({
			row,
			index,
			display,
			share,
			filteredTotal,
			columns,
			currentId,
			onOpen,
			onRetry,
			onToggleExpand,
			depth,
			childCount,
			expanded,
			familyTotal,
			t,
		}) {
			const activate = () => onOpen(row.id);
			const level = depth === undefined ? 1 : depth;
			return h(
				"tr",
				{
					className: cx("dshTup_row", row.id === currentId && "dshTup_rowCurrent"),
					"data-row": row.id,
					"aria-level": level,
					// The index only feeds the entrance wave: CSS multiplies it by the shared
					// stagger token, so a page of rows lands as a sweep instead of a jump.
					style: {
						"--dsh-tup-i": index,
						"--dsh-tup-tree-d": Math.min(Math.max(level - 1, 0), TREE_INDENT_CAP),
					},
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
				columns.map((column) =>
					usageCell(column, {
						row,
						display,
						share,
						filteredTotal,
						currentId,
						onRetry,
						onToggleExpand,
						childCount: childCount ?? 0,
						expanded,
						familyTotal,
						depth,
						t,
					}),
				),
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
			onToggleExpand,
			onEmptyAction,
			emptyKind,
			skeleton,
			currentId,
			fromDay,
			toDay,
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
				const index = rows.findIndex((node) => node.row.id === focusId);
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
				const [titleKey, hintKey, actionKey] = EMPTY_COPY[emptyKind] ?? EMPTY_COPY.none;
				body = h("div", { key: "empty", className: "dshTup_empty" }, [
					h(IconDatabaseOutlineRegular, { key: "icon", size: 28, className: "dshTup_emptyIcon" }),
					h("div", { key: "a" }, t(titleKey)),
					h("div", { key: "b", className: "dshTup_subtitle" }, t(hintKey)),
					h(Button, { key: "c", variant: "outline", onClick: onEmptyAction }, t(actionKey)),
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
						h("col", { key: column.key, className: column.colHideClass, style: { width: column.fluid ? undefined : column.width + "px" } }),
					),
				);
				body = h("table", { key: "t", className: "dshTup_table" }, [cols, head, h("tbody", { key: "body" }, bodyRows())]);
			}
		
			/** The ordered body content: spacer, window slice, spacer. */
			function bodyRows() {
				const out = [];
				if (range.topPad > 0) out.push(h(SpacerRow, { key: "top", height: range.topPad, columns: columns.length, position: "top" }));
				for (let index = 0; index < slice.length; index += 1) {
					const node = slice[index];
					const row = node.row;
					const usage = fromDay === null || fromDay === undefined ? row.usage : usageInWindow(row, fromDay, toDay);
					const display = displayOf(row, t, usage === row.usage ? undefined : usage);
					out.push(
						h(UsageRow, {
							key: row.id,
							index,
							row,
							display,
							share: usage === undefined ? 0 : totalOf(usage),
							filteredTotal,
							columns,
							currentId,
							onOpen,
							onRetry,
							onToggleExpand,
							depth: node.depth,
							childCount: node.childCount,
							expanded: node.expanded,
							familyTotal: node.familyTotal,
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
		 *   `overview`  the KPI strip, a compact year calendar, the daily trend, and the
		 *               model rank — a document-flow scroll, because charts stack.
		 *   `sessions`  the headline totals and the table. The header range is the usage
		 *               window shared with the overview.
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
			const [archivedId, setArchivedId] = react.useState(undefined);
			const [focusId, setFocusId] = react.useState(undefined);
			const [windowInfo, setWindowInfo] = react.useState(null);
			const [page, setPage] = react.useState(1);
			const [modelsExpanded, setModelsExpanded] = react.useState(false);
			/** Which parent sessions currently show their matched children. Not persisted. */
			const [expandedIds, setExpandedIds] = react.useState(() => new Set());
			const [thresholds, setThresholds] = react.useState(loadThresholds);
			const [thresholdOpen, setThresholdOpen] = react.useState(false);
			const [thresholdDraft, setThresholdDraft] = react.useState(() => draftOfThresholds(loadThresholds()));
			const toggleExpand = react.useCallback((id) => {
				setExpandedIds((previous) => {
					const next = new Set(previous);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			}, []);
			/**
			 * The calendar's measured card width. Hooks stay here, unconditionally, because
			 * the overview's charts mount and unmount with the view; a hook inside a child
			 * would shift every later slot in the self-check's hook runtime.
			 */
			const [heatWidth, setHeatWidth] = react.useState(0);
			const heatObserver = react.useRef(null);
			const measureHeat = react.useCallback((node) => {
				if (heatObserver.current !== null) {
					heatObserver.current();
					heatObserver.current = null;
				}
				if (node === null || node === undefined || typeof node.clientWidth !== "number") return;
				const measure = () => {
					const next = Math.max(HEATMAP_FLOOR, Math.round(node.clientWidth));
					setHeatWidth((previous) => (previous === next ? previous : next));
				};
				measure();
				if (typeof ResizeObserver === "function") {
					const observer = new ResizeObserver(measure);
					observer.observe(node);
					heatObserver.current = () => observer.disconnect();
				}
			}, []);
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
		
			react.useEffect(() => {
				saveThresholds(thresholds);
			}, [thresholds]);
		
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
			const offsetMinutes = react.useMemo(() => hostOffsetMinutes(rows), [rows]);
			const today = currentDayIndex(offsetMinutes);
			const usageWindow = react.useMemo(() => usageWindowOf(filters.range, today), [filters.range, today]);
			const tableWindow = react.useMemo(
				() => (filters.day !== null ? { fromDay: filters.day, toDay: filters.day } : usageWindow),
				[filters.day, usageWindow],
			);
			const filtered = react.useMemo(
				() => selectRows(rows, deferredQuery === filters.query ? filters : { ...filters, query: deferredQuery }, today),
				[rows, filters, deferredQuery, today],
			);
			/**
			 * The rows the overview's calendars are built from.
			 *
			 * Range and the day chip are ignored: the year grid is always a year, and the
			 * day chip is set by clicking a cell of that grid, so honouring it here would
			 * collapse the chart to the day just clicked. Query, directory, model, and the
			 * two scoping toggles still apply.
			 */
			const heatRows = react.useMemo(
				() => selectRows(rows, { ...filters, query: deferredQuery, range: "all", day: null }, today),
				[rows, filters, deferredQuery, today],
			);
			const nested = react.useMemo(() => nestRows(filtered), [filtered]);
			const visible = react.useMemo(() => {
				const from = tableWindow === null ? undefined : tableWindow.fromDay;
				const to = tableWindow === null ? undefined : tableWindow.toDay;
				const usageOfRow = (row) => (from === undefined ? row.usage : usageInWindow(row, from, to));
				return flattenTree(nested.roots, nested.childrenOf, expandedIds).map((node) => {
					if (node.childCount === 0) return node;
					const family = familyUsageOf(node.row, nested.childrenOf, usageOfRow);
					return { ...node, familyTotal: family === undefined ? undefined : totalOf(family) };
				});
			}, [nested, expandedIds, tableWindow]);
			const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
			const currentPage = Math.min(page, pageCount);
			// One page of *visible* rows, after expand/collapse. Collapsed children do not
			// occupy a slot; expanding a parent can create a second page.
			const paged = react.useMemo(
				() => visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
				[visible, currentPage],
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
		
			/** Summed usage over the filtered set, in the same window the table shows. */
			const totals = react.useMemo(
				() => sumUsageInWindow(filtered, tableWindow === null ? undefined : tableWindow.fromDay, tableWindow === null ? undefined : tableWindow.toDay),
				[filtered, tableWindow],
			);
			const filteredTotal = totalOf(totals);
			const grandTotal = react.useMemo(() => totalOf(sumUsages(rows.map((row) => row.usage ?? ZERO_USAGE))), [rows]);
			/**
			 * Runtime drift check over EVERY row, independent of the active filters — a
			 * filter must never be able to hide a disagreement. Rows are identity-stable,
			 * so this only recomputes when a row's data actually changed.
			 */
			const audit = react.useMemo(() => auditUsageConsistency(rows), [rows]);
			const columns = react.useMemo(() => orderedColumns(filters), [filters]);
			const breakdown = react.useMemo(() => {
				const source = filters.view === "overview" ? heatRows : filtered;
				const window = filters.view === "overview" ? usageWindow : tableWindow;
				return aggregateRoutesInWindow(source, window === null ? undefined : window.fromDay, window === null ? undefined : window.toDay);
			}, [filters.view, heatRows, filtered, usageWindow, tableWindow]);
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
			/** Why an empty table is empty: a narrowing filter, the header range, or no data at all. */
			const narrowed =
				filters.topLevelOnly ||
				filters.cwd !== "" ||
				filters.query.trim() !== "" ||
				filters.usedOnly ||
				filters.model !== "" ||
				filters.day !== null;
			const emptyKind = narrowed ? "filtered" : filters.range !== "all" ? "range" : "none";
		
			//#region overview data (only while the overview is on screen)
			const isOverview = filters.view === "overview";
			const calendar = react.useMemo(() => (isOverview ? aggregateDays(heatRows) : null), [isOverview, heatRows]);
			const routeCalendar = react.useMemo(() => (isOverview ? aggregateRouteDays(heatRows) : null), [isOverview, heatRows]);
			/**
			 * The Host offset that labels the day chip.
			 *
			 * The calendar is not mounted on the sessions view — the view a calendar
			 * click switches to — so the chip recovers the offset from the row that
			 * owns the selected day. Rendering it with 0 would label the day one day
			 * early for a Host west of UTC.
			 */
			const dayFilterOffset = react.useMemo(() => {
				if (filters.day === null) return offsetMinutes;
				let fallback = offsetMinutes;
				for (const row of rows) {
					const value = row.dayUsage;
					if (value === undefined) continue;
					if (value.days.some((entry) => entry.day === filters.day)) return value.offsetMinutes ?? 0;
				}
				return fallback;
			}, [rows, filters.day, offsetMinutes]);
			const streak = react.useMemo(() => (calendar === null ? { longest: 0, current: 0 } : streaksOf(calendar.byDay, today)), [calendar, today]);
			const peak = react.useMemo(() => (calendar === null ? 0 : peakOf(calendar.byDay)), [calendar]);
			const anomalies = react.useMemo(() => (calendar === null ? new Map() : anomaliesOf(calendar.byDay)), [calendar]);
			const trendDays = react.useMemo(
				() => (isOverview && calendar !== null ? trendDaysOf(filters.range, today, calendar.byDay) : []),
				[isOverview, calendar, filters.range, today],
			);
			const trendValues = react.useMemo(
				() => (calendar === null ? new Map() : totalsByDay(calendar.byDay, trendDays)),
				[calendar, trendDays],
			);
			const trendHover = react.useMemo(
				() =>
					routeCalendar === null || usageWindow === null ? undefined : trendDetails(routeCalendar.byDay, trendDays),
				[routeCalendar, usageWindow, trendDays],
			);
			// Zero-token days exist in the state (a zero sample is recorded, not dropped)
			// but must not count as "there is calendar data": the grid would render empty
			// while claiming a year of data.
			const hasCalendar = calendar !== null && [...calendar.byDay.values()].some((tokens) => totalOf(tokens) > 0);
			/**
			 * The overview KPI total. Windowed over `heatRows`, so it ignores the day
			 * chip (that filter belongs to the table) and follows the header range.
			 */
			const overviewTotal = react.useMemo(
				() => totalOf(sumUsageInWindow(heatRows, usageWindow === null ? undefined : usageWindow.fromDay, usageWindow === null ? undefined : usageWindow.toDay)),
				[heatRows, usageWindow],
			);
			const compareLabel = react.useMemo(() => {
				if (!isOverview || calendar === null || usageWindow === null) return null;
				const previous = previousUsageWindow(usageWindow);
				if (previous === null) return null;
				const currentTotal = sumDaysBetween(calendar.byDay, usageWindow.fromDay, usageWindow.toDay);
				const previousTotal = sumDaysBetween(calendar.byDay, previous.fromDay, previous.toDay);
				if (previousTotal <= 0) return null;
				const change = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
				const delta = change > 0 ? "+" + change + "%" : change + "%";
				return t("kpi.compare", { n: usageWindow.toDay - usageWindow.fromDay + 1, delta });
			}, [isOverview, calendar, usageWindow, t]);
			const heatNote =
				calendar === null
					? ""
					: t("kpi.peak") +
						" " +
						formatCompact(peak) +
						" · " +
						t("kpi.current") +
						" " +
						t("kpi.days", { n: streak.current }) +
						" · " +
						t("kpi.longestRun") +
						" " +
						t("kpi.days", { n: streak.longest });
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
					// An archived session is not listed by the sidebar tree, so opening it lands
					// on the New Session page instead of the conversation the reader clicked.
					// Say so rather than navigate into that dead end.
					if (props.isSessionArchived(id)) {
						setArchivedId(id);
						return;
					}
					try {
						props.openSession(id);
					} catch (error) {
						// A failure used to be console-only, so a click that did nothing looked
						// like a click that was ignored.
						console.warn("[dsh-token-usage-panel] could not open " + id, error);
						announce(t("openFailed"));
					}
				},
				[props.openSession, props.isSessionArchived, announce, t],
			);
		
			const onWindowChange = react.useCallback((info) => setWindowInfo(info), []);
			const onFocusHandled = react.useCallback(() => setFocusId(undefined), []);
			const onArchivedClosed = react.useCallback(() => setArchivedId(undefined), []);
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
				if (!nested.present.has(focusId)) {
					onFocusHandled();
					return;
				}
				const ancestors = ancestorIds(focusId, nested.parentOf, nested.present);
				const needsExpand = ancestors.some((id) => !expandedIds.has(id));
				if (needsExpand) {
					setExpandedIds((previous) => {
						const next = new Set(previous);
						for (const id of ancestors) next.add(id);
						return next;
					});
					return;
				}
				const index = visible.findIndex((node) => node.row.id === focusId);
				if (index < 0) {
					onFocusHandled();
					return;
				}
				const target = Math.floor(index / PAGE_SIZE) + 1;
				setPage((previous) => (previous === target ? previous : target));
			}, [focusId, nested, visible, expandedIds, onFocusHandled]);
		
			/** Narrow to one model's sessions — the payoff of seeing the split. */
			const onSelectModel = react.useCallback(
				(routeId) => {
					updateFilters((previous) => ({ ...previous, model: routeId, view: "sessions" }));
				},
				[updateFilters],
			);
			const toggleModels = react.useCallback(() => setModelsExpanded((value) => !value), []);
			const openThresholdEditor = react.useCallback(() => {
				setThresholdDraft(draftOfThresholds(thresholds));
				setThresholdOpen(true);
			}, [thresholds]);
			const closeThresholdEditor = react.useCallback(() => setThresholdOpen(false), []);
			const applyThresholdDraft = react.useCallback(() => {
				const next = thresholdsFromDraft(thresholdDraft);
				if (next === undefined) return;
				setThresholds(next);
				setThresholdOpen(false);
			}, [thresholdDraft]);
		
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
					const width = clampColumnWidth(drag.startWidth + (clientX - drag.startX));
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
		
			const exportFrom = tableWindow === null ? undefined : tableWindow.fromDay;
			const exportTo = tableWindow === null ? undefined : tableWindow.toDay;
			const sessionExportLines = react.useMemo(
				() => exportSessionLines(flattenAll(nested.roots, nested.childrenOf), exportFrom, exportTo, t),
				[nested, exportFrom, exportTo, t],
			);
			const dayExportLines = react.useMemo(
				() => exportDayLines(filtered, exportFrom, exportTo, offsetMinutes, t),
				[filtered, exportFrom, exportTo, offsetMinutes, t],
			);
			const modelExportLines = react.useMemo(
				() => exportModelLines(filtered, exportFrom, exportTo, t),
				[filtered, exportFrom, exportTo, t],
			);
		
			const flagCopied = react.useCallback(() => {
				setCopied(true);
				announce(t("export.copied"));
				window.clearTimeout(copyTimer.current);
				copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
			}, [announce, t]);
		
			const copyLines = react.useCallback(
				(lines) => {
					const tsv = lines.map((line) => line.join("\t")).join("\n");
					void Promise.resolve(writeClipboard(tsv)).then(flagCopied, (error) => {
						console.warn("[dsh-token-usage-panel] clipboard write failed", error);
						announce(t("copyFailed"));
					});
				},
				[flagCopied, announce, t],
			);
		
			const downloadLines = react.useCallback((lines, kind) => {
				const csv = lines.map((line) => line.map(csvField).join(",")).join("\r\n");
				const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
				const link = document.createElement("a");
				const stamp = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "");
				link.href = url;
				link.download = "token-usage" + (kind === "sessions" ? "" : "-" + kind) + "-" + stamp + ".csv";
				document.body.appendChild(link);
				link.click();
				link.remove();
				URL.revokeObjectURL(url);
			}, []);
		
			const onCopy = react.useCallback(() => copyLines(sessionExportLines), [copyLines, sessionExportLines]);
			const onDownload = react.useCallback(() => downloadLines(sessionExportLines, "sessions"), [downloadLines, sessionExportLines]);
			const onCopyDays = react.useCallback(() => copyLines(dayExportLines), [copyLines, dayExportLines]);
			const onDownloadDays = react.useCallback(() => downloadLines(dayExportLines, "days"), [downloadLines, dayExportLines]);
			const onCopyModels = react.useCallback(() => copyLines(modelExportLines), [copyLines, modelExportLines]);
			const onDownloadModels = react.useCallback(() => downloadLines(modelExportLines, "models"), [downloadLines, modelExportLines]);
		
			const onJumpToCurrent = react.useCallback(() => {
				updateFilters((previous) => ({ ...resetFilters(previous), model: "", view: "sessions" }));
				if (current !== undefined) setFocusId(current.id);
			}, [updateFilters, current]);
		
			const onEmptyAction = react.useCallback(() => {
				if (emptyKind === "filtered") {
					updateFilters((previous) => ({ ...previous, query: "", cwd: "", model: "", day: null, topLevelOnly: false, usedOnly: false }));
					return;
				}
				if (emptyKind === "range") {
					updateFilters((previous) => ({ ...previous, range: "all" }));
					return;
				}
				try {
					props.startSession();
				} catch (error) {
					console.warn("[dsh-token-usage-panel] could not start a session", error);
					announce(t("startFailed"));
				}
			}, [emptyKind, updateFilters, props.startSession, announce, t]);
		
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
			const hits = react.useMemo(
				() => (loading ? [] : thresholdHits(rows, thresholds, today)),
				[loading, rows, thresholds, today],
			);
			const thresholdParsed = thresholdsFromDraft(thresholdDraft);
			const coverageFrom = usageWindow === null ? today - (ROUTE_DAY_RETENTION - 1) : usageWindow.fromDay;
			const coverageTo = usageWindow === null ? today : usageWindow.toDay;
			const coverageMissing = react.useMemo(
				() => routeDayCoverageMissing(rows, coverageFrom, coverageTo),
				[rows, coverageFrom, coverageTo],
			);
		
			// Announce the end of a read, so a refresh or a cold-session backfill is not
			// silent. Only the falling edge speaks: the rising edge is already conveyed by
			// the disabled button and the skeleton.
			const wasLoading = react.useRef(false);
			react.useEffect(() => {
				if (wasLoading.current && !loading) {
					announce(hits.length > 0 ? t("threshold." + hits[0].kind + "Over", { used: formatInt(hits[0].used), limit: formatInt(hits[0].limit), title: hits[0].title ?? "" }) : t("loaded"));
				}
				wasLoading.current = loading;
			}, [loading, announce, t, hits]);
		
			const header = h("header", { key: "head", className: "dshTup_head" }, [
				h("div", { key: "main", className: "dshTup_headMain" }, [
					h("h1", { key: "title", className: "dshTup_title" }, t("title")),
					h(SegmentedControl, {
						key: "range",
						id: "dsh-tup-range",
						label: t("range"),
						value: filters.range,
						options: HEADER_RANGES.map((value) => ({ value, label: t("range." + value) })),
						onChange: (next) => updateFilters((previous) => ({ ...previous, range: next })),
					}),
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
							key: "thresholds",
							variant: "outline",
							onClick: openThresholdEditor,
						},
						t("threshold.settings"),
					),
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
		
			const filterBar = isOverview
				? null
				: h(FilterBar, {
						key: "filters",
						filters,
						setFilters: updateFilters,
						directories,
						searchRef,
						exportProps: {
							onCopy,
							onDownload,
							onCopyDays,
							onDownloadDays,
							onCopyModels,
							onDownloadModels,
							copied,
							disabled: filtered.length === 0,
						},
						onJumpToCurrent,
						hasCurrent: current !== undefined,
						onOpenThresholds: openThresholdEditor,
						modelLabel,
						dayOffsetMinutes: dayFilterOffset,
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
				coverageMissing > 0
					? h("span", { key: "coverage", className: "dshTup_notice" }, [
							h(IconWarningOutlineRegular, { key: "icon", size: 12 }),
							t("trend.partial", { n: coverageMissing }),
						])
					: null,
				audit.count > 0
					? h("details", { key: "audit", className: "dshTup_notice dshTup_audit" }, [
							h("summary", { key: "s" }, [h(IconWarningOutlineRegular, { key: "icon", size: 12 }), t("audit", { n: audit.count })]),
							h(
								"ul",
								{ key: "l", className: "dshTup_auditList" },
								audit.entries
									.slice(0, 10)
									.map((entry) =>
										h(
											"li",
											{ key: entry.id },
											t("audit.row", { title: entry.title === "" ? entry.id : entry.title, route: formatInt(entry.routeTotal), usage: formatInt(entry.usageTotal) }),
										),
									),
							),
						])
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
				isOverview ? null : h("span", { key: "count" }, t("card.sessionsHint", { matched: filtered.length, total: rows.length })),
			]);
		
			let body;
			if (isOverview) {
				body = h("div", { key: "overview", className: "dshTup_overview" }, [
					h(KpiStrip, {
						key: "kpi",
						items: [
							{
								key: "total",
								label: t("kpi.total"),
								value: formatCompact(overviewTotal),
								title: formatInt(overviewTotal) + " " + t("unit.tokens"),
							},
						],
						compare: compareLabel,
					}),
					hasCalendar
						? h(ActivityHeatmap, {
								key: "activity",
								byDay: calendar.byDay,
								offsetMinutes,
								today,
								t,
								note: heatNote,
								onSelectDay,
								selectedDay: filters.day,
								anomalies,
								frame: heatWidth,
								measureRef: measureHeat,
							})
						: h("section", { key: "noCalendar", className: "dshTup_card dshTup_chartCard dshTup_heatCard" }, [
								h("h3", { key: "t", className: "dshTup_cardTitle" }, t("activity.title")),
								h("p", { key: "a", className: "dshTup_chartHint" }, t("chart.empty")),
								h("p", { key: "b", className: "dshTup_chartHint" }, t("chart.emptyHint")),
							]),
					hasCalendar
						? h(TokenTrend, {
								key: "trend",
								days: trendDays,
								values: trendValues,
								details: trendHover,
								offsetMinutes,
								t,
								extra:
									coverageMissing > 0
										? h("span", { className: "dshTup_chartHint" }, t("trend.partial", { n: coverageMissing }))
										: null,
							})
						: null,
					breakdown === undefined
						? null
						: h(ModelDonut, {
								key: "models",
								routes: breakdown.routes,
								t,
								onSelect: onSelectModel,
								extra: null,
								expanded: modelsExpanded,
								onToggleExpanded: toggleModels,
							}),
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
						showGrand: filters.range !== "all",
						animate,
						t,
					}),
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
						onToggleExpand: toggleExpand,
						onEmptyAction,
						emptyKind,
						skeleton,
						currentId: current === undefined ? undefined : current.id,
						fromDay: tableWindow === null ? undefined : tableWindow.fromDay,
						toDay: tableWindow === null ? undefined : tableWindow.toDay,
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
					hits.length > 0
						? h("div", { key: "alerts", className: "dshTup_notice dshTup_alerts", role: "status" }, [
								h(IconWarningOutlineRegular, { key: "icon", size: 12 }),
								h(
									"ul",
									{ key: "list", className: "dshTup_alertList" },
									hits.map((hit) =>
										h("li", { key: hit.kind }, t("threshold." + hit.kind + "Over", { used: formatInt(hit.used), limit: formatInt(hit.limit), title: hit.title ?? "" })),
									),
								),
								h(Button, { key: "set", variant: "ghost", size: "sm", onClick: openThresholdEditor }, t("threshold.settings")),
							])
						: null,
					body,
					footer,
					// The archived-session notice: the answer to the click the reader just made,
					// so it is a dialog they dismiss rather than a toast that expires. The
					// platform's own Modal owns the backdrop, the focus trap and Escape.
					h(Modal, {
						key: "archived",
						open: archivedId !== undefined,
						onClose: onArchivedClosed,
						title: t("archivedTitle"),
						closeLabel: t("archivedClose"),
						description: t("archivedBody"),
						footer: h(Button, { variant: "primary", onClick: onArchivedClosed }, t("archivedClose")),
					}),
					h(
						Modal,
						{
							key: "thresholds",
							open: thresholdOpen,
							onClose: closeThresholdEditor,
							title: t("threshold.settings"),
							closeLabel: t("threshold.cancel"),
							description: t("threshold.hint"),
							footer: [
								h(Button, { key: "c", variant: "outline", onClick: closeThresholdEditor }, t("threshold.cancel")),
								h(Button, { key: "s", variant: "primary", onClick: applyThresholdDraft }, t("threshold.save")),
							],
						},
						h("div", { className: "dshTup_thresholdForm" }, [
							h("label", { key: "day", className: "dshTup_thresholdField" }, [
								h("span", { key: "l" }, t("threshold.day")),
								h(Input, {
									key: "i",
									"aria-label": t("threshold.day"),
									value: thresholdDraft.day,
									inputMode: "numeric",
									onChange: (event) => setThresholdDraft((previous) => ({ ...previous, day: event.target.value })),
								}),
							]),
							h("label", { key: "week", className: "dshTup_thresholdField" }, [
								h("span", { key: "l" }, t("threshold.week")),
								h(Input, {
									key: "i",
									"aria-label": t("threshold.week"),
									value: thresholdDraft.week,
									inputMode: "numeric",
									onChange: (event) => setThresholdDraft((previous) => ({ ...previous, week: event.target.value })),
								}),
							]),
							h("label", { key: "session", className: "dshTup_thresholdField" }, [
								h("span", { key: "l" }, t("threshold.session")),
								h(Input, {
									key: "i",
									"aria-label": t("threshold.session"),
									value: thresholdDraft.session,
									inputMode: "numeric",
									onChange: (event) => setThresholdDraft((previous) => ({ ...previous, session: event.target.value })),
								}),
							]),
							thresholdParsed === undefined ? h("p", { key: "invalid", className: "dshTup_notice" }, t("threshold.invalid")) : null,
						]),
					),
				],
			);
		}

		/** Services this client half needs before it can register its slots. */
		const inject = ["slots", "locale", "sessions", "uiWorkspace", "workspaces"];

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
			/**
			 * Whether the registry hides a session from every grouping surface.
			 *
			 * `openSession` still selects it, but the sidebar tree never lists an archived
			 * session, so the main view resolves to the New Session page instead. The panel
			 * asks before navigating, because only the archive set knows the difference.
			 */
			const isSessionArchived = (id) => ctx.workspaces.list.getSnapshot().archivedSessionIds.includes(id);
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
							isSessionArchived,
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
