import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ShopDetail from './pages/ShopDetail'
import BookAppointment from './pages/BookAppointment'
import CustomerBookings from './pages/CustomerBookings'
import CustomerProfile from './pages/CustomerProfile'
import Favorites from './pages/Favorites'
import BarberDashboard from './pages/barber/BarberDashboard'
import ManageShop from './pages/barber/ManageShop'
import ManageServices from './pages/barber/ManageServices'
import ManageOffers from './pages/barber/ManageOffers'
import ManageAppointments from './pages/barber/ManageAppointments'

function ProtectedRoute({ children, role }: { children: JSX.Element; role?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/shops/:id" element={<ShopDetail />} />
          <Route path="/shops/:id/book" element={<ProtectedRoute role="CUSTOMER"><BookAppointment /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute role="CUSTOMER"><CustomerBookings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute role="CUSTOMER"><Favorites /></ProtectedRoute>} />
          <Route path="/barber" element={<ProtectedRoute role="BARBER"><BarberDashboard /></ProtectedRoute>} />
          <Route path="/barber/shop" element={<ProtectedRoute role="BARBER"><ManageShop /></ProtectedRoute>} />
          <Route path="/barber/services" element={<ProtectedRoute role="BARBER"><ManageServices /></ProtectedRoute>} />
          <Route path="/barber/offers" element={<ProtectedRoute role="BARBER"><ManageOffers /></ProtectedRoute>} />
          <Route path="/barber/appointments" element={<ProtectedRoute role="BARBER"><ManageAppointments /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
