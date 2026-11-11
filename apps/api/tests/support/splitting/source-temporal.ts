/** node-postgres parses SQL DATE at local midnight; it is not a UTC instant. */
export function sourceDateOnly(value: unknown): string {
  return value instanceof Date
    ? `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value).slice(0, 10);
}

/** Preserve milliseconds already present in a parsed timestamp. */
export function sourceTimestamp(value: unknown): string {
  return (value instanceof Date ? value : new Date(String(value))).toISOString();
}
