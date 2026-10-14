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
	const armed = react.useSyncExternalStore(subscribeThresholdBadge, thresholdBadgeSnapshot, thresholdBadgeSnapshot);
	return h("span", { className: "dshTup_navIcon", "data-alert": armed ? "true" : undefined }, [
		h(IconDatabaseOutlineRegular, { key: "i", size }),
		armed ? h("span", { key: "b", className: "dshTup_navBadge", "aria-hidden": "true" }) : null,
	]);
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

/**
 * Header menu that switches the panel's element palette. Surfaces stay on the
 * host; type roles, series, composition states and hover wash move. Open state
 * lives on the panel so this stays hook-free (the self-check's cursor cannot
 * absorb a child hook).
 */
function ThemeMenu({ theme, onSelect, open, setOpen, t }) {
	const items = [];
	const selectedIds = [theme];
	let lastGroup;
	for (const entry of PALETTES) {
		if (entry.group !== lastGroup) {
			lastGroup = entry.group;
			items.push({ id: "sep:" + entry.group, type: "separator" });
			items.push({ id: "label:" + entry.group, type: "label", text: t("theme.group." + entry.group) });
		}
		items.push({ id: entry.id, label: t("theme." + entry.id) });
	}
	const menuOpen = open === true;
	return h(Menu, {
		open: menuOpen,
		className: "dshTup_menu",
		items,
		selectedIds,
		onSelect: (id) => {
			if (paletteOf(id) !== undefined) onSelect(id);
			setOpen(false);
		},
		onClose: () => setOpen(false),
		portal: true,
		anchor: h(
			Button,
			{
				variant: "outline",
				className: "dshTup_themeBtn",
				"aria-label": t("theme"),
				"aria-haspopup": "menu",
				"aria-expanded": menuOpen,
				onClick: () => setOpen((previous) => previous !== true),
			},
			[
				h("span", { key: "l", className: "dshTup_triggerLabel" }, t("theme.short")),
				h(IconChevronDownOutlineRegular, { key: "c", size: 14, className: cx("dshTup_chevron", menuOpen && "dshTup_chevronOpen") }),
			],
		),
	});
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
