/** Wire field names of the `tokenUsage` projection, in bucket order. */
const USAGE_FIELDS = ["uncachedInputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens"];
/** The all-zero usage a session with no turns reports. */
const ZERO_USAGE = Object.freeze({
	uncachedInputTokens: 0,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
});
/** A frozen fresh zero total, used as the fold's seed. */
function zeroUsage() {
	return { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

/**
 * Validate one wire `tokenUsage` value.
 * @param value - candidate projection value.
 * @returns the four non-negative counters, or undefined when absent or malformed.
 */
function readUsage(value) {
	if (value === null || typeof value !== "object") return undefined;
	const out = {};
	for (const field of USAGE_FIELDS) {
		const raw = value[field];
		if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return undefined;
		out[field] = raw;
	}
	return out;
}

/** Whether two normalized usage values carry the same counters. */
function sameUsage(left, right) {
	if (left === right) return true;
	if (left === undefined || right === undefined) return false;
	for (const field of USAGE_FIELDS) {
		if (left[field] !== right[field]) return false;
	}
	return true;
}

/**
 * Validate one wire `sessionStats` value.
 * @param value - candidate projection value.
 * @returns turns and steps, or undefined when absent or malformed.
 */
function readStats(value) {
	if (value === null || typeof value !== "object") return undefined;
	const { turns, steps } = value;
	if (typeof turns !== "number" || !Number.isFinite(turns) || turns < 0) return undefined;
	if (typeof steps !== "number" || !Number.isFinite(steps) || steps < 0) return undefined;
	return { turns, steps };
}

/** Whether two normalized stats carry the same counts. */
function sameStats(left, right) {
	if (left === right) return true;
	if (left === undefined || right === undefined) return false;
	return left.turns === right.turns && left.steps === right.steps;
}

/** Sum the three disjoint prompt-side billing buckets. */
function billedInput(usage) {
	return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
}

/** Total tokens billed for one usage value. */
function totalOf(usage) {
	return billedInput(usage) + usage.outputTokens;
}

/**
 * Sum normalized usage values.
 * @param values - usage values to add.
 * @returns the four summed counters.
 */
function sumUsages(values) {
	const total = zeroUsage();
	for (const usage of values) {
		for (const field of USAGE_FIELDS) total[field] += usage[field];
	}
	return total;
}

/** Accumulate `right` into the `left` counters in place. */
function addInto(left, right) {
	for (const field of USAGE_FIELDS) left[field] += right[field];
	return left;
}

//#region host wire values
/**
 * The gateway/model labels the Host resolved for one route.
 *
 * Both are authoritative and both come from the LLM registry (`listProviders` /
 * `listModels`) — the same source the Models settings page renders. There is
 * deliberately no vendor here: an event records only `provider/model`, and the
 * provider is a route key such as `opencodegochat`, i.e. a gateway rather than a
 * model maker, so a vendor label would be a guess presented as a fact.
 */
function readLabels(table, provider, model) {
	const entry = table === undefined ? undefined : table[provider + "/" + model];
	if (entry === null || typeof entry !== "object") return { providerName: provider, modelName: model };
	return {
		providerName: typeof entry.providerName === "string" && entry.providerName !== "" ? entry.providerName : provider,
		modelName: typeof entry.modelName === "string" && entry.modelName !== "" ? entry.modelName : model,
	};
}

/**
 * The one label form every view renders: `opencode go chat · deepseek-v4.1-flash`.
 * @param route - any object carrying `providerName` and `modelName`.
 * @returns the display label.
 */
function routeLabel(route) {
	return route.providerName + " · " + route.modelName;
}

/** Whether a wire `names` table is usable. */
function isNameTable(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validate the `tokenUsageByRoute` wire value and resolve its labels.
 * @param value - candidate projection value.
 * @returns `{ routes: [{ provider, model, providerName, modelName, tokens }] }`,
 *   or undefined when absent or malformed.
 */
function readRouteUsage(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
	if (!Array.isArray(value.routes) || !isNameTable(value.names)) return undefined;
	const routes = [];
	for (const entry of value.routes) {
		if (entry === null || typeof entry !== "object") return undefined;
		if (typeof entry.provider !== "string" || typeof entry.model !== "string") return undefined;
		const tokens = readUsage(entry.tokens);
		if (tokens === undefined) return undefined;
		routes.push({ provider: entry.provider, model: entry.model, ...readLabels(value.names, entry.provider, entry.model), tokens });
	}
	return { routes };
}

/** Whether two resolved route breakdowns carry the same rows. */
function sameRouteUsage(left, right) {
	if (left === right) return true;
	if (left === undefined || right === undefined) return false;
	if (left.routes.length !== right.routes.length) return false;
	for (let index = 0; index < left.routes.length; index += 1) {
		const a = left.routes[index];
		const b = right.routes[index];
		if (a.provider !== b.provider || a.model !== b.model) return false;
		if (a.providerName !== b.providerName || a.modelName !== b.modelName) return false;
		if (!sameUsage(a.tokens, b.tokens)) return false;
	}
	return true;
}

/**
 * Validate the `tokenUsageByDay` wire value.
 *
 * `offsetMinutes` MUST travel with the days. The Host buckets every event by its
 * own UTC offset and ships that offset alongside the buckets; the browser
 * re-derives every calendar date, month label and "today" anchor from a bare day
 * index, so a dropped offset silently renders the whole calendar in the wrong
 * frame — a mistake that stays invisible while the browser shares the Host zone.
 *
 * A missing or non-finite offset is deliberately NOT fatal: it is left undefined
 * and the aggregator falls back to 0, which is exactly the behaviour a Host that
 * never shipped the field would deserve. A malformed *day* still rejects the
 * block, as before.
 * @param value - candidate projection value.
 * @returns `{ days: [{ day, tokens }], first, last, offsetMinutes }`, or undefined.
 */
function readDayUsage(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
	if (!Array.isArray(value.days)) return undefined;
	const days = [];
	for (const entry of value.days) {
		if (entry === null || typeof entry !== "object" || !Number.isInteger(entry.day)) return undefined;
		const tokens = readUsage(entry.tokens);
		if (tokens === undefined) return undefined;
		days.push({ day: entry.day, tokens });
	}
	const first = typeof value.first === "number" && Number.isFinite(value.first) ? value.first : null;
	const last = typeof value.last === "number" && Number.isFinite(value.last) ? value.last : null;
	const offsetMinutes =
		typeof value.offsetMinutes === "number" && Number.isFinite(value.offsetMinutes) ? value.offsetMinutes : undefined;
	return { days, first, last, offsetMinutes };
}

/** Whether two day-usage values carry the same days, span and UTC offset. */
function sameDayUsage(left, right) {
	if (left === right) return true;
	if (left === undefined || right === undefined) return false;
	if (left.first !== right.first || left.last !== right.last) return false;
	// The offset participates in identity: it changes every rendered date, and the
	// row objects are reused on equality, so ignoring it would freeze the calendar
	// in a stale frame after a DST or timezone change.
	if (left.offsetMinutes !== right.offsetMinutes) return false;
	if (left.days.length !== right.days.length) return false;
	for (let index = 0; index < left.days.length; index += 1) {
		if (left.days[index].day !== right.days[index].day) return false;
		if (!sameUsage(left.days[index].tokens, right.days[index].tokens)) return false;
	}
	return true;
}

/**
 * Validate the `tokenUsageByRouteByDay` wire value and resolve its labels.
 * @param value - candidate projection value.
 * @returns `{ days: [{ day, routes: [...] }] }`, or undefined.
 */
function readRouteDayUsage(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
	if (!Array.isArray(value.days) || !isNameTable(value.names)) return undefined;
	const days = [];
	for (const entry of value.days) {
		if (entry === null || typeof entry !== "object" || !Number.isInteger(entry.day)) return undefined;
		if (!Array.isArray(entry.routes)) return undefined;
		const routes = [];
		for (const route of entry.routes) {
			if (route === null || typeof route !== "object") return undefined;
			if (typeof route.provider !== "string" || typeof route.model !== "string") return undefined;
			const tokens = readUsage(route.tokens);
			if (tokens === undefined) return undefined;
			routes.push({ provider: route.provider, model: route.model, ...readLabels(value.names, route.provider, route.model), tokens });
		}
		days.push({ day: entry.day, routes });
	}
	return { days };
}

/** Whether two route-day values carry the same days and rows. */
function sameRouteDayUsage(left, right) {
	if (left === right) return true;
	if (left === undefined || right === undefined) return false;
	if (left.days.length !== right.days.length) return false;
	for (let index = 0; index < left.days.length; index += 1) {
		const a = left.days[index];
		const b = right.days[index];
		if (a.day !== b.day || a.routes.length !== b.routes.length) return false;
		for (let inner = 0; inner < a.routes.length; inner += 1) {
			if (a.routes[inner].provider !== b.routes[inner].provider || a.routes[inner].model !== b.routes[inner].model) return false;
			// The resolved labels participate in identity exactly like they do for
			// `tokenUsageByRoute`: a registry rename with unchanged tokens must reach
			// the trend legend, not stay frozen behind a reused row object.
			if (a.routes[inner].providerName !== b.routes[inner].providerName) return false;
			if (a.routes[inner].modelName !== b.routes[inner].modelName) return false;
			if (!sameUsage(a.routes[inner].tokens, b.routes[inner].tokens)) return false;
		}
	}
	return true;
}

/** A stable key for one route, used as the merge and colour identity. */
function routeIdOf(route) {
	return route.provider + "/" + route.model;
}
//#endregion
