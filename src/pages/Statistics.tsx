import { useState, useEffect } from 'react'
import { api } from '@/utils/api'
import { BarChart3, Search } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const COURSE_MAP: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
}

const COURSE_COLORS: Record<string, string> = {
  subject1: '#1E3A5F',
  subject2: '#48BB78',
  subject3: '#F59E0B',
  subject4: '#9F7AEA',
}

interface CoachItem {
  coach_id: number
  coach_name: string
  total_hours: number
}

interface CourseItem {
  course_type: string
  total_hours: number
}

interface BatchData {
  by_course_type: CourseItem[]
  by_coach: CoachItem[]
  total_hours: number
}

interface StudentListItem {
  id: number
  name: string
}

interface StudentHoursByCourse {
  course_type: string
  current_hours: number
  required_hours: number
  percentage: number
}

interface StudentStatData {
  student: { id: number; name: string }
  hours_by_course: StudentHoursByCourse[]
  progress: number
  total_hours: number
  total_required: number
  overall_percentage: number
}

function progressColor(pct: number) {
  if (pct >= 80) return '#48BB78'
  if (pct >= 50) return '#F59E0B'
  return '#F56565'
}

export default function Statistics() {
  const [coachId, setCoachId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [batchData, setBatchData] = useState<BatchData | null>(null)

  const [students, setStudents] = useState<StudentListItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentStat, setStudentStat] = useState<StudentStatData | null>(null)

  const [coaches, setCoaches] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    api.get<{ data: { list: StudentListItem[] } }>('/students?limit=100').then((res) => {
      setStudents(res.data?.list || [])
    }).catch(() => {})

    api.get<{ data: { id: number; name: string }[] }>('/coaches').then((res) => {
      setCoaches(res.data || [])
    }).catch(() => {})
  }, [])

  const handleBatchQuery = () => {
    const params = new URLSearchParams()
    if (coachId) params.set('coach_id', coachId)
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    api.get<{ success: boolean; data: BatchData }>(`/statistics/batch?${params.toString()}`).then((res) => {
      setBatchData(res.data)
    }).catch(() => {})
  }

  const handleStudentQuery = () => {
    if (!selectedStudentId) return
    api.get<{ success: boolean; data: StudentStatData }>(`/statistics/student/${selectedStudentId}`).then((res) => {
      setStudentStat(res.data)
    }).catch(() => {})
  }

  const courseChartData = (batchData?.by_course_type || []).map((item) => ({
    name: COURSE_MAP[item.course_type] || item.course_type,
    学时: item.total_hours,
    fill: COURSE_COLORS[item.course_type] || '#1E3A5F',
  }))

  const coachChartData = (batchData?.by_coach || []).map((item) => ({
    name: item.coach_name,
    学时: item.total_hours,
  }))

  const pieData = (batchData?.by_course_type || []).map((item) => ({
    name: COURSE_MAP[item.course_type] || item.course_type,
    value: item.total_hours,
    fill: COURSE_COLORS[item.course_type] || '#1E3A5F',
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">学时统计</h2>
        <BarChart3 size={20} className="text-[var(--text-secondary)]" />
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">教练</label>
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">全部教练</option>
              {coaches.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
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
          <button
            onClick={handleBatchQuery}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
          >
            <Search size={16} />
            查询
          </button>
        </div>
      </div>

      {batchData && (
        <>
          <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6">
            <p className="text-sm text-[var(--text-secondary)] mb-2">总学时数</p>
            <p className="text-4xl font-bold text-primary">{batchData.total_hours}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6">
              <h3 className="text-base font-semibold text-[var(--text)] mb-4">各科目学时分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="学时" fill="#1E3A5F">
                    {courseChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6">
              <h3 className="text-base font-semibold text-[var(--text)] mb-4">各教练学时分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coachChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="学时" fill="#1E3A5F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {pieData.length > 0 && (
            <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6">
              <h3 className="text-base font-semibold text-[var(--text)] mb-4">科目学时占比</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-4">
        <h3 className="text-base font-semibold text-[var(--text)] mb-4">学员学时查询</h3>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">选择学员</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-w-[200px]"
            >
              <option value="">请选择学员</option>
              {students.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleStudentQuery}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
          >
            <Search size={16} />
            查询
          </button>
        </div>
      </div>

      {studentStat && (
        <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm p-6 space-y-6">
          <h3 className="text-base font-semibold text-[var(--text)]">
            {studentStat.student.name} - 学时进度
          </h3>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--text-secondary)]">总体进度</span>
              <span className="text-sm font-medium" style={{ color: progressColor(studentStat.overall_percentage) }}>
                {studentStat.overall_percentage}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(studentStat.overall_percentage, 100)}%`,
                  backgroundColor: progressColor(studentStat.overall_percentage),
                }}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {studentStat.total_hours} / {studentStat.total_required} 学时
            </p>
          </div>

          <div className="space-y-4">
            {studentStat.hours_by_course.map((item) => (
              <div key={item.course_type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text)]">{COURSE_MAP[item.course_type] || item.course_type}</span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {item.current_hours} / {item.required_hours}
                    <span className="ml-2 font-medium" style={{ color: progressColor(item.percentage) }}>
                      {item.percentage}%
                    </span>
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: progressColor(item.percentage),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
