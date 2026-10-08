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
function displayOf(row, t) {
	const cached = displayCache.get(row);
	if (cached !== undefined) return cached;
	const usage = row.usage;
	const total = usage === undefined ? undefined : totalOf(usage);
	const meta = [];
	const directory = leafName(row.cwd);
	if (directory !== undefined) meta.push(directory);
	if (row.stats !== undefined) meta.push(t("col.turns") + " " + formatInt(row.stats.turns));
	if (total === undefined) meta.push(t("missing"));
	else if (total === 0) meta.push(t("zero"));
	meta.push(row.id);
	const record = {
		total: total === undefined ? t("never") : formatInt(total),
		input: usage === undefined ? t("never") : formatInt(usage.uncachedInputTokens),
		cacheRead: usage === undefined ? t("never") : formatInt(usage.cacheReadTokens),
		cacheWrite: usage === undefined ? t("never") : formatInt(usage.cacheWriteTokens),
		output: usage === undefined ? t("never") : formatInt(usage.outputTokens),
		updatedAt: formatTime(row.updatedAt),
		tooltip: formatFullTime(row.updatedAt),
		meta: meta.join(" · "),
	};
	displayCache.set(row, record);
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
	const needsRead = (row) => {
		if (row.blank) return false;
		if (row.usage === undefined) return true;
		if (hostUnits === "no") return false;
		// Every value the panel displays is a read requirement, so this list must
		// name each projected unit the row field depends on. Dropping one here
		// leaves cache rows written before it silently under-reported.
		return row.routeUsage === undefined || row.dayUsage === undefined || row.routeDayUsage === undefined;
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
		for (const row of rows) {
			if (!needsRead(row)) continue;
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
		if (needsRead(row) && row.attempt === undefined) waiting += 1;
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
