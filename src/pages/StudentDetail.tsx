import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '@/utils/api'
import { useState, useEffect } from 'react'
import { ArrowLeft, User, Phone, CreditCard, Car, CalendarDays, Clock, UserCheck, FileText, AlertCircle } from 'lucide-react'

const GENDER_MAP: Record<string, string> = { male: '男', female: '女' }
const STAGE_MAP: Record<string, string> = { subject1: '科目一', subject2: '科目二', subject3: '科目三', subject4: '科目四' }
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '在训', color: 'bg-green-50 text-green-600' },
  completed: { label: '已结业', color: 'bg-blue-50 text-blue-600' },
  suspended: { label: '暂停', color: 'bg-gray-50 text-gray-500' },
}

interface HoursSummary {
  course_type: string
  total_hours: number
}

interface StudentData {
  id: number
  name: string
  gender: string
  id_card: string
  phone: string
  training_type: string
  stage: string
  enroll_date: string
  expected_complete_date: string
  coach_id: number
  coach_name: string
  status: string
  remark: string
  created_at: string
  hours_summary: HoursSummary[]
}

interface ProgressItem {
  course_type: string
  required_hours: number
  current_hours: number
  percentage: number
}

interface ProgressData {
  progress: ProgressItem[]
  total_hours: number
  total_required: number
  overall_percentage: number
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentData | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)

  useEffect(() => {
    if (id) {
      api.get<{ success: boolean; data: StudentData }>(`/students/${id}`).then((res) => {
        setStudent(res.data)
      }).catch(() => {})
      api.get<{ success: boolean; data: ProgressData }>(`/statistics/student/${id}`).then((res) => {
        setProgress(res.data)
      }).catch(() => {})
    }
  }, [id])

  function progressColor(pct: number) {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
      >
        <ArrowLeft size={16} />
        返回学员列表
      </button>

      {student ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-xl border border-[var(--border)] shadow-sm p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <User size={36} className="text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text)]">{student.name}</h2>
                <span className={`mt-2 text-xs px-3 py-1 rounded-full font-medium ${STATUS_MAP[student.status]?.color || 'bg-gray-50 text-gray-500'}`}>
                  {STATUS_MAP[student.status]?.label || student.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">手机号</p>
                    <p className="text-sm text-[var(--text)]">{student.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">身份证号</p>
                    <p className="text-sm text-[var(--text)]">{student.id_card || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">性别</p>
                    <p className="text-sm text-[var(--text)]">{GENDER_MAP[student.gender] || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Car size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">培训类型</p>
                    <p className="text-sm text-[var(--text)]">{student.training_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">当前科目</p>
                    <p className="text-sm text-[var(--text)]">{STAGE_MAP[student.stage] || student.stage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserCheck size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">带教教练</p>
                    <p className="text-sm text-[var(--text)]">{student.coach_name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">入学日期</p>
                    <p className="text-sm text-[var(--text)]">{student.enroll_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">预计完成</p>
                    <p className="text-sm text-[var(--text)]">{student.expected_complete_date || '-'}</p>
                  </div>
                </div>
                {student.remark && (
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-[var(--text-secondary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[var(--text-secondary)]">备注</p>
                      <p className="text-sm text-[var(--text)]">{student.remark}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {progress && (
                <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6">
                  <h3 className="text-base font-semibold text-[var(--text)] mb-4">培训进度</h3>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--text-secondary)]">总体进度</span>
                      <span className="text-sm font-medium text-[var(--text)]">{progress.overall_percentage}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor(progress.overall_percentage)}`}
                        style={{ width: `${Math.min(progress.overall_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[var(--text-secondary)]">已完成 {progress.total_hours} 小时</span>
                      <span className="text-xs text-[var(--text-secondary)]">需完成 {progress.total_required} 小时</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {progress.progress.map((item) => (
                      <div key={item.course_type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-[var(--text)]">
                            {STAGE_MAP[item.course_type] || item.course_type}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-secondary)]">
                              {item.current_hours} / {item.required_hours} 小时
                            </span>
                            {item.percentage < 80 && (
                              <AlertCircle size={14} className="text-amber-500" />
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor(item.percentage)}`}
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6">
                <h3 className="text-base font-semibold text-[var(--text)] mb-4">学时明细</h3>
                {student.hours_summary && student.hours_summary.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[var(--bg)]">
                          <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)]">科目</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-secondary)]">累计学时</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {student.hours_summary.map((h) => (
                          <tr key={h.course_type} className="hover:bg-[var(--bg)] transition-colors">
                            <td className="px-4 py-3 text-sm text-[var(--text)]">{STAGE_MAP[h.course_type] || h.course_type}</td>
                            <td className="px-4 py-3 text-sm text-[var(--text)] font-medium">{h.total_hours} 小时</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-[var(--text-secondary)]">暂无学时记录</div>
                )}
              </div>

              <div className="flex gap-3">
                <Link
                  to="/attendance"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  <Clock size={16} />
                  前往签到
                </Link>
                <Link
                  to="/statistics"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-gray-50 transition-colors"
                >
                  查看统计
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-12 text-center text-[var(--text-secondary)]">
          加载中...
        </div>
      )}
    </div>
  )
}
