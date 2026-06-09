import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import Modal from '@/components/Modal'
import { useAuthStore } from '@/store'
import { Plus, Calendar as CalendarIcon, Trash2, UserPlus, XCircle, User } from 'lucide-react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Schedule {
  id: number
  coach_id: number
  course_type: string
  schedule_date: string
  start_time: string
  end_time: string
  max_students: number
  current_students: number
  status: string
  coach_name: string
  bookings?: Array<{
    id: number
    student_id: number
    student_name: string
    training_type: string
    created_at: string
  }>
}

interface Coach {
  id: number
  name: string
  phone: string
  role: string
}

interface Student {
  id: number
  name: string
  phone: string
  training_type: string
  stage: string
  coach_name: string
}

interface ScheduleForm {
  coach_id: string
  course_type: string
  schedule_date: string
  start_time: string
  end_time: string
  max_students: string
}

const courseTypeMap: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
}

const statusMap: Record<string, { label: string; className: string }> = {
  available: { label: '可预约', className: 'bg-emerald-100 text-emerald-700' },
  full: { label: '已满', className: 'bg-red-100 text-red-700' },
  cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-600' },
}

const courseColorMap: Record<string, { border: string; bg: string; text: string }> = {
  subject1: { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' },
  subject2: { border: 'border-green-300', bg: 'bg-green-50', text: 'text-green-700' },
  subject3: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-700' },
  subject4: { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-700' },
}

const emptyForm: ScheduleForm = {
  coach_id: '',
  course_type: 'subject1',
  schedule_date: '',
  start_time: '09:00',
  end_time: '10:00',
  max_students: '4',
}

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function Scheduling() {
  const { token } = useAuthStore()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [rangeStart, setRangeStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [rangeEnd, setRangeEnd] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const [coachFilter, setCoachFilter] = useState<string>('')
  const [activePreset, setActivePreset] = useState<string>('thisWeek')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [form, setForm] = useState<ScheduleForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchSchedules = () => {
    const params = new URLSearchParams({
      start_date: format(rangeStart, 'yyyy-MM-dd'),
      end_date: format(rangeEnd, 'yyyy-MM-dd'),
    })
    if (coachFilter) params.set('coach_id', coachFilter)
    api
      .get<{ success: boolean; data: Schedule[] }>(`/schedules?${params.toString()}`)
      .then((res) => {
        setSchedules(res.data || [])
      })
      .catch(() => {})
  }

  const fetchScheduleDetail = (scheduleId: number) => {
    setDetailLoading(true)
    api
      .get<{ success: boolean; data: Schedule }>(`/schedules/${scheduleId}`)
      .then((res) => {
        const detail = res.data
        if (detail) {
          setSelectedSchedule(detail)
          const idx = schedules.findIndex((s) => s.id === scheduleId)
          if (idx >= 0) {
            const newSchedules = [...schedules]
            newSchedules[idx] = detail
            setSchedules(newSchedules)
          }
        }
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  const fetchCoaches = () => {
    api
      .get<{ success: boolean; data: Coach[] }>('/coaches')
      .then((res) => {
        setCoaches(res.data || [])
      })
      .catch(() => {})
  }

  const fetchStudents = () => {
    api
      .get<{ success: boolean; data: { list: Student[] } }>('/students?limit=100')
      .then((res) => {
        setStudents(res.data?.list || [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchCoaches()
    fetchStudents()
  }, [])

  useEffect(() => {
    if (token) fetchSchedules()
  }, [rangeStart, rangeEnd, coachFilter, token])

  const setDateRange = (preset: string) => {
    const today = new Date()
    setActivePreset(preset)
    if (preset === 'thisWeek') {
      setRangeStart(startOfWeek(today, { weekStartsOn: 1 }))
      setRangeEnd(endOfWeek(today, { weekStartsOn: 1 }))
    } else if (preset === 'nextWeek') {
      const nextMonday = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1)
      setRangeStart(nextMonday)
      setRangeEnd(endOfWeek(nextMonday, { weekStartsOn: 1 }))
    } else if (preset === 'thisMonth') {
      setRangeStart(startOfMonth(today))
      setRangeEnd(endOfMonth(today))
    }
  }

  const getWeekDates = () => {
    const dates: Date[] = []
    const start = startOfWeek(rangeStart, { weekStartsOn: 1 })
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(start, i))
    }
    return dates
  }

  const getSchedulesForDate = (date: Date) => {
    return schedules
      .filter((s) => isSameDay(parseISO(s.schedule_date), date))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const weekDates = getWeekDates()

  const openAddModal = () => {
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openDetailModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setSelectedStudentId('')
    setShowDetail(true)
    fetchScheduleDetail(schedule.id)
  }

  const updateForm = (field: keyof ScheduleForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitAdd = () => {
    if (!form.coach_id || !form.schedule_date || !form.start_time || !form.end_time) return
    setSubmitting(true)
    api
      .post<{ success: boolean; data: Schedule }>('/schedules', {
        coach_id: Number(form.coach_id),
        course_type: form.course_type,
        schedule_date: form.schedule_date,
        start_time: form.start_time,
        end_time: form.end_time,
        max_students: Number(form.max_students) || 4,
      })
      .then(() => {
        setShowAdd(false)
        fetchSchedules()
      })
      .catch(() => {})
      .finally(() => setSubmitting(false))
  }

  const handleDeleteSchedule = () => {
    if (!selectedSchedule) return
    if (!window.confirm(`确定删除此排班吗？此操作不可撤销。`)) return
    setDeleting(true)
    api
      .delete<{ success: boolean; data: null }>(`/schedules/${selectedSchedule.id}`)
      .then(() => {
        setShowDetail(false)
        setSelectedSchedule(null)
        fetchSchedules()
      })
      .catch(() => {})
      .finally(() => setDeleting(false))
  }

  const handleBookStudent = () => {
    if (!selectedSchedule || !selectedStudentId) return
    setBookingLoading(true)
    api
      .post<{ success: boolean; data: Schedule }>(`/schedules/${selectedSchedule.id}/book`, {
        student_id: Number(selectedStudentId),
      })
      .then((res) => {
        const updated = res.data
        setSelectedStudentId('')
        if (updated) {
          setSelectedSchedule(updated)
          const idx = schedules.findIndex((s) => s.id === updated.id)
          if (idx >= 0) {
            const newSchedules = [...schedules]
            newSchedules[idx] = updated
            setSchedules(newSchedules)
          }
        }
      })
      .catch((err) => {
        window.alert(err?.response?.data?.error || '预约失败')
      })
      .finally(() => setBookingLoading(false))
  }

  const handleCancelBooking = (studentId: number) => {
    if (!selectedSchedule) return
    if (!window.confirm('确定取消该学员的预约吗？')) return
    api
      .delete<{ success: boolean; data: Schedule }>(`/schedules/${selectedSchedule.id}/book/${studentId}`)
      .then((res) => {
        const updated = res.data
        if (updated) {
          setSelectedSchedule(updated)
          const idx = schedules.findIndex((s) => s.id === updated.id)
          if (idx >= 0) {
            const newSchedules = [...schedules]
            newSchedules[idx] = updated
            setSchedules(newSchedules)
          }
        }
      })
      .catch((err) => {
        window.alert(err?.response?.data?.error || '取消预约失败')
      })
  }

  const presetButtons = [
    { key: 'thisWeek', label: '本周' },
    { key: 'nextWeek', label: '下周' },
    { key: 'thisMonth', label: '本月' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">课程排班</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-lg p-1">
            {presetButtons.map((p) => (
              <button
                key={p.key}
                onClick={() => setDateRange(p.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activePreset === p.key
                    ? 'bg-[#1E3A5F] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="">全部教练</option>
            {coaches.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2a4d7a] transition-colors"
          >
            <Plus size={16} />
            新建排班
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg)]">
          {weekDates.map((date, idx) => (
            <div
              key={idx}
              className="px-4 py-3 text-center border-r border-[var(--border)] last:border-r-0"
            >
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                {weekDays[idx]}
              </div>
              <div className="text-sm font-semibold text-[var(--text)]">
                {format(date, 'M/d', { locale: zhCN })}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[600px]">
          {weekDates.map((date, idx) => {
            const daySchedules = getSchedulesForDate(date)
            return (
              <div
                key={idx}
                className="border-r border-[var(--border)] last:border-r-0 p-2 space-y-2 min-h-[600px] bg-white"
              >
                {daySchedules.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)]/50 py-8">
                    暂无排班
                  </div>
                ) : (
                  daySchedules.map((s) => {
                    const colors = courseColorMap[s.course_type] || courseColorMap.subject1
                    const status = statusMap[s.status] || statusMap.available
                    return (
                      <div
                        key={s.id}
                        onClick={() => openDetailModal(s)}
                        className={`rounded-lg border ${colors.border} ${colors.bg} p-3 cursor-pointer hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${colors.text}`}>
                            {courseTypeMap[s.course_type] || s.course_type}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text)] font-medium mb-1">
                          {s.start_time} - {s.end_time}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                          <User size={12} />
                          {s.coach_name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {s.current_students}/{s.max_students} 人
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="新建排班">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              教练 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.coach_id}
              onChange={(e) => updateForm('coach_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            >
              <option value="">请选择教练</option>
              {coaches.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">课程类型</label>
            <select
              value={form.course_type}
              onChange={(e) => updateForm('course_type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            >
              <option value="subject1">科目一</option>
              <option value="subject2">科目二</option>
              <option value="subject3">科目三</option>
              <option value="subject4">科目四</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              排班日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.schedule_date}
              onChange={(e) => updateForm('schedule_date', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">开始时间</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateForm('start_time', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">结束时间</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateForm('end_time', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">最大人数</label>
            <input
              type="number"
              min="1"
              value={form.max_students}
              onChange={(e) => updateForm('max_students', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={handleSubmitAdd}
            disabled={
              submitting ||
              !form.coach_id ||
              !form.schedule_date ||
              !form.start_time ||
              !form.end_time
            }
            className="w-full py-2.5 rounded-lg bg-[#1E3A5F] text-white font-medium hover:bg-[#2a4d7a] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CalendarIcon size={16} />
            {submitting ? '保存中...' : '确认创建'}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false)
          setSelectedSchedule(null)
        }}
        title="排班详情"
        width="max-w-xl"
      >
        {detailLoading ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)]">加载中...</div>
        ) : selectedSchedule && (
          <div className="space-y-5">
            <div
              className={`rounded-lg p-4 border ${
                courseColorMap[selectedSchedule.course_type]?.border || 'border-blue-300'
              } ${courseColorMap[selectedSchedule.course_type]?.bg || 'bg-blue-50'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span
                    className={`text-lg font-bold ${
                      courseColorMap[selectedSchedule.course_type]?.text || 'text-blue-700'
                    }`}
                  >
                    {courseTypeMap[selectedSchedule.course_type] || selectedSchedule.course_type}
                  </span>
                  <span
                    className={`ml-3 text-xs px-2.5 py-1 rounded-full font-medium ${
                      statusMap[selectedSchedule.status]?.className ||
                      statusMap.available.className
                    }`}
                  >
                    {statusMap[selectedSchedule.status]?.label || selectedSchedule.status}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {selectedSchedule.current_students}/{selectedSchedule.max_students}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">已约/可约人数</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[var(--text-secondary)]">教练：</span>
                  <span className="font-medium text-[var(--text)]">
                    {selectedSchedule.coach_name}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">日期：</span>
                  <span className="font-medium text-[var(--text)]">
                    {selectedSchedule.schedule_date}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--text-secondary)]">时间：</span>
                  <span className="font-medium text-[var(--text)]">
                    {selectedSchedule.start_time} - {selectedSchedule.end_time}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <User size={14} />
                已预约学员
              </h3>
              <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] max-h-48 overflow-y-auto">
                {!selectedSchedule.bookings || selectedSchedule.bookings.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
                    暂无预约学员
                  </div>
                ) : (
                  selectedSchedule.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg)]"
                    >
                      <div>
                        <div className="text-sm font-medium text-[var(--text)]">
                          {b.student_name}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {b.training_type}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(b.student_id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                        title="取消预约"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <UserPlus size={14} />
                添加学员预约
              </h3>
              <div className="flex gap-2">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                >
                  <option value="">请选择学员</option>
                  {students.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} - {s.training_type}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBookStudent}
                  disabled={bookingLoading || !selectedStudentId}
                  className="px-4 py-2 rounded-lg bg-[#F59E0B] text-white text-sm font-medium hover:bg-[#d97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  {bookingLoading ? '预约中...' : '预约'}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={handleDeleteSchedule}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 size={16} />
                {deleting ? '删除中...' : '删除排班'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
