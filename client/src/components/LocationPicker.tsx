// Interactive Google Maps location picker.
// User can search an address (Places autocomplete), click anywhere on the
// map, or drag the marker. All three actions keep address + lat/lng in sync.
import { useRef, useState, useCallback, useEffect } from 'react'
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api'

const LIBRARIES: ('places')[] = ['places']

interface Props {
  initialLat?: number | null
  initialLng?: number | null
  initialAddress?: string
  onChange: (loc: { lat: number; lng: number; address: string }) => void
}

const containerStyle = { width: '100%', height: '280px', borderRadius: '0.75rem' }
const defaultCenter = { lat: 40.7128, lng: -74.0060 } // NYC fallback

export default function LocationPicker({ initialLat, initialLng, initialAddress, onChange }: Props) {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: LIBRARIES,
  })

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  )
  const [address, setAddress] = useState(initialAddress || '')
  const [mapCenter, setMapCenter] = useState(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : defaultCenter
  )
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Reverse geocode (map click → address)
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!window.google?.maps) return ''
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address)
        } else {
          resolve('')
        }
      })
    })
  }, [])

  const updateLocation = useCallback(async (lat: number, lng: number, providedAddress?: string) => {
    setMarker({ lat, lng })
    setMapCenter({ lat, lng })
    const addr = providedAddress ?? (await reverseGeocode(lat, lng))
    setAddress(addr)
    onChange({ lat, lng, address: addr })
  }, [onChange, reverseGeocode])

  // Autocomplete: user picked a place
  const onPlaceChanged = () => {
    if (!autocompleteRef.current) return
    const place = autocompleteRef.current.getPlace()
    if (!place?.geometry?.location) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    updateLocation(lat, lng, place.formatted_address || place.name || '')
  }

  // "Use my current location" — browser geolocation
  const useMyLocation = () => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition((pos) => {
      updateLocation(pos.coords.latitude, pos.coords.longitude)
    })
  }

  // Try to geocode any initialAddress so the map opens centered on the shop
  useEffect(() => {
    if (initialLat != null && initialLng != null) return
    if (!initialAddress || !window.google?.maps) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: initialAddress }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        setMapCenter({ lat: loc.lat(), lng: loc.lng() })
      }
    })
  }, [isLoaded, initialAddress, initialLat, initialLng])

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Map picker unavailable</p>
        <p>Google Maps API key isn't configured. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in the build env to enable.</p>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load Google Maps. Check the API key restrictions and that the Maps JavaScript, Places, and Geocoding APIs are enabled.
      </div>
    )
  }
  if (!isLoaded) {
    return <div className="h-[280px] rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Loading map…</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Autocomplete
          onLoad={(ac) => { autocompleteRef.current = ac }}
          onPlaceChanged={onPlaceChanged}
          options={{ fields: ['geometry', 'formatted_address', 'name'] }}
          className="flex-1"
        >
          <input
            type="text"
            placeholder="Search for an address…"
            className="input"
            defaultValue={initialAddress}
          />
        </Autocomplete>
        <button type="button" onClick={useMyLocation} className="btn-outline text-sm whitespace-nowrap">
          📍 My location
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={marker ? 16 : 12}
        onClick={(e) => {
          if (e.latLng) updateLocation(e.latLng.lat(), e.latLng.lng())
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {marker && (
          <Marker
            position={marker}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) updateLocation(e.latLng.lat(), e.latLng.lng())
            }}
          />
        )}
      </GoogleMap>

      {marker ? (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          ✓ <span className="font-semibold">Pinned</span> at {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
          {address && <div className="text-gray-700 mt-0.5">{address}</div>}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Search for an address above, click anywhere on the map, or use "My location".</p>
      )}
    </div>
  )
}
