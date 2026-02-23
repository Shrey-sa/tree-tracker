import { useState } from 'react'
import api from '../services/api'
import { diagnoseTreeHealth, getMaintenanceAdvice, generateReportSummary } from '../services/groq'
import { Sparkles, TreePine, ClipboardList, BarChart3, Upload, Loader2, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const PriorityBadge = ({ priority }) => {
  const colors = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[priority] || colors.low}`}>
      {priority?.toUpperCase()}
    </span>
  )
}

const AssessmentBadge = ({ level }) => {
  const config = {
    excellent: { color: 'text-green-700 bg-green-50 border-green-200', icon: '🌟' },
    good: { color: 'text-green-600 bg-green-50 border-green-200', icon: '✅' },
    concerning: { color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '⚠️' },
    critical: { color: 'text-red-700 bg-red-50 border-red-200', icon: '🚨' },
  }
  const c = config[level] || config.good
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full border ${c.color}`}>
      {c.icon} {level?.charAt(0).toUpperCase() + level?.slice(1)}
    </span>
  )
}

// ── Feature 1: Health Diagnosis ────────────────────────────────────────────
function HealthDiagnosis() {
  const [image, setImage] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [imageMime, setImageMime] = useState('image/jpeg')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(URL.createObjectURL(file))
    setImageMime(file.type)
    const reader = new FileReader()
    reader.onload = () => setImageBase64(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const analyze = async () => {
    if (!imageBase64) return
    setLoading(true); setError(null); setResult(null)
    try {
      const result = await diagnoseTreeHealth(imageBase64, imageMime)
      setResult(result)
    } catch (e) {
      setError(e.message || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const healthColors = { healthy: 'text-green-600', at_risk: 'text-amber-600', dead: 'text-red-600' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload size={18} className="text-forest-600" /> Upload Tree Photo
        </h3>
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-xl overflow-hidden transition-colors
            ${image ? 'border-forest-300' : 'border-gray-200 hover:border-forest-300'}`}>
            {image ? (
              <img src={image} alt="Tree" className="w-full h-64 object-cover" />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <TreePine size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Click to upload a tree photo</p>
                <p className="text-xs mt-1">JPG, PNG up to 10MB</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        <button onClick={analyze} disabled={!imageBase64 || loading}
          className="btn-primary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing with Groq AI...</>
            : <><Sparkles size={16} /> Diagnose Tree Health</>}
        </button>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" /> AI Diagnosis
        </h3>
        {!result && !loading && (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Sparkles size={40} className="mb-3 opacity-20" />
            <p className="text-sm">Upload a photo to get AI diagnosis</p>
          </div>
        )}
        {loading && (
          <div className="h-64 flex flex-col items-center justify-center">
            <Loader2 size={40} className="animate-spin text-forest-500 mb-3" />
            <p className="text-sm text-gray-500">LLaMA 3.3 is analyzing your tree...</p>
          </div>
        )}
        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Diagnosed Health</div>
                <div className={`text-lg font-bold ${healthColors[result.health_status] || 'text-gray-700'}`}>
                  {result.health_status?.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-0.5">Confidence</div>
                <PriorityBadge priority={result.confidence} />
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnosis</div>
              <p className="text-sm text-gray-700 leading-relaxed">{result.diagnosis}</p>
            </div>
            {result.issues_detected?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Issues Detected</div>
                <div className="flex flex-wrap gap-2">
                  {result.issues_detected.map((issue, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg">{issue}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3 bg-forest-50 border border-forest-200 rounded-xl">
              <div className="text-xs font-semibold text-forest-700 mb-1 flex items-center gap-1">
                <CheckCircle size={12} /> Recommended Action
              </div>
              <p className="text-sm text-forest-800">{result.recommended_action}</p>
              <div className="flex items-center gap-2 mt-2">
                <PriorityBadge priority={result.urgency} />
                <span className="text-xs font-medium text-forest-700 bg-forest-100 px-2 py-0.5 rounded-full">{result.task_type}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Feature 2: Maintenance Advisor ─────────────────────────────────────────
function MaintenanceAdvisor() {
  const [zones, setZones] = useState([])
  const [selectedZone, setSelectedZone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [zonesLoaded, setZonesLoaded] = useState(false)

  const loadZones = async () => {
    if (zonesLoaded) return
    try {
      const res = await api.get('/zones/')
      setZones(res.data.results || res.data)
      setZonesLoaded(true)
    } catch {}
  }

  const analyze = async () => {
    if (!selectedZone) return
    setLoading(true); setError(null); setResult(null)
    try {
      // Fetch zone stats from backend
      const [zonesRes, treesRes, tasksRes] = await Promise.all([
        api.get('/zones/'),
        api.get(`/trees/?zone=${selectedZone}&page_size=500`),
        api.get(`/tasks/?zone=${selectedZone}&status=pending`),
      ])

      const zone = (zonesRes.data.results || zonesRes.data).find(z => z.id == selectedZone)
      const trees = treesRes.data.results || treesRes.data
      const tasks = tasksRes.data.results || tasksRes.data

      const healthy = trees.filter(t => t.current_health === 'healthy').length
      const at_risk = trees.filter(t => t.current_health === 'at_risk').length
      const dead = trees.filter(t => t.current_health === 'dead').length
      const total = trees.length
      const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length

      const zoneData = {
        name: zone?.name || 'Unknown',
        city: zone?.city || '',
        total, healthy, at_risk, dead,
        survival_rate: total ? Math.round(healthy / total * 100) : 0,
        pending_tasks: tasks.length,
        overdue_tasks: overdue,
        uninspected: at_risk,
        species_list: [...new Set(trees.map(t => t.species_name).filter(Boolean))].slice(0, 5),
      }

      const advice = await getMaintenanceAdvice(zoneData)
      setResult({ zone: zone?.name, advice })
    } catch (e) {
      setError(e.message || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const taskTypeEmoji = { water: '💧', prune: '✂️', treat: '💊', fertilize: '🌱', inspect: '🔍', remove: '🪓' }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList size={18} className="text-forest-600" /> Select Zone to Analyze
        </h3>
        <div className="flex gap-3">
          <select className="input flex-1" value={selectedZone}
            onChange={e => setSelectedZone(e.target.value)} onFocus={loadZones}>
            <option value="">Select a zone...</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name} — {z.city}</option>)}
          </select>
          <button onClick={analyze} disabled={!selectedZone || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 whitespace-nowrap">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Analyzing...' : 'Get AI Advice'}
          </button>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      </div>

      {loading && (
        <div className="card text-center py-12">
          <Loader2 size={40} className="animate-spin text-forest-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">LLaMA 3.3 is analyzing zone data...</p>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="card border-l-4 border-forest-400">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Zone Analysis: {result.zone}</h3>
                <div className="mt-1"><PriorityBadge priority={result.advice?.priority_level} /></div>
              </div>
              <Sparkles size={20} className="text-purple-400" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{result.advice?.summary}</p>
            {result.advice?.insights?.length > 0 && (
              <div className="mt-4 space-y-2">
                {result.advice.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />{insight}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Recommended Tasks</h3>
            <div className="space-y-3">
              {result.advice?.recommended_tasks?.map((task, i) => (
                <div key={i} className="p-4 border border-gray-100 rounded-xl hover:border-forest-200 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{taskTypeEmoji[task.task_type] || '📋'}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{task.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{task.reason}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs text-gray-400">Due in {task.due_in_days}d</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>🌳 {task.tree_count} trees affected</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{task.task_type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card text-center py-12">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">Select a zone and click "Get AI Advice"</p>
        </div>
      )}
    </div>
  )
}

// ── Feature 3: Report Summarizer ───────────────────────────────────────────
function ReportSummarizer() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const generate = async () => {
    setLoading(true); setError(null); setResult(null)
    try {
      const [treesRes, tasksRes, zonesRes] = await Promise.all([
        api.get('/reports/summary/'),
        api.get('/tasks/'),
        api.get('/zones/'),
      ])

      const summary = treesRes.data
      const tasks = tasksRes.data.results || tasksRes.data
      const zones = zonesRes.data.results || zonesRes.data

      const today = new Date()
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

      const overdue = tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < today).length

      const statsData = {
        total: summary.total_trees || 0,
        healthy: summary.healthy_trees || 0,
        at_risk: summary.at_risk_trees || 0,
        dead: summary.dead_trees || 0,
        survival_rate: summary.survival_rate || 0,
        planted_this_month: summary.planted_this_month || 0,
        planted_last_month: summary.planted_last_month || 0,
        pending_tasks: tasks.filter(t => t.status === 'pending').length,
        overdue_tasks: overdue,
        completed_this_month: tasks.filter(t => t.status === 'completed').length,
        zone_stats: zones.map(z => ({
          name: z.name,
          survival_rate: z.survival_rate || 0
        })).sort((a, b) => a.survival_rate - b.survival_rate),
      }

      const report = await generateReportSummary(statsData)
      setResult(report)
    } catch (e) {
      setError(e.message || 'Failed to generate summary.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-forest-600" /> AI City Report
            </h3>
            <p className="text-sm text-gray-500 mt-1">Executive insights from your live city tree data</p>
          </div>
          <button onClick={generate} disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      </div>

      {loading && (
        <div className="card text-center py-12">
          <Loader2 size={40} className="animate-spin text-forest-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">LLaMA 3.3 is analyzing your city's tree data...</p>
        </div>
      )}

      {result && !loading && (
        <>
          <div className="card bg-gradient-to-r from-forest-900 to-forest-700 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-forest-300 uppercase tracking-widest mb-2">AI Analysis · Powered by LLaMA 3.3</div>
                <h2 className="text-lg font-bold leading-snug">{result.headline}</h2>
                <div className="mt-3"><AssessmentBadge level={result.overall_assessment} /></div>
              </div>
              <Sparkles size={24} className="text-forest-400 shrink-0" />
            </div>
            <p className="mt-4 text-sm text-forest-200 leading-relaxed">{result.executive_summary}</p>
            {result.month_comparison && (
              <p className="mt-2 text-xs text-forest-300 italic">{result.month_comparison}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" /> Key Wins
              </h3>
              <ul className="space-y-2">
                {result.key_wins?.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>{win}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Key Concerns
              </h3>
              <ul className="space-y-2">
                {result.key_concerns?.map((concern, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 mt-0.5">!</span>{concern}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {result.action_items?.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <PriorityBadge priority={item.priority} />
                  <p className="text-sm text-gray-700 flex-1">{item.action}</p>
                  <ChevronRight size={16} className="text-gray-400 shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card text-center py-12">
          <BarChart3 size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">Click "Generate Report" to get AI-powered city insights</p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'diagnosis', label: 'Health Diagnosis', icon: TreePine },
  { id: 'advisor', label: 'Maintenance Advisor', icon: ClipboardList },
  { id: 'report', label: 'Report Summarizer', icon: BarChart3 },
]

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('diagnosis')
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-forest-600 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-sm text-gray-500">Powered by LLaMA 3.3 via Groq</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id ? 'bg-white text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'diagnosis' && <HealthDiagnosis />}
      {activeTab === 'advisor' && <MaintenanceAdvisor />}
      {activeTab === 'report' && <ReportSummarizer />}
    </div>
  )
}
