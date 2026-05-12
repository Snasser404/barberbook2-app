// Password input with live rule checklist.
// Uses the same rules as the server (server is the source of truth — this is just UX feedback).
import { useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  /** Show the rules checklist below the field */
  showRules?: boolean
}

interface Rule { label: string; passed: boolean }

export function getPasswordRules(pw: string): Rule[] {
  return [
    { label: 'At least 8 characters', passed: pw.length >= 8 },
    { label: 'Contains an uppercase letter', passed: /[A-Z]/.test(pw) },
    { label: 'Contains a lowercase letter', passed: /[a-z]/.test(pw) },
    { label: 'Contains a number', passed: /[0-9]/.test(pw) },
  ]
}

export function isPasswordValid(pw: string): boolean {
  return getPasswordRules(pw).every((r) => r.passed)
}

export default function PasswordField({ value, onChange, label = 'Password', placeholder = '••••••••', required = true, showRules = true }: Props) {
  const [show, setShow] = useState(false)
  const rules = getPasswordRules(value)
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input pr-16"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {showRules && value && (
        <ul className="mt-2 space-y-0.5">
          {rules.map((r) => (
            <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.passed ? 'text-green-600' : 'text-gray-500'}`}>
              <span>{r.passed ? '✓' : '○'}</span>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
