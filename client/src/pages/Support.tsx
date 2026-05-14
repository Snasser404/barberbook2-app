// Contact support form — anyone can use it (logged in, logged out, or suspended).
// Submits a SupportTicket and the server emails the admin.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Support() {
  const { user } = useAuth()
  const location = useLocation()
  const presetSubject = (location.state as any)?.subject || ''

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: presetSubject,
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/support/contact', form)
      setSent(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send your message — try again in a moment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50 py-10">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">💬</span>
          <h1 className="text-2xl font-bold text-primary mt-2">Contact support</h1>
          <p className="text-gray-500 text-sm mt-1">We typically reply within 1-2 business days.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {sent ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-lg text-sm mb-4">
              <p className="font-semibold">Message sent</p>
              <p>Thanks {form.name.split(' ')[0]}! Our team will reply to <span className="font-medium">{form.email}</span> as soon as possible.</p>
            </div>
            <Link to="/" className="text-primary hover:underline text-sm">← Back to home</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email * <span className="text-xs text-gray-400 font-normal">— so we can reply</span></label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea className="input resize-none" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what's going on…" required />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
              {submitting ? 'Sending...' : 'Send message'}
            </button>
            <p className="text-xs text-gray-400 text-center">By submitting you agree we may contact you via email.</p>
          </form>
        )}
      </div>
    </div>
  )
}
