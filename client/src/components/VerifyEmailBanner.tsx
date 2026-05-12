// Small dismissible banner reminding unverified users to verify their email.
// Render this on dashboards / homepage. Hidden once verified or dismissed for the session.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmailBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('verify-banner-dismissed') === '1')

  if (!user || user.emailVerified || dismissed) return null

  const dismiss = () => {
    sessionStorage.setItem('verify-banner-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-amber-900 text-sm">
          📧 <span className="font-medium">Verify your email</span> — check your inbox for the 6-digit code we sent to {user.email}.
        </p>
        <div className="flex items-center gap-3">
          <Link to="/verify-email" className="text-amber-900 underline text-sm font-medium hover:text-amber-950">Verify now</Link>
          <button onClick={dismiss} className="text-amber-700 hover:text-amber-900 text-sm">Dismiss</button>
        </div>
      </div>
    </div>
  )
}
