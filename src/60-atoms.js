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
