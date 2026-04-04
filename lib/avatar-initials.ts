/** Two-letter initials for avatar fallback. */
export function avatarInitials(
  fullName: string | null | undefined,
  username: string | null | undefined,
  email: string
): string {
  const n = fullName?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0]?.[0]
      const b = parts[parts.length - 1]?.[0]
      if (a && b) return (a + b).toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  const u = username?.trim()
  if (u) return u.slice(0, 2).toUpperCase()
  const local = email.split('@')[0] ?? '?'
  return local.slice(0, 2).toUpperCase()
}
