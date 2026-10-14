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
	const [theme, setTheme] = react.useState(loadTheme);
	const [themeOpen, setThemeOpen] = react.useState(false);
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

	react.useEffect(() => {
		saveTheme(theme);
	}, [theme]);

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
		if (next.day !== null || next.week !== null || next.session !== null) {
			void requestThresholdNotifications().then(() => evaluateThresholdWatch(store, t));
		}
	}, [thresholdDraft, store, t]);

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
			h(ThemeMenu, { key: "theme", theme, onSelect: setTheme, open: themeOpen, setOpen: setThemeOpen, t }),
			h(
				Button,
				{
					key: "thresholds",
					className: "dshTup_thresholdBtn",
					variant: "outline",
					title: t("threshold.settings"),
					onClick: openThresholdEditor,
				},
				t("threshold.settingsShort"),
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
			"data-palette": theme,
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
