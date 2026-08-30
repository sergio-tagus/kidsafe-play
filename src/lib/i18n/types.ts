export type Lang = "es" | "en" | "pt";

/** Flat key -> translated string map. `es` is the source of truth for keys. */
export type Dict = Record<string, string>;
