/** Two-letter initials for avatar fallback. */
export function avatarInitials(
  fullName: string | null | undefined,
  username: string | null | undefined,
  email: string | null | undefined
): string {
  const n = fullName?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]?.[0]
      const b = parts[parts.length - 1]?.[0]
      if (a && b) return (a + b).toUpperCase()
    }
    const slice = n.slice(0, 2).toUpperCase()
    return slice || '?'
  }
  const u = username?.trim()
  if (u) {
    const slice = u.slice(0, 2).toUpperCase()
    return slice || '?'
  }
  const e = email?.trim()
  if (!e) return '?'
  const local = e.split('@')[0] ?? ''
  const slice = local.slice(0, 2).toUpperCase()
  return slice || '?'
}
