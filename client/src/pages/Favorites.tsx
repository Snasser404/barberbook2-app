import { useState, useEffect } from 'react'
import api from '../api/client'
import { BarberShop } from '../types'
import ShopCard from '../components/ShopCard'

export default function Favorites() {
  const [shops, setShops] = useState<BarberShop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/favorites').then((r) => setShops(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-primary mb-6">Saved Barbershops</h1>
      {shops.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">♡</p>
          <p className="font-medium">No saved shops yet</p>
          <p className="text-sm mt-1">Tap the heart on any shop to save it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      )}
    </div>
  )
}
