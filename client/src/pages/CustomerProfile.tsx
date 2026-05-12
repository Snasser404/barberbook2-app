import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import AvatarUploader from '../components/AvatarUploader'
import PasswordField, { isPasswordValid } from '../components/PasswordField'

export default function CustomerProfile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', avatar: user?.avatar || '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (!isPasswordValid(pwForm.next)) {
      setPwError('New password does not meet the requirements')
      return
    }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwMsg('Password changed successfully')
      setPwForm({ current: '', next: '' })
      setTimeout(() => setPwMsg(''), 3000)
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Could not change password')
    } finally {
      setPwSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { data } = await api.put('/auth/me', form)
      updateUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (url: string | null) => {
    setForm({ ...form, avatar: url || '' })
    // Save immediately so the avatar persists right away
    try {
      const { data } = await api.put('/auth/me', { avatar: url })
      updateUser(data)
    } catch {}
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">My Profile</h1>
      <div className="card p-6">
        <div className="mb-6">
          <p className="font-semibold text-lg">{user?.name}</p>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <span className="badge bg-primary/10 text-primary text-xs mt-1 inline-block">{user?.role}</span>
        </div>

        <div className="mb-6 pb-6 border-b">
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile picture</label>
          <AvatarUploader
            value={form.avatar}
            onChange={handleAvatarChange}
            fallback={user?.name.charAt(0).toUpperCase() || '?'}
            size={96}
          />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        {saved && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">Profile updated!</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input bg-gray-50" value={user?.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6 mt-6">
        <h2 className="font-semibold text-gray-900 mb-4">Change password</h2>
        {pwError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">{pwError}</div>}
        {pwMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-3">{pwMsg}</div>}
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
            <input type="password" className="input" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required />
          </div>
          <PasswordField label="New password" value={pwForm.next} onChange={(v) => setPwForm({ ...pwForm, next: v })} />
          <button type="submit" disabled={pwSaving} className="btn-primary w-full">
            {pwSaving ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
