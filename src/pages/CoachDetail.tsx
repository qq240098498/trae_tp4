import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, User, Phone, CalendarDays, Clock, Users, Award,
  FileText, AlertTriangle, TrendingUp, BadgeCheck, Star, BookOpen
} from 'lucide-react'

const COACH_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '在职', color: 'bg-emerald-100 text-emerald-700' },
  leave: { label: '休假', color: 'bg-amber-100 text-amber-700' },
  resigned: { label: '离职', color: 'bg-gray-100 text-gray-600' },
}

const STAGE_MAP: Record<string, string> = { subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' }
const STUDENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '在训', color: 'bg-emerald-50 text-emerald-600' },
  completed: { label: '已结业', color: 'bg-blue-50 text-blue-600' },
  suspended: { label: '暂停', color: 'bg-gray-50 text-gray-500' },
}
const SCHEDULE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  available: { label: '可预约', color: 'bg-emerald-50 text-emerald-600' },
  full: { label: '已满', color: 'bg-amber-50 text-amber-600' },
  cancelled: { label: '已取消', color: 'bg-gray-50 text-gray-500' },
}
const PERF_GRADE_MAP: Record<string, { label: string; color: string }> = {
  excellent: { label: '优秀', color: 'bg-emerald-100 text-emerald-700' },
  good: { label: '良好', color: 'bg-blue-100 text-blue-700' },
  pass: { label: '合格', color: 'bg-amber-100 text-amber-700' },
  fail: { label: '不合格', color: 'bg-red-100 text-red-700' },
  pending: { label: '待评定', color: 'bg-gray-100 text-gray-600' },
}

interface CoachStats {
  active_student_count: number
  completed_student_count: number
  total_student_count: number
  total_teaching_hours: number
  total_schedule_count: number
  upcoming_schedule_count: number
  evaluation_count: number
  avg_evaluation_score: number
  violation_count: number
}

interface RecentStudent {
  id: number
  name: string
  training_type: string
  stage: string
  status: string
  enroll_date: string
}

interface RecentSchedule {
  id: number
  course_type: string
  schedule_date: string
  start_time: string
  end_time: string
  max_students: number
  current_students: number
  status: string
}

interface RecentAttendance {
  id: number
  check_in_time: string
  check_out_time: string
  duration_hours: number
  course_type: string
  student_name: string
}

interface HourlyRate {
  course_type: string
  course_name: string
  hourly_rate: number
  effective_date: string | null
}

interface CoachDetailData {
  id: number
  username: string
  name: string
  phone: string
  created_at: string
  employee_id: string
  hire_date: string
  specialty: string
  coach_status: string
  license_number: string
  years_of_experience: number
  remark: string
  stats: CoachStats
  recent_students: RecentStudent[]
  recent_schedules: RecentSchedule[]
  recent_attendance: RecentAttendance[]
  recent_performance: any
  hourly_rates: HourlyRate[]
}

export default function CoachDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [coach, setCoach] = useState<CoachDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      setLoading(true)
      api.get<{ success: boolean; data: CoachDetailData }>(`/coaches/${id}`).then((res) => {
        setCoach(res.data)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [id])

  const specialtyList = coach?.specialty?.split(',').filter(Boolean) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--text-secondary)] text-sm">加载中...</p>
      </div>
    )
  }

  if (!coach) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/coaches')}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft size={16} />
          返回教练列表
        </button>
        <div className="py-20 text-center text-sm text-[var(--text-secondary)]">教练不存在或已被删除</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/coaches')}
        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft size={16} />
        返回教练列表
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-[var(--border)] shadow-sm p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <User size={36} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)]">{coach.name}</h2>
            <span className={`mt-2 text-xs px-3 py-1 rounded-full font-medium ${COACH_STATUS_MAP[coach.coach_status]?.color || COACH_STATUS_MAP.active.color}`}>
              {COACH_STATUS_MAP[coach.coach_status]?.label || '在职'}
            </span>
            {coach.recent_performance && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PERF_GRADE_MAP[coach.recent_performance.grade]?.color || PERF_GRADE_MAP.pending.color}`}>
                  {PERF_GRADE_MAP[coach.recent_performance.grade]?.label || '待评定'}
                </span>
                {coach.recent_performance.ranking && (
                  <span className="text-xs text-[var(--text-secondary)]">排名 #{coach.recent_performance.ranking}</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <BadgeCheck size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">用户名</p>
                <p className="text-[var(--text)] truncate">{coach.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">联系电话</p>
                <p className="text-[var(--text)]">{coach.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">工号</p>
                <p className="text-[var(--text)]">{coach.employee_id || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">教练证号</p>
                <p className="text-[var(--text)]">{coach.license_number || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">入职日期</p>
                <p className="text-[var(--text)]">{coach.hire_date || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">教龄</p>
                <p className="text-[var(--text)]">{coach.years_of_experience ? `${coach.years_of_experience} 年` : '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1.5">擅长科目</p>
              <div className="flex flex-wrap gap-1.5">
                {specialtyList.length > 0 ? specialtyList.map((s) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-600 font-medium">
                    {STAGE_MAP[s] || s}
                  </span>
                )) : (
                  <span className="text-xs text-[var(--text-secondary)]">-</span>
                )}
              </div>
            </div>
            {coach.remark && (
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-1.5">备注</p>
                <p className="text-sm text-[var(--text)] bg-[var(--bg)] rounded-lg p-3">{coach.remark}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Users size={16} />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">在训学员</span>
              </div>
              <p className="text-2xl font-semibold text-[var(--text)]">{coach.stats.active_student_count || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Award size={16} />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">结业学员</span>
              </div>
              <p className="text-2xl font-semibold text-[var(--text)]">{coach.stats.completed_student_count || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Clock size={16} />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">累计学时</span>
              </div>
              <p className="text-2xl font-semibold text-[var(--text)]">{(coach.stats.total_teaching_hours || 0).toFixed(1)}<span className="text-sm font-normal text-[var(--text-secondary)] ml-1">h</span></p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                  <Star size={16} />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">平均评分</span>
              </div>
              <p className="text-2xl font-semibold text-[var(--text)]">{(coach.stats.avg_evaluation_score || 0).toFixed(1)}<span className="text-sm font-normal text-[var(--text-secondary)] ml-1">/5</span></p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle size={16} />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">违规记录</span>
              </div>
              <p className="text-2xl font-semibold text-[var(--text)]">{coach.stats.violation_count || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  <h3 className="font-semibold text-[var(--text)]">近期学员</h3>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">共 {coach.stats.total_student_count || 0} 名</span>
              </div>
              {coach.recent_students.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-secondary)]">暂无学员</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {coach.recent_students.map((s) => (
                    <div key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg)] cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                          {s.name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{s.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{s.training_type} · {STAGE_MAP[s.stage] || s.stage}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STUDENT_STATUS_MAP[s.status]?.color || STUDENT_STATUS_MAP.active.color}`}>
                        {STUDENT_STATUS_MAP[s.status]?.label || s.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary" />
                  <h3 className="font-semibold text-[var(--text)]">近期排班</h3>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">待上 {coach.stats.upcoming_schedule_count || 0} 节</span>
              </div>
              {coach.recent_schedules.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-secondary)]">暂无排班记录</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {coach.recent_schedules.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg)] transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text)]">{STAGE_MAP[s.course_type] || s.course_type}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{s.schedule_date}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.start_time} - {s.end_time}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_STATUS_MAP[s.status]?.color || ''}`}>
                          {SCHEDULE_STATUS_MAP[s.status]?.label || s.status}
                        </span>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{s.current_students}/{s.max_students}人</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <h3 className="font-semibold text-[var(--text)]">近期考勤</h3>
                </div>
              </div>
              {coach.recent_attendance.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-secondary)]">暂无考勤记录</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {coach.recent_attendance.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg)] transition-colors">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{a.student_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{STAGE_MAP[a.course_type] || a.course_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--text)]">{a.duration_hours?.toFixed(1)} h</p>
                        <p className="text-xs text-[var(--text-secondary)]">{a.check_in_time?.substring(0, 16)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[var(--border)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-primary" />
                  <h3 className="font-semibold text-[var(--text)]">课时费标准</h3>
                </div>
              </div>
              <div className="space-y-2">
                {coach.hourly_rates.map((r) => (
                  <div key={r.course_type} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{r.course_name}</p>
                      {r.effective_date && <p className="text-xs text-[var(--text-secondary)]">生效日期：{r.effective_date}</p>}
                    </div>
                    <p className="text-lg font-semibold text-primary">¥{r.hourly_rate}/h</p>
                  </div>
                ))}
              </div>
              {coach.recent_performance && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-secondary)] mb-2">最新绩效</p>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-blue-50">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">综合评分</p>
                      <p className="text-xs text-[var(--text-secondary)]">{coach.recent_performance.period_start} ~ {coach.recent_performance.period_end}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{coach.recent_performance.composite_score?.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
