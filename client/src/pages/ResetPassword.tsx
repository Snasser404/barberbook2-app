import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../api/client'
import PasswordField, { isPasswordValid } from '../components/PasswordField'

export default function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = (location.state as any)?.email || ''

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !code || code.length !== 6) {
      setError('Enter your email and the 6-digit code from your email')
      return
    }
    if (!isPasswordValid(password)) { setError('Password does not meet the requirements'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, code, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold text-primary mt-2">Reset password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter the 6-digit code we emailed you</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {done ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg text-sm mb-4">
              <p className="font-semibold">Password updated!</p>
              <p>Redirecting to sign in…</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">6-digit reset code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="input text-center text-2xl tracking-[0.4em] font-mono"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <PasswordField label="New password" value={password} onChange={setPassword} />
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Updating...' : 'Update password'}
            </button>
            <div className="flex justify-between text-xs">
              <Link to="/forgot-password" className="text-primary hover:underline">Need a new code?</Link>
              <Link to="/login" className="text-gray-500 hover:underline">← Back to sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
