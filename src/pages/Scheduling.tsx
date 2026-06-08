import { Calendar as CalendarIcon } from 'lucide-react'

export default function Scheduling() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">课程排班</h2>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors">
          <CalendarIcon size={16} />
          新建排班
        </button>
      </div>
      <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-12 text-center text-[var(--text-secondary)]">
        课程排班功能开发中...
      </div>
    </div>
  )
}
