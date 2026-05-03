import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import { BarberShop } from '../types'
import ShopCard from '../components/ShopCard'
import { haversineKm } from '../lib/distance'

type SortMode = 'rating' | 'distance'
type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'

export default function Home() {
  const [shops, setShops] = useState<BarberShop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [minRating, setMinRating] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('rating')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')

  const fetchShops = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/shops', { params: { search: search || undefined, minRating: minRating || undefined } })
      setShops(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchShops() }, [])

  // Try to silently use cached location on mount
  useEffect(() => {
    const cached = localStorage.getItem('userLocation')
    if (cached) {
      try {
        const { lat, lng, ts } = JSON.parse(cached)
        // Use cached location if less than 1 hour old
        if (Date.now() - ts < 60 * 60 * 1000) {
          setUserLocation({ lat, lng })
          setLocationStatus('granted')
          setSortMode('distance')
        }
      } catch {}
    }
  }, [])

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported')
      return
    }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setLocationStatus('granted')
        setSortMode('distance')
        localStorage.setItem('userLocation', JSON.stringify({ ...loc, ts: Date.now() }))
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchShops()
  }

  // Compute shops with distance + sort
  const sortedShops = useMemo(() => {
    const withDistance = shops.map((shop) => {
      let distanceKm: number | null = null
      if (userLocation && shop.latitude != null && shop.longitude != null) {
        distanceKm = haversineKm(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude)
      }
      return { ...shop, distanceKm }
    })

    if (sortMode === 'distance' && userLocation) {
      return [...withDistance].sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })
    }
    return [...withDistance].sort((a, b) => b.rating - a.rating)
  }, [shops, userLocation, sortMode])

  return (
    <div>
      {/* Hero */}
      <div className="bg-primary text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">Find your perfect barber</h1>
          <p className="text-gray-300 text-lg mb-8">Browse local barbershops, compare prices, and book instantly</p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <input
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Search by name or area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="bg-accent text-primary px-6 py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Location prompt */}
      {locationStatus !== 'granted' && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-semibold text-blue-900">Find barbers near you</p>
                <p className="text-sm text-blue-700">
                  {locationStatus === 'denied' && 'Location access was denied. Enable it in your browser to see nearby shops.'}
                  {locationStatus === 'unsupported' && 'Your browser does not support location services.'}
                  {(locationStatus === 'idle' || locationStatus === 'loading') && 'Allow location access to sort shops by distance'}
                </p>
              </div>
            </div>
            <button
              onClick={requestLocation}
              disabled={locationStatus === 'loading' || locationStatus === 'unsupported'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {locationStatus === 'loading' ? 'Locating...' : locationStatus === 'denied' ? 'Try again' : 'Use my location'}
            </button>
          </div>
        </div>
      )}

      {/* Filters + Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-xl font-semibold text-gray-800">
            {loading ? 'Loading...' : `${sortedShops.length} barbershop${sortedShops.length !== 1 ? 's' : ''} found`}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {userLocation && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSortMode('distance')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${sortMode === 'distance' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  📍 Nearest
                </button>
                <button
                  onClick={() => setSortMode('rating')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${sortMode === 'rating' ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  ⭐ Top rated
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Min rating:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={minRating}
                onChange={(e) => { setMinRating(e.target.value); setTimeout(fetchShops, 0) }}
              >
                <option value="">Any</option>
                <option value="3">3+ ★</option>
                <option value="4">4+ ★</option>
                <option value="4.5">4.5+ ★</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedShops.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">✂</p>
            <p className="text-xl font-medium">No barbershops found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedShops.map((shop) => <ShopCard key={shop.id} shop={shop} distanceKm={shop.distanceKm} />)}
          </div>
        )}
      </div>
    </div>
  )
}
