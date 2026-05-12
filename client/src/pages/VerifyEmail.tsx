import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmail() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resentMsg, setResentMsg] = useState('')

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/auth/verify-email', { code })
      if (user) updateUser({ ...user, emailVerified: true })
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError('')
    setResentMsg('')
    try {
      await api.post('/auth/resend-verification')
      setResentMsg('A new code has been sent to your email.')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">📧</span>
          <h1 className="text-2xl font-bold text-primary mt-2">Verify your email</h1>
          <p className="text-gray-500 text-sm mt-1">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {resentMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{resentMsg}</div>}

        <form onSubmit={verify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
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
          <button type="submit" disabled={submitting || code.length !== 6} className="btn-primary w-full py-2.5 disabled:opacity-50">
            {submitting ? 'Verifying...' : 'Verify email'}
          </button>
        </form>

        <div className="flex items-center justify-between mt-4 text-sm">
          <button onClick={resend} disabled={resending} className="text-primary hover:underline disabled:opacity-50">
            {resending ? 'Sending...' : 'Resend code'}
          </button>
          <button onClick={() => navigate('/')} className="text-gray-500 hover:underline">Skip for now</button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Check your spam folder if you don't see the email.
        </p>
      </div>
    </div>
  )
}
