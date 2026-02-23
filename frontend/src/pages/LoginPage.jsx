import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Leaf, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
      toast.success('Welcome back!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-forest-950 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-forest-500 rounded-xl flex items-center justify-center text-xl">
            🌳
          </div>
          <div>
            <div className="text-white font-display font-bold text-xl">Tree Tracker</div>
            <div className="text-forest-400 text-sm">Green Asset Management</div>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-display font-bold text-white leading-tight mb-6">
            Managing urban<br />greenery, digitally.
          </h1>
          <p className="text-forest-300 text-lg leading-relaxed">
            Track every tree from planting to maturity. Monitor health, schedule maintenance,
            and report survival rates — all from one dashboard.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { emoji: '🗺️', label: 'Map View', desc: 'Geo-tagged trees' },
              { emoji: '📋', label: 'Tasks', desc: 'Maintenance workflows' },
              { emoji: '📊', label: 'Reports', desc: 'Survival analytics' },
            ].map(f => (
              <div key={f.label} className="bg-forest-900 rounded-xl p-4">
                <div className="text-2xl mb-2">{f.emoji}</div>
                <div className="text-white text-sm font-medium">{f.label}</div>
                <div className="text-forest-400 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-forest-500 text-xs">
          Helping cities track and grow their urban forest
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="text-2xl">🌳</div>
            <span className="font-display font-bold text-xl text-forest-800">Tree Tracker</span>
          </div>

          <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Sign in</h2>
          <p className="text-gray-500 text-sm mb-8">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                type="text"
                placeholder="your.username"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-600 text-white py-2.5 rounded-lg font-medium
                         hover:bg-forest-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Demo credentials</div>
            <div className="space-y-1 text-xs text-gray-600">
              <div><span className="font-medium">Admin:</span> admin / admin123</div>
              <div><span className="font-medium">Supervisor:</span> supervisor1 / pass1234</div>
              <div><span className="font-medium">Field Worker:</span> worker1 / pass1234</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
