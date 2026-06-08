import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import { Download } from 'lucide-react'

const EXPORT_TYPE_MAP: Record<string, string> = {
  students: '学员档案',
  attendance: '考勤记录',
  statistics: '学时统计',
}

const STATUS_MAP: Record<string, string> = {
  completed: '已完成',
  processing: '处理中',
  failed: '失败',
}

function statusStyle(status: string) {
  if (status === 'completed') return 'bg-green-50 text-green-600'
  if (status === 'processing') return 'bg-blue-50 text-blue-600'
  return 'bg-red-50 text-red-600'
}

interface CoachItem {
  id: number
  name: string
}

interface HistoryItem {
  id: number
  export_type: string
  file_name: string
  file_size: number
  status: string
  created_at: string
}

export default function ExportPage() {
  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export')

  const [exportType, setExportType] = useState('students')
  const [statusFilter, setStatusFilter] = useState('')
  const [coachFilter, setCoachFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)

  const [coaches, setCoaches] = useState<CoachItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    api.get<{ data: CoachItem[] }>('/coaches').then((res) => {
      setCoaches(res.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = () => {
    api.get<{ success: boolean; data: HistoryItem[] }>('/export/history').then((res) => {
      setHistory(res.data || [])
    }).catch(() => {})
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const filters: Record<string, string> = {}
      if (exportType === 'students') {
        if (statusFilter) filters.status = statusFilter
        if (coachFilter) filters.coach_id = coachFilter
      } else if (exportType === 'attendance') {
        if (startDate) filters.start_date = startDate
        if (endDate) filters.end_date = endDate
        if (coachFilter) filters.coach_id = coachFilter
      }

      const token = localStorage.getItem('token')
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ export_type: exportType, filters }),
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportType}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      fetchHistory()
    } catch {
      // error
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">记录导出</h2>
        <Download size={20} className="text-[var(--text-secondary)]" />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'export'
              ? 'bg-primary text-white'
              : 'bg-white text-[var(--text-secondary)] border border-[var(--border)] hover:bg-gray-50'
          }`}
        >
          导出数据
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-primary text-white'
              : 'bg-white text-[var(--text-secondary)] border border-[var(--border)] hover:bg-gray-50'
          }`}
        >
          导出历史
        </button>
      </div>

      {activeTab === 'export' && (
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-[var(--text)] mb-4">导出类型</h3>
            <div className="flex gap-4">
              {Object.entries(EXPORT_TYPE_MAP).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="exportType"
                    value={key}
                    checked={exportType === key}
                    onChange={(e) => setExportType(e.target.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-[var(--text)]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {exportType === 'students' && (
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">状态筛选</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">全部</option>
                  <option value="active">在学</option>
                  <option value="completed">已结业</option>
                  <option value="suspended">暂停</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">教练筛选</label>
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">全部教练</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {exportType === 'attendance' && (
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-secondary)]">教练筛选</label>
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">全部教练</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            {exporting ? '导出中...' : '导出'}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">导出类型</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">文件名</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">文件大小</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
                    暂无导出记录
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-6 py-4 text-sm text-[var(--text)]">
                      {EXPORT_TYPE_MAP[item.export_type] || item.export_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.file_name}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {(item.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(item.status)}`}>
                        {STATUS_MAP[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
