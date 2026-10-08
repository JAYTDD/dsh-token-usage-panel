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
