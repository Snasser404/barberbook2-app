// Shared password complexity rules — used by register, change-password, and staff invite.
export const PASSWORD_MIN_LENGTH = 8

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  if (typeof password !== 'string') return { ok: false, error: 'Password is required' }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` }
  }
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Password must include at least one uppercase letter' }
  if (!/[a-z]/.test(password)) return { ok: false, error: 'Password must include at least one lowercase letter' }
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Password must include at least one number' }
  // Common weak passwords blocklist (small)
  const lower = password.toLowerCase()
  if (['password', 'password1', '12345678', 'qwerty12', 'iloveyou', 'admin123'].includes(lower)) {
    return { ok: false, error: 'That password is too common — choose a stronger one' }
  }
  return { ok: true }
}
