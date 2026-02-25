import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Map, TreePine, ClipboardList,
  MapPin, BarChart3, LogOut, Menu, X,
  Sparkles, ScanSearch
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/map', icon: Map, label: 'Map View' },
  { to: '/trees', icon: TreePine, label: 'Trees' },
  { to: '/tasks', icon: ClipboardList, label: 'Tasks' },
  { to: '/zones', icon: MapPin, label: 'Zones' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/ai', icon: Sparkles, label: 'AI Assistant' },
  { to: '/satellite', icon: ScanSearch, label: 'Satellite Detect' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-forest-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-forest-400 flex items-center justify-center">
            <TreePine size={18} className="text-forest-900" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Tree Tracker</div>
            <div className="text-forest-400 text-xs">Green Asset Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative
              ${isActive
                ? 'bg-forest-600 text-white'
                : 'text-forest-300 hover:bg-forest-700 hover:text-white'}`
            }
          >
            <Icon size={18} />
            {label}
            {/* Notification badge on Activity */}
            {label === 'Live Activity' && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {/* Live indicator */}
            {label === 'Live Activity' && (
              <span className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-forest-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-forest-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.username}</div>
            <div className="text-forest-400 text-xs capitalize">{user?.role}</div>
          </div>
          {connected
            ? <Wifi size={12} className="text-green-400 shrink-0" />
            : <WifiOff size={12} className="text-gray-500 shrink-0" />
          }
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-forest-300 hover:bg-forest-700 hover:text-white text-sm transition-all">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-56 bg-forest-900 flex-col shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 bg-forest-900">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={22} className="text-gray-600" />
          </button>
          <span className="font-semibold text-forest-800">Tree Tracker</span>
                  </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
