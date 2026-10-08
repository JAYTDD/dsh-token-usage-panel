/**
 * The plugin stylesheet.
 *
 * Layout contract (guarded by a static assertion in the self-check): the frame's
 * centre column is `display:flex; overflow:hidden` with a definite height, so
 * this panel is a flex column of that same height. Every band except the table is
 * `flex:0 0 auto`; the table region is the ONE `flex:1 1 auto; min-height:<floor>;
 * overflow:auto` child and therefore the only scrollport. A shrinking
 * `overflow:hidden` table wrapper was absorbing all the shrink and clipping rows
 * instead of producing a scrollbar.
 *
 * Motion contract: the root carries `data-animate="true"` plus the `--dsh-tup-*`
 * tokens built from `MOTION` in `05-constants.js`, and every entrance, growth and
 * interaction rule is scoped under that attribute so a host could embed the panel
 * without motion. Growth replays on a real data change because the animated leaves
 * are keyed on a digest of their own data — an unchanged re-render must NOT restart
 * a drawing — and `prefers-reduced-motion` turns the whole vocabulary off.
 */
const css = [
	//#region shell and bands
	".dshTup_root{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;container-type:inline-size;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.5;--dsh-tup-row-h:54px;--dsh-tup-fast:140ms;--dsh-tup-base:220ms;--dsh-tup-slow:460ms;--dsh-tup-stagger:16ms;--dsh-tup-ease:cubic-bezier(.22,.61,.36,1);--dsh-tup-settle:cubic-bezier(.16,1,.3,1)}",
	// The motion vocabulary. Every wave — bands, table rows, heatmap columns — is
	// `index * --dsh-tup-stagger`, and every curve is one of the two easing tokens, so
	// the panel is retimed from `MOTION` in `05-constants.js`; the values in the root
	// rule are only the fallback for a stylesheet rendered without the panel's inline
	// properties.
	"@keyframes dshTup-enter{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
	"@keyframes dshTup-bandIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
	"@keyframes dshTup-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}",
	"@keyframes dshTup-sweep{from{opacity:0;transform:rotate(-108deg) scale(.86)}to{opacity:1;transform:none}}",
	"@keyframes dshTup-cellIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
	"@keyframes dshTup-grow{from{transform:scaleX(0)}to{transform:none}}",
	"@keyframes dshTup-tipIn{from{opacity:0;transform:translate(-50%,-3px)}to{opacity:1;transform:translate(-50%,0)}}",
	".dshTup_root{animation:dshTup-enter var(--dsh-tup-base) var(--dsh-tup-ease) both}",
	// The bands of a view enter as one wave. The delay comes from the child index in
	// CSS rather than from a prop, so no component has to know it is being staggered;
	// the fifth band and beyond share the last step so a long view cannot push its tail
	// late.
	".dshTup_root[data-animate=true] .dshTup_overview>*,.dshTup_root[data-animate=true] .dshTup_sessions>*{animation:dshTup-bandIn var(--dsh-tup-base) var(--dsh-tup-ease) both}",
	".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(2),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(2){animation-delay:calc(var(--dsh-tup-stagger) * 1)}",
	".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(3),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(3){animation-delay:calc(var(--dsh-tup-stagger) * 2)}",
	".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(4),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(4){animation-delay:calc(var(--dsh-tup-stagger) * 3)}",
	".dshTup_root[data-animate=true] .dshTup_overview>:nth-child(n+5),.dshTup_root[data-animate=true] .dshTup_sessions>:nth-child(n+5){animation-delay:calc(var(--dsh-tup-stagger) * 4)}",
	// Interaction feedback is deliberately NOT part of that wave: a hover or a press is
	// immediate feedback, and gating it on a data change would read as a dead surface.
	".dshTup_root button{transition:transform var(--dsh-tup-fast) var(--dsh-tup-ease),background-color var(--dsh-tup-fast) var(--dsh-tup-ease),border-color var(--dsh-tup-fast) var(--dsh-tup-ease),color var(--dsh-tup-fast) var(--dsh-tup-ease),opacity var(--dsh-tup-fast) var(--dsh-tup-ease)}",
	".dshTup_root button:active:not(:disabled){transform:scale(.97)}",
	".dshTup_card{transition:border-color var(--dsh-tup-fast) var(--dsh-tup-ease),background-color var(--dsh-tup-fast) var(--dsh-tup-ease)}",
	".dshTup_card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}",
	// The empty heatmap cell is painted with the card's own resting surface
	// (`--dsw-alias-bg-layer-2`, see `heatColor`), so on hover the card lifts to that
	// same colour and the whole grid vanishes — same story for the donut track and
	// the tooltip chrome. Chart cards therefore keep the resting surface and signal
	// the hover on the border alone.
	".dshTup_chartCard:hover{background:var(--dsw-alias-bg-layer-1)}",
	// Inside the sessions scrollport the cards take their natural height
	// (`flex:none`), so card content can never be squeezed and the page scrolls
	// instead.
	".dshTup_sessions>.dshTup_summary,.dshTup_sessions>.dshTup_routes,.dshTup_sessions>.dshTup_chartCard{flex:none}",
	// The chart card is the only `.dshTup_card` placed straight into that flow, and
	// `.dshTup_card` carries no margin of its own (the overview's cards are inset by
	// `.dshTup_overview`'s padding). Without this inset it renders full-bleed: wider
	// than the summary and model bands above it, and clipped at the panel edges.
	".dshTup_sessions>.dshTup_chartCard{margin:12px 20px 0}",
	// Padding-top matches .dshTup_overview so the title does not jump 4px when the
	// view switches between overview and sessions.
	".dshTup_head{flex:0 0 auto;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:12px 20px 0}",
	".dshTup_headMain{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 260px}",
	".dshTup_title{margin:0;font-size:17px;font-weight:600}",
	".dshTup_subtitle{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px}",
	// margin-left:auto keeps the wrapped action row right-aligned under the title
	// instead of dropping to the far left when the head wraps on a narrow pane.
	".dshTup_actions{display:flex;align-items:center;gap:8px;flex:none;margin-left:auto}",
	".dshTup_summary{flex:0 0 auto;display:flex;align-items:center;gap:16px 22px;flex-wrap:wrap;margin:12px 20px 0;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
	".dshTup_sumHead{display:flex;flex-direction:column;gap:1px;flex:none;min-width:148px}",
	".dshTup_sumLabel{color:var(--dsw-alias-label-secondary);font-size:12px}",
	".dshTup_sumValue{font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.25;overflow-wrap:anywhere}",
	".dshTup_sumHint{color:var(--dsw-alias-label-tertiary);font-size:11px}",
	".dshTup_sumBar{display:flex;flex-direction:column;gap:6px;flex:1 1 220px;min-width:170px}",
	".dshTup_bar{display:flex;height:8px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-interactive-bg-hover)}",
	".dshTup_barSeg{height:100%;min-width:0}",
	".dshTup_root[data-animate=true] .dshTup_barSeg{transform-origin:left center;animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both;transition:width var(--dsh-tup-base) var(--dsh-tup-ease)}",
	".dshTup_legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:var(--dsw-alias-label-secondary)}",
	".dshTup_legendItem{display:inline-flex;align-items:center;gap:5px;transition:transform var(--dsh-tup-fast) var(--dsh-tup-settle),opacity var(--dsh-tup-fast) var(--dsh-tup-ease)}",
	".dshTup_legendItem:hover{transform:translateY(-1px)}",
	".dshTup_dot{width:8px;height:8px;border-radius:2px;flex:none}",
	".dshTup_legendNum{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}",
	".dshTup_stats{display:grid;grid-template-columns:repeat(2,minmax(84px,auto));gap:2px 20px;margin:0;flex:none}",
	".dshTup_stat{display:flex;align-items:baseline;gap:8px}",
	".dshTup_stat dt{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}",
	".dshTup_stat dd{margin:0;font-size:13px;font-variant-numeric:tabular-nums;font-weight:500}",
	".dshTup_grand{flex:1 1 100%;display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary);font-size:11px}",
	".dshTup_grandNum{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
	//#endregion

	//#region per-model breakdown
	".dshTup_routes{flex:0 0 auto;display:flex;flex-direction:column;gap:6px;margin:12px 20px 0;padding:10px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
	".dshTup_routeHead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}",
	".dshTup_routeList{display:flex;flex-wrap:wrap;gap:6px 10px;margin:0;padding:0;list-style:none}",
	".dshTup_routeItem{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;max-width:100%;padding:3px 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-base);font-size:12px;transition:border-color var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
	".dshTup_routeItem:hover{border-color:var(--dsw-alias-border-l2);transform:translateY(-1px)}",
	".dshTup_routeProvider{color:var(--dsw-alias-label-tertiary);font-size:11px}",
	".dshTup_routeModel{color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}",
	".dshTup_routeTokens{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
	".dshTup_routeShare{color:var(--dsw-alias-label-tertiary);font-size:11px;font-variant-numeric:tabular-nums;min-width:38px;text-align:right}",
	".dshTup_routeMoney{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;font-weight:500}",
	".dshTup_routeHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px}",
	// Grouped reading: one block per gateway, its own header carrying the rolled-up
	// total and share, the same chips inside. The chips stay chips — grouping only
	// adds the headers and the column direction.
	".dshTup_routeGroups{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none}",
	".dshTup_routeGroup{display:flex;flex-direction:column;gap:5px;min-width:0}",
	".dshTup_routeGroupHead{display:flex;align-items:baseline;gap:8px}",
	".dshTup_routeGroupName{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
	".dshTup_root .dshTup_routeButton{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;max-width:100%;border:0;background:transparent;color:inherit;font:inherit;padding:0;cursor:pointer}",
	//#endregion

	//#region views and charts
	// Both views scroll as one document. The sessions view used to be a composed
	// flex column (fixed chrome + one flexible table band), which meant that when
	// the cards were collectively taller than the panel the only shrinkable member
	// was the table: it collapsed to its floor, the cards kept their height, and the
	// overflow was clipped by the root's `overflow:hidden` with no scrollable
	// ancestor at all — the cards were unreachable and no scrollbar existed. The
	// cards now sit in normal flow and scroll with the page, so no combination of
	// card content can push anything out of reach.
	".dshTup_root[data-view=overview]{overflow-y:auto;overscroll-behavior:contain}",
	".dshTup_overview{flex:0 0 auto;display:flex;flex-direction:column;gap:12px;padding:12px 20px 0}",
	// `min-height:0` + `overflow-y:auto` make this the scrollport for the sessions
	// view. The table keeps its own inner scroller (the virtual window needs a
	// definite `clientHeight`), so a tall table scrolls inside the page scroll
	// rather than growing without bound.
	".dshTup_sessions{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;overflow-y:auto;overscroll-behavior:contain}",
	".dshTup_kpi{flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:stretch;gap:6px 0;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
	".dshTup_kpiItem{flex:1 1 130px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:0 12px;min-width:0}",
	".dshTup_kpiItem+.dshTup_kpiItem{border-left:.5px solid var(--dsw-alias-border-l1)}",
	".dshTup_kpiValue{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}",
	".dshTup_kpiLabel{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}",
	".dshTup_card{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
	".dshTup_cardHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}",
	".dshTup_cardTitle{margin:0;font-size:13px;font-weight:600}",
	".dshTup_chartCard{flex:0 0 auto}",
	".dshTup_chartHint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:11px}",
	".dshTup_legendRow{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;color:var(--dsw-alias-label-secondary)}",
	".dshTup_cell{transform-box:fill-box;transform-origin:center;transition:opacity var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
	".dshTup_cell:hover{opacity:.8;transform:scale(1.18)}",
	// The heatmap wave: the SVG groups its cells by week column, so this is 53
	// staggered group animations rather than 371 individual ones.
	".dshTup_heatCol{transform-box:fill-box;transform-origin:center}",
	".dshTup_root[data-animate=true] .dshTup_heatCol{animation:dshTup-cellIn var(--dsh-tup-base) var(--dsh-tup-ease) both;animation-delay:calc(var(--dsh-tup-i,0) * var(--dsh-tup-stagger))}",
	// Only the days that carry usage are offered as buttons; the affordance has to
	// follow that, or the empty cells read as clickable too.
	".dshTup_cell[role=button]{cursor:pointer}",
	".dshTup_cell[role=button]:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}",
	".dshTup_axisLabel{fill:var(--dsw-alias-label-tertiary);font-size:11px}",
	// A `width:100%;height:auto` SVG against a fixed viewBox scales its text with
	// the container (an 11px axis label rendered ~14.6px wide, ~2.5px narrow), and
	// capping the rendered width to a band fixed that by leaving the right of a wide
	// card empty. The trend instead measures its wrapper in JS and widens its own
	// viewBox to match, so it fills the card at scale 1 with its labels at 11px;
	// 520px is the floor, below which the wrapper scrolls. The heatmap is a square
	// grid rather than a plot, so it keeps the centred band.
	".dshTup_trendWrap{position:relative;overflow-x:auto;overscroll-behavior:contain}",
	".dshTup_trend{display:block;width:100%;min-width:520px;height:auto}",
	".dshTup_heatmapWrap{overflow-x:auto;overscroll-behavior:contain}",
	".dshTup_heatmap{display:block;width:100%;min-width:680px;max-width:900px;height:auto;margin:0 auto}",
	".dshTup_gridLine{stroke:var(--dsw-alias-border-l1);stroke-width:1;stroke-dasharray:3 4}",
	".dshTup_trendLine{fill:none;stroke-width:2;stroke-linecap:round}",
	// The line draws itself: `pathLength="1"` on the element normalizes its length, so
	// the dash pattern can be written here without measuring the path. The two halves
	// are a pair — drop `pathLength` from the charts and every line turns into a
	// one-unit dashed stroke.
	".dshTup_root[data-animate=true] .dshTup_trendLine{stroke-dasharray:1;animation:dshTup-draw var(--dsh-tup-slow) var(--dsh-tup-settle) both}",
	".dshTup_cursor{stroke:var(--dsw-alias-border-l2);stroke-width:1}",
	".dshTup_cursorDot{stroke:var(--dsw-alias-bg-layer-1);stroke-width:1.5}",
	".dshTup_overlay{fill:transparent;cursor:crosshair}",
	// The gateway is its own bounded chip rather than a prefix blended into the model
	// name, because the two are different facts: `opencodegochat` is the route taken,
	// the model is what answered.
	".dshTup_providerTag{flex:none;display:inline-flex;align-items:center;box-sizing:border-box;padding:0 5px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:16px;white-space:nowrap}",
	".dshTup_modelName{display:inline-flex;align-items:center;gap:6px;min-width:0}",
	".dshTup_modelText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
	".dshTup_tooltip{position:absolute;top:4px;transform:translateX(-50%);min-width:150px;max-width:240px;padding:7px 9px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-2));box-shadow:var(--dsw-shadow-lv2);font-size:11px;pointer-events:none;z-index:3}",
	".dshTup_root[data-animate=true] .dshTup_tooltip{animation:dshTup-tipIn var(--dsh-tup-fast) var(--dsh-tup-ease) both}",
	".dshTup_tooltipDay{color:var(--dsw-alias-label-secondary);margin-bottom:4px}",
	".dshTup_tooltipRow{display:flex;align-items:center;gap:6px}",
	".dshTup_tooltipLabel{color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto;min-width:0}",
	".dshTup_tooltipValue{font-variant-numeric:tabular-nums;font-weight:500}",
	".dshTup_donutWrap{display:flex;align-items:center;gap:18px;flex-wrap:wrap}",
	".dshTup_donut{flex:0 0 auto;width:170px;height:170px}",
	".dshTup_donutTrack{stroke:var(--dsw-alias-bg-layer-2)}",
	".dshTup_donutSegment{transition:stroke-dashoffset var(--dsh-tup-slow) var(--dsh-tup-ease)}",
	// The ring sweeps in as one group: each segment's geometry lives in its own
	// `stroke-dasharray`/`stroke-dashoffset` attributes, so animating those from CSS
	// would fight the data. Rotating the group into place is the growth animation.
	".dshTup_donutSweep{transform-box:fill-box;transform-origin:center}",
	".dshTup_root[data-animate=true] .dshTup_donutSweep{animation:dshTup-sweep var(--dsh-tup-slow) var(--dsh-tup-settle) both}",
	".dshTup_donutValue{fill:var(--dsw-alias-label-primary);font-size:20px;font-weight:600}",
	".dshTup_donutUnit{fill:var(--dsw-alias-label-tertiary);font-size:10px}",
	".dshTup_modelList{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}",
	".dshTup_modelButton{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;border:0;border-radius:var(--dsw-radius-sm);background:transparent;color:inherit;font:inherit;padding:5px 6px;cursor:pointer;text-align:left;transition:background var(--dsh-tup-fast) var(--dsh-tup-ease),transform var(--dsh-tup-fast) var(--dsh-tup-settle)}",
	".dshTup_modelButton:hover{background:var(--dsw-alias-interactive-bg-hover)}",
	".dshTup_modelLabels{display:flex;flex-direction:column;gap:1px;flex:1 1 auto;min-width:0}",
	".dshTup_modelName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
	".dshTup_modelMeta{color:var(--dsw-alias-label-tertiary);font-size:11px}",
	".dshTup_modelShare{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;font-size:12px}",
	//#endregion

	//#region filter band
	".dshTup_filters{flex:0 0 auto;display:flex;flex-direction:column;gap:8px;padding:12px 20px 0}",
	".dshTup_filterRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
	".dshTup_root .dshTup_search{height:36px;flex:1 1 220px;min-width:170px}",
	".dshTup_root .dshTup_menu{display:inline-flex;flex:none}",
	".dshTup_root .dshTup_trigger{max-width:230px}",
	".dshTup_triggerLabel{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
	".dshTup_chevron{flex:none;transition:transform var(--dsh-tup-fast) var(--dsh-tup-ease)}",
	".dshTup_chevronOpen{transform:rotate(180deg)}",
	".dshTup_filterSpacer{flex:1 1 0;min-width:0}",
	".dshTup_menuLabelRow{display:inline-flex;align-items:center;gap:6px}",
	".dshTup_menuCount{color:var(--dsw-alias-label-tertiary);font-size:11px}",
	//#endregion

	//#region the table
	// The table sits in the sessions page flow: that view is the single scrollport, so
	// the table must not open a second one. What bounds the rendered row count here is
	// pagination (`PAGE_SIZE` rows per page), not a fixed-height scroller — which is
	// also why the virtual window never engages (its threshold sits above one page) and
	// why this band no longer needs a definite `clientHeight`.
	// Only the horizontal axis may scroll, and only once a dragged column pushes the
	// table past the pane; that must not spill out of the card's rounded border.
	// Only the ::-webkit-scrollbar family is declared: the host is Chromium, where
	// those pseudo-elements take precedence over scrollbar-width/scrollbar-color, so
	// declaring both would leave the standard properties silently dead.
	".dshTup_tableWrap{flex:0 0 auto;margin:12px 20px 0}",
	".dshTup_tableScroll{overflow-x:auto;overscroll-behavior-x:contain;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1)}",
	".dshTup_tableWrap[data-scrolled=true] .dshTup_tableScroll{border-color:var(--dsw-alias-border-l2)}",
	".dshTup_root[data-animate=true] .dshTup_tableScroll{transition:border-color var(--dsh-tup-base) var(--dsh-tup-ease)}",
	".dshTup_tableScroll::-webkit-scrollbar{width:10px;height:10px}",
	".dshTup_tableScroll::-webkit-scrollbar-track{background:transparent}",
	".dshTup_tableScroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l2);background-clip:content-box;border:2px solid transparent;border-radius:999px}",
	".dshTup_tableScroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l2);background-clip:content-box}",
	".dshTup_tableScroll::-webkit-scrollbar-corner{background:transparent}",
	// `min(720px,100%)` keeps the columns from crushing while never exceeding the
	// container: a bare 720px floor would force a horizontal scrollbar as soon as
	// the pane is narrower than the sum of the visible columns.
	".dshTup_table{width:100%;min-width:min(720px,100%);border-collapse:separate;border-spacing:0;font-size:13px}",
	".dshTup_table th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-weight:500;text-align:right;white-space:nowrap;padding:0}",
	".dshTup_root[data-scrolled=true] .dshTup_table th{box-shadow:inset 0 -1px 0 var(--dsw-alias-border-l2)}",
	".dshTup_thBtn{display:flex;align-items:center;justify-content:flex-end;gap:4px;width:100%;box-sizing:border-box;padding:9px 12px;border:0;border-bottom:.5px solid var(--dsw-alias-border-l3);background:transparent;color:inherit;font:inherit;font-weight:500;text-align:inherit;cursor:pointer;border-radius:0}",
	".dshTup_thStatic{display:flex;align-items:center;justify-content:flex-end;padding:9px 12px;border-bottom:.5px solid var(--dsw-alias-border-l3)}",
	".dshTup_thBtn:hover{color:var(--dsw-alias-label-primary)}",
	".dshTup_thBtn:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
	".dshTup_colSession .dshTup_thBtn,.dshTup_colSession .dshTup_thStatic{justify-content:flex-start}",
	".dshTup_sortGlyph{flex:none;opacity:.85}",
	// Fixed layout makes the browser honour the colgroup widths exactly, which is
	// what a drag must do; `th` is already position:sticky, so it is the containing
	// block for the absolutely positioned handle below.
	".dshTup_table{table-layout:fixed}",
	".dshTup_resizeHandle{position:absolute;top:0;right:-3px;width:7px;height:100%;cursor:col-resize;touch-action:none}",
	".dshTup_resizeHandle:hover{background:var(--dsw-alias-border-l2)}",
	".dshTup_table td{box-sizing:border-box;height:var(--dsh-tup-row-h);padding:8px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1);text-align:right;vertical-align:middle;font-variant-numeric:tabular-nums;white-space:nowrap}",
	".dshTup_spacer td{height:auto;padding:0;border:0;background:transparent}",
	"@keyframes dshTup-rowIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}",
	// Rows land as a wave: each row carries its page index as `--dsh-tup-i` (see
	// `70-table.js`), so paging reads as a sweep rather than a jump. Spacers are
	// excluded — they have no content to reveal.
	".dshTup_root[data-animate=true] .dshTup_table tbody tr[data-row]{animation:dshTup-rowIn var(--dsh-tup-base) var(--dsh-tup-settle) both;animation-delay:calc(var(--dsh-tup-i,0) * var(--dsh-tup-stagger))}",
	".dshTup_table tbody tr[data-row]{transition:background var(--dsh-tup-fast) var(--dsh-tup-ease),box-shadow var(--dsh-tup-fast) var(--dsh-tup-ease)}",
	".dshTup_table tbody tr[data-row]:last-child td{border-bottom:none}",
	".dshTup_row{cursor:pointer}",
	".dshTup_row:hover{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}",
	".dshTup_row:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}",
	".dshTup_rowCurrent{background:var(--dsw-alias-interactive-bg-hover)}",
	".dshTup_cellMain{display:flex;flex-direction:column;gap:2px;min-width:0;overflow:hidden}",
	".dshTup_rowTitle{display:flex;align-items:center;gap:6px;min-width:0}",
	".dshTup_rowTitleText{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
	".dshTup_rowMeta{color:var(--dsw-alias-label-tertiary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
	".dshTup_share{display:flex;align-items:center;gap:8px;justify-content:flex-end}",
	".dshTup_shareTrack{width:56px;height:6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);overflow:hidden;flex:none}",
	".dshTup_shareFill{height:100%;background:var(--dsw-alias-brand-primary);border-radius:999px}",
	".dshTup_root[data-animate=true] .dshTup_shareFill{transform-origin:left center;animation:dshTup-grow var(--dsh-tup-slow) var(--dsh-tup-settle) both;transition:width var(--dsh-tup-base) var(--dsh-tup-ease)}",
	".dshTup_shareNum{min-width:42px;text-align:right;color:var(--dsw-alias-label-secondary);font-size:12px}",
	".dshTup_muted{color:var(--dsw-alias-label-tertiary)}",
	".dshTup_retry{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:var(--dsw-alias-state-warn-primary);font:inherit;font-size:11px;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}",
	//#endregion

	//#region empty, skeleton, footer
	".dshTup_empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:200px;padding:28px 16px;text-align:center;color:var(--dsw-alias-label-secondary)}",
	".dshTup_emptyIcon{color:var(--dsw-alias-label-dimmed)}",
	"@keyframes dshTup-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}",
	".dshTup_skelRow{display:flex;align-items:center;gap:16px;padding:0 14px;height:var(--dsh-tup-row-h);border-bottom:.5px solid var(--dsw-alias-border-l1)}",
	".dshTup_skel{position:relative;height:10px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;flex:none}",
	".dshTup_skel::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--dsw-alias-interactive-bg-hover),transparent);animation:dshTup-shimmer 1.4s linear infinite}",
	".dshTup_skelGrow{flex:1 1 auto;min-width:0;max-width:280px}",
	// margin-top (not padding-top) so the seam above the footer is the same 12px
	// every other band-to-band gap uses.
	".dshTup_foot{flex:0 0 auto;display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin-top:12px;padding:0 20px 14px;color:var(--dsw-alias-label-tertiary);font-size:12px}",
	// Visually hidden but still announced: clipped rather than `display:none`, which
	// would remove the live region from the accessibility tree entirely.
	".dshTup_live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}",
	".dshTup_footSpacer{flex:1 1 0;min-width:0}",
	".dshTup_pagination{display:inline-flex;align-items:center;gap:6px}",
	".dshTup_notice{display:inline-flex;align-items:center;gap:4px;color:var(--dsw-alias-state-warn-primary)}",
	//#endregion

	//#region responsive columns
	// A hidden column must stop reserving a track. The cells are `display:none`, but
	// under `table-layout:fixed` the browser sizes columns from the colgroup, so the
	// `<col>` has to be dropped too — otherwise the "hidden" columns still add up to
	// more than the container and the table grows the forbidden horizontal scrollbar.
	"@container (max-width: 900px){.dshTup_hideBelow{display:none}.dshTup_colHideBelow{display:none}}",
	"@container (max-width: 640px){.dshTup_hideBelow2{display:none}.dshTup_colHideBelow2{display:none}}",
	//#endregion

	//#region light-theme contrast
	// The theme's light palette is tuned for large chrome surfaces, but this panel
	// renders a lot of 9-12px text on the same white, and four of the aliases fall
	// below WCAG AA there: label-tertiary 3.71:1, warn 2.15:1, success 2.28:1,
	// business 4.23:1. The theme itself is not ours to change, so the aliases are
	// remapped inside this panel only. Light is the default theme and dark is opted
	// into with `body[data-ds-dark-theme]`, so `body:not([data-ds-dark-theme])`
	// scopes these to light without touching dark.
	"body:not([data-ds-dark-theme]) .dshTup_root{--dsw-alias-label-tertiary:#61666b;--dsw-alias-state-warn-primary:#b45309;--dsw-alias-state-success-primary:#15803d;--dsw-alias-state-business-primary:#2563eb}",
	// The chart palette follows the same split. The defaults below are the original
	// mid-saturation hexes, tuned for the dark surface; the light block deepens each
	// hue to clear 3:1 against white, since these paint thin strokes, small donut
	// arcs and heatmap cells rather than large fills.
	":root{--dsh-tup-c1:#5b9dff;--dsh-tup-c2:#4ecb71;--dsh-tup-c3:#b98cff;--dsh-tup-c4:#ff6b6b;--dsh-tup-c5:#ffab4d;--dsh-tup-c6:#39c7c7;--dsh-tup-c7:#ff8ad4;--dsh-tup-c8:#9aa7b8;--dsh-tup-other:#8b93a1;--dsh-tup-heat:#5b9dff}",
	"body:not([data-ds-dark-theme]){--dsh-tup-c1:#2563eb;--dsh-tup-c2:#15803d;--dsh-tup-c3:#7c3aed;--dsh-tup-c4:#dc2626;--dsh-tup-c5:#b45309;--dsh-tup-c6:#0f766e;--dsh-tup-c7:#be185d;--dsh-tup-c8:#475569;--dsh-tup-other:#64748b;--dsh-tup-heat:#2563eb}",
	//#endregion

	"@media (prefers-reduced-motion:reduce){.dshTup_root{animation:none}.dshTup_root *,.dshTup_root *::before,.dshTup_root *::after{transition:none!important;animation:none!important}}",
].join("");
const cssTagId = "dsh-token-usage-panel/panel.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-token-usage-panel";
	tag.dataset.pluginCss = cssTagId;
	tag.textContent = css;
	document.head.appendChild(tag);
}
