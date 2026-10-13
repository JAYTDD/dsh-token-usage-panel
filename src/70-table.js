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
