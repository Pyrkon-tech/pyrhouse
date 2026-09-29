/** Aliases of the generated API contract (@pyrhouse/api). */
import type { Schemas } from '@pyrhouse/api';

/** List row: value is null unless the list was requested with ?prefix= */
export type Setting = Schemas['AppSettingSummary'];
/** Single setting (GET /settings/:key) — always has its value */
export type SettingWithValue = Schemas['AppSetting'];
