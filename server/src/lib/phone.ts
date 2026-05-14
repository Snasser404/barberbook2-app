// Lightweight phone validation — requires a leading + and country code,
// then 6-15 digits. Allows spaces, hyphens, parentheses for readability.
// Examples accepted: +1 555 123 4567, +44 20 7946 0958, +9665012345678
export function validatePhone(phone: string): { ok: true; normalized: string } | { ok: false; error: string } {
  if (typeof phone !== 'string') return { ok: false, error: 'Phone must be a string' }
  const trimmed = phone.trim()
  if (!trimmed.startsWith('+')) {
    return { ok: false, error: 'Phone must start with a country code, e.g. +1 555 123 4567' }
  }
  // Remove spaces, hyphens, parens for the digit check
  const digitsOnly = trimmed.replace(/[\s\-()]/g, '')
  if (!/^\+[0-9]{7,16}$/.test(digitsOnly)) {
    return { ok: false, error: 'Phone must contain only digits after the country code (7-15 digits)' }
  }
  return { ok: true, normalized: digitsOnly }
}
