import { useState, useEffect } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import AdminVerifications from '../../components/AdminVerifications'
import AdminUsersTab from './tabs/AdminUsersTab'
import AdminShopsTab from './tabs/AdminShopsTab'
import AdminReviewsTab from './tabs/AdminReviewsTab'
import AdminAuditTab from './tabs/AdminAuditTab'
import AdminSupportTab from './tabs/AdminSupportTab'

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

type Tab = 'overview' | 'verifications' | 'users' | 'shops' | 'reviews' | 'audit' | 'support'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overview', label: 'Overview', emoji: '📊' },
  { key: 'verifications', label: 'Verifications', emoji: '🛡' },
  { key: 'users', label: 'Users', emoji: '👥' },
  { key: 'shops', label: 'Shops', emoji: '🏪' },
  { key: 'reviews', label: 'Reviews', emoji: '⭐' },
  { key: 'support', label: 'Support', emoji: '💬' },
  { key: 'audit', label: 'Audit log', emoji: '📜' },
]

export default function AdminDashboard() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [pendingVerCount, setPendingVerCount] = useState(0)
  const [openTicketCount, setOpenTicketCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').then((r) => setStats(r.data)),
      api.get('/admin/verifications/pending-count').then((r) => setPendingVerCount(r.data.count)).catch(() => {}),
      api.get('/admin/support-tickets', { params: { status: 'OPEN' } }).then((r) => setOpenTicketCount(r.data.length)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-primary">Admin dashboard</h1>
          <p className="text-gray-500 text-sm">
            Platform-wide overview &amp; moderation
            {me?.isSuperAdmin && <span className="ml-2 badge bg-purple-100 text-purple-800 text-xs">SUPER ADMIN</span>}
          </p>
        </div>
        <span className="badge bg-purple-100 text-purple-800 text-xs">ADMIN</span>
      </div>

      {/* Tab nav */}
      <div className="overflow-x-auto -mx-4 px-4 mb-6">
        <div className="flex gap-1 min-w-max border-b border-gray-200">
          {TABS.map((t) => {
            const badge =
              t.key === 'verifications' && pendingVerCount > 0 ? pendingVerCount :
              t.key === 'support' && openTicketCount > 0 ? openTicketCount : 0
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                <span className="mr-1">{t.emoji}</span>
                {t.label}
                {badge > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs font-semibold rounded-full px-1.5 py-0.5">{badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} />}
      {tab === 'verifications' && <AdminVerifications />}
      {tab === 'users' && <AdminUsersTab />}
      {tab === 'shops' && <AdminShopsTab />}
      {tab === 'reviews' && <AdminReviewsTab />}
      {tab === 'support' && <AdminSupportTab />}
      {tab === 'audit' && <AdminAuditTab />}
    </div>
  )
}

function OverviewTab({ stats }: { stats: Stats | null }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Users" value={stats.users} />
      <Stat label="Shops" value={stats.shops} />
      <Stat label="Barbers" value={stats.staff} />
      <Stat label="Appointments" value={stats.appointments} sub={`${stats.completedAppointments} completed`} />
      <Stat label="Reviews" value={stats.reviews} />
      <Stat label="Photos" value={stats.photos} />
      <Stat label="Cancelled" value={stats.cancelledAppointments} />
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
