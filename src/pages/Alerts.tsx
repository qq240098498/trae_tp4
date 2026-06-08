import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import { AlertTriangle } from 'lucide-react'

const COURSE_MAP: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
}

interface AlertItem {
  id: number
  student_id: number
  student_name: string
  course_type: string
  current_hours: number
  required_hours: number
  percentage: number
  severity: 'high' | 'medium' | 'low'
  status: 'pending' | 'resolved' | 'ignored'
  message: string
}

interface RuleItem {
  course_type: string
  required_hours: number
  warning_threshold: number
}

function severityStyle(severity: string) {
  if (severity === 'high') return 'bg-red-50 text-red-600'
  if (severity === 'medium') return 'bg-yellow-50 text-yellow-600'
  return 'bg-green-50 text-green-600'
}

function severityLabel(severity: string) {
  if (severity === 'high') return '高'
  if (severity === 'medium') return '中'
  return '低'
}

function statusStyle(status: string) {
  if (status === 'resolved') return 'bg-blue-50 text-blue-600'
  if (status === 'ignored') return 'bg-gray-100 text-gray-500'
  return 'bg-orange-50 text-orange-600'
}

function statusLabel(status: string) {
  if (status === 'resolved') return '已解决'
  if (status === 'ignored') return '已忽略'
  return '待处理'
}

function progressColor(pct: number) {
  if (pct >= 80) return '#48BB78'
  if (pct >= 50) return '#F59E0B'
  return '#F56565'
}

export default function Alerts() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'list' | 'rules'>('list')

  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  const [rules, setRules] = useState<RuleItem[]>([])
  const [savingRule, setSavingRule] = useState<string | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [statusFilter, severityFilter])

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchAlerts = () => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (severityFilter) params.set('severity', severityFilter)
    api.get<{ success: boolean; data: AlertItem[] }>(`/alerts?${params.toString()}`).then((res) => {
      setAlerts(res.data || [])
    }).catch(() => {})
  }

  const fetchRules = () => {
    api.get<{ success: boolean; data: RuleItem[] }>('/alerts/rules').then((res) => {
      setRules(res.data || [])
    }).catch(() => {})
  }

  const handleStatusChange = (id: number, status: 'resolved' | 'ignored' | 'pending') => {
    api.put<{ success: boolean }>(`/alerts/${id}/status`, { status }).then(() => {
      fetchAlerts()
    }).catch(() => {})
  }

  const handleRuleChange = (courseType: string, field: 'required_hours' | 'warning_threshold', value: number) => {
    setRules((prev) =>
      prev.map((r) => (r.course_type === courseType ? { ...r, [field]: value } : r))
    )
  }

  const handleSaveRule = (courseType: string) => {
    setSavingRule(courseType)
    const rule = rules.find((r) => r.course_type === courseType)
    if (!rule) { setSavingRule(null); return }
    api.put<{ success: boolean }>('/alerts/rules', {
      rules: [rule],
    }).then(() => {
      setSavingRule(null)
    }).catch(() => {
      setSavingRule(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">学时提醒</h2>
        <AlertTriangle size={20} className="text-[var(--text-secondary)]" />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-primary text-white'
              : 'bg-white text-[var(--text-secondary)] border border-[var(--border)] hover:bg-gray-50'
          }`}
        >
          预警列表
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'rules'
              ? 'bg-primary text-white'
              : 'bg-white text-[var(--text-secondary)] border border-[var(--border)] hover:bg-gray-50'
          }`}
        >
          规则配置
        </button>
      </div>

      {activeTab === 'list' && (
        <>
          <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">状态</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">全部</option>
                  <option value="pending">待处理</option>
                  <option value="resolved">已解决</option>
                  <option value="ignored">已忽略</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">严重程度</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">全部</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-12 text-center text-[var(--text-secondary)]">
              暂无预警数据
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/students/${alert.student_id}`)}
                        className="text-base font-semibold text-primary hover:underline"
                      >
                        {alert.student_name}
                      </button>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {COURSE_MAP[alert.course_type] || alert.course_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityStyle(alert.severity)}`}>
                        {severityLabel(alert.severity)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(alert.status)}`}>
                        {statusLabel(alert.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {alert.current_hours} / {alert.required_hours} 学时
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(alert.percentage, 100)}%`,
                          backgroundColor: progressColor(alert.percentage),
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-medium min-w-[36px] text-right"
                      style={{ color: progressColor(alert.percentage) }}
                    >
                      {alert.percentage}%
                    </span>
                  </div>

                  {alert.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(alert.id, 'resolved')}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-light transition-colors"
                      >
                        标记已解决
                      </button>
                      <button
                        onClick={() => handleStatusChange(alert.id, 'ignored')}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        忽略
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4">规则配置</h3>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.course_type} className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium text-[var(--text)] min-w-[60px]">
                  {COURSE_MAP[rule.course_type] || rule.course_type}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--text-secondary)]">要求学时</label>
                  <input
                    type="number"
                    value={rule.required_hours}
                    onChange={(e) => handleRuleChange(rule.course_type, 'required_hours', Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--text-secondary)]">预警阈值(%)</label>
                  <input
                    type="number"
                    value={rule.warning_threshold}
                    onChange={(e) => handleRuleChange(rule.course_type, 'warning_threshold', Number(e.target.value))}
                    className="w-24 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => handleSaveRule(rule.course_type)}
                  disabled={savingRule === rule.course_type}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {savingRule === rule.course_type ? '保存中...' : '保存'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
