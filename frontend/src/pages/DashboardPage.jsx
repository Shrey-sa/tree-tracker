import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { TreePine, AlertTriangle, Skull, TrendingUp, ClipboardList, AlertCircle, CheckCircle2, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const HEALTH_COLORS = { healthy: '#22c55e', at_risk: '#f59e0b', dead: '#ef4444' }

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    api.get('/reports/summary/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-3xl mb-3 animate-bounce">🌳</div>
        <div className="text-gray-500 text-sm">Loading dashboard...</div>
      </div>
    </div>
  )

  if (!data) return null

  const { trees, tasks, zones, recent_activity } = data

  const pieData = [
    { name: 'Healthy', value: trees.healthy, color: '#22c55e' },
    { name: 'At Risk', value: trees.at_risk, color: '#f59e0b' },
    { name: 'Dead', value: trees.dead, color: '#ef4444' },
  ]

  const topZones = [...zones].sort((a, b) => b.total - a.total).slice(0, 6)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          Good morning, {user?.first_name || user?.username} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening across the city's green assets today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<TreePine className="text-forest-600" size={22} />}
          label="Total Trees"
          value={trees.total.toLocaleString()}
          sub={`${trees.planted_this_month} planted this month`}
          bg="bg-forest-50"
        />
        <StatCard
          icon={<TrendingUp className="text-green-600" size={22} />}
          label="Survival Rate"
          value={`${trees.survival_rate}%`}
          sub={`${trees.healthy} healthy trees`}
          bg="bg-green-50"
        />
        <StatCard
          icon={<AlertTriangle className="text-amber-600" size={22} />}
          label="At Risk"
          value={trees.at_risk.toLocaleString()}
          sub="Need attention"
          bg="bg-amber-50"
          alert={trees.at_risk > 0}
        />
        <StatCard
          icon={<ClipboardList className="text-blue-600" size={22} />}
          label="Overdue Tasks"
          value={tasks.overdue.toLocaleString()}
          sub={`${tasks.pending} total pending`}
          bg="bg-blue-50"
          alert={tasks.overdue > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Health distribution donut */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Health Distribution</h3>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="space-y-2 flex-1">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-600">{p.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone bar chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Trees by Zone</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={topZones} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="healthy_count" stackId="a" fill="#22c55e" name="Healthy" />
              <Bar dataKey="at_risk_count" stackId="a" fill="#f59e0b" name="At Risk" />
              <Bar dataKey="dead_count" stackId="a" fill="#ef4444" name="Dead" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Health Updates</h3>
            <Link to="/trees" className="text-forest-600 text-sm hover:underline">View all</Link>
          </div>
          {recent_activity.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-8">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {recent_activity.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    a.to === 'healthy' ? 'bg-green-500' :
                    a.to === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-gray-500 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {a.tree_tag}
                  </span>
                  <span className="text-gray-600">
                    <span className={`font-medium ${a.from === 'healthy' ? 'text-green-600' : a.from === 'at_risk' ? 'text-amber-600' : 'text-red-600'}`}>{a.from}</span>
                    {' → '}
                    <span className={`font-medium ${a.to === 'healthy' ? 'text-green-600' : a.to === 'at_risk' ? 'text-amber-600' : 'text-red-600'}`}>{a.to}</span>
                  </span>
                  <span className="text-gray-400 ml-auto text-xs">{a.by}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone summary table */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Zone Overview</h3>
            <Link to="/zones" className="text-forest-600 text-sm hover:underline">Manage</Link>
          </div>
          <div className="space-y-2">
            {zones.slice(0, 5).map(z => {
              const rate = z.total > 0 ? Math.round(((z.healthy_count + z.at_risk_count) / z.total) * 100) : 0
              return (
                <div key={z.id} className="flex items-center gap-3">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{z.name}</span>
                  <span className="text-xs text-gray-400">{z.total} trees</span>
                  <div className="w-20 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-forest-500"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-10 text-right">{rate}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, bg, alert }) {
  return (
    <div className={`card p-4 ${bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
        {alert && <div className="w-2 h-2 rounded-full bg-red-500" />}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  )
}
