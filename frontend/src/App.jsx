import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import TreesPage from './pages/TreesPage'
import TreeDetailPage from './pages/TreeDetailPage'
import TasksPage from './pages/TasksPage'
import ZonesPage from './pages/ZonesPage'
import ReportsPage from './pages/ReportsPage'
import AddTreePage from './pages/AddTreePage'
import AIAssistantPage from './pages/AIAssistantPage'
import SatelliteDetectionPage from './pages/SatelliteDetectionPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-forest-50">
      <div className="text-center">
        <div className="text-5xl mb-4">🌳</div>
        <div className="text-forest-700 font-medium">Loading Tree Tracker...</div>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
                  <Layout />
              </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="trees" element={<TreesPage />} />
        <Route path="trees/add" element={<AddTreePage />} />
        <Route path="trees/:id" element={<TreeDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="zones" element={<ZonesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="satellite" element={<SatelliteDetectionPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a1a', color: '#fff', borderRadius: '10px' },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
