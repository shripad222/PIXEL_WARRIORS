import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './ProtectedRoute'
import { AuthProvider } from './AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <Routes>
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
          <Route path="/" element={<Navigate to="/driver" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  </StrictMode>,
)
