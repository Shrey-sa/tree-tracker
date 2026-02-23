import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, CheckCircle2, Clock, AlertCircle, Filter } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
}

const TASK_TYPE_ICONS = {
  water: '💧', prune: '✂️', treat: '💊', fertilize: '🌿', inspect: '🔍', remove: '🪓'
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [zones, setZones] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', zone: '' })
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuth()

  const fetchTasks = async () => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.zone) params.set('zone', filters.zone)
    const res = await api.get(`/tasks/?${params}`)
    setTasks(res.data.results || res.data)
  }

  useEffect(() => {
    Promise.all([
      fetchTasks(),
      api.get('/zones/').then(r => setZones(r.data.results || r.data)),
      api.get('/auth/users/?role=field_worker').then(r => setWorkers(r.data.results || r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTasks() }, [filters])

  const completeTask = async (taskId) => {
    try {
      await api.patch(`/tasks/${taskId}/complete/`, { completion_notes: '' })
      toast.success('Task marked as complete!')
      fetchTasks()
    } catch {
      toast.error('Failed to complete task')
    }
  }

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.is_overdue).length,
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Maintenance Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">
            {counts.overdue > 0 && <span className="text-red-600 font-medium">{counts.overdue} overdue · </span>}
            {counts.pending} pending tasks
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} />
            Create Task
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: '', label: 'All', count: counts.all },
          { key: 'pending', label: '🕐 Pending', count: counts.pending },
          { key: 'completed', label: '✅ Completed', count: counts.completed },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilters(p => ({ ...p, status: tab.key }))}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filters.status === tab.key
                ? 'bg-forest-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Zone filter */}
      <div className="mb-4">
        <select
          className="input w-auto"
          value={filters.zone}
          onChange={e => setFilters(p => ({ ...p, zone: e.target.value }))}
        >
          <option value="">All Zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p>No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`card p-4 flex gap-4 ${task.is_overdue ? 'border-red-200 bg-red-50/30' : ''}`}
            >
              <div className="text-2xl flex-shrink-0">
                {TASK_TYPE_ICONS[task.task_type] || '🔧'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                  {task.is_overdue && (
                    <span className="badge-overdue">Overdue</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>📍 {task.zone_name}</span>
                  {task.tree_tag && <span>🌳 {task.tree_tag}</span>}
                  <span>👷 {task.assigned_to_name || 'Unassigned'}</span>
                  <span>📅 Due {task.due_date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`badge-${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
                {task.status === 'pending' && (
                  user?.role !== 'field_worker' || task.assigned_to === user?.id
                ) && (
                  <button
                    onClick={() => completeTask(task.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                    title="Mark complete"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <CreateTaskModal
          zones={zones}
          workers={workers}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTasks() }}
        />
      )}
    </div>
  )
}

function CreateTaskModal({ zones, workers, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', task_type: 'water', priority: 'medium',
    zone: '', assigned_to: '', due_date: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/tasks/', form)
      toast.success('Task created!')
      onCreated()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="font-display font-bold text-lg mb-4">Create Maintenance Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Task Type</label>
              <select className="input" value={form.task_type} onChange={e => setForm(p => ({ ...p, task_type: e.target.value }))}>
                <option value="water">💧 Water</option>
                <option value="prune">✂️ Prune</option>
                <option value="treat">💊 Treat</option>
                <option value="fertilize">🌿 Fertilize</option>
                <option value="inspect">🔍 Inspect</option>
                <option value="remove">🪓 Remove</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Zone *</label>
              <select className="input" value={form.zone} onChange={e => setForm(p => ({ ...p, zone: e.target.value }))} required>
                <option value="">Select zone</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input className="input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
