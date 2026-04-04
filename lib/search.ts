/** Escape `%`, `_`, and `\` for safe use inside PostgREST `ilike` patterns. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}
