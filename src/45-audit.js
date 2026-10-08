/**
 * Runtime consistency audit — the mechanism that turns a silent under-count into
 * a reported drift.
 *
 * That bug was silent and human-visible: the session table reads each row's
 * `tokenUsage` (the official meter) while the model donut and the per-model band
 * read `tokenUsageByRoute`. When the read queue covered only `tokenUsage`, nine
 * stale cache rows never folded the route unit, so the table said 216M and the
 * charts said 186M — two totals on one panel disagreeing, caught only because the
 * user eyeballed it.
 *
 * `tokenUsageByRoute` is UNwindowed (unlike `ByDay` / `ByRouteByDay`, which clip
 * to 366 / 31 days and therefore legitimately sum to LESS than the total). So for
 * any row that carries both values, the four buckets summed across routes MUST
 * equal the row's total exactly — the same identity the Host differential oracle
 * enforces at fold time, re-checked here at render against whatever
 * actually reached the browser. It fires only on a real drift: a future change to
 * `advanceUsage`, a new sampling dimension that forgets a bucket, or a malformed
 * wire value the validator let through.
 *
 * Rows missing either value are skipped, NOT flagged — an absent unit is a read
 * still pending (the read queue already reports that); this audit is for values
 * that arrived and disagree.
 */

/**
 * Find every complete row whose per-model sum disagrees with its own total.
 * @param rows - the projected rows.
 * @returns `{ count, entries }`, where each entry is `{ id, title, usageTotal, routeTotal, delta }`.
 */
function auditUsageConsistency(rows) {
	const entries = [];
	for (const row of rows) {
		const usage = row.usage;
		const route = row.routeUsage;
		if (usage === undefined || route === undefined) continue;
		const routeTotal = zeroUsage();
		for (const entry of route.routes) addInto(routeTotal, entry.tokens);
		const usageTotal = totalOf(usage);
		const summed = totalOf(routeTotal);
		if (summed === usageTotal) continue;
		entries.push({
			id: row.id,
			title: row.title === undefined ? "" : row.title,
			usageTotal,
			routeTotal: summed,
			delta: summed - usageTotal,
		});
	}
	return { count: entries.length, entries };
}
