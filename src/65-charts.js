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
