/** Services this client half needs before it can register its slots. */
const inject = ["slots", "locale", "sessions", "uiWorkspace"];

/**
 * Register the sidebar entry and its main panel.
 * @param ctx - browser services used by these contributions.
 */
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-token-usage-panel: dictionaries");
	// Rows cache formatted labels, and those follow the active locale: drop the
	// cache whenever a dictionary or the preference changes.
	ctx.effect(() => ctx.locale.subscribe(() => clearDisplayCache()), "dsh-token-usage-panel: locale cache");
	const openSession = (id) => {
		ctx.uiWorkspace.openSession(id);
	};
	const startSession = (workspaceId) => {
		ctx.uiWorkspace.startSession(workspaceId);
	};
	ctx.slots.inject("main", () =>
		ctx.slots.register(
			{
				name: "main",
				key: PANEL_ID,
				locale: NS,
				inject: () => ({
					openSession,
					startSession,
					sessionList: ctx.sessions.list,
					sessionService: ctx.sessions,
				}),
			},
			TokenUsagePanel,
		),
	);
	ctx.slots.inject("sidebar.panellist", () =>
		ctx.slots.register(
			{
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 20,
				locale: NS,
				label: () => ctx.locale.bind(NS)("panel"),
			},
			TokenUsageIcon,
		),
	);
}
