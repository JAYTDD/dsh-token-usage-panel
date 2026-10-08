/**
 * Route display names for the usage breakdown.
 *
 * A durable event carries only `provider/model`, and `provider` is a **route key**,
 * not a vendor: on a real profile the same three models arrive as
 * `opencodegochat/*`, `opencodego/*`, and `codexpert/*`, i.e. gateways in front of
 * someone else's models. There is therefore no vendor in the data model, and
 * guessing one from the model id is a heuristic that reads as fact.
 *
 * So a route is labelled with the two things the data actually supports, both
 * authoritative and both from the registry the Models settings page renders:
 *
 *   providerName  `ctx.llm.listProviders()` → `{ id, name }`
 *                 (`opencodegochat` → `opencode go chat`)
 *   modelName     `ctx.llm.listModels(provider)` → `{ id, name }`, where `name` is
 *                 the model's display form (`GLM-5.3-Flash`) and `id` the route
 *                 form (`glm-5.3-flash`)
 *
 * The label is rendered as `providerName · modelName`, so it reads
 * `opencode go chat · deepseek-v4.1-flash`.
 *
 * The registry lookup is asynchronous while a projection's `view()` is
 * synchronous, so names are resolved into a cache at load and read synchronously
 * afterwards. A route that is no longer mounted, or a failed lookup, falls back
 * to the raw ids rather than throwing — history outlives adapters.
 *
 * @module dsh-token-usage-panel/route-names
 */

/** Route key for a provider/model pair. */
export function routeKey(provider, model) {
	return provider + "/" + model;
}

/**
 * Create the name cache.
 * @returns the cache, with a synchronous read face for projection views.
 */
export function createRouteNames() {
	/** providerId → display name */
	const providers = new Map();
	/** `provider/model` → display name */
	const models = new Map();
	let resolvedAt = 0;

	return {
		/**
		 * Re-read the live LLM registry. Never throws: a provider that fails to
		 * list its models keeps its provider name and the raw model id.
		 * @param llm - the `llm` service.
		 * @returns the number of providers whose names were read.
		 */
		async resolve(llm) {
			if (llm === null || typeof llm !== "object" || typeof llm.listProviders !== "function") return 0;
			let list;
			try {
				list = llm.listProviders();
			} catch {
				return 0;
			}
			if (!Array.isArray(list)) return 0;
			providers.clear();
			models.clear();
			for (const provider of list) {
				if (provider === null || typeof provider !== "object") continue;
				if (typeof provider.id !== "string" || typeof provider.name !== "string") continue;
				providers.set(provider.id, provider.name);
				try {
					const entries = await llm.listModels(provider.id);
					if (!Array.isArray(entries)) continue;
					for (const entry of entries) {
						if (entry === null || typeof entry !== "object") continue;
						if (typeof entry.id !== "string") continue;
						models.set(routeKey(provider.id, entry.id), typeof entry.name === "string" && entry.name !== "" ? entry.name : entry.id);
					}
				} catch {
					/* keep the provider name and fall back to raw model ids */
				}
			}
			resolvedAt = Date.now();
			return providers.size;
		},
		/** @returns the provider's (gateway's) display name, or its raw id. */
		providerName(provider) {
			return providers.get(provider) ?? provider;
		},
		/** @returns the model's display name, or its raw id. */
		modelName(provider, model) {
			return models.get(routeKey(provider, model)) ?? model;
		},
		/** @returns when the registry was last read, for diagnostics. */
		resolvedAt() {
			return resolvedAt;
		},
	};
}
