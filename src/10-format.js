/**
 * Number and time formatting.
 *
 * `Intl.NumberFormat` is built once: `toLocaleString` constructs a formatter per
 * call, and the table formats several counters per row, so the allocation shows
 * up as frame cost while a session streams.
 */
const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

/** Group an integer with thousands separators. */
function formatInt(value) {
	const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
	return NUMBER_FORMAT.format(safe);
}

/** Compact a large count: `12K`, `1.2M`, `8.8B`. */
function formatCompact(value) {
	const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
	if (safe < 10000) return NUMBER_FORMAT.format(safe);
	if (safe < 1000000) return (safe / 1000).toFixed(safe < 100000 ? 1 : 0) + "K";
	if (safe < 1000000000) return (safe / 1000000).toFixed(safe < 10000000 ? 2 : 1) + "M";
	return (safe / 1000000000).toFixed(2) + "B";
}

/** Render an epoch-millisecond timestamp as `MM-DD HH:mm` (year only when it differs). */
function formatTime(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
	const date = new Date(value);
	const now = new Date();
	const pad = (number) => String(number).padStart(2, "0");
	const year = date.getFullYear() === now.getFullYear() ? "" : date.getFullYear() + "-";
	return year + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

/** Full timestamp for a row's native tooltip; empty when unknown. */
function formatFullTime(value) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
	return new Date(value).toLocaleString();
}

/**
 * The local date a Host day index names.
 *
 * The Host buckets by its own UTC offset and ships that offset with the data, so
 * the browser must shift by the same amount before reading the calendar fields.
 * @param day - the Host day index.
 * @param offsetMinutes - minutes east of UTC used by the fold.
 * @returns the Date at that local day.
 */
function dateOfDay(day, offsetMinutes) {
	return new Date(day * DAY_MS - offsetMinutes * 60000);
}

/**
 * `9月23日` / `Sep 23` for a Host day index.
 *
 * The browser's own locale formats the date: the panel already switches all its
 * copy through the locale seat, and re-deriving the active language here would be
 * a second source of truth for the same thing.
 */
function formatDayShort(day, offsetMinutes) {
	return dateOfDay(day, offsetMinutes).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** `2026-09-23` for a Host day index, used in titles and exports. */
function formatDayIso(day, offsetMinutes) {
	const date = dateOfDay(day, offsetMinutes);
	const pad = (number) => String(number).padStart(2, "0");
	return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

/** `9月` / `Sep` for a Host day index, used as a month axis label. */
function formatMonthShort(day, offsetMinutes) {
	return dateOfDay(day, offsetMinutes).toLocaleDateString(undefined, { month: "short" });
}

/**
 * Inclusive lower bound of a range filter.
 * @param key - `all` | `today` | `7d` | `30d`.
 * @param now - current epoch milliseconds.
 * @returns the window start, or 0 for `all`.
 */
function rangeStart(key, now) {
	if (key === "today") {
		const start = new Date(now);
		start.setHours(0, 0, 0, 0);
		return start.getTime();
	}
	if (key === "7d") return now - 7 * DAY_MS;
	if (key === "30d") return now - 30 * DAY_MS;
	return 0;
}

/** Leaf directory name of a workspace path. */
function leafName(path) {
	if (typeof path !== "string" || path === "") return undefined;
	const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
	return parts[parts.length - 1] || path;
}

/** Join truthy class names. */
function cx(...values) {
	return values.filter((value) => typeof value === "string" && value !== "").join(" ");
}

/** Shallow equality for string-keyed records. */
function shallowEqual(left, right) {
	if (Object.is(left, right)) return true;
	if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
	const keys = Object.keys(left);
	if (keys.length !== Object.keys(right).length) return false;
	for (const key of keys) {
		if (!Object.hasOwn(right, key) || !Object.is(left[key], right[key])) return false;
	}
	return true;
}

/** Escape one CSV field (RFC 4180: quote when it holds a delimiter, quote or newline). */
function csvField(value) {
	const text = value === undefined || value === null ? "" : String(value);
	return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

/** Clamp a number into a range. */
function clamp(value, low, high) {
	return value < low ? low : value > high ? high : value;
}
