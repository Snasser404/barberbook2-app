import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { User } from '../../types'
import ConfirmDialog from '../../components/ConfirmDialog'

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
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [activity, setActivity] = useState<Activity | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadUsers = (s?: string, r?: string) => {
    const roleParam = (r ?? roleFilter)
    return api.get('/admin/users', { params: { search: s || search || undefined, role: roleParam || undefined } }).then((u) => setUsers(u.data))
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

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/admin/users/${toDelete.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== toDelete.id))
      setToDelete(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not delete user')
    } finally {
      setDeleting(false)
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
        <h2 className="font-semibold text-gray-900 mb-3">Users</h2>
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
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-2 pr-2 font-medium">{u.name}</td>
                  <td className="py-2 pr-2 text-gray-600">{u.email}</td>
                  <td className="py-2 pr-2">
                    <span className={`badge text-xs ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'BARBER' ? 'bg-blue-100 text-blue-800' : u.role === 'STAFF' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                  </td>
                  <td className="py-2 pr-2 text-gray-500 text-xs">{new Date((u as any).createdAt).toLocaleDateString()}</td>
                  <td className="py-2 pr-2 text-right">
                    <button onClick={() => setToDelete(u)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
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

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this user?"
        message={toDelete ? `Deleting ${toDelete.name} (${toDelete.email}) is permanent. They will not be able to recover the account.` : undefined}
        confirmLabel="Delete user"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
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
