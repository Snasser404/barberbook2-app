import { useState, useEffect } from 'react'
import api from '../../api/client'
import { Staff, BarberShop } from '../../types'
import StarRating from '../../components/StarRating'
import AvatarUploader from '../../components/AvatarUploader'
import { isPasswordValid } from '../../components/PasswordField'

export default function ManageStaff() {
  const [shop, setShop] = useState<BarberShop | null>(null)
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', avatar: '', specialties: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // "Transfer existing" flow
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data: shopData } = await api.get('/shops/mine')
      setShop(shopData)
      if (shopData?.id) {
        const { data: staffData } = await api.get(`/shops/${shopData.id}/staff/all`)
        setStaff(staffData)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const generateTempPassword = () => {
    // Easy-to-share temp password: word + 4 digits, but still meets validator
    // (8+ chars, upper, lower, number)
    const words = ['Sunny', 'Quick', 'Sharp', 'Smart', 'Bold', 'Fresh', 'Lucky', 'Brave', 'Calm', 'Cool']
    const w = words[Math.floor(Math.random() * words.length)]
    const n = Math.floor(1000 + Math.random() * 9000)
    return `${w}${n}` // e.g. Sunny4729 — meets all rules
  }

  const startNew = () => {
    setEditing(null)
    setForm({ name: '', bio: '', avatar: '', specialties: '', email: '', password: generateTempPassword() })
    setError('')
    setShowForm(true)
  }

  const startEdit = (s: Staff) => {
    setEditing(s)
    setForm({
      name: s.name,
      bio: s.bio || '',
      avatar: s.avatar || '',
      specialties: s.specialties || '',
      email: '',
      password: '',
    })
    setError('')
    setShowForm(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const { name, bio, avatar, specialties } = form
        const { data } = await api.put(`/staff/${editing.id}`, { name, bio, avatar, specialties })
        setStaff((prev) => prev.map((s) => s.id === editing.id ? data : s))
      } else {
        // Email is mandatory now — every barber must be able to sign in
        if (!form.email) {
          setError('Email is required for the barber to sign in')
          setSaving(false)
          return
        }
        if (!form.password || !isPasswordValid(form.password)) {
          setError('Password must be at least 8 chars with uppercase, lowercase and a number')
          setSaving(false)
          return
        }
        const payload: any = {
          name: form.name, bio: form.bio, avatar: form.avatar, specialties: form.specialties,
          email: form.email, password: form.password,
        }
        const { data } = await api.post(`/shops/${shop.id}/staff`, payload)
        setStaff((prev) => [...prev, data])
      }
      setShowForm(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (s: Staff) => {
    const { data } = await api.put(`/staff/${s.id}`, { isActive: !s.isActive })
    setStaff((prev) => prev.map((x) => x.id === s.id ? data : x))
  }

  const remove = async (s: Staff) => {
    if (!confirm(`Remove ${s.name}? This will also delete their reviews. Past appointments stay in the system.`)) return
    await api.delete(`/staff/${s.id}`)
    setStaff((prev) => prev.filter((x) => x.id !== s.id))
  }

  const inviteExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shop) return
    setInviteSaving(true)
    setInviteError('')
    try {
      const { data } = await api.post(`/shops/${shop.id}/staff/invite`, { email: inviteEmail })
      setStaff((prev) => [...prev, data])
      setShowInvite(false)
      setInviteEmail('')
    } catch (err: any) {
      setInviteError(err.response?.data?.error || 'Could not invite')
    } finally { setInviteSaving(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!shop) return <div className="text-center py-20 text-gray-500">Set up your shop first</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary">Manage Team</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setShowInvite(true); setInviteEmail(''); setInviteError('') }} className="btn-outline text-sm">📨 Invite existing</button>
          <button onClick={startNew} className="btn-primary text-sm">+ Add new barber</button>
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-6">Customers can browse your team, see each barber's specialties and ratings, and book directly with their favorite.</p>

      {staff.length === 0 ? (
        <div className="text-center py-16 text-gray-400 card">
          <p className="text-4xl mb-3">💈</p>
          <p className="font-medium">No barbers added yet</p>
          <p className="text-sm mt-1">Add yourself or your team so customers can book with them</p>
          <button onClick={startNew} className="btn-primary mt-4 text-sm">+ Add your first barber</button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className={`card p-4 ${!s.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                {s.avatar ? (
                  <img src={s.avatar} alt={s.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary text-accent flex items-center justify-center text-xl font-bold shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{s.name}</h3>
                    {!s.isActive && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Hidden</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarRating rating={Math.round(s.rating)} size="sm" />
                    <span className="text-xs text-gray-500">{s.rating.toFixed(1)} ({s.reviewCount} reviews)</span>
                  </div>
                  {s.specialties && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.specialties.split(',').map((sp) => (
                        <span key={sp} className="text-xs bg-accent/15 text-amber-800 px-2 py-0.5 rounded-full">{sp.trim()}</span>
                      ))}
                    </div>
                  )}
                  {s.bio && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{s.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                <button onClick={() => startEdit(s)} className="text-sm text-primary hover:underline">Edit</button>
                <button onClick={() => toggleActive(s)} className="text-sm text-gray-500 hover:text-gray-700">{s.isActive ? 'Hide' : 'Show'}</button>
                <button onClick={() => remove(s)} className="text-sm text-red-500 hover:text-red-700 ml-auto">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl my-8 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-4">{editing ? 'Edit barber' : 'Add a barber'}</h3>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Marco Rossi" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                <input className="input" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Fades, Beards, Hot shaves (comma-separated)" />
                <p className="text-xs text-gray-400 mt-1">Comma-separated tags shown to customers</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea className="input resize-none" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Years of experience, training, what makes them stand out..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile picture</label>
                <AvatarUploader
                  value={form.avatar}
                  onChange={(url) => setForm({ ...form, avatar: url || '' })}
                  fallback={form.name.charAt(0).toUpperCase() || '?'}
                  size={80}
                />
              </div>

              {/* Login fields — always required for new barbers */}
              {!editing && (
                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Login details *</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      className="input text-sm"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="barber@example.com"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">They'll use this to sign in.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Temporary password *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="input text-sm flex-1 font-mono"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={8}
                      />
                      <button type="button" onClick={() => setForm({ ...form, password: generateTempPassword() })} className="btn-outline text-xs">↻ New</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Share this with them.</strong> They can change it after their first sign-in. Must be 8+ chars with upper, lower &amp; a number.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm">{saving ? 'Saving...' : editing ? 'Save changes' : 'Add barber'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite existing barber (transfer from another shop or unattached) */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !inviteSaving && setShowInvite(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-2">Invite an existing barber</h3>
            <p className="text-sm text-gray-600 mb-4">
              If a barber already has a BarberBook account (e.g. previously worked at another shop),
              enter their email and they'll be added to your team. Their reviews, portfolio and rating come with them.
            </p>
            {inviteError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-3">{inviteError}</div>}
            <form onSubmit={inviteExisting} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barber's email *</label>
                <input type="email" className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} disabled={inviteSaving} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={inviteSaving} className="flex-1 btn-primary text-sm">{inviteSaving ? 'Inviting…' : 'Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
