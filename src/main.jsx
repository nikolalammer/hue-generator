import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Dashboard from './Dashboard.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HuePage from './pages/HuePage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Schüler-App – öffentlich zugänglich */}
        <Route path="/" element={<App />} />

        {/* Anmeldeseite für Lehrpersonen */}
        <Route path="/login" element={<LoginPage />} />

        {/* Schüler-Ansicht – HÜ per Link abrufen und lösen */}
        <Route path="/hue/:id" element={<HuePage />} />

        {/* Lehrer-Dashboard – nur für angemeldete Nutzer */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
