import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { User } from '../../types'
import ConfirmDialog from '../../components/ConfirmDialog'
import PasswordField, { isPasswordValid } from '../../components/PasswordField'
import { useAuth } from '../../context/AuthContext'

type UserStatus = 'active' | 'deleted' | 'all'
type AdminUser = User & { createdAt: string; deletedAt?: string | null }

interface Stats {
  users: number
  shops: number
  staff: number
  appointments: number
  reviews: number
  photos: number
  completedAppointments: number
  cancelledAppointments: number
}

interface Activity {
  recentAppts: Array<{ id: string; date: string; time: string; status: string; createdAt: string; customer?: { name: string }; shop?: { name: string }; service?: { name: string } }>
  recentReviews: Array<{ id: string; rating: number; comment?: string; createdAt: string; customer?: { name: string }; shop?: { name: string } }>
  recentUsers: Array<{ id: string; email: string; name: string; role: string; createdAt: string }>
}

export default function AdminDashboard() {
  const { user: me } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [activity, setActivity] = useState<Activity | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus>('active')
  const [loading, setLoading] = useState(true)
  const [toSuspend, setToSuspend] = useState<AdminUser | null>(null)
  const [toRestore, setToRestore] = useState<AdminUser | null>(null)
  const [toPermDelete, setToPermDelete] = useState<AdminUser | null>(null)
  const [toDemote, setToDemote] = useState<AdminUser | null>(null)
  const [toPromote, setToPromote] = useState<AdminUser | null>(null)
  const [working, setWorking] = useState(false)

  // "+ Add admin" modal
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [addAdminForm, setAddAdminForm] = useState({ email: '', name: '', password: '' })
  const [addAdminLoading, setAddAdminLoading] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')
  const [addAdminInfo, setAddAdminInfo] = useState('')

  const loadUsers = (s?: string, r?: string, st?: UserStatus) => {
    const roleParam = (r ?? roleFilter)
    const statusParam = (st ?? statusFilter)
    return api.get('/admin/users', { params: { search: s || search || undefined, role: roleParam || undefined, status: statusParam } }).then((u) => setUsers(u.data))
  }

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').then((r) => setStats(r.data)),
      api.get('/admin/activity').then((r) => setActivity(r.data)),
      loadUsers(),
    ]).finally(() => setLoading(false))
  }, [])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers()
  }

  const suspendNow = async () => {
    if (!toSuspend) return
    setWorking(true)
    try {
      await api.delete(`/admin/users/${toSuspend.id}`)
      if (statusFilter === 'active') {
        setUsers((prev) => prev.filter((u) => u.id !== toSuspend.id))
      } else {
        setUsers((prev) => prev.map((u) => u.id === toSuspend.id ? { ...u, deletedAt: new Date().toISOString() } : u))
      }
      setToSuspend(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not suspend user')
    } finally {
      setWorking(false)
    }
  }

  const restoreNow = async () => {
    if (!toRestore) return
    setWorking(true)
    try {
      await api.post(`/admin/users/${toRestore.id}/restore`)
      if (statusFilter === 'deleted') {
        setUsers((prev) => prev.filter((u) => u.id !== toRestore.id))
      } else {
        setUsers((prev) => prev.map((u) => u.id === toRestore.id ? { ...u, deletedAt: null } : u))
      }
      setToRestore(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not restore user')
    } finally {
      setWorking(false)
    }
  }

  const permDeleteNow = async () => {
    if (!toPermDelete) return
    setWorking(true)
    try {
      await api.delete(`/admin/users/${toPermDelete.id}/permanent`)
      setUsers((prev) => prev.filter((u) => u.id !== toPermDelete.id))
      setToPermDelete(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not permanently delete user')
    } finally {
      setWorking(false)
    }
  }

  const promoteNow = async () => {
    if (!toPromote) return
    setWorking(true)
    try {
      await api.post('/admin/admins', { email: toPromote.email })
      setUsers((prev) => prev.map((u) => u.id === toPromote.id ? { ...u, role: 'ADMIN' } : u))
      setToPromote(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not promote user')
    } finally {
      setWorking(false)
    }
  }

  const demoteNow = async () => {
    if (!toDemote) return
    setWorking(true)
    try {
      await api.post(`/admin/users/${toDemote.id}/demote`)
      setUsers((prev) => prev.map((u) => u.id === toDemote.id ? { ...u, role: 'CUSTOMER' } : u))
      setToDemote(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not demote user')
    } finally {
      setWorking(false)
    }
  }

  const submitAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddAdminError('')
    setAddAdminInfo('')

    if (!addAdminForm.email) { setAddAdminError('Email is required'); return }

    // If we're creating a new user (we'll detect server-side), password must be valid
    if (addAdminForm.password && !isPasswordValid(addAdminForm.password)) {
      setAddAdminError('Password does not meet the requirements')
      return
    }

    setAddAdminLoading(true)
    try {
      const payload: any = { email: addAdminForm.email }
      if (addAdminForm.password) payload.password = addAdminForm.password
      if (addAdminForm.name) payload.name = addAdminForm.name

      const { data } = await api.post('/admin/admins', payload)
      setAddAdminInfo(data.created
        ? `Created new admin: ${data.user.email}`
        : `Promoted existing user to admin: ${data.user.email}`)
      // Reload users list to reflect the change
      loadUsers()
      setAddAdminForm({ email: '', name: '', password: '' })
      // Auto-close after a short delay so they see the success msg
      setTimeout(() => { setShowAddAdmin(false); setAddAdminInfo('') }, 1800)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not add admin'
      // If server says password required, hint at that
      if (typeof msg === 'string' && msg.toLowerCase().includes('password is required')) {
        setAddAdminError(`${msg} — that email isn't registered yet, so enter a name + password to create the admin account.`)
      } else {
        setAddAdminError(typeof msg === 'string' ? msg : 'Could not add admin')
      }
    } finally {
      setAddAdminLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Admin dashboard</h1>
          <p className="text-gray-500 text-sm">Platform-wide overview & moderation</p>
        </div>
        <span className="badge bg-purple-100 text-purple-800 text-xs">ADMIN</span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Stat label="Users" value={stats.users} />
          <Stat label="Shops" value={stats.shops} />
          <Stat label="Barbers" value={stats.staff} />
          <Stat label="Appointments" value={stats.appointments} sub={`${stats.completedAppointments} completed`} />
          <Stat label="Reviews" value={stats.reviews} />
          <Stat label="Photos" value={stats.photos} />
          <Stat label="Cancelled" value={stats.cancelledAppointments} />
        </div>
      )}

      {/* Users table */}
      <div className="card p-5 mb-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900">Users</h2>
          <button onClick={() => { setShowAddAdmin(true); setAddAdminError(''); setAddAdminInfo('') }} className="btn-primary text-sm">+ Add admin</button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['active', 'deleted', 'all'] as UserStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); loadUsers(undefined, undefined, s) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s === 'active' ? 'Active' : s === 'deleted' ? '🚫 Suspended' : 'All'}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} className="flex gap-2 mb-3 flex-wrap">
          <input className="input flex-1 min-w-[160px]" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input max-w-[160px]" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); loadUsers(undefined, e.target.value) }}>
            <option value="">All roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="BARBER">Barber owner</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="btn-primary text-sm">Search</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Role</th>
                <th className="py-2 pr-2">Joined</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const suspended = !!u.deletedAt
                return (
                  <tr key={u.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${suspended ? 'opacity-60' : ''}`}>
                    <td className="py-2 pr-2 font-medium">{u.name}</td>
                    <td className="py-2 pr-2 text-gray-600">{u.email}</td>
                    <td className="py-2 pr-2">
                      <span className={`badge text-xs ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'BARBER' ? 'bg-blue-100 text-blue-800' : u.role === 'STAFF' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                    </td>
                    <td className="py-2 pr-2 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-2">
                      {suspended ? (
                        <span className="badge bg-amber-100 text-amber-800 text-xs">Suspended</span>
                      ) : (
                        <span className="badge bg-green-100 text-green-800 text-xs">Active</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {suspended ? (
                          <>
                            <button onClick={() => setToRestore(u)} className="text-xs text-green-600 hover:underline">Restore</button>
                            <button onClick={() => setToPermDelete(u)} className="text-xs text-red-700 hover:underline">Delete forever</button>
                          </>
                        ) : (
                          <>
                            {u.role === 'ADMIN' ? (
                              u.id === me?.id ? (
                                <span className="text-xs text-gray-400">You</span>
                              ) : (
                                <button onClick={() => setToDemote(u)} className="text-xs text-gray-500 hover:underline">Remove admin</button>
                              )
                            ) : (
                              <button onClick={() => setToPromote(u)} className="text-xs text-purple-600 hover:underline">Make admin</button>
                            )}
                            {u.id !== me?.id && <button onClick={() => setToSuspend(u)} className="text-xs text-amber-600 hover:underline">Suspend</button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-gray-400 text-center py-6 text-sm">No users match those filters.</p>}
        </div>
      </div>

      {/* Recent activity */}
      {activity && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Recent appointments</h2>
            <ul className="space-y-2 text-sm">
              {activity.recentAppts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span>{a.customer?.name} → {a.shop?.name} ({a.service?.name})</span>
                  <span className="text-xs text-gray-400">{a.status}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Recent signups</h2>
            <ul className="space-y-2 text-sm">
              {activity.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between">
                  <span>{u.name} <span className="text-gray-400 text-xs">({u.email})</span></span>
                  <span className="text-xs text-gray-400">{u.role}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5 md:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-3">Recent reviews</h2>
            <ul className="space-y-2 text-sm">
              {activity.recentReviews.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span className="shrink-0 text-yellow-500">{'★'.repeat(r.rating)}</span>
                  <span className="flex-1">
                    <span className="font-medium">{r.customer?.name}</span> on <span className="text-gray-600">{r.shop?.name}</span>
                    {r.comment && <span className="text-gray-500"> — "{r.comment}"</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Suspend (soft-delete) — reversible */}
      <ConfirmDialog
        open={!!toSuspend}
        title="Suspend this account?"
        message={toSuspend ? `${toSuspend.name} (${toSuspend.email}) will no longer be able to log in.\n\nAll their data is preserved and you can restore the account anytime from the "Suspended" tab.\n\nThis is reversible.` : undefined}
        confirmLabel="Suspend"
        tone="danger"
        loading={working}
        onConfirm={suspendNow}
        onCancel={() => setToSuspend(null)}
      />

      {/* Restore — confirm before re-enabling */}
      <ConfirmDialog
        open={!!toRestore}
        title="Restore this account?"
        message={toRestore ? `${toRestore.name} (${toRestore.email}) will be able to log in again. All their previous data is intact.` : undefined}
        confirmLabel="Restore"
        tone="primary"
        loading={working}
        onConfirm={restoreNow}
        onCancel={() => setToRestore(null)}
      />

      {/* Permanent delete — wipes data forever */}
      <ConfirmDialog
        open={!!toPermDelete}
        title="Permanently delete this account?"
        message={toPermDelete ? `⚠ This is IRREVERSIBLE.\n\n${toPermDelete.name} (${toPermDelete.email}) will be permanently wiped, along with:\n\n• Their appointments, reviews, photos and favorites\n${toPermDelete.role === 'BARBER' ? '• Their entire shop including services, offers, staff, and shop reviews\n' : ''}${toPermDelete.role === 'STAFF' ? '• Their staff profile, portfolio, and all reviews about them\n' : ''}\nThe email will become free for someone else to register with.\n\nIf you just want to disable login, use Suspend instead.` : undefined}
        confirmLabel="Yes, delete forever"
        tone="danger"
        loading={working}
        onConfirm={permDeleteNow}
        onCancel={() => setToPermDelete(null)}
      />

      {/* Promote to admin */}
      <ConfirmDialog
        open={!!toPromote}
        title="Make this user an admin?"
        message={toPromote ? `${toPromote.name} (${toPromote.email}) will gain full admin access — they will be able to manage all users, shops, and platform data.\n\nYou can revoke admin access at any time.` : undefined}
        confirmLabel="Yes, make admin"
        tone="primary"
        loading={working}
        onConfirm={promoteNow}
        onCancel={() => setToPromote(null)}
      />

      {/* Demote admin */}
      <ConfirmDialog
        open={!!toDemote}
        title="Remove admin access?"
        message={toDemote ? `${toDemote.name} (${toDemote.email}) will lose admin privileges and be moved to a regular Customer account.\n\nTheir other data is unchanged.` : undefined}
        confirmLabel="Remove admin"
        tone="danger"
        loading={working}
        onConfirm={demoteNow}
        onCancel={() => setToDemote(null)}
      />

      {/* Add admin modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !addAdminLoading && setShowAddAdmin(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-2">Add an admin</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the email of someone you want to make an admin.
              If they already have an account, they'll be promoted.
              If not, fill in a name + password to create them as an admin.
            </p>
            {addAdminError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">{addAdminError}</div>}
            {addAdminInfo && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-3">{addAdminInfo}</div>}
            <form onSubmit={submitAddAdmin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" className="input" value={addAdminForm.email} onChange={(e) => setAddAdminForm({ ...addAdminForm, email: e.target.value })} placeholder="admin@example.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (if creating new)</label>
                <input className="input" value={addAdminForm.name} onChange={(e) => setAddAdminForm({ ...addAdminForm, name: e.target.value })} placeholder="Full name" />
                <p className="text-xs text-gray-400 mt-1">Leave blank when promoting an existing user</p>
              </div>
              <PasswordField label="Password (if creating new)" value={addAdminForm.password} onChange={(v) => setAddAdminForm({ ...addAdminForm, password: v })} required={false} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddAdmin(false)} disabled={addAdminLoading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={addAdminLoading} className="flex-1 btn-primary text-sm">{addAdminLoading ? 'Working…' : 'Add admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card p-3">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs font-medium text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
