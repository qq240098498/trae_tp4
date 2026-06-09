import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import {
  Users,
  LogIn,
  LogOut,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  Award,
  Activity
} from 'lucide-react'

interface Student {
  id: number
  name: string
  phone: string
  training_type: string
  stage: string
  coach_name: string
}

interface Coach {
  id: number
  name: string
  phone: string
  role: string
}

interface AttendanceRecord {
  id: number
  student_id: number
  student_name: string
  coach_id: number
  coach_name: string
  course_type: string
  check_in_time: string
  check_out_time: string | null
  duration_hours: number | null
  status: string
}

interface TodayStats {
  checked_in: AttendanceRecord[]
  completed: AttendanceRecord[]
  total: number
}

const courseTypeMap: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
}

const statusMap: Record<string, { label: string; className: string }> = {
  checked_in: { label: '已签到', className: 'bg-orange-100 text-orange-700' },
  completed: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
}

function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  } catch {
    return '-'
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const y = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${mo}-${d} ${h}:${mi}`
  } catch {
    return '-'
  }
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<'checkin' | 'records'>('checkin')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [todayStats, setTodayStats] = useState<TodayStats>({ checked_in: [], completed: [], total: 0 })

  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [selectedCourseType, setSelectedCourseType] = useState<string>('subject1')
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false)

  const [filterDate, setFilterDate] = useState<string>(getTodayDateString())
  const [filterCoachId, setFilterCoachId] = useState<string>('')
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsLimit] = useState(10)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const y = now.getFullYear()
      const mo = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const h = String(now.getHours()).padStart(2, '0')
      const mi = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      const weeks = ['日', '一', '二', '三', '四', '五', '六']
      const week = weeks[now.getDay()]
      setCurrentTime(`${y}年${mo}月${d}日 星期${week} ${h}:${mi}:${s}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    api.get<{ success: boolean; data: { list: Student[]; total: number } }>(
      '/students?limit=100&status=active'
    ).then((res) => {
      setStudents(res.data.list || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ success: boolean; data: Coach[] }>('/coaches').then((res) => {
      setCoaches(res.data || [])
    }).catch(() => {})
  }, [])

  const fetchTodayStats = () => {
    api.get<{ success: boolean; data: TodayStats }>('/attendance/today').then((res) => {
      setTodayStats(res.data || { checked_in: [], completed: [], total: 0 })
    }).catch(() => {})
  }

  useEffect(() => {
    fetchTodayStats()
  }, [])

  const fetchRecords = (p: number = recordsPage, date: string = filterDate, coachId: string = filterCoachId) => {
    const params = new URLSearchParams({ page: String(p), limit: String(recordsLimit) })
    if (date) params.set('date', date)
    if (coachId) params.set('coach_id', coachId)
    api.get<{ success: boolean; data: { list: AttendanceRecord[]; total: number; page: number; limit: number } }>(
      `/attendance?${params.toString()}`
    ).then((res) => {
      setRecords(res.data.list || [])
      setRecordsTotal(res.data.total || 0)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchRecords()
  }, [recordsPage])

  const handleSearchRecords = () => {
    setRecordsPage(1)
    fetchRecords(1, filterDate, filterCoachId)
  }

  const handleCheckIn = () => {
    if (!selectedStudentId) {
      window.alert('请选择学员')
      return
    }
    if (!selectedCoachId) {
      window.alert('请选择教练')
      return
    }
    setSubmittingCheckIn(true)
    api.post<{ success: boolean; data: AttendanceRecord }>('/attendance/check-in', {
      student_id: Number(selectedStudentId),
      coach_id: Number(selectedCoachId),
      course_type: selectedCourseType,
    }).then(() => {
      window.alert('签到成功')
      setSelectedStudentId('')
      setSelectedCoachId('')
      setSelectedCourseType('subject1')
      fetchTodayStats()
    }).catch((err) => {
      window.alert(err.message || '签到失败')
    }).finally(() => setSubmittingCheckIn(false))
  }

  const handleCheckOut = (attendanceId: number, studentName: string) => {
    if (!window.confirm(`确定为学员「${studentName}」签退吗？`)) return
    api.post<{ success: boolean; data: AttendanceRecord }>('/attendance/check-out', {
      attendance_id: attendanceId,
    }).then(() => {
      window.alert('签退成功')
      fetchTodayStats()
    }).catch((err) => {
      window.alert(err.message || '签退失败')
    })
  }

  const totalRecordsPages = Math.ceil(recordsTotal / recordsLimit)
  const inTrainingCount = todayStats.checked_in.length
  const completedCount = todayStats.completed.length
  const totalTodayCount = todayStats.total || (inTrainingCount + completedCount)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">签到打卡</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#1E3A5F]/10">
              <Users className="text-[#1E3A5F]" size={24} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">今日总签到</p>
              <p className="text-2xl font-bold text-[#1E3A5F] mt-0.5">{totalTodayCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-100">
              <Award className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">已签退</p>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{completedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#F59E0B]/10">
              <Activity className="text-[#F59E0B]" size={24} />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">在训中</p>
              <p className="text-2xl font-bold text-[#F59E0B] mt-0.5">{inTrainingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'checkin'
                ? 'text-[#1E3A5F] border-[#1E3A5F] bg-[#1E3A5F]/5'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text)] hover:bg-[var(--bg)]'
            }`}
          >
            <LogIn size={16} />
            签到操作
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'records'
                ? 'text-[#1E3A5F] border-[#1E3A5F] bg-[#1E3A5F]/5'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text)] hover:bg-[var(--bg)]'
            }`}
          >
            <Calendar size={16} />
            签到记录
          </button>
        </div>

        {activeTab === 'checkin' && (
          <div className="p-6 space-y-6">
            <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5081] rounded-lg p-6 text-white">
              <div className="flex items-center justify-center gap-3">
                <Clock size={28} className="text-[#F59E0B]" />
                <span className="text-2xl md:text-3xl font-mono font-bold tracking-wide">
                  {currentTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[var(--bg)] rounded-lg p-5 border border-[var(--border)]">
                <h3 className="text-base font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                  <UserCheck className="text-[#1E3A5F]" size={18} />
                  学员签到
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">选择学员</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] text-sm"
                    >
                      <option value="">请选择学员</option>
                      {students.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}（{s.training_type || '-'}）
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">选择教练</label>
                    <select
                      value={selectedCoachId}
                      onChange={(e) => setSelectedCoachId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] text-sm"
                    >
                      <option value="">请选择教练</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">选择科目</label>
                    <select
                      value={selectedCourseType}
                      onChange={(e) => setSelectedCourseType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] text-sm"
                    >
                      <option value="subject1">科目一</option>
                      <option value="subject2">科目二</option>
                      <option value="subject3">科目三</option>
                      <option value="subject4">科目四</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCheckIn}
                    disabled={submittingCheckIn}
                    className="w-full py-3.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {submittingCheckIn ? '签到中...' : '签 到'}
                  </button>
                </div>
              </div>

              <div className="bg-[var(--bg)] rounded-lg p-5 border border-[var(--border)]">
                <h3 className="text-base font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                  <LogOut className="text-red-500" size={18} />
                  待签退学员
                  {todayStats.checked_in.length > 0 && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#F59E0B] text-white font-medium">
                      {todayStats.checked_in.length}
                    </span>
                  )}
                </h3>
                {todayStats.checked_in.length === 0 ? (
                  <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
                    暂无待签退学员
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {todayStats.checked_in.map((record) => (
                      <div
                        key={record.id}
                        className="bg-white rounded-lg p-4 border border-[var(--border)] flex items-center gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[var(--text)] text-sm">{record.student_name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium">
                              {courseTypeMap[record.course_type] || record.course_type}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
                            <p>教练：{record.coach_name || '-'}</p>
                            <p className="flex items-center gap-1">
                              <Clock size={12} />
                              签到时间：{formatTime(record.check_in_time)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCheckOut(record.id, record.student_name)}
                          className="flex-shrink-0 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                        >
                          签退
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--text-secondary)] whitespace-nowrap">日期</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--text-secondary)] whitespace-nowrap">教练</label>
                <select
                  value={filterCoachId}
                  onChange={(e) => setFilterCoachId(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] text-sm"
                >
                  <option value="">全部教练</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSearchRecords}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2d5081] transition-colors"
              >
                <Search size={16} />
                搜索
              </button>
            </div>

            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">学员姓名</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">教练</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">科目</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">签到时间</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">签退时间</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">时长(小时)</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">
                          暂无签到记录
                        </td>
                      </tr>
                    ) : (
                      records.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--bg)] transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-[var(--text)]">{r.student_name}</td>
                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">{r.coach_name || '-'}</td>
                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                            {courseTypeMap[r.course_type] || r.course_type}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">{formatDateTime(r.check_in_time)}</td>
                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">{formatDateTime(r.check_out_time)}</td>
                          <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                            {r.duration_hours !== null && r.duration_hours !== undefined ? r.duration_hours : '-'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusMap[r.status]?.className || statusMap.checked_in.className}`}>
                              {statusMap[r.status]?.label || r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalRecordsPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  第 {recordsPage}/{totalRecordsPages} 页，共 {recordsTotal} 条
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
                    disabled={recordsPage <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                    上一页
                  </button>
                  <button
                    onClick={() => setRecordsPage((p) => Math.min(totalRecordsPages, p + 1))}
                    disabled={recordsPage >= totalRecordsPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
