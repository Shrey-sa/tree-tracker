/**
 * Groq API client - called directly from frontend
 * Free tier: 30 req/min, llama-3.3-70b-versatile
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const TEXT_MODEL = 'llama-3.3-70b-versatile'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function callGroq(messages, model = TEXT_MODEL) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.choices[0].message.content

  // Parse JSON safely
  try {
    return JSON.parse(text)
  } catch {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  }
}

// ── Feature 1: Health Diagnosis (Vision) ──────────────────────────────────
export async function diagnoseTreeHealth(imageBase64, imageMime, treeInfo = {}) {
  const { species = 'Unknown', zone = 'Unknown', current_health = 'unknown' } = treeInfo

  const messages = [{
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: `data:${imageMime};base64,${imageBase64}` }
      },
      {
        type: 'text',
        text: `You are an expert urban arborist. Analyze this tree photo.
Tree context: Species=${species}, Zone=${zone}, Current health=${current_health}

Respond with ONLY valid JSON:
{
  "health_status": "healthy" or "at_risk" or "dead",
  "confidence": "high" or "medium" or "low",
  "diagnosis": "2-3 sentence description of what you observe",
  "issues_detected": ["issue1", "issue2"],
  "recommended_action": "Specific actionable recommendation",
  "task_type": "water" or "prune" or "treat" or "fertilize" or "inspect" or "none",
  "urgency": "urgent" or "high" or "medium" or "low"
}`
      }
    ]
  }]

  return callGroq(messages, VISION_MODEL)
}

// ── Feature 2: Maintenance Advisor ────────────────────────────────────────
export async function getMaintenanceAdvice(zoneData) {
  const { name, city, total, healthy, at_risk, dead, survival_rate,
    pending_tasks, overdue_tasks, uninspected, species_list } = zoneData

  const messages = [
    {
      role: 'system',
      content: 'You are an expert urban forestry maintenance advisor. Respond with valid JSON only.'
    },
    {
      role: 'user',
      content: `Analyze this zone and suggest maintenance tasks:

Zone: ${name}, ${city}
Total Trees: ${total} | Healthy: ${healthy} (${survival_rate}% survival)
At Risk: ${at_risk} | Dead: ${dead}
Not Inspected 14+ Days: ${uninspected}
Pending Tasks: ${pending_tasks} (${overdue_tasks} overdue)
Species: ${species_list?.join(', ') || 'Various'}

Respond with ONLY this JSON:
{
  "summary": "2-3 sentence analysis",
  "priority_level": "urgent" or "high" or "medium" or "low",
  "recommended_tasks": [
    {
      "title": "Task title",
      "task_type": "water" or "prune" or "treat" or "fertilize" or "inspect" or "remove",
      "priority": "urgent" or "high" or "medium" or "low",
      "reason": "Why needed",
      "tree_count": number,
      "due_in_days": number
    }
  ],
  "insights": ["insight1", "insight2", "insight3"]
}`
    }
  ]

  return callGroq(messages)
}

// ── Feature 3: Report Summarizer ──────────────────────────────────────────
export async function generateReportSummary(statsData) {
  const { total, healthy, at_risk, dead, survival_rate,
    planted_this_month, planted_last_month,
    pending_tasks, overdue_tasks, completed_this_month, zone_stats } = statsData

  const messages = [
    {
      role: 'system',
      content: 'You are a senior urban forestry analyst. Write executive reports. Respond with valid JSON only.'
    },
    {
      role: 'user',
      content: `Generate an executive report for this city's urban forest:

Total Trees: ${total} | Healthy: ${healthy} (${survival_rate}%)
At Risk: ${at_risk} | Dead: ${dead}
Planted This Month: ${planted_this_month} (vs ${planted_last_month} last month)
Pending: ${pending_tasks} tasks | Overdue: ${overdue_tasks} | Completed: ${completed_this_month}
Zones (worst→best): ${zone_stats?.map(z => `${z.name}: ${z.survival_rate}%`).join(', ')}

Respond with ONLY this JSON:
{
  "headline": "One punchy sentence summarizing city tree health",
  "overall_assessment": "excellent" or "good" or "concerning" or "critical",
  "executive_summary": "3-4 sentences with specific numbers",
  "key_wins": ["win1", "win2"],
  "key_concerns": ["concern1", "concern2"],
  "action_items": [
    {"priority": "urgent" or "high" or "medium", "action": "Specific action"}
  ],
  "month_comparison": "One sentence comparing this month vs last month"
}`
    }
  ]

  return callGroq(messages)
}
