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
