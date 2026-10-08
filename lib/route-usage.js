/**
 * Usage-derived session projection units: per-model totals, per-day totals, and
 * per-day-per-model totals.
 *
 * Why projection units and not Host RPCs: a unit with a `wire` block is
 * client-visible, so it flows through the existing read model unchanged — the
 * session listing's projection column, `session.projections`, the control
 * stream, and the projection cache all carry it with no new service, Remote
 * namespace, or descriptor.
 *
 * All three folds share ONE event-advance step (`advanceUsage`). That is the
 * point: `dsh-token-meter` already owns `tokenUsage`, and the replace-within-a
 * -step rule and the `llm/retry-started` boundary must exist in exactly one place
 * here, or the three units drift apart and their sums stop matching the shipped
 * total. The host self-check asserts `sum(per-model) === sum(per-day) ===
 * tokenUsage` differentially against a reimplementation of the shipped fold.
 *
 * Schemas are duck-typed (`{ parse }`) because the projection registry only ever
 * calls `.parse(value)` and treats a throw as "unusable row". That keeps this
 * package dependency-free: a real schema library would mean either a pnpm
 * install into the profile or an import the installed app cannot resolve.
 *
 * There is NO pricing here. Money was removed deliberately: a shipped price table
 * goes stale within weeks and then renders confidently wrong figures, and the
 * breakdown's job is usage, not billing.
 *
 * @module dsh-token-usage-panel/route-usage
 */

/** The four disjoint billing buckets, in canonical order. */
const BUCKET_FIELDS = ["uncachedInputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"];
/** Route key used before any `request/header` has been folded. */
const UNKNOWN_ROUTE = "unknown";
const DAY_MS = 86400000;
/** Days of per-day totals retained (the activity heat map shows about a year). */
const DAY_WINDOW = 366;
/** Days of per-day-per-model detail retained (the trend chart spans at most 30). */
const ROUTE_DAY_WINDOW = 31;
/**
 * Events that bound a session's chat duration. Using a small milestone set keeps
 * the per-day state from advancing on every unrelated event, and "first to last
 * milestone" is what a duration figure should mean.
 */
const SPAN_EVENTS = new Set(["turn/start", "turn/end", "user/message", "assistant/message", "assistant/attempt", "request/header"]);

/** A non-negative finite count. */
function isCount(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** A complete bucket record. */
function isBuckets(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	for (const field of BUCKET_FIELDS) if (!isCount(value[field])) return false;
	return true;
}

/**
 * Build a duck-typed schema. The registry's contract is `.parse(value)`, which
 * must return the value or throw.
 * @param label - diagnostic name used in the thrown error.
 * @param validate - predicate over the candidate value.
 * @returns the schema object the projection registry accepts.
 */
function schema(label, validate) {
	return {
		parse(value) {
			if (!validate(value)) throw new Error(label + " is not a valid value");
			return value;
		},
	};
}

/** The shared `{ route, last }` bookkeeping every unit carries. */
function isRoute(value) {
	if (value === null) return true;
	if (typeof value !== "object" || value === null) return false;
	return typeof value.provider === "string" && typeof value.model === "string";
}

function isLast(value) {
	if (value === null) return true;
	if (typeof value !== "object" || value === null) return false;
	if (!isCount(value.turn) || !isCount(value.step)) return false;
	if (typeof value.routeKey !== "string" || value.routeKey.length === 0) return false;
	if (value.day !== null && !isCount(value.day)) return false;
	return isBuckets(value.buckets);
}

/** A `{ [key]: buckets }` map. */
function isBucketMap(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	for (const buckets of Object.values(value)) if (!isBuckets(buckets)) return false;
	return true;
}

const ROUTE_STATE = schema("tokenUsageByRoute state", (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	return isRoute(value.route) && isLast(value.last) && isBucketMap(value.totals);
});

const DAY_STATE = schema("tokenUsageByDay state", (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!isRoute(value.route) || !isLast(value.last) || !isBucketMap(value.days)) return false;
	if (value.first !== null && !isCount(value.first)) return false;
	if (value.lastTime !== null && !isCount(value.lastTime)) return false;
	return true;
});

const ROUTE_DAY_STATE = schema("tokenUsageByRouteByDay state", (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!isRoute(value.route) || !isLast(value.last)) return false;
	if (value.days === null || typeof value.days !== "object" || Array.isArray(value.days)) return false;
	for (const byRoute of Object.values(value.days)) if (!isBucketMap(byRoute)) return false;
	return true;
});

/** A `{ provider, model, tokens }` row. */
function isRouteRow(value) {
	if (value === null || typeof value !== "object") return false;
	return typeof value.provider === "string" && typeof value.model === "string" && isBuckets(value.tokens);
}

/** The shared `names` table: `provider/model` → labels. */
function isNameTable(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	for (const entry of Object.values(value)) {
		if (entry === null || typeof entry !== "object") return false;
		if (typeof entry.providerName !== "string" || typeof entry.modelName !== "string") return false;
	}
	return true;
}

const ROUTE_VIEW = schema("tokenUsageByRoute view", (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!Array.isArray(value.routes) || !isNameTable(value.names)) return false;
	return value.routes.every(isRouteRow);
});

const DAY_VIEW = schema("tokenUsageByDay view", (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!Array.isArray(value.days)) return false;
	// The offset travels with the days so the browser can label them in the same
	// frame the fold bucketed them in; without it a UTC+8 user's early-morning
	// usage would be labelled one day early.
	if (typeof value.offsetMinutes !== "number" || !Number.isFinite(value.offsetMinutes)) return false;
	if (value.first !== null && !isCount(value.first)) return false;
	if (value.last !== null && !isCount(value.last)) return false;
	for (const day of value.days) {
		if (day === null || typeof day !== "object") return false;
		if (!isCount(day.day) || !isBuckets(day.tokens)) return false;
	}
	return true;
});

const ROUTE_DAY_VIEW = schema("tokenUsageByRouteByDay view", (value) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
	if (!Array.isArray(value.days) || !isNameTable(value.names)) return false;
	for (const day of value.days) {
		if (day === null || typeof day !== "object") return false;
		if (!isCount(day.day) || !Array.isArray(day.routes)) return false;
		if (!day.routes.every(isRouteRow)) return false;
	}
	return true;
});

/** An all-zero bucket record. */
function zeroBuckets() {
	return { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

/** Add two bucket records. */
function addBuckets(left, right) {
	const next = zeroBuckets();
	for (const field of BUCKET_FIELDS) next[field] = left[field] + right[field];
	return next;
}

/** Subtract `right` from `left`. */
function subtractBuckets(left, right) {
	const next = zeroBuckets();
	for (const field of BUCKET_FIELDS) next[field] = left[field] - right[field];
	return next;
}

/** Sum of one bucket record's counters. */
function totalOf(buckets) {
	let total = 0;
	for (const field of BUCKET_FIELDS) total += buckets[field];
	return total;
}

/** Whether two bucket records carry the same counters. */
function equalBuckets(left, right) {
	for (const field of BUCKET_FIELDS) if (left[field] !== right[field]) return false;
	return true;
}

/** Whether a bucket record is all zeros. */
function isEmptyBuckets(buckets) {
	for (const field of BUCKET_FIELDS) if (buckets[field] !== 0) return false;
	return true;
}

/** Whether a `{ [route]: buckets }` map has no counters left. */
function isEmptyBucketMap(map) {
	for (const buckets of Object.values(map)) if (!isEmptyBuckets(buckets)) return false;
	return true;
}

/** The route key for the route in force, or the unknown key. */
function routeKeyOf(route) {
	return route === null ? UNKNOWN_ROUTE : route.provider + "/" + route.model;
}

/**
 * Normalize one provider-reported usage sample into billing buckets.
 * @param usage - the sample carried by an assistant settlement or its stream.
 * @returns the buckets, or undefined when the sample is malformed.
 */
function bucketsFrom(usage) {
	if (usage === null || typeof usage !== "object") return undefined;
	if (!isCount(usage.inputTokens) || !isCount(usage.outputTokens)) return undefined;
	const cacheRead = usage.cacheReadTokens === undefined ? 0 : usage.cacheReadTokens;
	const cacheWrite = usage.cacheWriteTokens === undefined ? 0 : usage.cacheWriteTokens;
	if (!isCount(cacheRead) || !isCount(cacheWrite)) return undefined;
	return {
		uncachedInputTokens: usage.inputTokens,
		outputTokens: usage.outputTokens,
		cacheReadTokens: cacheRead,
		cacheWriteTokens: cacheWrite,
	};
}

/**
 * The usage one durable assistant settlement reports, read exactly as the token
 * meter reads it: an explicit `data.usage` for a message, otherwise the last
 * `usage` chunk of the compact stream.
 */
function usageOf(event) {
	const data = event.data;
	if (data === null || typeof data !== "object") return undefined;
	if (event.type === "assistant/message" && data.usage !== undefined) return data.usage;
	const stream = data.stream;
	if (!Array.isArray(stream)) return undefined;
	for (let index = stream.length - 1; index >= 0; index -= 1) {
		const record = stream[index];
		if (record === null || typeof record !== "object" || record.type !== "chunk") continue;
		const chunk = record.chunk;
		if (chunk !== null && typeof chunk === "object" && chunk.type === "usage") return chunk.usage;
	}
	return undefined;
}

/** The event's commit time, or null when it carries none. */
function eventTime(event) {
	return event !== null && typeof event === "object" && isCount(event.time) ? event.time : null;
}

/**
 * Build the day-index function for one configured UTC offset.
 * @param utcOffsetMinutes - minutes east of UTC.
 * @returns `(time) => dayIndex`.
 */
function makeDayOf(utcOffsetMinutes) {
	const offsetMs = (Number.isFinite(utcOffsetMinutes) ? utcOffsetMinutes : 0) * 60000;
	return (time) => Math.floor((time + offsetMs) / DAY_MS);
}

/**
 * Advance the shared bookkeeping by one event.
 *
 * This is the single implementation of the shipped `tokenUsage` semantics: route
 * tracking from `request/header`, the same-step replacement slot, and the
 * `llm/retry-started` boundary that closes it so a retried attempt is billed
 * again. Every unit consumes the returned `sample`; none re-derives it.
 *
 * @param state - a state carrying `{ route, last }`.
 * @param event - the next committed session event.
 * @param day - the event's day index for the configured offset.
 * @returns `{ state, sample }`, where `sample` is undefined when nothing changed.
 */
function advanceUsage(state, event, day) {
	if (event === null || typeof event !== "object") return { state, sample: undefined };
	if (event.type === "request/header") {
		const header = event.data === null || typeof event.data !== "object" ? undefined : event.data.header;
		const config = header === null || typeof header !== "object" ? undefined : header.config;
		if (config === null || typeof config !== "object") return { state, sample: undefined };
		// A request header's provider and model are non-empty by the schema the loop
		// builds it from, so an empty one is not a route.
		if (typeof config.provider !== "string" || config.provider === "") return { state, sample: undefined };
		if (typeof config.model !== "string" || config.model === "") return { state, sample: undefined };
		if (state.route !== null && state.route.provider === config.provider && state.route.model === config.model) {
			return { state, sample: undefined };
		}
		return { state: { ...state, route: { provider: config.provider, model: config.model } }, sample: undefined };
	}
	if (event.type === "llm/retry-started") {
		const data = event.data === null || typeof event.data !== "object" ? {} : event.data;
		return state.last !== null && state.last.turn === data.turn && state.last.step === data.step
			? { state: { ...state, last: null }, sample: undefined }
			: { state, sample: undefined };
	}
	if (event.type !== "assistant/message" && event.type !== "assistant/attempt") return { state, sample: undefined };
	const usage = usageOf(event);
	if (usage === undefined) return { state, sample: undefined };
	const buckets = bucketsFrom(usage);
	if (buckets === undefined) return { state, sample: undefined };
	const data = event.data;
	const turn = isCount(data.turn) ? data.turn : 0;
	const step = isCount(data.step) ? data.step : 0;
	const routeKey = routeKeyOf(state.route);
	const previous = state.last !== null && state.last.turn === turn && state.last.step === step ? state.last : null;
	if (previous !== null && previous.routeKey === routeKey && previous.day === day && equalBuckets(previous.buckets, buckets)) {
		return { state, sample: undefined };
	}
	return {
		state: { ...state, last: { turn, step, routeKey, day, buckets } },
		sample: { routeKey, day, buckets, previous },
	};
}

/** Drop day entries older than the retained window. */
function pruneDays(days, currentDay, window) {
	if (currentDay === null) return days;
	const floor = currentDay - window + 1;
	let next = null;
	for (const key of Object.keys(days)) {
		const day = Number(key);
		if (Number.isFinite(day) && day >= floor) continue;
		if (next === null) next = { ...days };
		delete next[key];
	}
	return next === null ? days : next;
}

/**
 * Accumulate one sample into a `{ [key]: buckets }` map.
 *
 * `keyOf` maps a `{ routeKey, day }` identity to this map's key, or to null when
 * the sample has no place in it (an unknown day). A null key skips the add, and
 * the matching subtract is a no-op because the entry cannot exist.
 */
function applySample(map, sample, keyOf) {
	const next = { ...map };
	if (sample.previous !== null) {
		const previousKey = keyOf(sample.previous);
		const current = previousKey === null ? undefined : next[previousKey];
		if (current !== undefined) {
			const reduced = subtractBuckets(current, sample.previous.buckets);
			if (isEmptyBuckets(reduced)) delete next[previousKey];
			else next[previousKey] = reduced;
		}
	}
	const id = keyOf(sample);
	if (id !== null) {
		const current = next[id];
		next[id] = current === undefined ? sample.buckets : addBuckets(current, sample.buckets);
	}
	return next;
}

/**
 * Accumulate one sample into a `{ [day]: { [route]: buckets } }` map.
 *
 * The superseded record can belong to an EARLIER day: a same-turn same-step
 * replacement may cross midnight, and the record it replaces was added to its
 * own day's sub-map. The subtract must land there, not in the current day's —
 * that is why this map cannot use `applySample`'s flat key: the identity of a
 * record is `(day, route)`, and a subtraction keyed on the route alone silently
 * leaves the previous day's token share behind (`sum(per-day-per-model)` then
 * exceeds `sum(per-day)`, and the trend chart draws a phantom day).
 *
 * @param days - the day-partitioned map.
 * @param sample - the advanced sample.
 * @returns the possibly-updated map, or the same reference when nothing changed.
 */
function applySampleByDay(days, sample) {
	let next = days;
	const previous = sample.previous;
	if (previous !== null && previous.day !== null) {
		const previousDay = String(previous.day);
		const map = next[previousDay];
		const current = map === undefined ? undefined : map[previous.routeKey];
		if (current !== undefined) {
			const reduced = subtractBuckets(current, previous.buckets);
			const updated = { ...map };
			if (isEmptyBuckets(reduced)) delete updated[previous.routeKey];
			else updated[previous.routeKey] = reduced;
			next = { ...next, [previousDay]: updated };
			if (isEmptyBucketMap(updated)) {
				const withoutDay = { ...next };
				delete withoutDay[previousDay];
				next = withoutDay;
			}
		}
	}
	if (sample.day === null) return next;
	const dayKey = String(sample.day);
	const map = next[dayKey] ?? {};
	const current = map[sample.routeKey];
	const updated = { ...map, [sample.routeKey]: current === undefined ? sample.buckets : addBuckets(current, sample.buckets) };
	if (isEmptyBucketMap(updated)) {
		const withoutDay = { ...next };
		delete withoutDay[dayKey];
		return withoutDay;
	}
	return { ...next, [dayKey]: updated };
}

/**
 * Build the three usage units.
 * @param config - the row config (`utcOffsetMinutes`).
 * @param names - the route-name cache from `createRouteNames`.
 * @returns the projection definitions, ready to register.
 */
export function createUsageProjections(config, names) {
	const configuredOffset = config === null || typeof config !== "object" ? undefined : config.utcOffsetMinutes;
	// The Host runs on the user's machine, so the process offset is the user's
	// zone; it is an explicit knob because a projection must stay deterministic
	// and the offset cannot be recovered from the log.
	const utcOffsetMinutes = Number.isFinite(configuredOffset) ? configuredOffset : -new Date().getTimezoneOffset();
	const dayOf = makeDayOf(utcOffsetMinutes);

	/**
	 * The shared `names` table for every route appearing in `keys`.
	 *
	 * Keyed by `provider/model` — the same identity the wire rows expose — never by
	 * the raw state key. The unknown route's state key is the bare `unknown`, so
	 * keying by it would leave the client unable to look that row's labels up.
	 */
	function nameTable(keys) {
		const table = {};
		for (const key of keys) {
			const separator = key.indexOf("/");
			const provider = separator === -1 ? UNKNOWN_ROUTE : key.slice(0, separator);
			const model = separator === -1 ? key : key.slice(separator + 1);
			table[provider + "/" + model] = {
				providerName: names.providerName(provider),
				modelName: names.modelName(provider, model),
			};
		}
		return table;
	}

	/** One route row for a route key and its buckets. */
	function routeRow(key, buckets) {
		const separator = key.indexOf("/");
		return {
			provider: separator === -1 ? UNKNOWN_ROUTE : key.slice(0, separator),
			model: separator === -1 ? key : key.slice(separator + 1),
			tokens: { ...buckets },
		};
	}

	/** Order route rows by volume, then by name, so the view is stable. */
	function sortRouteRows(rows) {
		return rows.sort(
			(left, right) =>
				totalOf(right.tokens) - totalOf(left.tokens) || left.model.localeCompare(right.model) || left.provider.localeCompare(right.provider),
		);
	}

	const routeTotals = {
		key: "tokenUsageByRoute",
		stateVersion: 1,
		stateSchema: ROUTE_STATE,
		init: () => ({ route: null, last: null, totals: {} }),
		apply: (state, event) => {
			const advanced = advanceUsage(state, event, null);
			if (advanced.sample === undefined) return advanced.state;
			return { ...advanced.state, totals: applySample(advanced.state.totals, advanced.sample, (sample) => sample.routeKey) };
		},
		wire: {
			viewSchema: ROUTE_VIEW,
			view: (state) => {
				const keys = Object.keys(state.totals);
				return { names: nameTable(keys), routes: sortRouteRows(keys.map((key) => routeRow(key, state.totals[key]))) };
			},
		},
	};

	const dayTotals = {
		key: "tokenUsageByDay",
		stateVersion: 1,
		stateSchema: DAY_STATE,
		init: () => ({ route: null, last: null, days: {}, first: null, lastTime: null }),
		apply: (state, event) => {
			let next = state;
			if (SPAN_EVENTS.has(event === null || typeof event !== "object" ? "" : event.type)) {
				const time = eventTime(event);
				if (time !== null) {
					const first = state.first === null ? time : Math.min(state.first, time);
					const lastTime = state.lastTime === null ? time : Math.max(state.lastTime, time);
					if (first !== state.first || lastTime !== state.lastTime) next = { ...next, first, lastTime };
				}
			}
			const time = eventTime(event);
			const advanced = advanceUsage(next, event, time === null ? null : dayOf(time));
			if (advanced.sample === undefined) return advanced.state;
			const days = applySample(advanced.state.days, advanced.sample, (sample) => (sample.day === null ? null : String(sample.day)));
			const currentDay = advanced.sample.day === null ? null : advanced.sample.day;
			return { ...advanced.state, days: pruneDays(days, currentDay, DAY_WINDOW) };
		},
		wire: {
			viewSchema: DAY_VIEW,
			view: (state) => ({
				days: Object.keys(state.days)
					.map((key) => ({ day: Number(key), tokens: { ...state.days[key] } }))
					.sort((left, right) => left.day - right.day),
				first: state.first,
				last: state.lastTime,
				offsetMinutes: utcOffsetMinutes,
			}),
		},
	};

	const routeDayTotals = {
		key: "tokenUsageByRouteByDay",
		stateVersion: 1,
		stateSchema: ROUTE_DAY_STATE,
		init: () => ({ route: null, last: null, days: {} }),
		apply: (state, event) => {
			const time = eventTime(event);
			const advanced = advanceUsage(state, event, time === null ? null : dayOf(time));
			const sample = advanced.sample;
			if (sample === undefined) return advanced.state;
			const days = applySampleByDay(advanced.state.days, sample);
			if (days === advanced.state.days) return advanced.state;
			return { ...advanced.state, days: pruneDays(days, sample.day, ROUTE_DAY_WINDOW) };
		},
		wire: {
			viewSchema: ROUTE_DAY_VIEW,
			view: (state) => {
				const keys = new Set();
				for (const byRoute of Object.values(state.days)) for (const key of Object.keys(byRoute)) keys.add(key);
				return {
					names: nameTable([...keys]),
					days: Object.keys(state.days)
						.map((key) => ({
							day: Number(key),
							routes: sortRouteRows(Object.keys(state.days[key]).map((route) => routeRow(route, state.days[key][route]))),
						}))
						.sort((left, right) => left.day - right.day),
				};
			},
		},
	};

	return [routeTotals, dayTotals, routeDayTotals];
}

/** Test seam: the pure helpers, so the host self-check can exercise them directly. */
export const internals = {
	BUCKET_FIELDS,
	UNKNOWN_ROUTE,
	DAY_WINDOW,
	ROUTE_DAY_WINDOW,
	advanceUsage,
	bucketsFrom,
	equalBuckets,
	eventTime,
	isEmptyBuckets,
	makeDayOf,
	pruneDays,
	routeKeyOf,
	totalOf,
	usageOf,
	zeroBuckets,
	ROUTE_STATE,
	DAY_STATE,
	ROUTE_DAY_STATE,
	ROUTE_VIEW,
	DAY_VIEW,
	ROUTE_DAY_VIEW,
};
