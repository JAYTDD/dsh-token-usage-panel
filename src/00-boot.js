/**
 * Module boot: the module table this bundle is allowed to resolve.
 *
 * Both requests are platform seed words from the shell's frozen module table
 * (`react` plus the static UI libraries), so the package declares no
 * `dsh.client.external` — declaring one would require a boot-graph row, and a
 * seed module is answered by the baseline table itself.
 */
const react = require("react");
const h = react.createElement;
const {
	Button,
	Checkbox,
	IconChevronDownOutlineRegular,
	IconCloseOutlineRegular,
	IconDatabaseOutlineRegular,
	IconDownloadOutlineRegular,
	IconFlatListOutlineRegular,
	IconFolderOpenOutlineRegular,
	IconRefreshOutlineRegular,
	IconSearchOutlineRegular,
	IconSlidersTwoOutlineRegular,
	IconWarningOutlineRegular,
	Input,
	Menu,
	SegmentedControl,
	StateDot,
	Tag,
	writeClipboard,
} = require("@deepseek-ai/dsh-client-ui-primitives");
