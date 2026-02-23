import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import { Filter } from 'lucide-react'

const HEALTH_COLORS = {
  healthy: '#22c55e',
  at_risk: '#f59e0b',
  dead: '#ef4444',
}

export default function MapPage() {
  const [trees, setTrees] = useState([])
  const [zones, setZones] = useState([])
  const [filters, setFilters] = useState({ zone: '', health: '' })
  const [loading, setLoading] = useState(true)

  const fetchTrees = (params = {}) => {
    const q = new URLSearchParams()
    if (params.zone) q.set('zone', params.zone)
    if (params.health) q.set('health', params.health)
    return api.get(`/trees/map/?${q}`).then(r => setTrees(r.data))
  }

  useEffect(() => {
    Promise.all([
      fetchTrees(),
      api.get('/zones/').then(r => setZones(r.data.results || r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) fetchTrees(filters)
  }, [filters])

  const center = trees.length > 0
    ? [trees[0].latitude, trees[0].longitude]
    : [12.9716, 77.5946]

  const counts = {
    healthy: trees.filter(t => t.current_health === 'healthy').length,
    at_risk: trees.filter(t => t.current_health === 'at_risk').length,
    dead: trees.filter(t => t.current_health === 'dead').length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={16} />
          Filters:
        </div>

        <select
          className="input w-auto text-sm"
          value={filters.zone}
          onChange={e => setFilters(p => ({ ...p, zone: e.target.value }))}
        >
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>

        <select
          className="input w-auto text-sm"
          value={filters.health}
          onChange={e => setFilters(p => ({ ...p, health: e.target.value }))}
        >
          <option value="">All Health</option>
          <option value="healthy">🟢 Healthy</option>
          <option value="at_risk">🟡 At Risk</option>
          <option value="dead">🔴 Dead</option>
        </select>

        <div className="flex-1" />

        <div className="flex items-center gap-4 text-sm">
          {[
            { key: 'healthy', label: 'Healthy', color: '#22c55e' },
            { key: 'at_risk', label: 'At Risk', color: '#f59e0b' },
            { key: 'dead', label: 'Dead', color: '#ef4444' },
          ].map(h => (
            <div key={h.key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: h.color }} />
              <span className="text-gray-600">{h.label}</span>
              <span className="font-semibold text-gray-800">({counts[h.key]})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="text-3xl animate-bounce mb-2">🗺️</div>
              <div className="text-gray-500 text-sm">Loading map data...</div>
            </div>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {trees.map(tree => (
              <CircleMarker
                key={tree.id}
                center={[tree.latitude, tree.longitude]}
                radius={7}
                pathOptions={{
                  fillColor: HEALTH_COLORS[tree.current_health] || '#888',
                  fillOpacity: 0.85,
                  color: '#fff',
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>{tree.tag_number}</div>
                    <div style={{ fontWeight: 600, margin: '4px 0' }}>
                      {tree['species__common_name'] || 'Unknown species'}
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                      {tree['zone__name']} • {tree.planted_date}
                    </div>
                    <a
                      href={`/trees/${tree.id}`}
                      style={{ fontSize: 11, color: '#16a34a', textDecoration: 'underline' }}
                    >
                      View details →
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg px-4 py-3 z-[1000] border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Showing</div>
          <div className="text-2xl font-bold text-gray-900">{trees.length}</div>
          <div className="text-xs text-gray-500">trees on map</div>
        </div>
      </div>
    </div>
  )
}
