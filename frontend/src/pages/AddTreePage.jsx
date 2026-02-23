import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Crosshair } from 'lucide-react'

export default function AddTreePage() {
  const navigate = useNavigate()
  const [zones, setZones] = useState([])
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({
    species: '',
    zone: '',
    latitude: '',
    longitude: '',
    location_description: '',
    planted_date: new Date().toISOString().split('T')[0],
    height_cm: '',
    current_health: 'healthy',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      api.get('/zones/').then(r => setZones(r.data.results || r.data)),
      api.get('/species/').then(r => setSpecies(r.data.results || r.data)),
    ])
  }, [])

  const getLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(p => ({
          ...p,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setLocating(false)
        toast.success('Location captured!')
      },
      () => {
        toast.error('Could not get location')
        setLocating(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '') formData.append(k, v)
      })
      const photo = document.querySelector('input[type="file"]')?.files?.[0]
      if (photo) formData.append('photo', photo)

      const res = await api.post('/trees/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Tree ${res.data.tag_number} registered!`)
      navigate(`/trees/${res.data.id}`)
    } catch (err) {
      const errors = err.response?.data
      if (errors) {
        const msg = Object.values(errors).flat().join(', ')
        toast.error(msg)
      } else {
        toast.error('Failed to register tree')
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (key, value) => setForm(p => ({ ...p, [key]: value }))

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-display font-bold text-gray-900 mb-1">Register New Tree</h1>
      <p className="text-gray-500 text-sm mb-6">Add a newly planted tree to the registry</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Species & Zone */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Species *</label>
            <select className="input" value={form.species} onChange={e => field('species', e.target.value)} required>
              <option value="">Select species</option>
              {species.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.common_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Zone *</label>
            <select className="input" value={form.zone} onChange={e => field('zone', e.target.value)} required>
              <option value="">Select zone</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="card p-4 bg-forest-50 border-forest-100">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 font-medium text-sm text-gray-700">
              <MapPin size={16} className="text-forest-600" />
              GPS Location *
            </label>
            <button
              type="button"
              onClick={getLocation}
              disabled={locating}
              className="btn-secondary text-xs py-1.5"
            >
              <Crosshair size={14} />
              {locating ? 'Locating...' : 'Use My Location'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Latitude</label>
              <input
                className="input"
                type="number"
                step="any"
                placeholder="12.9716"
                value={form.latitude}
                onChange={e => field('latitude', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label text-xs">Longitude</label>
              <input
                className="input"
                type="number"
                step="any"
                placeholder="77.5946"
                value={form.longitude}
                onChange={e => field('longitude', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="label text-xs">Location Description</label>
            <input
              className="input"
              placeholder="e.g. Near Gate 3, south side of the park"
              value={form.location_description}
              onChange={e => field('location_description', e.target.value)}
            />
          </div>
        </div>

        {/* Planting details */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Planted Date *</label>
            <input
              className="input"
              type="date"
              value={form.planted_date}
              onChange={e => field('planted_date', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input
              className="input"
              type="number"
              placeholder="120"
              value={form.height_cm}
              onChange={e => field('height_cm', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Initial Health</label>
            <select className="input" value={form.current_health} onChange={e => field('current_health', e.target.value)}>
              <option value="healthy">🟢 Healthy</option>
              <option value="at_risk">🟡 At Risk</option>
            </select>
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="label">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 
                       file:text-sm file:font-medium file:bg-forest-100 file:text-forest-700
                       hover:file:bg-forest-200"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Any observations about this tree..."
            value={form.notes}
            onChange={e => field('notes', e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Registering...' : '🌱 Register Tree'}
          </button>
        </div>
      </form>
    </div>
  )
}
