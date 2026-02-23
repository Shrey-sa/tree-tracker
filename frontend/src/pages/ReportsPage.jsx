import { useEffect, useState } from 'react'
import api from '../services/api'
import { Download, FileText, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary/').then(r => setSummary(r.data)),
      api.get('/reports/trends/').then(r => setTrends(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  const downloadPDF = async () => {
    try {
      const res = await api.get('/reports/export/pdf/', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `tree-tracker-report-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch {
      toast.error('Failed to generate PDF')
    }
  }

  const downloadCSV = async () => {
    try {
      const res = await api.get('/reports/export/csv/', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `trees-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded!')
    } catch {
      toast.error('Failed to export CSV')
    }
  }

  const trendData = trends.map(t => ({
    month: t.month ? new Date(t.month).toLocaleDateString('en', { month: 'short', year: '2-digit' }) : '',
    Planted: t.planted,
    Healthy: t.healthy,
    Dead: t.dead,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-bounce">📊</div>
    </div>
  )

  if (!summary) return null

  const { trees, tasks, zones } = summary

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">City-wide green asset performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="btn-secondary">
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={downloadPDF} className="btn-primary">
            <FileText size={16} />
            Download PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trees', value: trees.total, sub: 'In registry', color: 'bg-forest-50' },
          { label: 'Survival Rate', value: `${trees.survival_rate}%`, sub: 'Trees alive', color: 'bg-green-50' },
          { label: 'Tasks Completed', value: tasks.completed_this_month, sub: 'This month', color: 'bg-blue-50' },
          { label: 'Overdue Tasks', value: tasks.overdue, sub: 'Need action', color: 'bg-red-50' },
        ].map(kpi => (
          <div key={kpi.label} className={`card p-4 ${kpi.color}`}>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-sm font-medium text-gray-700 mt-1">{kpi.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly trends */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Planting Trend</h3>
          {trendData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="Planted" fill="#52b788" name="Trees Planted" />
                <Bar dataKey="Dead" fill="#ef4444" name="Trees Died" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Zone comparison */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Zone Health Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zones.slice(0, 6)} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="healthy_count" stackId="a" fill="#22c55e" name="Healthy" />
              <Bar dataKey="at_risk_count" stackId="a" fill="#f59e0b" name="At Risk" />
              <Bar dataKey="dead_count" stackId="a" fill="#ef4444" name="Dead" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Zone-wise Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Zone</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Healthy</th>
                <th className="px-5 py-3 text-right">At Risk</th>
                <th className="px-5 py-3 text-right">Dead</th>
                <th className="px-5 py-3 text-right">Survival</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {zones.map(z => {
                const rate = z.total > 0 ? Math.round(((z.healthy_count + z.at_risk_count) / z.total) * 100) : 0
                return (
                  <tr key={z.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{z.name}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{z.total}</td>
                    <td className="px-5 py-3 text-right text-green-600 font-medium">{z.healthy_count}</td>
                    <td className="px-5 py-3 text-right text-amber-600 font-medium">{z.at_risk_count}</td>
                    <td className="px-5 py-3 text-right text-red-600 font-medium">{z.dead_count}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold ${rate >= 70 ? 'text-green-600' : rate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
