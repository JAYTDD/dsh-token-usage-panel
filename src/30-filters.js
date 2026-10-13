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
