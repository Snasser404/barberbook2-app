// Phone input that enforces country code prefix and digits-only.
// Stores the value as a normalized string starting with "+".
import { useState, useEffect } from 'react'

// A short curated list of common country codes. Pick whichever matches.
// (We can swap to libphonenumber-js later for full coverage.)
const COUNTRY_CODES = [
  { code: '+1',   label: '🇺🇸 US/CA (+1)' },
  { code: '+44',  label: '🇬🇧 UK (+44)' },
  { code: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+20',  label: '🇪🇬 Egypt (+20)' },
  { code: '+962', label: '🇯🇴 Jordan (+962)' },
  { code: '+961', label: '🇱🇧 Lebanon (+961)' },
  { code: '+963', label: '🇸🇾 Syria (+963)' },
  { code: '+964', label: '🇮🇶 Iraq (+964)' },
  { code: '+965', label: '🇰🇼 Kuwait (+965)' },
  { code: '+967', label: '🇾🇪 Yemen (+967)' },
  { code: '+968', label: '🇴🇲 Oman (+968)' },
  { code: '+970', label: '🇵🇸 Palestine (+970)' },
  { code: '+973', label: '🇧🇭 Bahrain (+973)' },
  { code: '+974', label: '🇶🇦 Qatar (+974)' },
  { code: '+212', label: '🇲🇦 Morocco (+212)' },
  { code: '+216', label: '🇹🇳 Tunisia (+216)' },
  { code: '+213', label: '🇩🇿 Algeria (+213)' },
  { code: '+33',  label: '🇫🇷 France (+33)' },
  { code: '+49',  label: '🇩🇪 Germany (+49)' },
  { code: '+39',  label: '🇮🇹 Italy (+39)' },
  { code: '+34',  label: '🇪🇸 Spain (+34)' },
  { code: '+90',  label: '🇹🇷 Turkey (+90)' },
  { code: '+81',  label: '🇯🇵 Japan (+81)' },
  { code: '+86',  label: '🇨🇳 China (+86)' },
  { code: '+91',  label: '🇮🇳 India (+91)' },
  { code: '+92',  label: '🇵🇰 Pakistan (+92)' },
  { code: '+880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '+62',  label: '🇮🇩 Indonesia (+62)' },
  { code: '+60',  label: '🇲🇾 Malaysia (+60)' },
  { code: '+65',  label: '🇸🇬 Singapore (+65)' },
  { code: '+61',  label: '🇦🇺 Australia (+61)' },
  { code: '+27',  label: '🇿🇦 South Africa (+27)' },
  { code: '+55',  label: '🇧🇷 Brazil (+55)' },
  { code: '+52',  label: '🇲🇽 Mexico (+52)' },
]

interface Props {
  value: string
  onChange: (combined: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  defaultCountry?: string
}

function splitPhone(combined: string, fallbackCountry: string): { country: string; rest: string } {
  if (!combined) return { country: fallbackCountry, rest: '' }
  if (!combined.startsWith('+')) return { country: fallbackCountry, rest: combined.replace(/\D/g, '') }
  // Find the longest country code in our list that matches the prefix
  let matched = ''
  for (const c of COUNTRY_CODES) {
    if (combined.startsWith(c.code) && c.code.length > matched.length) matched = c.code
  }
  if (!matched) return { country: fallbackCountry, rest: combined.replace(/\D/g, '') }
  return { country: matched, rest: combined.slice(matched.length).replace(/\D/g, '') }
}

export default function PhoneInput({ value, onChange, label = 'Phone', required = false, placeholder = '555 123 4567', defaultCountry = '+1' }: Props) {
  const initial = splitPhone(value, defaultCountry)
  const [country, setCountry] = useState(initial.country)
  const [local, setLocal] = useState(initial.rest)

  // Re-sync when external value changes
  useEffect(() => {
    const s = splitPhone(value, defaultCountry)
    setCountry(s.country)
    setLocal(s.rest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = (c: string, r: string) => {
    const digits = r.replace(/\D/g, '')
    onChange(digits ? `${c}${digits}` : '')
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <div className="flex gap-2">
        <select
          className="input max-w-[170px]"
          value={country}
          onChange={(e) => { setCountry(e.target.value); emit(e.target.value, local) }}
        >
          {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          className="input flex-1"
          placeholder={placeholder}
          value={local}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, '')
            setLocal(cleaned)
            emit(country, cleaned)
          }}
          required={required}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">Numbers only — country code is selected above.</p>
    </div>
  )
}
