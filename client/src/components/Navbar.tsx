import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-accent">
            <span className="text-2xl">✂</span>
            <span>BarberBook</span>
          </Link>

          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  Sign in
                </Link>
                <Link to="/register" className="bg-accent text-primary px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors">
                  Get started
                </Link>
              </>
            ) : user.role === 'BARBER' ? (
              <>
                <Link to="/barber" className="text-gray-300 hover:text-white text-sm">Dashboard</Link>
                <Link to="/barber/appointments" className="text-gray-300 hover:text-white text-sm">Appointments</Link>
                <Link to="/profile" className="text-gray-300 hover:text-white text-sm">{user.name}</Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">Logout</button>
              </>
            ) : (
              <>
                <Link to="/bookings" className="text-gray-300 hover:text-white text-sm">My Bookings</Link>
                <Link to="/favorites" className="text-gray-300 hover:text-white text-sm">Favorites</Link>
                <Link to="/profile" className="text-gray-300 hover:text-white text-sm">{user.name}</Link>
                <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm">Logout</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
