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
