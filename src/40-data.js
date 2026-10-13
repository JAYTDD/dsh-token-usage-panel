//#region projection
/** Shared empty row list, so an empty table keeps one array identity. */
const EMPTY_ROWS = Object.freeze([]);
/** Shared empty day map, so an empty overview keeps one identity. */
const EMPTY_DAY_MAP = new Map();

/**
 * Read one row's projection values from the list snapshot.
 *
 * The list surface carries a per-session projection block whose values are the
 * wire views (the Host applies `wire.view` to the persisted checkpoint), so this
 * reads exactly what the shipped folds produced.
 */
function valuesOf(snapshot, id) {
	const block = snapshot.projectionsBySession === undefined ? undefined : snapshot.projectionsBySession[id];
	if (block !== undefined && block.values !== undefined) return block.values;
	const summary = snapshot.byId[id];
	return summary === undefined ? undefined : summary.projectionValues;
}

/**
 * Project one session into the row model, reusing the previous object whenever
 * every field it exposes is unchanged.
 *
 * This identity reuse is the whole performance story: the session list ticks
 * once per animation frame while any session runs, and `list.set()` hands out a
 * fresh snapshot object every time. Comparing fields and returning the previous
 * row object lets the subscription below skip the render entirely instead of
 * rebuilding rows, re-sorting, and re-formatting numbers 60 times a second.
 *
 * @param snapshot - the `ctx.sessions.list` snapshot.
 * @param id - session id.
 * @param attempts - projection-read ledger keyed by session id.
 * @param previous - this id's row from the previous projection, when there was one.
 * @returns the row, or undefined when the snapshot no longer lists the id.
 */
function rowInputOf(snapshot, id, attempts, previous) {
	const summary = snapshot.byId[id];
	if (summary === undefined) return undefined;
	const values = valuesOf(snapshot, id);
	const usage = readUsage(values === undefined ? undefined : values.tokenUsage);
	const stats = readStats(values === undefined ? undefined : values.sessionStats);
	const routeUsageRaw = readRouteUsage(values === undefined ? undefined : values.tokenUsageByRoute);
	const dayUsageRaw = readDayUsage(values === undefined ? undefined : values.tokenUsageByDay);
	const routeDayUsageRaw = readRouteDayUsage(values === undefined ? undefined : values.tokenUsageByRouteByDay);
	const title = typeof summary.displayTitle === "string" && summary.displayTitle !== "" ? summary.displayTitle : undefined;
	const running = summary.running === true;
	const blank = summary.blank === true;
	const updatedAt = typeof summary.updatedAt === "number" ? summary.updatedAt : 0;
	const cwd = typeof summary.cwd === "string" ? summary.cwd : undefined;
	const parentId = typeof summary.parentId === "string" ? summary.parentId : undefined;
	// `mainView` retention is how ui-workspace identifies the session shown in the
	// centre column; compare the number, never the wrapper object (which is
	// rebuilt on every list tick and would defeat the identity reuse below).
	const retainedBy = summary.retainedBy;
	const retainedMainView = retainedBy === undefined || retainedBy === null ? 0 : retainedBy.mainView ?? 0;
	// A blank session has started no turn, so it cannot carry usage; recording it
	// as `skipped` keeps it out of the read queue and reports it as zero.
	const attempt = blank ? "skipped" : attempts.get(id);
	const usageStable = previous !== undefined && sameUsage(previous.usage, usage) ? previous.usage : usage;
	const statsStable = previous !== undefined && sameStats(previous.stats, stats) ? previous.stats : stats;
	const routeUsageStable = previous !== undefined && sameRouteUsage(previous.routeUsage, routeUsageRaw) ? previous.routeUsage : routeUsageRaw;
	const dayUsageStable = previous !== undefined && sameDayUsage(previous.dayUsage, dayUsageRaw) ? previous.dayUsage : dayUsageRaw;
	const routeDayStable =
		previous !== undefined && sameRouteDayUsage(previous.routeDayUsage, routeDayUsageRaw) ? previous.routeDayUsage : routeDayUsageRaw;
	if (
		previous !== undefined &&
		previous.title === title &&
		previous.running === running &&
		previous.blank === blank &&
		previous.updatedAt === updatedAt &&
		previous.cwd === cwd &&
		previous.parentId === parentId &&
		previous.retainedMainView === retainedMainView &&
		previous.attempt === attempt &&
		previous.usage === usageStable &&
		previous.stats === statsStable &&
		previous.routeUsage === routeUsageStable &&
		previous.dayUsage === dayUsageStable &&
		previous.routeDayUsage === routeDayStable
	) {
		return previous;
	}
	return {
		id,
		title,
		running,
		blank,
		updatedAt,
		cwd,
		parentId,
		retainedMainView,
		attempt,
		usage: usageStable,
		stats: statsStable,
		routeUsage: routeUsageStable,
		dayUsage: dayUsageStable,
		routeDayUsage: routeDayStable,
	};
}

/**
 * Subscribe to the session list through a projection that keeps stable row
 * identities, so React only re-renders when a row's data actually changed.
 *
 * `useSyncExternalStore` requires a snapshot that is cached between store
 * notifications; the projection caches both the per-id rows and the array, and
 * returns the previous array when nothing changed.
 *
 * @param store - `ctx.sessions.list`.
 * @param attempts - projection-read ledger.
 * @param epoch - bumped when the ledger changes, forcing a re-projection.
 * @returns the row list.
 */
function useProjectedSessions(store, attempts, epoch) {
	const state = react.useRef({ epoch: -1, phase: undefined, byId: new Map(), rows: EMPTY_ROWS });
	const subscribe = react.useCallback((notify) => store.subscribe(notify), [store]);
	const getSnapshot = react.useCallback(() => {
		const snapshot = store.getSnapshot();
		// The baseline phase is read from the snapshot, never captured at render
		// time: a phase-only change (an empty profile finishing its first pull)
		// must be able to notify, and a value closed over by the last render could
		// not see it.
		const phase = snapshot.phase;
		const current = state.current;
		const byId = new Map();
		const rows = [];
		for (const id of snapshot.ids) {
			const input = rowInputOf(snapshot, id, attempts, current.byId.get(id));
			if (input === undefined) continue;
			byId.set(id, input);
			rows.push(input);
		}
		// Deliberately NOT comparing `snapshot.ids`: the Host rebuilds that array on
		// every list publication, so an identity check there would defeat the gate
		// for exactly the ticks it exists to absorb. Row identity plus the length
		// and order comparison below already detect every real change, including
		// an emptied list and a reordering.
		const unchanged =
			current.epoch === epoch &&
			current.phase === phase &&
			current.rows.length === rows.length &&
			current.rows.every((row, index) => row === rows[index]);
		state.current = { epoch, phase, byId, rows: unchanged ? current.rows : rows };
		return state.current.rows;
	}, [store, attempts, epoch]);
	return react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Project the current list snapshot into rows without React.
 * Used by the always-on threshold watcher, which must run while the panel is closed.
 * @param snapshot - `ctx.sessions.list` snapshot.
 * @returns projected rows.
 */
function rowsFromSnapshot(snapshot) {
	const rows = [];
	if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.ids)) return rows;
	const attempts = new Map();
	for (const id of snapshot.ids) {
		const row = rowInputOf(snapshot, id, attempts, undefined);
		if (row !== undefined) rows.push(row);
	}
	return rows;
}
//#endregion

//#region display cache
/**
 * Per-row display strings, keyed by the row object.
 *
 * The row identity is stable until the row's data changes, so every formatted
 * number, timestamp, and label is computed once per real change instead of once
 * per render. Swapped rather than cleared on a locale change, because a
 * `WeakMap` cannot be emptied.
 */
let displayCache = new WeakMap();

/** Drop every cached string; the next render recomputes against the new locale. */
function clearDisplayCache() {
	displayCache = new WeakMap();
}

/**
 * The formatted strings one row renders.
 * @param row - projected row.
 * @param t - translate seat.
 * @returns the cached display record.
 */
function displayOf(row, t, usageOverride) {
	if (usageOverride === undefined) {
		const cached = displayCache.get(row);
		if (cached !== undefined) return cached;
	}
	const usage = usageOverride !== undefined ? usageOverride : row.usage;
	const total = usage === undefined ? undefined : totalOf(usage);
	const efficiency = usage === undefined ? undefined : efficiencyOf(usage);
	const directory = leafName(row.cwd);
	const record = {
		total: total === undefined ? t("never") : formatInt(total),
		input: usage === undefined ? t("never") : formatInt(usage.uncachedInputTokens),
		cacheRead: usage === undefined ? t("never") : formatInt(usage.cacheReadTokens),
		cacheWrite: usage === undefined ? t("never") : formatInt(usage.cacheWriteTokens),
		output: usage === undefined ? t("never") : formatInt(usage.outputTokens),
		cacheReadRate: efficiency === undefined ? t("never") : formatShare(efficiency.cacheReadRate),
		directory,
		turns: row.stats === undefined ? undefined : t("col.turns") + " " + formatInt(row.stats.turns),
		status: total === undefined ? t("missing") : total === 0 ? t("zero") : undefined,
		updatedAt: formatTime(row.updatedAt),
		tooltip: (row.title ?? t("unknownTitle")) + "\n" + row.id + "\n" + formatFullTime(row.updatedAt),
	};
	if (usageOverride === undefined) displayCache.set(row, record);
	return record;
}
//#endregion

//#region aggregation
/**
 * Merge the filtered rows' per-model usage into one breakdown.
 *
 * Labels come from the rows' own resolved labels, so the browser never re-derives
 * a gateway or a display name — the Host owns that single implementation.
 *
 * @param rows - the filtered rows.
 * @returns `{ routes: [{ provider, model, providerName, modelName, tokens }] }`,
 *   or undefined when no row carries route data.
 */
function aggregateRoutes(rows) {
	const merged = new Map();
	for (const row of rows) {
		const value = row.routeUsage;
		if (value === undefined) continue;
		for (const route of value.routes) {
			// The model band answers which models consumed tokens. Keep zero-use
			// registry/header routes out of the displayed breakdown.
			if (totalOf(route.tokens) <= 0) continue;
			const key = routeIdOf(route);
			let entry = merged.get(key);
			if (entry === undefined) {
				entry = {
					provider: route.provider,
					model: route.model,
					providerName: route.providerName,
					modelName: route.modelName,
					tokens: zeroUsage(),
				};
				merged.set(key, entry);
			}
			addInto(entry.tokens, route.tokens);
		}
	}
	if (merged.size === 0) return undefined;
	const routes = [...merged.values()];
	routes.sort((left, right) => totalOf(right.tokens) - totalOf(left.tokens) || left.model.localeCompare(right.model));
	return { routes };
}

/**
 * Merge the filtered rows' per-day totals into one calendar.
 * @param rows - the filtered rows.
 * @returns `{ byDay, offsetMinutes, first, last }`, where `byDay` maps a Host day
 *   index to summed tokens; empty maps and a null span when no row carries day data.
 */
function aggregateDays(rows) {
	const byDay = new Map();
	let offsetMinutes;
	let first = null;
	let last = null;
	let any = false;
	for (const row of rows) {
		const value = row.dayUsage;
		if (value === undefined) continue;
		any = true;
		if (offsetMinutes === undefined) offsetMinutes = value.offsetMinutes;
		for (const day of value.days) {
			const current = byDay.get(day.day);
			if (current === undefined) byDay.set(day.day, { ...day.tokens });
			else addInto(current, day.tokens);
		}
		if (value.first !== null && (first === null || value.first < first)) first = value.first;
		if (value.last !== null && (last === null || value.last > last)) last = value.last;
	}
	if (!any) return { byDay: EMPTY_DAY_MAP, offsetMinutes: 0, first: null, last: null };
	return { byDay, offsetMinutes: offsetMinutes ?? 0, first, last };
}

/**
 * Merge the filtered rows' per-day-per-model detail into one calendar.
 * @param rows - the filtered rows.
 * @returns `{ byDay, offsetMinutes }`, where each day maps `routeId` to that day's
 *   tokens for the route.
 */
function aggregateRouteDays(rows) {
	const byDay = new Map();
	let offsetMinutes;
	let any = false;
	for (const row of rows) {
		const value = row.routeDayUsage;
		if (value === undefined) continue;
		any = true;
		if (offsetMinutes === undefined && row.dayUsage !== undefined) offsetMinutes = row.dayUsage.offsetMinutes;
		for (const day of value.days) {
			let bucket = byDay.get(day.day);
			if (bucket === undefined) {
				bucket = new Map();
				byDay.set(day.day, bucket);
			}
			for (const route of day.routes) {
				if (totalOf(route.tokens) <= 0) continue;
				const key = routeIdOf(route);
				const current = bucket.get(key);
				if (current === undefined) bucket.set(key, { ...route, tokens: { ...route.tokens } });
				else addInto(current.tokens, route.tokens);
			}
		}
	}
	if (!any) return { byDay: EMPTY_DAY_MAP, offsetMinutes: 0 };
	return { byDay, offsetMinutes: offsetMinutes ?? 0 };
}

/**
 * The day index the Host would assign to "now".
 * @param offsetMinutes - the Host's UTC offset from the data.
 * @returns the day index.
 */
function currentDayIndex(offsetMinutes) {
	return Math.floor((Date.now() + offsetMinutes * 60000) / DAY_MS);
}

/**
 * A window of Host day indices ending today, in ascending order.
 * @param today - the Host's current day index.
 * @param count - how many days the window spans.
 * @returns the day indices.
 */
function rangeDays(today, count) {
	const days = [];
	for (let offset = count - 1; offset >= 0; offset -= 1) days.push(today - offset);
	return days;
}

/**
 * Longest and current run of consecutive days that have usage.
 *
 * "Current" counts back from today (or from the most recent day with usage, so a
 * day that has not started yet in the Host's frame does not read as a broken
 * streak); a gap of one day ends it, which is the usual reading of a streak.
 *
 * @param byDay - day index → tokens.
 * @param today - the Host's current day index.
 * @returns `{ longest, current }` in days.
 */
function streaksOf(byDay, today) {
	// A day entry can exist with all-zero buckets (a zero-token settlement is
	// recorded, not dropped), and a day without tokens must not read as an active
	// streak day: the calendar paints it empty and the KPI would disagree.
	const days = [...byDay.keys()].filter((day) => totalOf(byDay.get(day)) > 0).sort((left, right) => left - right);
	let longest = 0;
	let run = 0;
	let previous = null;
	for (const day of days) {
		run = previous !== null && day === previous + 1 ? run + 1 : 1;
		if (run > longest) longest = run;
		previous = day;
	}
	if (days.length === 0) return { longest: 0, current: 0 };
	let current = 0;
	let cursor = days[days.length - 1];
	if (cursor < today - 1) return { longest, current: 0 };
	while (byDay.has(cursor) && totalOf(byDay.get(cursor)) > 0) {
		current += 1;
		cursor -= 1;
	}
	return { longest, current };
}

/** The largest single-day total. */
function peakOf(byDay) {
	let peak = 0;
	for (const tokens of byDay.values()) {
		const total = totalOf(tokens);
		if (total > peak) peak = total;
	}
	return peak;
}

/**
 * Identify unusually high days from up to 28 preceding active days. A median
 * resists one-off spikes, and seven samples are required before any day is
 * labelled so a new installation does not manufacture anomalies.
 */
function anomaliesOf(byDay) {
	const days = [...byDay.keys()].sort((left, right) => left - right);
	const anomalies = new Map();
	for (let index = 0; index < days.length; index += 1) {
		const day = days[index];
		const value = totalOf(byDay.get(day));
		if (value <= 0) continue;
		const samples = [];
		for (let cursor = Math.max(0, index - 28); cursor < index; cursor += 1) {
			const candidate = totalOf(byDay.get(days[cursor]));
			if (candidate > 0) samples.push(candidate);
		}
		if (samples.length < 7) continue;
		samples.sort((left, right) => left - right);
		const middle = Math.floor(samples.length / 2);
		const median = samples.length % 2 === 0 ? (samples[middle - 1] + samples[middle]) / 2 : samples[middle];
		if (median > 0 && value >= median * 2) anomalies.set(day, { value, median });
	}
	return anomalies;
}

/**
 * The Host UTC offset carried by the first row that has one.
 * @param rows - projected rows.
 * @returns minutes east of UTC, or 0 when none of the rows know.
 */
function hostOffsetMinutes(rows) {
	for (const row of rows) {
		const value = row.dayUsage;
		if (value === undefined) continue;
		if (typeof value.offsetMinutes === "number" && Number.isFinite(value.offsetMinutes)) return value.offsetMinutes;
	}
	return 0;
}

/**
 * The inclusive Host-day window a range names, or null for lifetime (`all`).
 * @param range - `all` | `7d` | `30d` | `90d`.
 * @param today - the Host's current day index.
 * @returns `{ fromDay, toDay }` or null.
 */
function usageWindowOf(range, today) {
	if (range === "7d") return { fromDay: today - 6, toDay: today };
	if (range === "30d") return { fromDay: today - 29, toDay: today };
	if (range === "90d") return { fromDay: today - (ROUTE_DAY_RETENTION - 1), toDay: today };
	return null;
}

/**
 * The equal-length window immediately before `window`.
 * @param window - `{ fromDay, toDay }`.
 * @returns the previous window, or null when there is no current one.
 */
function previousUsageWindow(window) {
	if (window === null || window === undefined) return null;
	const span = window.toDay - window.fromDay + 1;
	return { fromDay: window.fromDay - span, toDay: window.fromDay - 1 };
}

/**
 * One row's token buckets inside an inclusive day span.
 * @param row - projected row.
 * @param fromDay - inclusive start.
 * @param toDay - inclusive end.
 * @returns the summed buckets, or undefined when the row has no day breakdown.
 */
function usageInWindow(row, fromDay, toDay) {
	const days = row.dayUsage === undefined ? undefined : row.dayUsage.days;
	if (days === undefined) return undefined;
	const total = zeroUsage();
	for (const entry of days) {
		if (entry.day < fromDay || entry.day > toDay) continue;
		addInto(total, entry.tokens);
	}
	return total;
}

/**
 * Whether a row spent any tokens inside an inclusive day span.
 * @param row - projected row.
 * @param fromDay - inclusive start.
 * @param toDay - inclusive end.
 * @returns true when at least one day in the span has a positive total.
 */
function rowHasUsageInWindow(row, fromDay, toDay) {
	const days = row.dayUsage === undefined ? undefined : row.dayUsage.days;
	if (days === undefined) return false;
	for (const entry of days) {
		if (entry.day < fromDay || entry.day > toDay) continue;
		if (totalOf(entry.tokens) > 0) return true;
	}
	return false;
}

/**
 * Sum usage over rows. With a window, each row contributes its day buckets in
 * that span; without one, each row contributes its lifetime `tokenUsage`.
 * @param rows - projected rows.
 * @param fromDay - inclusive start, or null/undefined for lifetime.
 * @param toDay - inclusive end, or null/undefined for lifetime.
 * @returns the four summed counters.
 */
function sumUsageInWindow(rows, fromDay, toDay) {
	if (fromDay === null || fromDay === undefined || toDay === null || toDay === undefined) {
		return sumUsages(rows.map((row) => row.usage ?? ZERO_USAGE));
	}
	const total = zeroUsage();
	for (const row of rows) {
		const usage = usageInWindow(row, fromDay, toDay);
		if (usage === undefined) continue;
		addInto(total, usage);
	}
	return total;
}

/**
 * Sum the calendar's per-day totals over an inclusive span.
 * @param byDay - day index → tokens.
 * @param fromDay - inclusive start.
 * @param toDay - inclusive end.
 * @returns the summed total.
 */
function sumDaysBetween(byDay, fromDay, toDay) {
	let total = 0;
	for (let day = fromDay; day <= toDay; day += 1) {
		const tokens = byDay.get(day);
		if (tokens === undefined) continue;
		total += totalOf(tokens);
	}
	return total;
}

/**
 * The day indices the trend draws for a range.
 *
 * `7d` / `30d` / `90d` are a trailing window ending today. `all` runs from the
 * earliest day that has usage to today, capped at 366.
 *
 * @param range - `all` | `7d` | `30d` | `90d`.
 * @param today - the Host's current day index.
 * @param byDay - day index → tokens.
 * @returns the day indices, ascending.
 */
function trendDaysOf(range, today, byDay) {
	if (range === "7d") return rangeDays(today, 7);
	if (range === "30d") return rangeDays(today, 30);
	if (range === "90d") return rangeDays(today, ROUTE_DAY_RETENTION);
	let first = today;
	let any = false;
	for (const [day, tokens] of byDay) {
		if (totalOf(tokens) <= 0) continue;
		any = true;
		if (day < first) first = day;
	}
	if (!any) return rangeDays(today, 1);
	return rangeDays(today, Math.min(366, Math.max(1, today - first + 1)));
}

/**
 * Per-day totals over a window, for the single trend line.
 * @param byDay - day index → tokens.
 * @param days - the day indices in the window, ascending.
 * @returns day → total.
 */
function totalsByDay(byDay, days) {
	const values = new Map();
	for (const day of days) {
		const tokens = byDay.get(day);
		if (tokens === undefined) continue;
		const total = totalOf(tokens);
		if (total > 0) values.set(day, total);
	}
	return values;
}

/**
 * Merge per-model usage. With a window this walks `tokenUsageByRouteByDay`;
 * without one it uses the lifetime `tokenUsageByRoute` breakdown.
 * @param rows - projected rows.
 * @param fromDay - inclusive start, or null/undefined for lifetime.
 * @param toDay - inclusive end, or null/undefined for lifetime.
 * @returns `{ routes }` or undefined when nothing has model data.
 */
function aggregateRoutesInWindow(rows, fromDay, toDay) {
	if (fromDay === null || fromDay === undefined || toDay === null || toDay === undefined) return aggregateRoutes(rows);
	const merged = new Map();
	for (const row of rows) {
		const value = row.routeDayUsage;
		if (value === undefined) continue;
		for (const day of value.days) {
			if (day.day < fromDay || day.day > toDay) continue;
			for (const route of day.routes) {
				if (totalOf(route.tokens) <= 0) continue;
				const key = routeIdOf(route);
				let entry = merged.get(key);
				if (entry === undefined) {
					entry = {
						provider: route.provider,
						model: route.model,
						providerName: route.providerName,
						modelName: route.modelName,
						tokens: zeroUsage(),
					};
					merged.set(key, entry);
				}
				addInto(entry.tokens, route.tokens);
			}
		}
	}
	if (merged.size === 0) return undefined;
	const routes = [...merged.values()];
	routes.sort((left, right) => totalOf(right.tokens) - totalOf(left.tokens) || left.model.localeCompare(right.model));
	return { routes };
}

/**
 * Whether this row's per-model-by-day window is missing a day that the per-day
 * totals still have, inside the Host retention span.
 *
 * Old checkpoints were pruned at 31 days. After the window grew to 90 those
 * days stay absent until a projection refresh rebuilds them; treating the
 * truncated block as complete would under-count model hover and the 90-day
 * rank. Missing units are a different case (`needsRead` already queues those).
 *
 * @param row - projected row.
 * @param today - the Host's current day index.
 * @returns true when a billed day in the retention window has no route-by-day row.
 */
function routeDayCoverageGap(row, today) {
	const dayUsage = row.dayUsage;
	const routeDay = row.routeDayUsage;
	if (dayUsage === undefined || routeDay === undefined) return false;
	const from = today - (ROUTE_DAY_RETENTION - 1);
	const covered = new Set();
	for (const entry of routeDay.days) covered.add(entry.day);
	for (const entry of dayUsage.days) {
		if (entry.day < from || entry.day > today) continue;
		if (totalOf(entry.tokens) <= 0) continue;
		if (!covered.has(entry.day)) return true;
	}
	return false;
}

/**
 * How many days in an inclusive span have token totals but no per-model detail.
 * @param rows - projected rows.
 * @param fromDay - inclusive start.
 * @param toDay - inclusive end.
 * @returns the number of uncovered days.
 */
function routeDayCoverageMissing(rows, fromDay, toDay) {
	if (fromDay === null || fromDay === undefined || toDay === null || toDay === undefined) return 0;
	const daysWithUsage = new Set();
	const daysWithRoutes = new Set();
	for (const row of rows) {
		if (row.dayUsage !== undefined) {
			for (const entry of row.dayUsage.days) {
				if (entry.day < fromDay || entry.day > toDay) continue;
				if (totalOf(entry.tokens) > 0) daysWithUsage.add(entry.day);
			}
		}
		if (row.routeDayUsage !== undefined) {
			for (const entry of row.routeDayUsage.days) {
				if (entry.day < fromDay || entry.day > toDay) continue;
				if (entry.routes.some((route) => totalOf(route.tokens) > 0)) daysWithRoutes.add(entry.day);
			}
		}
	}
	let missing = 0;
	for (const day of daysWithUsage) if (!daysWithRoutes.has(day)) missing += 1;
	return missing;
}

/** Header cells for the four billing buckets plus the total, in export order. */
function exportBucketHeader(t) {
	return [t("col.input"), t("col.cacheRead"), t("col.cacheWrite"), t("col.output"), t("col.total")];
}

/** Raw bucket integers (or blanks) matching `exportBucketHeader`. */
function exportBucketCells(usage) {
	if (usage === undefined) return ["", "", "", "", ""];
	return [usage.uncachedInputTokens, usage.cacheReadTokens, usage.cacheWriteTokens, usage.outputTokens, totalOf(usage)];
}

/**
 * Session export: every matched row (tree order, including collapsed children),
 * always with the four raw buckets. Independent of `showBuckets`.
 * @param nodes - `flattenAll` result.
 * @param fromDay - inclusive start, or undefined for lifetime.
 * @param toDay - inclusive end, or undefined for lifetime.
 * @param t - translate seat.
 * @returns `string[][]` including a header row.
 */
function exportSessionLines(nodes, fromDay, toDay, t) {
	const lines = [[t("col.session"), t("col.id"), t("col.updated"), ...exportBucketHeader(t)]];
	for (const node of nodes) {
		const row = node.row;
		const usage = fromDay === undefined || toDay === undefined ? row.usage : usageInWindow(row, fromDay, toDay);
		const updated = typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt) && row.updatedAt > 0 ? new Date(row.updatedAt).toISOString() : "";
		lines.push([row.title !== undefined && row.title !== "" ? row.title : t("unknownTitle"), row.id, updated, ...exportBucketCells(usage)]);
	}
	return lines;
}

/**
 * Daily export of the current filtered set in the current window.
 * `all` emits every calendar day that has usage.
 * @param rows - filtered rows.
 * @param fromDay - inclusive start, or undefined for lifetime.
 * @param toDay - inclusive end, or undefined for lifetime.
 * @param offsetMinutes - Host UTC offset, for ISO dates.
 * @param t - translate seat.
 * @returns `string[][]` including a header row.
 */
function exportDayLines(rows, fromDay, toDay, offsetMinutes, t) {
	const calendar = aggregateDays(rows);
	const lines = [[t("export.col.date"), ...exportBucketHeader(t)]];
	const days = [];
	if (fromDay === undefined || toDay === undefined) {
		for (const [day, tokens] of calendar.byDay) {
			if (totalOf(tokens) > 0) days.push(day);
		}
		days.sort((left, right) => left - right);
	} else {
		for (let day = fromDay; day <= toDay; day += 1) {
			const tokens = calendar.byDay.get(day);
			if (tokens === undefined || totalOf(tokens) <= 0) continue;
			days.push(day);
		}
	}
	for (const day of days) lines.push([formatDayIso(day, offsetMinutes), ...exportBucketCells(calendar.byDay.get(day))]);
	return lines;
}

/**
 * Per-model export of the current filtered set in the current window.
 * `all` uses lifetime `tokenUsageByRoute`, never a fake year of route-by-day.
 * @param rows - filtered rows.
 * @param fromDay - inclusive start, or undefined for lifetime.
 * @param toDay - inclusive end, or undefined for lifetime.
 * @param t - translate seat.
 * @returns `string[][]` including a header row.
 */
function exportModelLines(rows, fromDay, toDay, t) {
	const breakdown = aggregateRoutesInWindow(rows, fromDay, toDay);
	const lines = [[t("export.col.provider"), t("export.col.model"), t("filter.model"), ...exportBucketHeader(t)]];
	if (breakdown === undefined) return lines;
	for (const route of breakdown.routes) {
		lines.push([route.provider, route.model, routeLabel(route), ...exportBucketCells(route.tokens)]);
	}
	return lines;
}

//#endregion

//#region read queue
/**
 * Read every session's token usage, refreshing projection columns the list
 * snapshot left empty.
 *
 * The list surface already carries each session's cached projection column, so
 * most rows resolve without a read. Rows whose cache missed are read one at a
 * time through `sessions.refreshProjections`, which folds the durable log on the
 * Host without activating an Agent; the result lands in the same projection
 * store the list snapshot serves, so this hook needs no value cache.
 *
 * Reads are never cancelled by a snapshot change: the session list ticks every
 * frame, so tearing reads down with an effect would strand ids mid-read and
 * leave them spinning forever. The queue is drained by one long-lived pump.
 *
 * @param sessions - the `sessions` client service.
 * @param store - `ctx.sessions.list`.
 * @returns rows plus load state and recovery callbacks.
 */
function useUsageRows(sessions, store) {
	/** Attempt ledger: id → `loading` | `loaded` | `error`. Never retried on its own. */
	const attemptsRef = react.useRef(new Map());
	/** Ids waiting for a read slot, owned for the panel's lifetime. */
	const queueRef = react.useRef([]);
	/** Reads currently in flight. */
	const activeRef = react.useRef(0);
	/** False once the panel unmounts, so a settling read stops driving state. */
	const aliveRef = react.useRef(true);
	const [budget, setBudget] = react.useState(AUTO_LOAD_BUDGET);
	const [epoch, setEpoch] = react.useState(0);
	/**
	 * Whether this Host serves the extra usage units, resolved by the first read.
	 *
	 * A session whose cached projection column predates this plugin carries
	 * `tokenUsage` but NOT `tokenUsageByRoute` / `ByDay` / `ByRouteByDay`. Keying the
	 * read queue on `tokenUsage` alone therefore never refreshes those rows, so the
	 * charts and the per-model breakdown silently cover only the sessions that
	 * happened to be live. Measured on a real profile that was 186M of 216M tokens —
	 * 14% of the total missing, and the table and the charts disagreeing. The probe
	 * keeps a composition without the Host half from folding every log for units that
	 * will never appear.
	 */
	const [hostUnits, setHostUnits] = react.useState("unknown");
	const rows = useProjectedSessions(store, attemptsRef.current, epoch);

	react.useEffect(
		() => () => {
			aliveRef.current = false;
		},
		[],
	);

	/**
	 * Whether this row still needs a projection read.
	 * @param row - the projected row.
	 * @returns true when any value the panel displays is absent.
	 */
	const needsRead = (row, today) => {
		if (row.blank) return false;
		if (row.usage === undefined) return true;
		if (hostUnits === "no") return false;
		// Every value the panel displays is a read requirement, so this list must
		// name each projected unit the row field depends on. Dropping one here
		// leaves cache rows written before it silently under-reported.
		if (row.routeUsage === undefined || row.dayUsage === undefined || row.routeDayUsage === undefined) return true;
		return routeDayCoverageGap(row, today);
	};

	/** Fill the read slots from the queue. */
	const pump = react.useCallback(() => {
		/** Whether one finished read produced the day unit (the probe's evidence). */
		const probeDayUnit = (id) => {
			const values = valuesOf(store.getSnapshot(), id);
			return readDayUsage(values === undefined ? undefined : values.tokenUsageByDay) !== undefined;
		};
		/**
		 * Resolve whether this Host serves the extra units, from the store rather
		 * than from the rows this render closed over (the refresh just landed and
		 * React has not re-rendered).
		 *
		 * A "yes" is conclusive. A "no" is re-checked once on a later macrotask:
		 * `refreshProjections` may resolve before the list snapshot has ingested
		 * the refreshed projection, and a false "no" would disable the backfill
		 * for every remaining stale row — the exact 14% failure this probe exists
		 * to prevent. `refresh()` resets the verdict, so even a wrong "no" has a
		 * recovery path.
		 */
		const probeHostUnits = (id) => {
			if (probeDayUnit(id)) {
				setHostUnits("yes");
				return;
			}
			setTimeout(() => {
				if (!aliveRef.current) return;
				setHostUnits((value) => (value === "unknown" && !probeDayUnit(id) ? "no" : value));
			}, 0);
		};
		while (activeRef.current < LOAD_CONCURRENCY && queueRef.current.length > 0) {
			const id = queueRef.current.shift();
			activeRef.current += 1;
			void (async () => {
				try {
					await sessions.refreshProjections(id);
					attemptsRef.current.set(id, "loaded");
					probeHostUnits(id);
				} catch (error) {
					attemptsRef.current.set(id, "error");
					console.warn("[dsh-token-usage-panel] projection read failed for " + id, error);
				} finally {
					activeRef.current -= 1;
					if (aliveRef.current) {
						setEpoch((value) => value + 1);
						pump();
					}
				}
			})();
		}
	}, [sessions, store]);

	react.useEffect(() => {
		let queued = false;
		const today = currentDayIndex(hostOffsetMinutes(rows));
		for (const row of rows) {
			if (!needsRead(row, today)) continue;
			if (attemptsRef.current.has(row.id)) continue;
			if (attemptsRef.current.size >= budget) break;
			attemptsRef.current.set(row.id, "loading");
			queueRef.current.push(row.id);
			queued = true;
		}
		if (queued) pump();
	}, [rows, budget, pump, hostUnits]);

	let pending = 0;
	let waiting = 0;
	let unavailable = 0;
	const today = currentDayIndex(hostOffsetMinutes(rows));
	for (const row of rows) {
		if (row.attempt === "loading") {
			pending += 1;
			continue;
		}
		if (row.usage === undefined) {
			// `blank` rows are complete by definition (they cannot carry usage).
			if (row.attempt === undefined && !row.blank) waiting += 1;
			else if (!row.blank) unavailable += 1;
			continue;
		}
		if (needsRead(row, today) && row.attempt === undefined) waiting += 1;
	}

	const refresh = react.useCallback(() => {
		attemptsRef.current.clear();
		queueRef.current.length = 0;
		// Re-open the Host-unit probe: the verdict may have been a false "no" (a
		// store that lagged the first read), or the Host half may have appeared
		// since. Without this reset the panel could never recover.
		setHostUnits("unknown");
		setBudget(AUTO_LOAD_BUDGET);
		void Promise.resolve(sessions.refresh()).catch(() => undefined);
		setEpoch((value) => value + 1);
	}, [sessions]);

	/** Re-read one session whose projection read failed. */
	const retry = react.useCallback(
		(id) => {
			attemptsRef.current.delete(id);
			queueRef.current.push(id);
			pump();
		},
		[pump],
	);

	const loadMore = react.useCallback(() => {
		setBudget((value) => value + AUTO_LOAD_BUDGET);
	}, []);

	return { rows, pending, waiting, unavailable, refresh, retry, loadMore };
}
//#endregion
