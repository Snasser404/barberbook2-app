import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import VerifyEmailBanner from './components/VerifyEmailBanner'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ShopDetail from './pages/ShopDetail'
import BookAppointment from './pages/BookAppointment'
import CustomerBookings from './pages/CustomerBookings'
import CustomerProfile from './pages/CustomerProfile'
import Favorites from './pages/Favorites'
import StaffProfile from './pages/StaffProfile'
import MyPhotos from './pages/MyPhotos'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import BarberDashboard from './pages/barber/BarberDashboard'
import ManageShop from './pages/barber/ManageShop'
import ManageServices from './pages/barber/ManageServices'
import ManageOffers from './pages/barber/ManageOffers'
import ManageAppointments from './pages/barber/ManageAppointments'
import ManageStaff from './pages/barber/ManageStaff'
import StaffDashboard from './pages/staff/StaffDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

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
      <VerifyEmailBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
          <Route path="/shops/:id" element={<ShopDetail />} />
          <Route path="/staff/:id" element={<StaffProfile />} />
          <Route path="/shops/:id/book" element={<ProtectedRoute role="CUSTOMER"><BookAppointment /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute role="CUSTOMER"><CustomerBookings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute role="CUSTOMER"><Favorites /></ProtectedRoute>} />
          <Route path="/my-photos" element={<ProtectedRoute role="CUSTOMER"><MyPhotos /></ProtectedRoute>} />
          <Route path="/barber" element={<ProtectedRoute role="BARBER"><BarberDashboard /></ProtectedRoute>} />
          <Route path="/barber/shop" element={<ProtectedRoute role="BARBER"><ManageShop /></ProtectedRoute>} />
          <Route path="/barber/services" element={<ProtectedRoute role="BARBER"><ManageServices /></ProtectedRoute>} />
          <Route path="/barber/offers" element={<ProtectedRoute role="BARBER"><ManageOffers /></ProtectedRoute>} />
          <Route path="/barber/appointments" element={<ProtectedRoute role="BARBER"><ManageAppointments /></ProtectedRoute>} />
          <Route path="/barber/staff" element={<ProtectedRoute role="BARBER"><ManageStaff /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute role="STAFF"><StaffDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
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
