// Host entry for the token-usage panel: contributes the usage projection units.
import { createRouteNames } from "./route-names.js";
import { createUsageProjections } from "./route-usage.js";

/** How often the route display names are re-read from the live LLM registry. */
const NAME_REFRESH_MS = 5 * 60 * 1000;

/**
 * Host plugin body.
 *
 * Registers three usage-derived session projection units — per-model totals,
 * per-day totals, and per-day-per-model detail — which makes the breakdown and
 * the charts client-visible through the existing projection read model (listing
 * column, `session.projections`, control stream, projection cache) with no new
 * service, Remote namespace, or descriptor.
 *
 * The registry and the LLM registry are both INJECTED rather than declared as
 * plugin dependencies: the Loader skips a client bundle whose host entry has no
 * fiber, so a composition lacking either service must still load this entry. It
 * simply contributes less — the browser half degrades to plain token totals.
 *
 * Configuration (optional):
 *
 *   utcOffsetMinutes: 480
 *     Minutes east of UTC used to bucket usage into days. Defaults to this
 *     process's own offset, which is the user's zone because the Host runs on
 *     the user's machine. It is an explicit knob because a projection must be
 *     deterministic and a timezone is not recoverable from the session log.
 *
 * There is no pricing configuration (money was removed from this plugin) and no
 * vendor-name configuration: a route is labelled with the gateway's registry name
 * and the model's registry name, and nothing else is claimed.
 *
 * @param ctx - the Host context.
 * @param config - the row config.
 */
export function apply(ctx, config) {
	if (ctx === null || typeof ctx !== "object" || typeof ctx.inject !== "function") return;
	const names = createRouteNames();

	// Display names are cosmetic: a lookup failure must never keep the units from
	// registering, so the resolve is fire-and-forget and the cache falls back to
	// raw ids. The periodic refresh is what makes a newly added provider or model
	// show up without a restart; it is one timer per plugin.
	ctx.inject(["llm"], (scoped) => {
		scoped.effect(() => {
			const refresh = () => {
				void Promise.resolve(names.resolve(scoped.llm)).catch(() => undefined);
			};
			refresh();
			const timer = setInterval(refresh, NAME_REFRESH_MS);
			return () => clearInterval(timer);
		}, "dsh-token-usage-panel: route names");
	});

	// Optional contributor: the callback runs when the service appears, and each
	// registration is an effect on that scope, so unloading removes all keys.
	ctx.inject(["sessionProjections"], (scoped) => {
		scoped.effect(() => {
			const disposers = createUsageProjections(config, names).map((definition) => scoped.sessionProjections.register(definition));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "dsh-token-usage-panel: usage units");
	});
}
