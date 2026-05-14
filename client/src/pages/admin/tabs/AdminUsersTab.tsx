import { useState, useEffect } from 'react'
import api from '../../../api/client'
import { User } from '../../../types'
import ConfirmDialog from '../../../components/ConfirmDialog'
import PasswordField, { isPasswordValid } from '../../../components/PasswordField'
import { useAuth } from '../../../context/AuthContext'

type UserStatus = 'active' | 'deleted' | 'all'
type AdminUser = User & { createdAt: string; deletedAt?: string | null; isSuperAdmin?: boolean }

export default function AdminUsersTab() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus>('active')
  const [loading, setLoading] = useState(true)
  const [toSuspend, setToSuspend] = useState<AdminUser | null>(null)
  const [toRestore, setToRestore] = useState<AdminUser | null>(null)
  const [toPermDelete, setToPermDelete] = useState<AdminUser | null>(null)
  const [toDemote, setToDemote] = useState<AdminUser | null>(null)
  const [toPromote, setToPromote] = useState<AdminUser | null>(null)
  const [working, setWorking] = useState(false)

  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [addForm, setAddForm] = useState({ email: '', name: '', password: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addInfo, setAddInfo] = useState('')

  const load = (s?: string, r?: string, st?: UserStatus) => {
    setLoading(true)
    const roleParam = r ?? roleFilter
    const statusParam = st ?? statusFilter
    return api.get('/admin/users', { params: { search: s || search || undefined, role: roleParam || undefined, status: statusParam } })
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); load() }

  const suspendNow = async () => {
    if (!toSuspend) return
    setWorking(true)
    try {
      await api.delete(`/admin/users/${toSuspend.id}`)
      if (statusFilter === 'active') setUsers((p) => p.filter((u) => u.id !== toSuspend.id))
      else setUsers((p) => p.map((u) => u.id === toSuspend.id ? { ...u, deletedAt: new Date().toISOString() } : u))
      setToSuspend(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }
  const restoreNow = async () => {
    if (!toRestore) return
    setWorking(true)
    try {
      await api.post(`/admin/users/${toRestore.id}/restore`)
      if (statusFilter === 'deleted') setUsers((p) => p.filter((u) => u.id !== toRestore.id))
      else setUsers((p) => p.map((u) => u.id === toRestore.id ? { ...u, deletedAt: null } : u))
      setToRestore(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }
  const permDeleteNow = async () => {
    if (!toPermDelete) return
    setWorking(true)
    try {
      await api.delete(`/admin/users/${toPermDelete.id}/permanent`)
      setUsers((p) => p.filter((u) => u.id !== toPermDelete.id))
      setToPermDelete(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }
  const promoteNow = async () => {
    if (!toPromote) return
    setWorking(true)
    try {
      await api.post('/admin/admins', { email: toPromote.email })
      setUsers((p) => p.map((u) => u.id === toPromote.id ? { ...u, role: 'ADMIN' } : u))
      setToPromote(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }
  const demoteNow = async () => {
    if (!toDemote) return
    setWorking(true)
    try {
      await api.post(`/admin/users/${toDemote.id}/demote`)
      setUsers((p) => p.map((u) => u.id === toDemote.id ? { ...u, role: 'CUSTOMER' } : u))
      setToDemote(null)
    } catch (err: any) { alert(err.response?.data?.error || 'Failed') } finally { setWorking(false) }
  }
  const submitAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(''); setAddInfo('')
    if (!addForm.email) { setAddError('Email is required'); return }
    if (addForm.password && !isPasswordValid(addForm.password)) { setAddError('Password does not meet the requirements'); return }
    setAddLoading(true)
    try {
      const payload: any = { email: addForm.email }
      if (addForm.password) payload.password = addForm.password
      if (addForm.name) payload.name = addForm.name
      const { data } = await api.post('/admin/admins', payload)
      setAddInfo(data.created ? `Created new admin: ${data.user.email}` : `Promoted: ${data.user.email}`)
      load()
      setAddForm({ email: '', name: '', password: '' })
      setTimeout(() => { setShowAddAdmin(false); setAddInfo('') }, 1500)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed'
      setAddError(typeof msg === 'string' ? msg : 'Failed')
    } finally { setAddLoading(false) }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold text-gray-900">Users</h2>
        <button onClick={() => { setShowAddAdmin(true); setAddError(''); setAddInfo('') }} className="btn-primary text-sm">+ Add admin</button>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {(['active', 'deleted', 'all'] as UserStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); load(undefined, undefined, s) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s === 'active' ? 'Active' : s === 'deleted' ? '🚫 Suspended' : 'All'}
          </button>
        ))}
      </div>

      <form onSubmit={onSearch} className="flex gap-2 mb-3 flex-wrap">
        <input className="input flex-1 min-w-[160px]" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[160px]" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); load(undefined, e.target.value) }}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="BARBER">Barber owner</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Search</button>
      </form>

      {loading ? <p className="text-gray-400 text-sm py-4 text-center">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Email</th><th className="py-2 pr-2">Role</th><th className="py-2 pr-2">Joined</th><th className="py-2 pr-2">Status</th><th className="py-2 pr-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const suspended = !!u.deletedAt
                const isProtected = !!u.isSuperAdmin
                return (
                  <tr key={u.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${suspended ? 'opacity-60' : ''}`}>
                    <td className="py-2 pr-2 font-medium">{u.name} {isProtected && <span className="badge bg-purple-100 text-purple-800 text-xs ml-1">SUPER</span>}</td>
                    <td className="py-2 pr-2 text-gray-600">{u.email}</td>
                    <td className="py-2 pr-2">
                      <span className={`badge text-xs ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'BARBER' ? 'bg-blue-100 text-blue-800' : u.role === 'STAFF' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                    </td>
                    <td className="py-2 pr-2 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-2">{suspended ? <span className="badge bg-amber-100 text-amber-800 text-xs">Suspended</span> : <span className="badge bg-green-100 text-green-800 text-xs">Active</span>}</td>
                    <td className="py-2 pr-2 text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {isProtected ? (
                          <span className="text-xs text-gray-400 italic">protected</span>
                        ) : suspended ? (
                          <>
                            <button onClick={() => setToRestore(u)} className="text-xs text-green-600 hover:underline">Restore</button>
                            <button onClick={() => setToPermDelete(u)} className="text-xs text-red-700 hover:underline">Delete forever</button>
                          </>
                        ) : (
                          <>
                            {u.role === 'ADMIN'
                              ? (u.id === me?.id ? <span className="text-xs text-gray-400">You</span> : <button onClick={() => setToDemote(u)} className="text-xs text-gray-500 hover:underline">Remove admin</button>)
                              : <button onClick={() => setToPromote(u)} className="text-xs text-purple-600 hover:underline">Make admin</button>}
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
      )}

      <ConfirmDialog open={!!toSuspend} title="Suspend this account?" message={toSuspend ? `${toSuspend.name} (${toSuspend.email}) will no longer be able to log in.\n\nAll their data is preserved and you can restore the account anytime from the "Suspended" tab.\n\nThis is reversible.` : undefined} confirmLabel="Suspend" tone="danger" loading={working} onConfirm={suspendNow} onCancel={() => setToSuspend(null)} />
      <ConfirmDialog open={!!toRestore} title="Restore this account?" message={toRestore ? `${toRestore.name} (${toRestore.email}) will be able to log in again.` : undefined} confirmLabel="Restore" tone="primary" loading={working} onConfirm={restoreNow} onCancel={() => setToRestore(null)} />
      <ConfirmDialog open={!!toPermDelete} title="Permanently delete this account?" message={toPermDelete ? `⚠ IRREVERSIBLE.\n\n${toPermDelete.name} (${toPermDelete.email}) will be permanently wiped along with all their data.\n\nThe email will become free for someone else to register with.` : undefined} confirmLabel="Yes, delete forever" tone="danger" loading={working} onConfirm={permDeleteNow} onCancel={() => setToPermDelete(null)} />
      <ConfirmDialog open={!!toPromote} title="Make this user an admin?" message={toPromote ? `${toPromote.name} (${toPromote.email}) will gain full admin access. You can revoke any time.` : undefined} confirmLabel="Yes, make admin" tone="primary" loading={working} onConfirm={promoteNow} onCancel={() => setToPromote(null)} />
      <ConfirmDialog open={!!toDemote} title="Remove admin access?" message={toDemote ? `${toDemote.name} (${toDemote.email}) will lose admin privileges.` : undefined} confirmLabel="Remove admin" tone="danger" loading={working} onConfirm={demoteNow} onCancel={() => setToDemote(null)} />

      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !addLoading && setShowAddAdmin(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary mb-2">Add an admin</h3>
            <p className="text-sm text-gray-600 mb-4">Existing user → promoted. New email → account created with the password you choose.</p>
            {addError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">{addError}</div>}
            {addInfo && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-3">{addInfo}</div>}
            <form onSubmit={submitAddAdmin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" className="input" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (if creating new)</label>
                <input className="input" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Full name" />
              </div>
              <PasswordField label="Password (if creating new)" value={addForm.password} onChange={(v) => setAddForm({ ...addForm, password: v })} required={false} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddAdmin(false)} disabled={addLoading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary text-sm">{addLoading ? 'Working…' : 'Add admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
