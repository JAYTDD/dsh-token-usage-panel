/**
 * Always-on threshold watch: badges the sidebar icon and posts one system
 * notification per crossing per Host day, even while the usage panel is closed.
 *
 * The panel still shows the in-page banner. This module is the channel that
 * reaches a user who is in a chat. It cannot fire after DSH itself has quit.
 */
let thresholdBadgeArmed = false;
const thresholdBadgeListeners = new Set();

/** Subscribe to the sidebar badge flag. */
function subscribeThresholdBadge(notify) {
	thresholdBadgeListeners.add(notify);
	return () => thresholdBadgeListeners.delete(notify);
}

/** Whether the sidebar icon should show the warning dot. */
function thresholdBadgeSnapshot() {
	return thresholdBadgeArmed;
}

function setThresholdBadgeArmed(next) {
	const armed = next === true;
	if (thresholdBadgeArmed === armed) return;
	thresholdBadgeArmed = armed;
	for (const notify of [...thresholdBadgeListeners]) notify();
}

function loadNotified() {
	try {
		const parsed = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY));
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { day: "", keys: [] };
		const day = typeof parsed.day === "string" ? parsed.day : "";
		const keys = Array.isArray(parsed.keys) ? parsed.keys.filter((key) => typeof key === "string") : [];
		return { day, keys };
	} catch {
		return { day: "", keys: [] };
	}
}

function saveNotified(state) {
	try {
		window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(state));
	} catch {
		/* private mode or quota: skip, the next crossing may beep again */
	}
}

function hitKey(hit) {
	return hit.kind === "session" ? "session:" + String(hit.title ?? "") : hit.kind;
}

/**
 * Post one OS notification when permission is already granted.
 * @param hit - a threshold crossing.
 * @param t - translate seat.
 * @returns whether a notification was constructed.
 */
function dispatchThresholdNotification(hit, t) {
	if (typeof Notification !== "function" || Notification.permission !== "granted") return false;
	const title = t("panel");
	const body = t("threshold." + hit.kind + "Over", {
		used: formatInt(hit.used),
		limit: formatInt(hit.limit),
		title: hit.title ?? "",
	});
	try {
		new Notification(title, { body, tag: "dsh-tup-threshold" });
		return true;
	} catch {
		return false;
	}
}

/**
 * Ask for notification permission. Must run from a user gesture (Save).
 * @returns a promise of the resulting permission string.
 */
function requestThresholdNotifications() {
	if (typeof Notification !== "function") return Promise.resolve("denied");
	if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
	try {
		return Promise.resolve(Notification.requestPermission());
	} catch {
		return Promise.resolve("denied");
	}
}

/**
 * Recompute hits from the live list, update the badge, and notify new crossings.
 * @param store - `ctx.sessions.list`.
 * @param t - translate seat.
 */
function evaluateThresholdWatch(store, t) {
	const thresholds = loadThresholds();
	const rows = rowsFromSnapshot(store.getSnapshot());
	const today = currentDayIndex(hostOffsetMinutes(rows));
	const hits = thresholdHits(rows, thresholds, today);
	setThresholdBadgeArmed(hits.length > 0);
	if (hits.length === 0) return;
	const day = String(today);
	let seen = loadNotified();
	if (seen.day !== day) seen = { day, keys: [] };
	const keys = new Set(seen.keys);
	let firstFresh;
	for (const hit of hits) {
		const key = hitKey(hit);
		if (keys.has(key)) continue;
		keys.add(key);
		if (firstFresh === undefined) firstFresh = hit;
	}
	if (firstFresh === undefined) return;
	saveNotified({ day, keys: [...keys] });
	dispatchThresholdNotification(firstFresh, t);
}

/**
 * Start the always-on watch. Call from `apply`, not from the panel.
 * @param store - `ctx.sessions.list`.
 * @param t - translate seat bound to this plugin's namespace.
 * @returns a disposer.
 */
function startThresholdWatch(store, t) {
	const run = () => evaluateThresholdWatch(store, t);
	run();
	const offList = store.subscribe(run);
	const offSave = subscribeThresholdSaves(run);
	const onStorage = (event) => {
		if (event === null || event === undefined) return;
		if (event.key !== THRESHOLD_KEY && event.key !== NOTIFIED_KEY) return;
		run();
	};
	if (typeof window.addEventListener === "function") window.addEventListener("storage", onStorage);
	return () => {
		offList();
		offSave();
		if (typeof window.removeEventListener === "function") window.removeEventListener("storage", onStorage);
	};
}
