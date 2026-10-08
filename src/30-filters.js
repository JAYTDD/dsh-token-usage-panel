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
