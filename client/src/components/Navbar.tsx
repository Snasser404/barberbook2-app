import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const links = !user
    ? null
    : user.role === 'BARBER'
      ? [
          { to: '/barber', label: 'Dashboard' },
          { to: '/barber/appointments', label: 'Appointments' },
          { to: '/profile', label: user.name },
        ]
      : user.role === 'STAFF'
        ? [
            { to: '/staff', label: 'Dashboard' },
            { to: '/profile', label: user.name },
          ]
        : [
            { to: '/bookings', label: 'My Bookings' },
            { to: '/my-photos', label: 'My Photos' },
            { to: '/favorites', label: 'Favorites' },
            { to: '/profile', label: user.name },
          ]

  return (
    <nav className="bg-primary text-white shadow-lg relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-accent shrink-0">
            <span className="text-2xl">✂</span>
            <span>BarberBook</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  Sign in
                </Link>
                <Link to="/register" className="bg-accent text-primary px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors">
                  Get started
                </Link>
              </>
            ) : (
              <>
                {links!.map((l) => (
                  <Link key={l.to} to={l.to} className="text-gray-300 hover:text-white text-sm transition-colors">{l.label}</Link>
                ))}
                <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm transition-colors">Logout</button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2 text-gray-300 hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-primary">
          <div className="px-4 py-3 space-y-1">
            {!user ? (
              <>
                <Link to="/login" className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white text-sm font-medium">
                  Sign in
                </Link>
                <Link to="/register" className="block px-3 py-2 rounded-lg bg-accent text-primary text-sm font-semibold text-center mt-2">
                  Get started
                </Link>
              </>
            ) : (
              <>
                {links!.map((l) => (
                  <Link key={l.to} to={l.to} className="block px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white text-sm">
                    {l.label}
                  </Link>
                ))}
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white text-sm">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
