import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Calendar, Ruler, Tag, User, Edit2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function TreeDetailPage() {
  const { id } = useParams()
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [healthForm, setHealthForm] = useState({ health_status: '', notes: '' })
  const [showHealthModal, setShowHealthModal] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get(`/trees/${id}/`).then(r => {
      setTree(r.data)
      setHealthForm(p => ({ ...p, health_status: r.data.current_health }))
    }).finally(() => setLoading(false))
  }, [id])

  const updateHealth = async () => {
    setUpdating(true)
    try {
      const res = await api.patch(`/trees/${id}/health/`, healthForm)
      setTree(res.data)
      setShowHealthModal(false)
      toast.success('Health status updated!')
    } catch (e) {
      toast.error('Failed to update health')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-bounce">🌳</div>
    </div>
  )

  if (!tree) return (
    <div className="p-6 text-center text-gray-500">Tree not found.</div>
  )

  const healthColor = {
    healthy: 'bg-green-100 text-green-800 border-green-200',
    at_risk: 'bg-amber-100 text-amber-800 border-amber-200',
    dead: 'bg-red-100 text-red-800 border-red-200',
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6">
        <ArrowLeft size={16} />
        Back to trees
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Photo + key info */}
        <div className="space-y-4">
          {/* Photo */}
          <div className="card overflow-hidden">
            <div className="h-56 bg-forest-50 flex items-center justify-center">
              {tree.photo ? (
                <img src={tree.photo} alt={tree.tag_number} className="w-full h-full object-cover" />
              ) : (
                <div className="text-7xl">🌳</div>
              )}
            </div>
          </div>

          {/* Health status card */}
          <div className={`card p-4 border ${healthColor[tree.current_health]}`}>
            <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">
              Current Health
            </div>
            <div className="text-2xl font-bold capitalize">
              {tree.current_health.replace('_', ' ')}
            </div>
            {(user?.role !== 'admin' || user?.role === 'admin') && (
              <button
                onClick={() => setShowHealthModal(true)}
                className="mt-3 text-xs font-medium underline opacity-70 hover:opacity-100"
              >
                Update health status
              </button>
            )}
          </div>

          {/* Quick info */}
          <div className="card p-4 space-y-3">
            <InfoRow icon={<Tag size={14} />} label="Tag" value={tree.tag_number} mono />
            <InfoRow icon={<Calendar size={14} />} label="Planted" value={tree.planted_date} />
            <InfoRow icon={<Calendar size={14} />} label="Age" value={`${tree.days_since_planted} days`} />
            {tree.height_cm && <InfoRow icon={<Ruler size={14} />} label="Height" value={`${tree.height_cm} cm`} />}
            <InfoRow icon={<User size={14} />} label="Planted by" value={tree.planted_by_name || 'Unknown'} />
          </div>
        </div>

        {/* Right: Details + history */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {tree.species_detail?.common_name || 'Unknown Species'}
            </h1>
            {tree.species_detail?.scientific_name && (
              <p className="text-gray-500 italic text-sm mt-1">{tree.species_detail.scientific_name}</p>
            )}
          </div>

          {/* Location card */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-forest-600" />
              Location
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Zone:</span>
                <span className="ml-2 font-medium">{tree.zone_name}</span>
              </div>
              <div>
                <span className="text-gray-500">Coordinates:</span>
                <span className="ml-2 font-mono text-xs">{tree.latitude?.toFixed(5)}, {tree.longitude?.toFixed(5)}</span>
              </div>
              {tree.location_description && (
                <div className="col-span-2">
                  <span className="text-gray-500">Description:</span>
                  <span className="ml-2">{tree.location_description}</span>
                </div>
              )}
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${tree.latitude}&mlon=${tree.longitude}&zoom=18`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-forest-600 text-sm hover:underline"
            >
              View on map →
            </a>
          </div>

          {/* Species info */}
          {tree.species_detail && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Species Info</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Watering:</span>
                  <span className="ml-2">Every {tree.species_detail.watering_frequency_days} days</span>
                </div>
                <div>
                  <span className="text-gray-500">Native:</span>
                  <span className="ml-2">{tree.species_detail.native ? '✅ Yes' : '❌ No'}</span>
                </div>
              </div>
              {tree.species_detail.description && (
                <p className="text-gray-500 text-sm mt-2">{tree.species_detail.description}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {tree.notes && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
              <p className="text-gray-600 text-sm">{tree.notes}</p>
            </div>
          )}

          {/* Health history */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Health History</h3>
            {tree.health_logs?.length === 0 ? (
              <p className="text-gray-400 text-sm">No health logs yet.</p>
            ) : (
              <div className="space-y-3">
                {tree.health_logs?.map(log => (
                  <div key={log.id} className="flex gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                      log.health_status === 'healthy' ? 'bg-green-500' :
                      log.health_status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`badge-${log.health_status}`}>
                          {log.health_status.replace('_', ' ')}
                        </span>
                        {log.previous_health && (
                          <span className="text-gray-400 text-xs">
                            (was {log.previous_health.replace('_', ' ')})
                          </span>
                        )}
                        <span className="text-gray-400 text-xs ml-auto">
                          {new Date(log.logged_at).toLocaleDateString()}
                        </span>
                      </div>
                      {log.notes && <p className="text-gray-500 text-xs mt-1">{log.notes}</p>}
                      <p className="text-gray-400 text-xs mt-0.5">by {log.logged_by_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Update Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-display font-bold text-lg mb-4">Update Health Status</h3>

            <div className="space-y-4">
              <div>
                <label className="label">New Status</label>
                <select
                  className="input"
                  value={healthForm.health_status}
                  onChange={e => setHealthForm(p => ({ ...p, health_status: e.target.value }))}
                >
                  <option value="healthy">🟢 Healthy</option>
                  <option value="at_risk">🟡 At Risk</option>
                  <option value="dead">🔴 Dead</option>
                </select>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What did you observe?"
                  value={healthForm.notes}
                  onChange={e => setHealthForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowHealthModal(false)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={updateHealth}
                disabled={updating}
                className="btn-primary flex-1 justify-center"
              >
                {updating ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <span className={`font-medium text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
