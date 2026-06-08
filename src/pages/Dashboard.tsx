import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/utils/api'
import { Users, UserCheck, Clock, AlertTriangle, Plus, CalendarCheck, Download, ChevronRight } from 'lucide-react'

interface OverviewData {
  active_students: number
  today_attendance: number
  month_hours: number
  pending_alerts: number
  total_students: number
  total_coaches: number
}

interface AlertItem {
  id: number
  student_id: number
  student_name: string
  course_type: string
  current_hours: number
  required_hours: number
  severity: 'high' | 'medium' | 'low'
  message: string
  stage: string
  training_type: string
}

const stageMap: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
}

const severityConfig: Record<string, { label: string; className: string }> = {
  high: { label: '严重', className: 'bg-red-100 text-red-700' },
  medium: { label: '警告', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: '提示', className: 'bg-green-100 text-green-700' },
}

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: OverviewData }>('/statistics/overview'),
      api.get<{ success: boolean; data: AlertItem[] }>('/alerts?status=pending'),
    ])
      .then(([overviewRes, alertsRes]) => {
        setOverview(overviewRes.data)
        setAlerts(alertsRes.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    {
      label: '在册学员',
      value: overview?.active_students ?? 0,
      icon: Users,
      gradient: 'bg-gradient-to-br from-primary to-primary-light',
    },
    {
      label: '今日签到',
      value: overview?.today_attendance ?? 0,
      icon: UserCheck,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
    {
      label: '本月学时',
      value: overview?.month_hours ?? 0,
      icon: Clock,
      gradient: 'bg-gradient-to-br from-accent to-amber-600',
    },
    {
      label: '学时预警',
      value: overview?.pending_alerts ?? 0,
      icon: AlertTriangle,
      gradient: 'bg-gradient-to-br from-red-500 to-red-600',
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--text)]">仪表盘</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div key={item.label} className={`${item.gradient} rounded-lg p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">{item.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{loading ? '-' : item.value}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <item.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[var(--text)]">学时预警</h3>
            <Link to="/alerts" className="text-sm text-primary hover:text-primary-light flex items-center gap-1">
              查看全部 <ChevronRight size={14} />
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[var(--text-secondary)] text-sm">
              暂无预警信息
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.map((alert) => (
                <Link
                  key={alert.id}
                  to={`/students/${alert.student_id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text)]">{alert.student_name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {stageMap[alert.stage] || alert.course_type}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      当前 {alert.current_hours}h / 需达 {alert.required_hours}h
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityConfig[alert.severity]?.className || severityConfig.low.className}`}>
                    {severityConfig[alert.severity]?.label || '提示'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 border border-[var(--border)] shadow-sm">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4">快捷操作</h3>
          <div className="space-y-3">
            <Link
              to="/students"
              className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text)]">新增学员</p>
                <p className="text-xs text-[var(--text-secondary)]">录入新的学员信息</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-primary transition-colors" />
            </Link>
            <Link
              to="/attendance"
              className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CalendarCheck size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text)]">签到打卡</p>
                <p className="text-xs text-[var(--text-secondary)]">学员签到签退管理</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-emerald-600 transition-colors" />
            </Link>
            <Link
              to="/export"
              className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--bg)] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Download size={20} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text)]">导出记录</p>
                <p className="text-xs text-[var(--text-secondary)]">导出学时与签到数据</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-accent transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
