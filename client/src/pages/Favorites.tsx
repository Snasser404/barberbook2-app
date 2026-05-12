import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { BarberShop, Staff } from '../types'
import ShopCard from '../components/ShopCard'
import StarRating from '../components/StarRating'

type Tab = 'shops' | 'barbers'

export default function Favorites() {
  const [shops, setShops] = useState<BarberShop[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('shops')

  useEffect(() => {
    Promise.all([
      api.get('/favorites').then((r) => setShops(r.data)),
      api.get('/staff-favorites').then((r) => setStaff(r.data)).catch(() => setStaff([])),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-4">My favorites</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setTab('shops')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'shops' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          🏪 Shops <span className="opacity-70 ml-1">({shops.length})</span>
        </button>
        <button
          onClick={() => setTab('barbers')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === 'barbers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          💈 Barbers <span className="opacity-70 ml-1">({staff.length})</span>
        </button>
      </div>

      {tab === 'shops' && (
        shops.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">♡</p>
            <p className="font-medium">No saved shops yet</p>
            <p className="text-sm mt-1">Tap the heart on any shop to save it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        )
      )}

      {tab === 'barbers' && (
        staff.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">♡</p>
            <p className="font-medium">No saved barbers yet</p>
            <p className="text-sm mt-1">Tap the heart on any barber's profile to save them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((s) => (
              <Link key={s.id} to={`/staff/${s.id}`} className="card p-4 hover:shadow-md transition-shadow flex items-start gap-3">
                {s.avatar ? (
                  <img src={s.avatar} alt={s.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary text-accent flex items-center justify-center text-xl font-bold shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  {s.shop && <p className="text-xs text-gray-500">at {s.shop.name}</p>}
                  <div className="flex items-center gap-1.5 mt-1">
                    <StarRating rating={Math.round(s.rating)} size="sm" />
                    <span className="text-xs text-gray-500">{s.rating.toFixed(1)} ({s.reviewCount})</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
