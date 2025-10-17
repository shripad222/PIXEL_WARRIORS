import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Login from './pages/Login'
import Register from './pages/Register'
import LandingPage from './pages/LandingPage'
import AuthorityPortal from './pages/AuthorityPortal'
import AuthorityLogin from './pages/AuthorityLogin'
import AuthorityRegister from './pages/AuthorityRegister'
import AuthorityDashboard from './pages/AuthorityDashboard'
import MigrateUser from './pages/MigrateUser'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from './AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Driver Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/driver"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          
          {/* Authority Routes */}
          <Route path="/authority-portal" element={<AuthorityPortal />} />
          <Route path="/authority-login" element={<AuthorityLogin />} />
          <Route path="/authority-register" element={<AuthorityRegister />} />
          <Route
            path="/authority-dashboard"
            element={
              <ProtectedRoute>
                <AuthorityDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Migration Tool (for fixing existing users) */}
          <Route path="/migrate-user" element={<MigrateUser />} />
        </Routes>
      </AuthProvider>
    </Router>
  </StrictMode>,
)
