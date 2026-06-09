import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import Modal from '@/components/Modal'
import { Plus, Search, Pencil, Trash2, Eye, UserCog, Clock, Calendar, Award, Users } from 'lucide-react'

interface Coach {
  id: number
  username: string
  name: string
  phone: string
  employee_id: string
  hire_date: string
  specialty: string
  coach_status: string
  license_number: string
  years_of_experience: number
  remark: string
  created_at: string
  student_count: number
  upcoming_schedule_count: number
  month_hours: number
}

interface CoachForm {
  username: string
  password: string
  name: string
  phone: string
  employee_id: string
  hire_date: string
  specialty: string
  coach_status: string
  license_number: string
  years_of_experience: string
  remark: string
}

const coachStatusMap: Record<string, { label: string; className: string }> = {
  active: { label: '在职', className: 'bg-emerald-100 text-emerald-700' },
  leave: { label: '休假', className: 'bg-amber-100 text-amber-700' },
  resigned: { label: '离职', className: 'bg-gray-100 text-gray-600' },
}

const specialtyOptions = [
  { value: 'subject1', label: '科目一' },
  { value: 'subject2', label: '科目二' },
  { value: 'subject3', label: '科目三' },
  { value: 'subject4', label: '科目四' },
  { value: 'subject1,subject2', label: '科目一、二' },
  { value: 'subject2,subject3', label: '科目二、三' },
  { value: 'subject1,subject2,subject3,subject4', label: '全科目' },
]

const emptyForm: CoachForm = {
  username: '',
  password: '',
  name: '',
  phone: '',
  employee_id: '',
  hire_date: '',
  specialty: '',
  coach_status: 'active',
  license_number: '',
  years_of_experience: '',
  remark: '',
}

export default function Coaches() {
  const navigate = useNavigate()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CoachForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchCoaches = (kw: string = keyword, st: string = statusFilter) => {
    const params = new URLSearchParams()
    if (kw) params.set('keyword', kw)
    if (st) params.set('status', st)
    api.get<{ success: boolean; data: Coach[] }>(
      `/coaches${params.toString() ? `?${params.toString()}` : ''}`
    ).then((res) => {
      setCoaches(res.data || [])
    }).catch(() => {})
  }

  useEffect(() => {
    fetchCoaches()
  }, [])

  const handleSearch = () => {
    fetchCoaches(keyword, statusFilter)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const openAddModal = () => {
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEditModal = (coach: Coach) => {
    setEditingId(coach.id)
    setForm({
      username: coach.username || '',
      password: '',
      name: coach.name || '',
      phone: coach.phone || '',
      employee_id: coach.employee_id || '',
      hire_date: coach.hire_date || '',
      specialty: coach.specialty || '',
      coach_status: coach.coach_status || 'active',
      license_number: coach.license_number || '',
      years_of_experience: coach.years_of_experience ? String(coach.years_of_experience) : '',
      remark: coach.remark || '',
    })
    setShowEdit(true)
  }

  const handleSubmitAdd = () => {
    if (!form.username.trim() || !form.password.trim() || !form.name.trim()) return
    setSubmitting(true)
    api.post('/coaches', {
      ...form,
      years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : 0,
    }).then(() => {
      setShowAdd(false)
      fetchCoaches(keyword, statusFilter)
    }).catch(() => {}).finally(() => setSubmitting(false))
  }

  const handleSubmitEdit = () => {
    if (!editingId || !form.name.trim()) return
    setSubmitting(true)
    const payload: any = {
      ...form,
      years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : 0,
    }
    if (!form.password.trim()) {
      delete payload.password
    }
    api.put(`/coaches/${editingId}`, payload).then(() => {
      setShowEdit(false)
      setEditingId(null)
      fetchCoaches(keyword, statusFilter)
    }).catch(() => {}).finally(() => setSubmitting(false))
  }

  const handleDelete = (coach: Coach) => {
    if (window.confirm(`确定删除教练「${coach.name}」吗？删除前请确保该教练没有在训学员和未完成排班。此操作不可撤销。`)) {
      api.delete(`/coaches/${coach.id}`).then(() => {
        fetchCoaches(keyword, statusFilter)
      }).catch(() => {})
    }
  }

  const handleToggleStatus = (coach: Coach) => {
    const nextStatus = coach.coach_status === 'active' ? 'leave' : coach.coach_status === 'leave' ? 'resigned' : 'active'
    const confirmMsg = `确定将教练「${coach.name}」状态变更为「${coachStatusMap[nextStatus]?.label}」吗？`
    if (window.confirm(confirmMsg)) {
      api.patch(`/coaches/${coach.id}/status`, { coach_status: nextStatus }).then(() => {
        fetchCoaches(keyword, statusFilter)
      }).catch(() => {})
    }
  }

  const updateForm = (field: keyof CoachForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const renderForm = (onSubmit: () => void) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">用户名 <span className="text-red-500">*</span></label>
          <input
            value={form.username}
            disabled={showEdit}
            onChange={(e) => updateForm('username', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            {showEdit ? '重置密码 (留空不修改)' : '密码'} <span className="text-red-500">{showEdit ? '' : '*'}</span>
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateForm('password', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            placeholder={showEdit ? '输入新密码，留空不修改' : '请输入登录密码'}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">姓名 <span className="text-red-500">*</span></label>
          <input
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">手机号</label>
          <input
            value={form.phone}
            onChange={(e) => updateForm('phone', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">工号</label>
          <input
            value={form.employee_id}
            onChange={(e) => updateForm('employee_id', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">入职日期</label>
          <input
            type="date"
            value={form.hire_date}
            onChange={(e) => updateForm('hire_date', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">擅长科目</label>
          <select
            value={form.specialty}
            onChange={(e) => updateForm('specialty', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="">请选择</option>
            {specialtyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">状态</label>
          <select
            value={form.coach_status}
            onChange={(e) => updateForm('coach_status', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="active">在职</option>
            <option value="leave">休假</option>
            <option value="resigned">离职</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">教练证号</label>
          <input
            value={form.license_number}
            onChange={(e) => updateForm('license_number', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">教龄 (年)</label>
          <input
            type="number"
            min="0"
            value={form.years_of_experience}
            onChange={(e) => updateForm('years_of_experience', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">备注</label>
        <textarea
          value={form.remark}
          onChange={(e) => updateForm('remark', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={submitting || !form.name.trim() || !form.username.trim() || (!showEdit && !form.password.trim())}
        className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? '提交中...' : showEdit ? '确认修改' : '确认添加'}
      </button>
    </div>
  )

  const totalStudents = coaches.reduce((s, c) => s + (c.student_count || 0), 0)
  const totalActive = coaches.filter((c) => !c.coach_status || c.coach_status === 'active').length
  const totalMonthHours = coaches.reduce((s, c) => s + (c.month_hours || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">教练管理</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
        >
          <Plus size={16} />
          添加教练
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <UserCog size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">教练总数</p>
            <p className="text-2xl font-semibold text-[var(--text)]">{coaches.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">在职教练</p>
            <p className="text-2xl font-semibold text-[var(--text)]">{totalActive}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">带教学员</p>
            <p className="text-2xl font-semibold text-[var(--text)]">{totalStudents}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[var(--border)] p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">本月学时 (h)</p>
            <p className="text-2xl font-semibold text-[var(--text)]">{totalMonthHours.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索教练姓名、手机号或工号"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">全部状态</option>
          <option value="active">在职</option>
          <option value="leave">休假</option>
          <option value="resigned">离职</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
        >
          搜索
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">教练信息</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">工号/证号</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">擅长科目</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">在训学员</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">本月学时</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">待上排班</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {coaches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
                    暂无教练数据
                  </td>
                </tr>
              ) : (
                coaches.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {c.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{c.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{c.phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-[var(--text)]">{c.employee_id || '-'}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{c.license_number || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
  <div className="flex flex-wrap gap-1">
    {c.specialty?.split(',').filter(Boolean).map((s) => {
      const subjectMap: Record<string, string> = {
        subject1: '科目一',
        subject2: '科目二',
        subject3: '科目三',
        subject4: '科目四'
      };
      return (
        <span key={s} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
          {subjectMap[s] || s}
        </span>
      );
    })}
    {!c.specialty && <span className="text-xs text-[var(--text-secondary)]">-</span>}
  </div>
</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 text-[var(--text)]">
                        <Users size={14} className="text-blue-500" />
                        {c.student_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 text-[var(--text)]">
                        <Clock size={14} className="text-amber-500" />
                        {c.month_hours?.toFixed(1) || '0.0'} h
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 text-[var(--text)]">
                        <Calendar size={14} className="text-emerald-500" />
                        {c.upcoming_schedule_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors hover:opacity-80 ${coachStatusMap[c.coach_status]?.className || coachStatusMap.active.className}`}
                      >
                        {coachStatusMap[c.coach_status]?.label || '在职'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/coaches/${c.id}`)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                          title="查看详情"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-md hover:bg-amber-50 text-amber-600 transition-colors"
                          title="编辑"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="添加教练">
        {renderForm(handleSubmitAdd)}
      </Modal>

      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setEditingId(null) }} title="编辑教练">
        {renderForm(handleSubmitEdit)}
      </Modal>
    </div>
  )
}
