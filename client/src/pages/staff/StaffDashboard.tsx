import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { Staff, Appointment, AppointmentStatus } from '../../types'
import StarRating from '../../components/StarRating'
import AppointmentPhotos from '../../components/AppointmentPhotos'
import AvatarUploader from '../../components/AvatarUploader'
import StaffPortfolio from '../../components/StaffPortfolio'

const statusColors: Record<AppointmentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
}

export default function StaffDashboard() {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', avatar: '', specialties: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/staff/me')
      setStaff(data)
      setForm({
        name: data.name,
        bio: data.bio || '',
        avatar: data.avatar || '',
        specialties: data.specialties || '',
      })
      const appts = await api.get('/appointments')
      setAppointments(appts.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaveMsg('')
    try {
      const { data } = await api.put('/staff/me', form)
      setStaff((prev) => prev ? { ...prev, ...data } : prev)
      setSaveMsg('✓ Saved')
      setTimeout(() => setSaveMsg(''), 2000)
      setEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const updateApptStatus = async (id: string, status: AppointmentStatus) => {
    const { data } = await api.put(`/appointments/${id}/status`, { status })
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: data.status } : a))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!staff) return <div className="text-center py-20 text-gray-500">Staff profile not found.</div>

  const today = new Date().toISOString().split('T')[0]
  const upcoming = appointments.filter((a) => a.date >= today && (a.status === 'PENDING' || a.status === 'CONFIRMED')).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const recent = appointments.filter((a) => a.status === 'COMPLETED').slice(0, 5)
  const pendingCount = upcoming.filter((a) => a.status === 'PENDING').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Hi {staff.name.split(' ')[0]} 👋</h1>
          {staff.shop && (
            <p className="text-gray-500 text-sm">working at <Link to={`/shops/${staff.shop.id}`} className="text-primary hover:underline">{staff.shop.name}</Link></p>
          )}
        </div>
        <Link to={`/staff/${staff.id}`} className="btn-outline text-sm">View public profile →</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat icon="⭐" label="Rating" value={staff.rating.toFixed(1)} sub={`${staff.reviewCount} reviews`} />
        <Stat icon="📅" label="Pending" value={String(pendingCount)} sub="needs response" highlight={pendingCount > 0} />
        <Stat icon="🗓" label="Upcoming" value={String(upcoming.length)} sub="appointments" />
        <Stat icon="✓" label="Completed" value={String(appointments.filter(a => a.status === 'COMPLETED').length)} sub="all-time" />
      </div>

      {/* Profile editor */}
      <div className="card p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">My profile</h2>
          {!editing && <button onClick={() => setEditing(true)} className="text-sm text-primary hover:underline">Edit</button>}
        </div>

        {saveMsg && <p className="text-green-600 text-sm mb-2">{saveMsg}</p>}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        {!editing ? (
          <div className="flex items-start gap-4">
            {staff.avatar ? (
              <img src={staff.avatar} alt={staff.name} className="w-20 h-20 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary text-accent flex items-center justify-center text-3xl font-bold shrink-0">
                {staff.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-lg">{staff.name}</p>
              {staff.specialties && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {staff.specialties.split(',').map((s) => <span key={s} className="text-xs bg-accent/15 text-amber-800 px-2 py-0.5 rounded-full">{s.trim()}</span>)}
                </div>
              )}
              {staff.bio && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{staff.bio}</p>}
              {!staff.bio && !staff.specialties && (
                <p className="text-gray-400 text-sm mt-2">Add a bio and specialties so customers know what you're great at.</p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile picture</label>
              <AvatarUploader
                value={form.avatar}
                onChange={(url) => setForm({ ...form, avatar: url || '' })}
                fallback={form.name.charAt(0).toUpperCase() || '?'}
                size={88}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
              <input className="input" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Fades, Beards, Hot shaves (comma-separated)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea className="input resize-none" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Years of experience, training, what makes you stand out..." />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} disabled={saving} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm">{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        )}
      </div>

      {/* Portfolio (editable) */}
      <div className="card p-5 mb-8">
        <StaffPortfolio staffId={staff.id} editable />
      </div>

      {/* Upcoming appointments */}
      <div className="mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">My upcoming appointments</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm card p-5 text-center">No upcoming appointments.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((appt) => (
              <div key={appt.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                      {appt.customer?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{appt.customer?.name}</p>
                      {appt.customer?.phone && <p className="text-gray-400 text-xs">{appt.customer.phone}</p>}
                      <p className="text-gray-600 text-sm mt-0.5">{appt.service?.name} — {appt.service?.duration}min — <span className="font-medium">${appt.service?.price}</span></p>
                      {appt.notes && <p className="text-gray-400 text-xs mt-1 italic">"{appt.notes}"</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{new Date(appt.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className="text-sm text-gray-500">{appt.time}</p>
                    <span className={`badge ${statusColors[appt.status]} mt-1 text-xs`}>{appt.status}</span>
                  </div>
                </div>
                <AppointmentPhotos appointmentId={appt.id} label="Photos from customer" />
                {appt.status === 'PENDING' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button onClick={() => updateApptStatus(appt.id, 'CONFIRMED')} className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">Confirm</button>
                    <button onClick={() => updateApptStatus(appt.id, 'CANCELLED')} className="flex-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">Decline</button>
                  </div>
                )}
                {appt.status === 'CONFIRMED' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button onClick={() => updateApptStatus(appt.id, 'COMPLETED')} className="flex-1 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">Mark completed</button>
                    <button onClick={() => updateApptStatus(appt.id, 'CANCELLED')} className="flex-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent reviews */}
      {staff.reviews && staff.reviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Latest reviews</h2>
            <Link to={`/staff/${staff.id}`} className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {staff.reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {review.customer?.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{review.customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {review.comment && <p className="text-gray-600 text-sm mt-1 leading-relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, sub, highlight }: { icon: string; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className={`card p-3 ${highlight ? 'border-amber-300 bg-amber-50' : ''}`}>
      <span className="text-lg">{icon}</span>
      <p className="text-xl font-bold text-primary mt-0.5">{value}</p>
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
