import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import Modal from '@/components/Modal'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

interface Student {
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
}

interface Coach {
  id: number
  name: string
}

interface StudentForm {
  name: string
  gender: string
  id_card: string
  phone: string
  training_type: string
  stage: string
  enroll_date: string
  expected_complete_date: string
  coach_id: string
  status: string
  remark: string
}

const genderMap: Record<string, string> = { male: '男', female: '女' }
const stageMap: Record<string, string> = {
  subject1: '科目一',
  subject2: '科目二',
  subject3: '科目三',
  subject4: '科目四',
}
const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: '在训', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '已结业', className: 'bg-blue-100 text-blue-700' },
  suspended: { label: '暂停', className: 'bg-gray-100 text-gray-600' },
}

const emptyForm: StudentForm = {
  name: '',
  gender: 'male',
  id_card: '',
  phone: '',
  training_type: 'C1',
  stage: 'subject1',
  enroll_date: '',
  expected_complete_date: '',
  coach_id: '',
  status: 'active',
  remark: '',
}

export default function Students() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<StudentForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchStudents = (p: number = page, kw: string = keyword, st: string = statusFilter) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (kw) params.set('keyword', kw)
    if (st) params.set('status', st)
    api.get<{ success: boolean; data: { list: Student[]; total: number; page: number; limit: number } }>(
      `/students?${params.toString()}`
    ).then((res) => {
      setStudents(res.data.list || [])
      setTotal(res.data.total || 0)
    }).catch(() => {})
  }

  useEffect(() => {
    fetchStudents()
  }, [page])

  useEffect(() => {
    api.get<{ success: boolean; data: Coach[] }>('/coaches').then((res) => {
      setCoaches(res.data || [])
    }).catch(() => {})
  }, [])

  const handleSearch = () => {
    setPage(1)
    fetchStudents(1, keyword, statusFilter)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const totalPages = Math.ceil(total / limit)

  const openAddModal = () => {
    setForm(emptyForm)
    setShowAdd(true)
  }

  const openEditModal = (student: Student) => {
    setEditingId(student.id)
    setForm({
      name: student.name,
      gender: student.gender || 'male',
      id_card: student.id_card || '',
      phone: student.phone || '',
      training_type: student.training_type || 'C1',
      stage: student.stage || 'subject1',
      enroll_date: student.enroll_date || '',
      expected_complete_date: student.expected_complete_date || '',
      coach_id: student.coach_id ? String(student.coach_id) : '',
      status: student.status || 'active',
      remark: student.remark || '',
    })
    setShowEdit(true)
  }

  const handleSubmitAdd = () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    api.post('/students', {
      ...form,
      coach_id: form.coach_id ? Number(form.coach_id) : null,
    }).then(() => {
      setShowAdd(false)
      fetchStudents(page, keyword, statusFilter)
    }).catch(() => {}).finally(() => setSubmitting(false))
  }

  const handleSubmitEdit = () => {
    if (!editingId || !form.name.trim()) return
    setSubmitting(true)
    api.put(`/students/${editingId}`, {
      ...form,
      coach_id: form.coach_id ? Number(form.coach_id) : null,
    }).then(() => {
      setShowEdit(false)
      setEditingId(null)
      fetchStudents(page, keyword, statusFilter)
    }).catch(() => {}).finally(() => setSubmitting(false))
  }

  const handleDelete = (student: Student) => {
    if (window.confirm(`确定删除学员「${student.name}」吗？此操作不可撤销。`)) {
      api.delete(`/students/${student.id}`).then(() => {
        fetchStudents(page, keyword, statusFilter)
      }).catch(() => {})
    }
  }

  const updateForm = (field: keyof StudentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const renderForm = (onSubmit: () => void) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">姓名 <span className="text-red-500">*</span></label>
        <input
          value={form.name}
          onChange={(e) => updateForm('name', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">性别</label>
          <select
            value={form.gender}
            onChange={(e) => updateForm('gender', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">培训类型</label>
          <select
            value={form.training_type}
            onChange={(e) => updateForm('training_type', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="C1">C1</option>
            <option value="C2">C2</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">身份证号</label>
        <input
          value={form.id_card}
          onChange={(e) => updateForm('id_card', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">手机号</label>
        <input
          value={form.phone}
          onChange={(e) => updateForm('phone', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">当前科目</label>
        <select
          value={form.stage}
          onChange={(e) => updateForm('stage', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="subject1">科目一</option>
          <option value="subject2">科目二</option>
          <option value="subject3">科目三</option>
          <option value="subject4">科目四</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">入学日期</label>
          <input
            type="date"
            value={form.enroll_date}
            onChange={(e) => updateForm('enroll_date', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">预计完成日期</label>
          <input
            type="date"
            value={form.expected_complete_date}
            onChange={(e) => updateForm('expected_complete_date', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">教练</label>
        <select
          value={form.coach_id}
          onChange={(e) => updateForm('coach_id', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">未分配</option>
          {coaches.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>
      {showEdit && (
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">状态</label>
          <select
            value={form.status}
            onChange={(e) => updateForm('status', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="active">在训</option>
            <option value="completed">已结业</option>
            <option value="suspended">暂停</option>
          </select>
        </div>
      )}
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
        disabled={submitting || !form.name.trim()}
        className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? '提交中...' : showEdit ? '确认修改' : '确认添加'}
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">学员档案</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
        >
          <Plus size={16} />
          添加学员
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索学员姓名、手机号或身份证"
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        >
          <option value="">全部状态</option>
          <option value="active">在训</option>
          <option value="completed">已结业</option>
          <option value="suspended">暂停</option>
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
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">姓名</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">性别</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">手机号</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">培训类型</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">当前科目</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">教练</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">入学日期</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
                    暂无学员数据
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/students/${s.id}`)}
                    className="hover:bg-[var(--bg)] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text)]">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{genderMap[s.gender] || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{s.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{s.training_type || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{stageMap[s.stage] || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{s.coach_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{s.enroll_date || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[s.status]?.className || statusMap.active.className}`}>
                        {statusMap[s.status]?.label || s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">
            共 {total} 条记录，第 {page}/{totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="添加学员">
        {renderForm(handleSubmitAdd)}
      </Modal>

      <Modal isOpen={showEdit} onClose={() => { setShowEdit(false); setEditingId(null) }} title="编辑学员">
        {renderForm(handleSubmitEdit)}
      </Modal>
    </div>
  )
}
