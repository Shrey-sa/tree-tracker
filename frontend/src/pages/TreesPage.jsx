import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Plus, Search, Filter, TreePine, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function TreesPage() {
  const [trees, setTrees] = useState([])
  const [zones, setZones] = useState([])
  const [species, setSpecies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ health: '', zone: '', species: '' })
  const { user } = useAuth()

  const fetchTrees = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filters.health) params.set('health', filters.health)
    if (filters.zone) params.set('zone', filters.zone)
    if (filters.species) params.set('species', filters.species)
    const res = await api.get(`/trees/?${params}`)
    setTrees(res.data.results || res.data)
  }

  useEffect(() => {
    Promise.all([
      fetchTrees(),
      api.get('/zones/').then(r => setZones(r.data.results || r.data)),
      api.get('/species/').then(r => setSpecies(r.data.results || r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchTrees, 300)
    return () => clearTimeout(t)
  }, [search, filters])

  const healthCounts = {
    all: trees.length,
    healthy: trees.filter(t => t.current_health === 'healthy').length,
    at_risk: trees.filter(t => t.current_health === 'at_risk').length,
    dead: trees.filter(t => t.current_health === 'dead').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Trees</h1>
          <p className="text-gray-500 text-sm mt-1">{trees.length} trees in registry</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'field_worker') && (
          <Link to="/trees/add" className="btn-primary">
            <Plus size={16} />
            Register Tree
          </Link>
        )}
      </div>

      {/* Health filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: '', label: 'All', count: healthCounts.all },
          { key: 'healthy', label: '🟢 Healthy', count: healthCounts.healthy },
          { key: 'at_risk', label: '🟡 At Risk', count: healthCounts.at_risk },
          { key: 'dead', label: '🔴 Dead', count: healthCounts.dead },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilters(p => ({ ...p, health: tab.key }))}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filters.health === tab.key
                ? 'bg-forest-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by tag, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={filters.zone}
          onChange={e => setFilters(p => ({ ...p, zone: e.target.value }))}
        >
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select
          className="input w-auto"
          value={filters.species}
          onChange={e => setFilters(p => ({ ...p, species: e.target.value }))}
        >
          <option value="">All Species</option>
          {species.map(s => <option key={s.id} value={s.id}>{s.common_name}</option>)}
        </select>
      </div>

      {/* Tree grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-3xl mb-3 animate-bounce">🌱</div>
          Loading trees...
        </div>
      ) : trees.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <TreePine size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No trees found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {trees.map(tree => (
            <TreeCard key={tree.id} tree={tree} />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeCard({ tree }) {
  const healthIcon = { healthy: '🟢', at_risk: '🟡', dead: '🔴' }
  const speciesIcon = { Neem: '🌿', Peepal: '🌳', Gulmohar: '🌺', Banyan: '🌲' }

  return (
    <Link
      to={`/trees/${tree.id}`}
      className="card p-4 hover:shadow-md transition-shadow group"
    >
      {/* Photo or placeholder */}
      <div className="w-full h-36 bg-forest-50 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
        {tree.photo ? (
          <img src={tree.photo} alt={tree.tag_number} className="w-full h-full object-cover" />
        ) : (
          <div className="text-5xl opacity-40">🌳</div>
        )}
      </div>

      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-xs text-gray-400">{tree.tag_number}</div>
          <div className="font-semibold text-gray-900 text-sm mt-0.5">
            {tree.species_name || 'Unknown species'}
          </div>
        </div>
        <span className="text-lg">{healthIcon[tree.current_health]}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        <MapPin size={11} />
        {tree.zone_name} • {tree.location_description || 'No location desc'}
      </div>

      <div className="flex items-center justify-between">
        <span className={`badge-${tree.current_health}`}>
          {tree.current_health.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(tree.planted_date).getFullYear()}
        </span>
      </div>
    </Link>
  )
}
