import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link } from 'react-router-dom'
import { MapPin, Trees, TrendingUp, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ZonesPage() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuth()

  const fetchZones = () => {
    api.get('/zones/').then(r => setZones(r.data.results || r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchZones() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-bounce">🗺️</div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Zones</h1>
          <p className="text-gray-500 text-sm mt-1">{zones.length} city zones</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} />
            Add Zone
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map(zone => (
          <ZoneCard key={zone.id} zone={zone} />
        ))}
      </div>

      {showCreate && (
        <CreateZoneModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchZones() }}
        />
      )}
    </div>
  )
}

function ZoneCard({ zone }) {
  const survivalRate = zone.survival_rate || 0
  const barColor = survivalRate >= 70 ? 'bg-green-500' : survivalRate >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{zone.name}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <MapPin size={11} />
            {zone.city}
          </div>
        </div>
        <div className="text-2xl">🌿</div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Total Trees" value={zone.tree_count || 0} />
        <Stat label="Healthy" value={zone.healthy_count || 0} color="text-green-600" />
        <Stat label="Area" value={`${zone.area_sq_km} km²`} />
        <Stat label="Survival" value={`${survivalRate}%`} color={survivalRate >= 70 ? 'text-green-600' : 'text-amber-600'} />
      </div>

      {/* Survival bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Survival Rate</span>
          <span>{survivalRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${barColor} transition-all`}
            style={{ width: `${survivalRate}%` }}
          />
        </div>
      </div>

      <Link
        to={`/trees?zone=${zone.id}`}
        className="text-forest-600 text-sm hover:underline font-medium"
      >
        View all trees →
      </Link>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${color || 'text-gray-800'}`}>{value}</div>
    </div>
  )
}

function CreateZoneModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', city: '', center_lat: '', center_lng: '', area_sq_km: '', description: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/zones/', form)
      toast.success('Zone created!')
      onCreated()
    } catch {
      toast.error('Failed to create zone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-display font-bold text-lg mb-4">Create Zone</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Zone Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">City *</label>
              <input className="input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Center Lat</label>
              <input className="input" type="number" step="any" value={form.center_lat} onChange={e => setForm(p => ({ ...p, center_lat: e.target.value }))} />
            </div>
            <div>
              <label className="label">Center Lng</label>
              <input className="input" type="number" step="any" value={form.center_lng} onChange={e => setForm(p => ({ ...p, center_lng: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Area (km²)</label>
            <input className="input" type="number" step="any" value={form.area_sq_km} onChange={e => setForm(p => ({ ...p, area_sq_km: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating...' : 'Create Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
