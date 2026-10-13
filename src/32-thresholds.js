/**
 * Soft token thresholds: a local, no-money budget.
 *
 * Stored beside the filters, never inside them, so reset and saved views
 * cannot clear a budget. A watcher started from `apply` reads this blob even
 * when the panel is closed, so a crossing can badge the sidebar and post a
 * system notification while the user is in a chat.
 */
function freshThresholds() {
	return { day: null, week: null, session: null };
}

/**
 * A positive integer threshold, or null to disable that dimension.
 * Zero, negatives, fractions, and non-numbers become null (off), not a throw.
 * @param value - raw JSON field.
 * @returns a positive safe integer, or null.
 */
function readThresholdNumber(value) {
	if (value === null || value === undefined) return null;
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return null;
	return value;
}

/**
 * Validate a persisted threshold blob. Unknown keys are ignored; a bad shape
 * drops the whole object so a half-applied budget cannot silently lie.
 * @param value - parsed JSON.
 * @returns `{ day, week, session }` each `number | null`, or undefined.
 */
function normalizeThresholds(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
	return {
		day: readThresholdNumber(value.day),
		week: readThresholdNumber(value.week),
		session: readThresholdNumber(value.session),
	};
}

/** Read the persisted thresholds, or all-off. */
function loadThresholds() {
	try {
		const raw = window.localStorage.getItem(THRESHOLD_KEY);
		if (raw === null) return freshThresholds();
		return normalizeThresholds(JSON.parse(raw)) ?? freshThresholds();
	} catch {
		return freshThresholds();
	}
}

const thresholdSaveListeners = new Set();

/** Persist the thresholds; a failure only loses the preference. */
function saveThresholds(thresholds) {
	try {
		window.localStorage.setItem(THRESHOLD_KEY, JSON.stringify(thresholds));
	} catch {
		/* private mode or quota: the panel keeps working without persistence */
	}
	for (const notify of [...thresholdSaveListeners]) notify();
}

/**
 * Subscribe to local saves of the threshold blob.
 * Same-tab `localStorage` writes do not fire `storage`, so the watcher
 * has to hear this instead of relying on the window event.
 * @param notify - called after each successful or attempted save.
 * @returns an unsubscribe function.
 */
function subscribeThresholdSaves(notify) {
	thresholdSaveListeners.add(notify);
	return () => thresholdSaveListeners.delete(notify);
}

/**
 * Parse one draft field. Empty means off; anything other than a positive
 * integer is unusable so the caller can refuse to save.
 * @param raw - the input value.
 * @returns a positive integer, null (off), or undefined (invalid).
 */
function parseThresholdInput(raw) {
	if (typeof raw !== "string") return undefined;
	const text = raw.trim();
	if (text === "") return null;
	if (!/^[1-9][0-9]{0,14}$/.test(text)) return undefined;
	const value = Number(text);
	if (!Number.isSafeInteger(value) || value < 1) return undefined;
	return value;
}

/** String draft of a stored threshold set, for the settings dialog. */
function draftOfThresholds(thresholds) {
	return {
		day: thresholds.day === null ? "" : String(thresholds.day),
		week: thresholds.week === null ? "" : String(thresholds.week),
		session: thresholds.session === null ? "" : String(thresholds.session),
	};
}

/**
 * Commit a settings draft, or undefined when any field is unusable.
 * @param draft - `{ day, week, session }` strings.
 * @returns a threshold object, or undefined.
 */
function thresholdsFromDraft(draft) {
	const day = parseThresholdInput(draft.day);
	const week = parseThresholdInput(draft.week);
	const session = parseThresholdInput(draft.session);
	if (day === undefined || week === undefined || session === undefined) return undefined;
	return { day, week, session };
}

/**
 * Which configured thresholds the unfiltered corpus currently crosses.
 *
 * Day = today's Host-day total. Week = the trailing 7 Host days (same span as
 * `range.7d`). Session = the largest lifetime `tokenUsage` of any row. Search,
 * directory, model, and day chips are ignored: a budget watches real spend.
 *
 * @param rows - every projected row.
 * @param thresholds - `{ day, week, session }` each `number | null`.
 * @param today - the Host's current day index.
 * @returns `{ kind, used, limit, title? }[]`.
 */
function thresholdHits(rows, thresholds, today) {
	const hits = [];
	if (thresholds.day === null && thresholds.week === null && thresholds.session === null) return hits;
	if (thresholds.day !== null) {
		const used = totalOf(sumUsageInWindow(rows, today, today));
		if (used >= thresholds.day) hits.push({ kind: "day", used, limit: thresholds.day });
	}
	if (thresholds.week !== null) {
		const used = totalOf(sumUsageInWindow(rows, today - 6, today));
		if (used >= thresholds.week) hits.push({ kind: "week", used, limit: thresholds.week });
	}
	if (thresholds.session !== null) {
		let used = 0;
		let title = "";
		for (const row of rows) {
			const total = row.usage === undefined ? 0 : totalOf(row.usage);
			if (total > used) {
				used = total;
				title = row.title === undefined || row.title === "" ? row.id : row.title;
			}
		}
		if (used >= thresholds.session) hits.push({ kind: "session", used, limit: thresholds.session, title });
	}
	return hits;
}
